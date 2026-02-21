'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError('Credenciales incorrectas');
      return;
    }

    router.replace('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="BirraSport" className="w-20 h-20 mx-auto mb-4 drop-shadow-[0_4px_16px_rgba(245,166,35,0.25)]" />
          <h1 className="text-3xl font-black tracking-[4px] uppercase bg-gradient-to-br from-amber to-amber-light bg-clip-text text-transparent">
            SaldoBirras
          </h1>
          <p className="text-[9px] tracking-[5px] uppercase text-dim font-semibold mt-1">
            BirraSport
          </p>
        </div>

        <div className="card">
          <h2 className="text-xs font-bold tracking-[2px] uppercase text-amber mb-5">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cajera@birrasport.com"
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-rd text-xs font-semibold">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-dim text-[10px] mt-6">
          Acceso exclusivo para personal autorizado
        </p>
      </div>
    </div>
  );
}
