# Final Builder Fixes!
I added a built-in terminal viewer into your builder!

If the build succeeds, it will show you all the green checks. If it fails, it will show you exactly what command crashed!

### 1. Update `app/api/deploy/route.ts` with this snippet on your VPS:
```bash
cat << 'EOF' > /var/www/masterchief/app/api/deploy/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const db = getDb();
  if (!db) {
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
    const deployBaseDir = process.env.NODE_ENV === 'production' && !process.env.APP_URL ? '/var/www/apps' : path.join(process.cwd(), '.deployments');

    if (!fs.existsSync(deployBaseDir)) fs.mkdirSync(deployBaseDir, { recursive: true });
    const appDir = path.join(deployBaseDir, slug);
    const zipPath = path.join(deployBaseDir, `${slug}.zip`);
    fs.writeFileSync(zipPath, buffer);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(appDir, true);
    fs.unlinkSync(zipPath);

    let rootItems = fs.readdirSync(appDir).filter((f: string) => f !== '__MACOSX' && f !== '.DS_Store');
    if (rootItems.length === 1) {
        const singleItemPath = path.join(appDir, rootItems[0]);
        if (fs.statSync(singleItemPath).isDirectory()) {
            const nestedFiles = fs.readdirSync(singleItemPath);
            for (const f of nestedFiles) fs.renameSync(path.join(singleItemPath, f), path.join(appDir, f));
            fs.rmdirSync(singleItemPath);
        }
    }

    const indexPath = path.join(appDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        let content = fs.readFileSync(indexPath, 'utf-8');
        content = content.replace(/<title>.*?<\/title>/i, `<title>${appName}</title>`);
        if (!content.includes('rel="icon"')) {
            content = content.replace('</head>', `  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>">\n  </head>`);
        }
        fs.writeFileSync(indexPath, content);
    }

    for (const file of ['vite.config.ts', 'vite.config.js']) {
        const configPath = path.join(appDir, file);
        if (fs.existsSync(configPath)) {
            let content = fs.readFileSync(configPath, 'utf8');
            if (content.includes('defineConfig({') && !content.includes(`base:`)) {
                content = content.replace('defineConfig({', `defineConfig({\n  base: '/${slug}/',`);
                fs.writeFileSync(configPath, content);
            }
        }
    }

    const patchReactSource = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) patchReactSource(fullPath);
            else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let changed = false;
                if (content.match(/window\.location\.pathname === ['"]\/['"]/)) {
                    content = content.replace(/window\.location\.pathname === ['"]\/['"]/g, `(window.location.pathname === '/' || window.location.pathname === '/${slug}' || window.location.pathname === '/${slug}/')`);
                    changed = true;
                }
                if (content.includes('<BrowserRouter>')) {
                     content = content.replace('<BrowserRouter>', `<BrowserRouter basename="/${slug}">`);
                     changed = true;
                }
                if (content.includes('react-router-dom') && content.includes('<Router>')) {
                     content = content.replace('<Router>', `<Router basename="/${slug}">`);
                     changed = true;
                }
                if (content.includes('wouter') && content.includes('<Router>')) {
                     content = content.replace('<Router>', `<Router base="/${slug}">`);
                     changed = true;
                }
                if (changed) fs.writeFileSync(fullPath, content);
            }
        }
    };
    patchReactSource(path.join(appDir, 'src'));

    let buildLog = '';
    const { execSync } = require('child_process');
    if (fs.existsSync(path.join(appDir, 'package.json'))) {
       try {
           const installOut = execSync('npm install', { cwd: appDir, encoding: 'utf-8' });
           buildLog += "--- NPM INSTALL ---\n" + installOut + "\n";
           const buildOut = execSync('npm run build', { cwd: appDir, encoding: 'utf-8' });
           buildLog += "--- NPM RUN BUILD ---\n" + buildOut + "\n";
       } catch (buildErr: any) {
           let errorOutput = buildErr.message;
           if (buildErr.stdout) errorOutput += '\n\nSTDOUT:\n' + buildErr.stdout;
           if (buildErr.stderr) errorOutput += '\n\nSTDERR:\n' + buildErr.stderr;
           return NextResponse.json({ error: 'Build failed! See details below.', details: errorOutput }, { status: 500 });
       }
    }

    const builtIndexPath = path.join(appDir, 'dist', 'index.html');
    const finalIndexToPatch = fs.existsSync(builtIndexPath) ? builtIndexPath : indexPath;
    if (fs.existsSync(finalIndexToPatch)) {
        let content = fs.readFileSync(finalIndexToPatch, 'utf-8');
        content = content.replace(/<title>.*?<\/title>/i, `<title>${appName}</title>`);
        if (!content.includes('rel="icon"')) {
            content = content.replace('</head>', `  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>">\n  </head>`);
        }
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

    const db = getDb();
    if (db) {
      await db.query(`CREATE TABLE IF NOT EXISTS deployments (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, status VARCHAR(50) DEFAULT 'deployed', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
      await db.query('INSERT INTO deployments (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = $1', [appName, slug]);
    }
    return NextResponse.json({ success: true, appDir, buildLog });
  } catch (err: any) {
    return NextResponse.json({ error: 'Deployment failed', details: err.message || String(err) }, { status: 500 });
  }
}
EOF
```

### 2. Update `app/builder/page.tsx` on your VPS

Run this snippet to update the builder page to display the logs:
```bash
cat << 'EOF' > /var/www/masterchief/app/builder/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Upload, Power, RefreshCcw, Trash2, Eye } from 'lucide-react';

export default function BuilderDashboard() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [appName, setAppName] = useState('');
  const [slug, setSlug] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDeployments = async () => {
    try {
      const res = await fetch('/api/deploy');
      const data = await res.json();
      if (Array.isArray(data)) setDeployments(data);
    } catch (e) {}
  };
  useEffect(() => { fetchDeployments(); }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !appName || !slug) return;
    setDeploying(true); setBuildLogs(null); setErrorMsg(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', appName);
    formData.append('slug', slug);

    try {
      const res = await fetch('/api/deploy', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setAppName(''); setSlug(''); setFile(null); fetchDeployments();
        if (data.buildLog) setBuildLogs(data.buildLog);
        alert('App deployed successfully!');
      } else {
        setErrorMsg(`Deployment failed: ${data.error}\n\n${data.details ? data.details : ''}`);
      }
    } catch (e: any) {
      setErrorMsg(`Internal error: ${e.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this deployment?')) return;
    try {
      const res = await fetch(`/api/deploy/${id}`, { method: 'DELETE' });
      if (res.ok) fetchDeployments();
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Deploy New App</h2>
            <form onSubmit={handleDeploy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">App Name</label>
                <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm" placeholder="e.g. My Next Dashboard" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">URL Slug</label>
                <div className="flex bg-slate-50 border border-slate-300 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500">
                  <span className="px-3 py-2 text-slate-400 bg-slate-100 border-r border-slate-300 text-sm whitespace-nowrap hidden sm:inline">mc.za/d/</span>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-3 py-2 bg-transparent text-slate-900 focus:outline-none text-sm" placeholder="my-app" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ZIP File</label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-md p-6 flex flex-col items-center justify-center hover:bg-slate-50 hover:border-indigo-400 transition-colors cursor-pointer group">
                  <input type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                  <span className="text-sm font-medium text-slate-700">{file ? file.name : "Select a .zip"}</span>
                  {!file && <span className="text-xs text-slate-400 mt-1">or drag and drop</span>}
                </div>
              </div>
              <button type="submit" disabled={deploying || !file || !appName || !slug}
                className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-md flex items-center justify-center gap-2">
                {deploying ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                {deploying ? 'Deploying...' : 'Execute Build'}
              </button>
            </form>
            
            {/* THIS IS THE NEW LOG VIEWER SECTION */}
            {(errorMsg || buildLogs) && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-tight">Deploy Output</h3>
                {errorMsg && (
                    <div className="bg-red-50 text-red-700 italic border border-red-200 p-4 rounded-md text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96">
                        {errorMsg}
                    </div>
                )}
                {buildLogs && (
                    <div className="bg-slate-900 text-green-400 p-4 rounded-md text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96 border border-slate-700 mt-4">
                        {buildLogs}
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 uppercase">Active Deployments</h2>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[600px] overflow-auto">
              {deployments.map((d) => (
                <li key={d.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{d.name}</span>
                      <a href={`/d/${d.slug}`} target="_blank" className="text-xs font-medium text-indigo-600 hover:underline">/{d.slug}</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/d/${d.slug}`} target="_blank" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md">
                      <Eye className="w-4 h-4" />
                    </a>
                    <button onClick={() => handleDelete(d.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF
```

### 3. Rebuild and Restart!
```bash
cd /var/www/masterchief
npm run build
pm2 restart "masterchief-app"
```

Now try uploading. The builder page will display exactly what went wrong in a big code box if the build fails! Copy it and show it to me!
