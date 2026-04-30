'use client';

import { useState, useEffect } from 'react';
import { Upload, Server, Globe, Power, CheckCircle, RefreshCcw, Trash2, Download, Edit2, Save, X, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Deployment {
  id: number;
  name: string;
  slug: string;
  status: string;
  created_at: string;
}

export default function BuilderDashboard() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
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
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDeployments();
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !appName || !slug) return;

    setDeploying(true);
    setBuildLogs(null);
    setErrorMsg(null);
    
    try {
      const res = await fetch(`/api/deploy?app-name=${encodeURIComponent(appName)}&app-slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/zip',
        },
        body: file,
      });

      if (res.ok) {
        const data = await res.json();
        setAppName('');
        setSlug('');
        setFile(null);
        fetchDeployments();
        if (data.buildLog) {
            setBuildLogs(data.buildLog);
        }
        alert('App deployed successfully!');
      } else {
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch(e) { setErrorMsg('Deployment failed: HTTP ' + res.status + '\n' + text.substring(0, 300)); return; }
        const fullErr = `Deployment failed: ${data.error}\n\n${data.details ? data.details : ''}`;
        setErrorMsg(fullErr);
      }
    } catch (e: any) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSave = async (id: number) => {
    try {
      const res = await fetch(`/api/deploy/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSlug: editSlug })
      });
      if (res.ok) {
        setEditingId(null);
        fetchDeployments();
      } else {
        alert('Failed to update slug. Perhaps it is already in use?');
      }
    } catch (e) {
      console.error(e);
    }
  };


  const handleLogout = async () => {
    // Simply removing cookie on client/server via an API would be best,
    // but for this UI we can clear document cookie if it wasn't HttpOnly.
    // It's HttpOnly, so we'd need a logout route. Let's just navigate to login 
    // and let an actual logout endpoint handle it if added.
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 h-16 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center font-bold text-lg text-white">M</div>
            <h1 className="font-bold tracking-tight text-xl text-white">MASTERCHIEF</h1>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
            Exit
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        
        {/* Upload Form */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">New Deployment</h2>
            <form onSubmit={handleDeploy} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">App Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. factory-app"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono placeholder:text-slate-700"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">URL Slug</label>
                <div className="flex items-center">
                  <div className="px-3 py-2 bg-slate-800 border border-slate-800 rounded-l text-slate-400 text-sm font-mono whitespace-nowrap">
                    masterchief.co.za/
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="examplesite"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 border-l-0 rounded-r text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono placeholder:text-slate-700"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">Source Code (ZIP)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-md bg-slate-950 hover:bg-slate-900 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".zip"
                    required
                    onChange={(e) => setFile(e?.target?.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    <div className="flex flex-col sm:flex-row text-sm text-slate-400 justify-center">
                      <span className="relative rounded-md font-bold text-indigo-400 hover:text-indigo-300 focus-within:outline-none">
                        Upload a file
                      </span>
                      <p className="sm:pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      {file ? file.name : 'Google AI Studio ZIP'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={deploying || !file || !appName || !slug}
                className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none text-white font-bold rounded-md transition-all shadow-lg shadow-indigo-900/50 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
              >
                {deploying ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                {deploying ? 'Deploying...' : 'Execute Build'}
              </button>
            </form>

            {(errorMsg || buildLogs) && (
              <div className="mt-6 border-t border-slate-800 pt-6">
                <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-tight">Deploy Output</h3>
                {errorMsg && (
                    <div className="bg-red-950/50 text-red-400 italic border border-red-900/50 p-4 rounded-md text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96">
                        {errorMsg}
                    </div>
                )}
                {buildLogs && (
                    <div className="bg-slate-950 text-green-400 p-4 rounded-md text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96 border border-slate-800 mt-4">
                        {buildLogs}
                    </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Deployments List */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest relative">
                Active Deployments
                <div className="absolute -left-3 top-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              </h2>
              <button onClick={fetchDeployments} className="text-slate-400 hover:text-indigo-400 transition-colors">
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="divide-y divide-slate-800/50 flex-1 overflow-auto">
              {deployments.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono text-sm">
                  No deployments yet. Upload a ZIP file to get started.
                </div>
              ) : (
                deployments.map((dep) => (
                  <div key={dep.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/30 transition-colors group gap-4">
                    <div className="flex items-start gap-4 w-full sm:w-auto overflow-hidden">
                      <div className="w-10 h-10 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-indigo-500/30 group-hover:bg-indigo-900/20 transition-colors">
                        <Server className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white tracking-tight truncate">{dep.name}</h3>
                        
                        {editingId === dep.id ? (
                           <div className="flex flex-wrap items-center gap-2 mt-2">
                             <div className="flex items-center text-xs font-mono max-w-full">
                               <span className="text-slate-500 truncate hidden sm:inline">masterchief.co.za/</span>
                               <span className="text-slate-500 truncate sm:hidden">.../</span>
                               <input 
                                 className="border border-indigo-500/50 bg-slate-950 rounded px-2 py-1 outline-none text-indigo-300 w-24 sm:w-32"
                                 value={editSlug}
                                 onChange={(e) => setEditSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                               />
                             </div>
                             <button onClick={() => handleEditSave(dep.id)} className="text-green-400 hover:text-green-300 p-1.5 bg-green-900/20 rounded border border-green-900/50 shrink-0"><Save className="w-3.5 h-3.5" /></button>
                             <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300 p-1.5 bg-slate-800 rounded border border-slate-700 shrink-0"><X className="w-3.5 h-3.5" /></button>
                           </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] font-mono text-slate-500">
                            <div className="flex items-center gap-1.5 truncate max-w-full">
                              <Globe className="w-3 h-3 shrink-0" />
                              <a 
                                href={`https://masterchief.co.za/${dep.slug}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-indigo-400 transition-colors hover:underline truncate"
                              >
                                masterchief.co.za/{dep.slug}
                              </a>
                            </div>
                            <button 
                                onClick={() => {
                                    setEditingId(dep.id);
                                    setEditSlug(dep.slug);
                                }}
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-indigo-400 transition-all flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded shadow-sm shrink-0"
                                title="Edit Path"
                            >
                              <Edit2 className="w-3 h-3" /> <span className="text-[9px] uppercase tracking-widest font-sans font-bold">Edit</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-row items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-800 sm:border-0">
                      <div className="flex items-center gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <a href={`https://masterchief.co.za/${dep.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 sm:p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/20 rounded border border-transparent hover:border-indigo-800/50 transition-all" title="View Site">
                          <Eye className="w-4 h-4 sm:w-4 sm:h-4" />
                        </a>
                        <a href={`/api/download/${dep.id}`} download className="p-2 sm:p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/20 rounded border border-transparent hover:border-indigo-800/50 transition-all" title="Download Source Zip">
                          <Download className="w-4 h-4 sm:w-4 sm:h-4" />
                        </a>
                        <button onClick={() => handleDelete(dep.id)} className="p-2 sm:p-2 text-slate-400 hover:text-red-400 hover:bg-red-950 rounded border border-transparent hover:border-red-900/50 transition-all" title="Delete Deployment">
                          <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400 bg-green-950 px-2 py-0.5 rounded uppercase tracking-wider border border-green-900/50">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {dep.status}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                          {new Date(dep.created_at).toLocaleDateString()}
                        </span>
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

      <footer className="h-10 bg-slate-950 border-t border-slate-900 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-wider">
          <div className="flex gap-4 sm:gap-6">
            <span className="truncate max-w-[120px] sm:max-w-none">VPS: Contabo Masterchief</span>
            <span className="hidden sm:inline">OS: Ubuntu 24.04 LTS</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
            <span className="hidden sm:inline">Builder Environment Active</span>
            <span className="sm:hidden">Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
