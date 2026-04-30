import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, x-app-name, x-app-slug',
    },
  });
}

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
    const isZip = req.headers.get('content-type') === 'application/zip';
    if (!isZip) {
      return NextResponse.json({ error: 'Content-Type must be application/zip' }, { status: 400 });
    }

    const url = new URL(req.url);
    const appName = url.searchParams.get('app-name') || '';
    const slug = url.searchParams.get('app-slug') || '';

    if (!appName || !slug) {
      return NextResponse.json({ error: 'Missing x-app-name or x-app-slug header' }, { status: 400 });
    }

    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (!buffer || buffer.length === 0) {
        return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
    }

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

    // FLATTENER LOGIC: AI Studio / Github often export with a single top-level folder.
    // If the extracted appDir contains exactly one folder (and no files), move everything up.
    let rootItems = fs.readdirSync(appDir).filter(f => f !== '__MACOSX' && f !== '.DS_Store');
    if (rootItems.length === 1) {
        const singleItemPath = path.join(appDir, rootItems[0]);
        if (fs.statSync(singleItemPath).isDirectory()) {
            console.log(`Flattening nested zip folder: ${rootItems[0]}`);
            const nestedFiles = fs.readdirSync(singleItemPath);
            for (const file of nestedFiles) {
                fs.renameSync(path.join(singleItemPath, file), path.join(appDir, file));
            }
            fs.rmdirSync(singleItemPath);
        }
    }

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
                
                // Fix Next.js App Router hallucination (importing Html, Head from next/document outside _document)
                if (file !== '_document.tsx' && file !== '_document.js' && file !== '_document.jsx' && file !== '_document.ts') {
                    if (content.includes('next/document')) {
                        content = content.replace(/import\s+[^'"]*['"]next\/document['"];?/g, '');
                        content = content.replace(/<Html(>|\s[^>]*>)/g, '<html$1');
                        content = content.replace(/<\/Html>/g, '</html>');
                        content = content.replace(/<Head(>|\s[^>]*>)/g, '<head$1');
                        content = content.replace(/<\/Head>/g, '</head>');
                        content = content.replace(/<Main\s*\/>/g, '{typeof children !== "undefined" ? children : null}');
                        content = content.replace(/<NextScript\s*\/>/g, '');
                        changed = true;
                    }
                }

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
                
                // If they alias BrowserRouter as Router: import { BrowserRouter as Router } from 'react-router-dom'
                if (content.includes('react-router-dom') && content.includes('<Router>')) {
                     content = content.replace('<Router>', `<Router basename="/${slug}">`);
                     changed = true;
                }

                // 3. Wouter Support (very common in AI studio apps)
                if (content.includes('wouter')) {
                     if (content.includes('<Router>')) {
                         content = content.replace('<Router>', `<Router base="/${slug}">`);
                         changed = true;
                     } else {
                         // Some Wouter apps don't use <Router> and rely on window.location natively!
                         // In this case we MUST patch <Route path="/something"> to <Route path="/slug/something">
                         if (/<Route\s+path=["']\/([^"']*)["']/g.test(content)) {
                             content = content.replace(/<Route\s+path=["']\/([^"']*)["']/g, `<Route path="/${slug}/$1"`);
                             changed = true;
                         }
                         if (/<Link\s+href=["']\/([^"']*)["']/g.test(content)) {
                             content = content.replace(/<Link\s+href=["']\/([^"']*)["']/g, `<Link href="/${slug}/$1"`);
                             changed = true;
                         }
                     }
                }
                
                if (content.includes('location === \'/\'') || content.includes('location === "/"')) {
                    content = content.replace(/location === ['"]\/['"]/g, `(location === '/' || location === '/${slug}' || location === '/${slug}/')`);
                    changed = true;
                }
                // 4. Vite createBrowserRouter support
                if (content.includes('createBrowserRouter')) {
                     if (!content.includes('basename:')) {
                         // Fallback just matching the simplest array shape 
                         content = content.replace(/createBrowserRouter\(\s*\[/g, `createBrowserRouter([\n  { path: "/", element: <div /> }, /* hack */\n`);
                     }
                }
                
                if (changed) {
                    fs.writeFileSync(fullPath, content);
                    console.log(`Patched routing logic in ${file}`);
                }
            }
        }
    };
    patchReactSource(path.join(appDir, 'src'));
    patchReactSource(path.join(appDir, 'app'));
    patchReactSource(path.join(appDir, 'pages'));
    patchReactSource(path.join(appDir, 'components'));

    // Build the app if package.json exists
    let buildLog = '';
    const { execSync } = require('child_process');
    if (fs.existsSync(path.join(appDir, 'package.json'))) {
       try {
           console.log(`Building app at ${appDir}...`);
           
           // Ensure local lockfile exists so Next.js and NPM don't traverse up into the VPS root
           if (!fs.existsSync(path.join(appDir, 'package-lock.json'))) {
               fs.writeFileSync(path.join(appDir, 'package-lock.json'), JSON.stringify({
                   name: "deployed-app",
                   lockfileVersion: 3,
                   requires: true,
                   packages: {}
               }));
           }

           console.log(`Running npm install...`);
           // Force NODE_ENV to development so devDependencies (like typescript) are installed
           const execEnv = { ...process.env, NODE_ENV: 'development' };
           const installOut = execSync('npm install --include=dev', { cwd: appDir, encoding: 'utf-8', env: execEnv });
           buildLog += "--- NPM INSTALL ---\n" + installOut + "\n";
           
           // Defensive fix: NextJS auto-install of typescript often fails resolving upwards because of outer package-lock.json
           if (fs.existsSync(path.join(appDir, 'next.config.ts')) || fs.existsSync(path.join(appDir, 'tsconfig.json'))) {
               console.log(`Ensuring typescript is installed locally...`);
               execSync('npm install typescript @types/node @types/react --no-save', { cwd: appDir, encoding: 'utf-8', env: execEnv });
           }

           console.log(`Running npm run build...`);
           // Create a clean env for build
           const buildEnv = { ...process.env };
           delete buildEnv.NODE_ENV; // Let NextJS default to production
           const buildOut = execSync('npm run build', { cwd: appDir, encoding: 'utf-8', env: buildEnv });
           buildLog += "--- NPM RUN BUILD ---\n" + buildOut + "\n";
           
           console.log(`Build complete!`);
       } catch (buildErr: any) {
           console.error('Build failed for app:', slug);
           
           let errorOutput = buildErr.message;
           if (buildErr.stdout) errorOutput += '\n\nSTDOUT:\n' + buildErr.stdout;
           if (buildErr.stderr) errorOutput += '\n\nSTDERR:\n' + buildErr.stderr;
           
           console.error(errorOutput);
           
           return NextResponse.json({ 
             error: 'Build failed! See details below.',
             details: errorOutput
           }, { status: 500 });
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

    return NextResponse.json({ success: true, appDir, buildLog });
  } catch (err: any) {
    console.error('Deploy error details:', err.message || err);
    return NextResponse.json({ 
      error: 'Deployment failed', 
      details: err.message || String(err),
      stack: err.stack
    }, { status: 500 });
  }
}
