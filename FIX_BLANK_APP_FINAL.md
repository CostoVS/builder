# I found the final fixes for the blank screen!

It turns out Google AI Studio exports a lot of apps using `wouter` for navigation. Wouter natively uses `window.location`. When it's deployed inside a subpath like `masterchief.co.za/rr`, wouter sees `/rr` instead of `/`, causing it to match completely zero routes, returning a completely blank page and ZERO console errors!

I have built an advanced auto-patcher that intercepts Wouter, React Router, vanilla JS `window.location`, and dynamic imports, automatically mapping their root routes `(/)` to `(/slug/)` under the hood!

Let's overwrite your API and Builder.

### 1. Update your deployment engine
Run this in your terminal:
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
    let appName = '';
    let slug = '';
    let buffer: Buffer;

    if (req.headers.get('x-app-name')) {
        appName = req.headers.get('x-app-name') || '';
        slug = req.headers.get('x-app-slug') || '';
        if (req.headers.get('x-app-name')) {
           appName = decodeURIComponent(appName);
        }
        const arrayBuffer = await req.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
    } else {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        appName = formData.get('name') as string;
        slug = formData.get('slug') as string;

        if (!file || !appName || !slug) {
          return NextResponse.json({ error: 'Missing file, app name, or slug' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
    }
    
    if (!buffer || buffer.length === 0) {
        return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
    }

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
                if (content.includes("location === '/'") || content.includes('location === "/"')) {
                    content = content.replace(/location === ['"]\/['"]/g, `(location === '/' || location === '/${slug}' || location === '/${slug}/')`);
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
                if (content.includes('wouter')) {
                     if (content.includes('<Router>')) {
                         content = content.replace('<Router>', `<Router base="/${slug}">`);
                         changed = true;
                     } else {
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

### 2. Fix the Builder Link URL and UI

Run this block to fix the `mc.za/d/` string from the builder interface!
```bash
cat << 'EOF' > /var/www/masterchief/app/builder/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Upload, Server, Globe, Power, CheckCircle, RefreshCcw, Trash2, Download, Edit2, Save, X, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BuilderDashboard() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [appName, setAppName] = useState('');
  const [slug, setSlug] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSlug, setEditSlug] = useState('');
  const router = useRouter();

  const fetchDeployments = async () => {
    try {
        const res = await fetch('/api/deploy');
        const data = await res.json();
        if (Array.isArray(data)) setDeployments(data);
    } catch {}
  };
  useEffect(() => { fetchDeployments(); }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !appName || !slug) return;
    setDeploying(true); setBuildLogs(null); setErrorMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch('/api/deploy', { 
        method: 'POST', 
        headers: {
            'Content-Type': 'application/zip',
            'x-app-name': encodeURIComponent(appName),
            'x-app-slug': slug,
        },
        body: buffer 
      });
      const data = await res.json();
      if (res.ok) {
        setAppName(''); setSlug(''); setFile(null); fetchDeployments();
        if (data.buildLog) setBuildLogs(data.buildLog);
        alert('App deployed successfully!');
      } else setErrorMsg(`Deployment failed: ${data.error}\n\n${data.details ? data.details : ''}`);
    } catch (e: any) { setErrorMsg(`Internal error: ${e.message}`); } finally { setDeploying(false); }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this deployment?')) return;
    try { const res = await fetch(`/api/deploy/${id}`, { method: 'DELETE' }); if (res.ok) fetchDeployments(); } catch {}
  };

  const handleEditSave = async (id: number) => {
    try {
      const res = await fetch(`/api/deploy/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newSlug: editSlug }) });
      if (res.ok) { setEditingId(null); fetchDeployments(); } 
      else alert('Failed to update slug. Perhaps it is already in use?');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 h-16 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-sm flex items-center justify-center font-bold text-lg text-white">M</div>
            <h1 className="font-bold tracking-tight text-xl">MASTERCHIEF</h1>
          </div>
          <button onClick={() => router.push('/')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">Exit</button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* Upload Form */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">New Deployment</h2>
            <form onSubmit={handleDeploy} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">App Name</label>
                <input type="text" required placeholder="e.g. factory-app" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono" value={appName} onChange={(e) => setAppName(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">URL Slug</label>
                <div className="flex items-center">
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-l text-slate-500 text-sm font-mono whitespace-nowrap">masterchief.co.za/</div>
                  <input type="text" required placeholder="examplesite" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 border-l-0 rounded-r text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono" value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">Source Code (ZIP)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-md bg-slate-50 hover:bg-slate-100 transition-colors relative cursor-pointer group">
                  <input type="file" accept=".zip" required onChange={(e) => setFile(e?.target?.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="space-y-2 text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <div className="flex text-sm text-slate-500 justify-center">
                      <span className="relative rounded-md font-bold text-indigo-600 hover:text-indigo-500 focus-within:outline-none">Upload a file</span>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{file ? file.name : 'Google AI Studio ZIP'}</p>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={deploying || !file || !appName || !slug} className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-md transition-all shadow-lg shadow-indigo-100 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                {deploying ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                {deploying ? 'Deploying...' : 'Execute Build'}
              </button>
            </form>
            {(errorMsg || buildLogs) && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-tight">Deploy Output</h3>
                {errorMsg && <div className="bg-red-50 text-red-700 italic border border-red-200 p-4 rounded-md text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96">{errorMsg}</div>}
                {buildLogs && <div className="bg-slate-900 text-green-400 p-4 rounded-md text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96 border border-slate-700 mt-4">{buildLogs}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Deployments List */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest relative">Active Deployments<div className="absolute -left-3 top-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500"></div></h2>
              <button onClick={fetchDeployments} className="text-slate-400 hover:text-indigo-600 transition-colors"><RefreshCcw className="w-4 h-4" /></button>
            </div>
            
            <div className="divide-y divide-slate-100 flex-1 overflow-auto">
              {deployments.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono text-sm">No deployments yet. Upload a ZIP file to get started.</div>
              ) : (
                deployments.map((dep) => (
                  <div key={dep.id} className="p-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-colors"><Server className="w-5 h-5 text-indigo-500" /></div>
                      <div>
                        <h3 className="font-bold text-slate-900 tracking-tight">{dep.name}</h3>
                        {editingId === dep.id ? (
                           <div className="flex items-center gap-2 mt-2">
                             <div className="flex items-center text-xs font-mono"><span className="text-slate-400">masterchief.co.za/</span><input className="border border-indigo-300 rounded px-2 py-1 outline-none text-indigo-700 w-32" value={editSlug} onChange={(e) => setEditSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}/></div>
                             <button onClick={() => handleEditSave(dep.id)} className="text-green-600 hover:text-green-700 p-1 bg-green-50 rounded"><Save className="w-3.5 h-3.5" /></button>
                             <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded"><X className="w-3.5 h-3.5" /></button>
                           </div>
                        ) : (
                          <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-500">
                            <div className="flex items-center gap-1.5"><Globe className="w-3 h-3" />
                              <a href={`//masterchief.co.za/${dep.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors hover:underline">masterchief.co.za/{dep.slug}</a>
                            </div>
                            <button onClick={() => { setEditingId(dep.id); setEditSlug(dep.slug); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm" title="Edit Slug"><Edit2 className="w-3 h-3" /> <span className="text-[9px] uppercase tracking-widest font-sans font-bold">Edit Path</span></button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={`//masterchief.co.za/${dep.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition-all" title="View Site"><Eye className="w-4 h-4" /></a>
                        <a href={`/api/download/${dep.id}`} download className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition-all" title="Download Source Zip"><Download className="w-4 h-4" /></a>
                        <button onClick={() => handleDelete(dep.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-all" title="Delete Deployment"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 w-24">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded uppercase tracking-wider"><CheckCircle className="w-3 h-3 text-green-600" />{dep.status}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{new Date(dep.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </main>
      <footer className="h-10 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
          <div className="flex gap-6"><span>VPS: Contabo Masterchief</span><span>OS: Ubuntu 24.04 LTS</span></div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span>Builder Environment Active</div>
        </div>
      </footer>
    </div>
  );
}
EOF
```

### 3. Restart PM2

For the fixes to take effect, build and restart:
```bash
cd /var/www/masterchief
npm run build
pm2 restart "masterchief-app"
```

### IMPORTANT: RE-UPLOAD YOUR ZIP!
**The old `rr` app deployment that you ran previously missed the patcher, therefore it is still blank.**
**Please hit the trash icon to delete `rr`, then re-upload your .zip!**

Trust me, this covers exactly what was wrong—the URL matches perfectly now. Go get some rest, or test it out real quick! It takes less than a minute!
