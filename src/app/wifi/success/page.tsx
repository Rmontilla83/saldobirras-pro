'use client';

import { useEffect } from 'react';
import { Wifi, Loader2 } from 'lucide-react';

export default function WifiSuccessPage() {
  // Auto-redirect to portal after 2 seconds (QR is already saved in localStorage)
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/portal';
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#060A13] text-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
        <Wifi size={48} className="text-emerald-400" />
      </div>

      <img
        src="/birrasport-logo.png"
        alt="BirraSport"
        className="w-16 h-16 mb-4 drop-shadow-[0_4px_24px_rgba(245,166,35,0.3)]"
      />

      <h1 className="text-3xl font-extrabold mb-2">Conectado!</h1>
      <p className="text-slate-400 text-lg mb-2">Disfruta del WiFi BirraSport</p>
      <p className="text-slate-600 text-sm mb-6">Entrando al portal...</p>
      <Loader2 size={28} className="text-amber-400 animate-spin" />
    </div>
  );
}
