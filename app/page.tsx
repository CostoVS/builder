import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 font-sans text-slate-900">
      <div className="max-w-2xl text-center space-y-8">
        <div className="w-16 h-16 bg-indigo-500 rounded-lg flex items-center justify-center mb-8 mx-auto text-white font-bold text-3xl shadow-lg shadow-indigo-200">
          M
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 uppercase">Masterchief Infrastructure</h1>
        <p className="text-slate-500 font-medium">
          This AI Studio preview environment showcases your unified VPS application. 
          When deployed to your Contabo VPS, Nginx and Next.js middleware will automatically route your domains.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link href="/orb" className="block p-6 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all text-left">
            <h2 className="text-lg font-bold mb-2 uppercase tracking-tight divide-x">masterchief.co.za</h2>
            <p className="text-sm text-slate-500 leading-relaxed text-[13px]">The moving orb landing page.</p>
          </Link>
          <Link href="/builder" className="block p-6 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all text-left">
            <h2 className="text-lg font-bold mb-2 uppercase tracking-tight">builder.masterchief.co.za</h2>
            <p className="text-sm text-slate-500 leading-relaxed text-[13px]">The code builder and deployment manager.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
