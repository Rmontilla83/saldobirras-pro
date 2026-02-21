'use client';

import { useStore } from '@/lib/store';
import { formatBalance, isLowBalance } from '@/lib/utils';
import { Smartphone, ArrowRight, X } from 'lucide-react';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';

export default function ScanPopup() {
  const { scanPopup: c, setScanPopup, setView } = useStore();
  if (!c) return null;

  const balColor = c.balance <= 0 ? 'text-red-400' : isLowBalance(c.balance, c.balance_type) ? 'text-yellow-500' : 'text-emerald-400';

  const handleGo = () => { setScanPopup(null); setView('customer', c); };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xl flex items-center justify-center animate-[fadeIn_0.2s_ease]" onClick={() => setScanPopup(null)}>
      <div className="bg-[#101828] border border-amber/10 rounded-3xl p-8 max-w-[380px] w-[90%] shadow-[0_32px_80px_rgba(0,0,0,0.5)] animate-[popScale_0.3s_ease] relative" onClick={e => e.stopPropagation()}>
        <button onClick={() => setScanPopup(null)} className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/[0.03] text-slate-500 flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition-colors">
          <X size={15}/>
        </button>

        <div className="w-16 h-16 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/10 flex items-center justify-center mx-auto mb-4 animate-[ring_1.5s_ease_infinite]">
          <Smartphone size={24} className="text-emerald-400"/>
        </div>

        <div className="text-center mb-1"><span className="text-[10px] text-slate-500 tracking-[2px] uppercase font-semibold">QR Escaneado</span></div>
        <div className="flex justify-center my-3"><Avatar name={c.name} photoUrl={c.photo_url} large /></div>
        <div className="text-center text-lg font-bold text-amber mb-0.5">{c.name}</div>
        <div className="text-center text-[11px] text-slate-500 mb-4">{c.email}</div>
        <div className="text-center mb-5">
          <div className={`text-[36px] font-extrabold tabular-nums ${balColor}`}>{formatBalance(c.balance, c.balance_type)}</div>
          <StatusBadge customer={c} />
        </div>
        <button onClick={handleGo} className="btn-primary w-full py-3.5 flex items-center justify-center gap-1.5">
          Abrir Perfil <ArrowRight size={14}/>
        </button>
      </div>
    </div>
  );
}
