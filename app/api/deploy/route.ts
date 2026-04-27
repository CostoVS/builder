import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const db = getDb();
  if (!db) {
    // Return mock data for AI Studio preview environment
    return NextResponse.json([{ id: 1, name: 'Example Site', slug: 'examplesite', status: 'mocked', created_at: new Date().toISOString() }]);
  }

  try {
    const res = await db.query('SELECT * FROM deployments ORDER BY created_at DESC');
    return NextResponse.json(res.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const appName = formData.get('name') as string;
    const slug = formData.get('slug') as string;

    if (!file || !appName || !slug) {
      return NextResponse.json({ error: 'Missing file, app name, or slug' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Provide a valid path on the VPS, using a fallback for local AI Studio runtime
    const deployBaseDir = process.env.NODE_ENV === 'production' && !process.env.APP_URL 
      ? '/var/www/apps' 
      : path.join(process.cwd(), '.deployments');

    if (!fs.existsSync(deployBaseDir)) {
      fs.mkdirSync(deployBaseDir, { recursive: true });
    }

    const appDir = path.join(deployBaseDir, slug);
    
    // Save zip temporarily
    const zipPath = path.join(deployBaseDir, `${slug}.zip`);
    fs.writeFileSync(zipPath, buffer);

    // Extract
    const zip = new AdmZip(zipPath);
    // Overwrite true
    zip.extractAllTo(appDir, true);
    
    // Cleanup Zip
    fs.unlinkSync(zipPath);

    // AI Studio Export Fixes: Replace Title and inject a default Favicon before build
    const indexPath = path.join(appDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        let indexHtmlContent = fs.readFileSync(indexPath, 'utf-8');
        indexHtmlContent = indexHtmlContent.replace(/<title>.*?<\/title>/i, `<title>${appName}</title>`);
        if (!indexHtmlContent.includes('rel="icon"')) {
            indexHtmlContent = indexHtmlContent.replace(
                '</head>',
                `  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>">\n  </head>`
            );
        }
        fs.writeFileSync(indexPath, indexHtmlContent);
    }

    // Force Vite to build using the proper base path so all dynamic imports and CSS paths work natively
    for (const file of ['vite.config.ts', 'vite.config.js']) {
        const configPath = path.join(appDir, file);
        if (fs.existsSync(configPath)) {
            let content = fs.readFileSync(configPath, 'utf8');
            if (content.includes('defineConfig({')) {
                // Ensure we don't duplicate if they deploy the same folder twice
                if (!content.includes(`base:`)) {
                    content = content.replace('defineConfig({', `defineConfig({\n  base: '/${slug}/',`);
                    fs.writeFileSync(configPath, content);
                    console.log(`Injected base: /${slug}/ into ${file}`);
                }
            }
        }
    }

    // Deep scan all components to inject React Router basenames and fix raw location checks
    const patchReactSource = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                patchReactSource(fullPath);
            } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let changed = false;
                
                // 1. Raw vanilla location checks
                if (content.match(/window\.location\.pathname === ['"]\/['"]/)) {
                    content = content.replace(/window\.location\.pathname === ['"]\/['"]/g, `(window.location.pathname === '/' || window.location.pathname === '/${slug}' || window.location.pathname === '/${slug}/')`);
                    changed = true;
                }
                
                // 2. React Router DOM
                if (content.includes('<BrowserRouter>')) {
                     content = content.replace('<BrowserRouter>', `<BrowserRouter basename="/${slug}">`);
                     changed = true;
                }
                
                // 3. Wouter Support (very common in AI studio apps)
                // If they use <Router>, we add base="/slug"
                if (content.includes('wouter') && content.includes('<Router>')) {
                     content = content.replace('<Router>', `<Router base="/${slug}">`);
                     changed = true;
                }
                
                if (changed) {
                    fs.writeFileSync(fullPath, content);
                    console.log(`Patched routing logic in ${file}`);
                }
            }
        }
    };
    patchReactSource(path.join(appDir, 'src'));

    // Build the app if package.json exists
    const { execSync } = require('child_process');
    if (fs.existsSync(path.join(appDir, 'package.json'))) {
       try {
           console.log(`Building app at ${appDir}...`);
           execSync('npm install', { cwd: appDir, stdio: 'inherit' });
           execSync('npm run build', { cwd: appDir, stdio: 'inherit' });
       } catch (buildErr: any) {
           console.error('Build failed for app:', slug, buildErr);
           throw new Error(`Build failed: ${buildErr.message || "Unknown error during npm build"}`);
       }
    }

    // Post-Build fixes for Subpath deployment blanks (Fixing Absolute Paths)
    const builtIndexPath = path.join(appDir, 'dist', 'index.html');
    const finalIndexToPatch = fs.existsSync(builtIndexPath) ? builtIndexPath : indexPath;
    if (fs.existsSync(finalIndexToPatch)) {
        let content = fs.readFileSync(finalIndexToPatch, 'utf-8');
        
        // Ensure title and favicon are replaced in the generated dist just in case it ignored our pre-build file
        content = content.replace(/<title>.*?<\/title>/i, `<title>${appName}</title>`);
        if (!content.includes('rel="icon"')) {
            content = content.replace(
                '</head>',
                `  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>">\n  </head>`
            );
        }

        // INJECT GLOBAL ERROR CATCHER FOR EASY DEBUGGING
        const errorScript = `
        <script>
        window.addEventListener('error', function(e) {
            document.body.innerHTML += '<div style="position:fixed;top:0;left:0;right:0;background:#ff0000;color:#fff;z-index:999999;padding:20px;font-family:monospace;white-space:pre-wrap;"><b>Runtime Error:</b> ' + String(e.message) + '<br>File: ' + e.filename + ':' + e.lineno + '</div>';
        });
        window.addEventListener('unhandledrejection', function(e) {
            document.body.innerHTML += '<div style="position:fixed;top:0;left:0;right:0;background:#ff0000;color:#fff;z-index:999999;padding:20px;font-family:monospace;white-space:pre-wrap;"><b>Unhandled Promise Rejection:</b> ' + String(e.reason) + '</div>';
        });
        </script>
        </head>`;
        content = content.replace('</head>', errorScript);

        fs.writeFileSync(finalIndexToPatch, content);
    }

    // Record in DB
    const db = getDb();
    if (db) {
      // Create table if it doesn't exist yet just in case initDb wasn't called early enough
      await db.query(`
            CREATE TABLE IF NOT EXISTS deployments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'deployed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

      await db.query(
        'INSERT INTO deployments (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = $1',
        [appName, slug]
      );
    }

    return NextResponse.json({ success: true, appDir });
  } catch (err: any) {
    console.error('Deploy error details:', err.message || err);
    return NextResponse.json({ 
      error: 'Deployment failed', 
      details: err.message || String(err),
      stack: err.stack
    }, { status: 500 });
  }
}
