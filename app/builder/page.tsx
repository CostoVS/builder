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
    fetchDeployments();
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !appName || !slug) return;

    setDeploying(true);
    setBuildLogs(null);
    setErrorMsg(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', appName);
    formData.append('slug', slug);

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        body: formData,
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
        const data = await res.json();
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 h-16 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-sm flex items-center justify-center font-bold text-lg text-white">M</div>
            <h1 className="font-bold tracking-tight text-xl">MASTERCHIEF</h1>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
            Exit
          </button>
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
                <input
                  type="text"
                  required
                  placeholder="e.g. factory-app"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">URL Slug</label>
                <div className="flex items-center">
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-l text-slate-500 text-sm font-mono whitespace-nowrap">
                    masterchief.co.za/
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="examplesite"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 border-l-0 rounded-r text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">Source Code (ZIP)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-md bg-slate-50 hover:bg-slate-100 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".zip"
                    required
                    onChange={(e) => setFile(e?.target?.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <div className="flex text-sm text-slate-500 justify-center">
                      <span className="relative rounded-md font-bold text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                        Upload a file
                      </span>
                      <p className="pl-1">or drag and drop</p>
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
                className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-md transition-all shadow-lg shadow-indigo-100 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
              >
                {deploying ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                {deploying ? 'Deploying...' : 'Execute Build'}
              </button>
            </form>

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

        {/* Deployments List */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest relative">
                Active Deployments
                <div className="absolute -left-3 top-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              </h2>
              <button onClick={fetchDeployments} className="text-slate-400 hover:text-indigo-600 transition-colors">
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="divide-y divide-slate-100 flex-1 overflow-auto">
              {deployments.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono text-sm">
                  No deployments yet. Upload a ZIP file to get started.
                </div>
              ) : (
                deployments.map((dep) => (
                  <div key={dep.id} className="p-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-colors">
                        <Server className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 tracking-tight">{dep.name}</h3>
                        
                        {editingId === dep.id ? (
                           <div className="flex items-center gap-2 mt-2">
                             <div className="flex items-center text-xs font-mono">
                               <span className="text-slate-400">masterchief.co.za/</span>
                               <input 
                                 className="border border-indigo-300 rounded px-2 py-1 outline-none text-indigo-700 w-32"
                                 value={editSlug}
                                 onChange={(e) => setEditSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                               />
                             </div>
                             <button onClick={() => handleEditSave(dep.id)} className="text-green-600 hover:text-green-700 p-1 bg-green-50 rounded"><Save className="w-3.5 h-3.5" /></button>
                             <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded"><X className="w-3.5 h-3.5" /></button>
                           </div>
                        ) : (
                          <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3 h-3" />
                              <a 
                                href={`http://masterchief.co.za/${dep.slug}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-indigo-600 transition-colors hover:underline"
                              >
                                masterchief.co.za/{dep.slug}
                              </a>
                            </div>
                            <button 
                                onClick={() => {
                                    setEditingId(dep.id);
                                    setEditSlug(dep.slug);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm"
                                title="Edit Slug"
                            >
                              <Edit2 className="w-3 h-3" /> <span className="text-[9px] uppercase tracking-widest font-sans font-bold">Edit Path</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={`http://masterchief.co.za/${dep.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition-all" title="View Site">
                          <Eye className="w-4 h-4" />
                        </a>
                        <a href={`/api/download/${dep.id}`} download className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition-all" title="Download Source Zip">
                          <Download className="w-4 h-4" />
                        </a>
                        <button onClick={() => handleDelete(dep.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-all" title="Delete Deployment">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 w-24">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded uppercase tracking-wider">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          {dep.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
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

      <footer className="h-10 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
          <div className="flex gap-6">
            <span>VPS: Contabo Masterchief</span>
            <span>OS: Ubuntu 24.04 LTS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Builder Environment Active
          </div>
        </div>
      </footer>
    </div>
  );
}
