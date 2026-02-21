'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError('Credenciales incorrectas'); return; }
    router.replace('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="BirraSport" className="w-20 h-20 mx-auto mb-5 drop-shadow-[0_4px_24px_rgba(245,166,35,0.2)]" />
          <h1 className="text-[28px] font-extrabold tracking-[3px] uppercase bg-gradient-to-r from-amber to-amber-light bg-clip-text text-transparent">
            SaldoBirras
          </h1>
          <p className="text-[10px] tracking-[5px] uppercase text-slate-600 font-medium mt-1">BirraSport</p>
        </div>

        <div className="card">
          <h2 className="text-xs font-bold tracking-[2px] uppercase text-amber/80 mb-5">Iniciar Sesión</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"/>
                <input type="email" className="input pl-10" value={email} onChange={e=>setEmail(e.target.value)} placeholder="cajera@birrasport.com" required />
              </div>
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"/>
                <input type="password" className="input pl-10" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> : <><LogIn size={15}/> Entrar</>}
            </button>
          </form>
        </div>
        <p className="text-center text-slate-700 text-[10px] mt-6">Acceso exclusivo para personal autorizado</p>
      </div>
    </div>
  );
}
