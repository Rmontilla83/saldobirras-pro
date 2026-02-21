'use client';

import { useStore } from '@/lib/store';
import { formatBalance, isLowBalance } from '@/lib/utils';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';

export default function ScanPopup() {
  const { scanPopup: c, setScanPopup, setView } = useStore();
  if (!c) return null;

  const balColor = c.balance <= 0 ? 'text-rd' : isLowBalance(c.balance, c.balance_type) ? 'text-orange-400' : 'text-gn';

  const handleGo = () => {
    setScanPopup(null);
    setView('customer', c);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] bg-bg/70 backdrop-blur-lg flex items-center justify-center animate-[popIn_0.25s_ease]"
      onClick={() => setScanPopup(null)}
    >
      <div
        className="bg-bg-3 border border-amber/15 rounded-[20px] p-8 max-w-[400px] w-[90%] shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_60px_rgba(245,166,35,0.08)] animate-[popScale_0.3s_ease] relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setScanPopup(null)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 text-muted text-lg flex items-center justify-center hover:bg-rd/10 hover:text-rd"
        >
          ✕
        </button>

        {/* Animated ring */}
        <div className="w-20 h-20 rounded-full border-[3px] border-gn flex items-center justify-center mx-auto mb-4 animate-[ring_1.5s_ease_infinite] text-4xl">
          📱
        </div>

        <div className="text-center mb-1.5">
          <span className="text-[11px] text-muted tracking-[2px] uppercase font-bold">QR Escaneado</span>
        </div>

        <div className="text-center mb-4">
          <Avatar name={c.name} photoUrl={c.photo_url} large />
        </div>

        <div className="text-center mb-1.5 text-xl font-extrabold text-amber tracking-wider">{c.name}</div>
        <div className="text-center text-[11px] text-muted mb-3">{c.email}</div>

        <div className="text-center mb-5">
          <div className={`text-[40px] font-black tracking-wider ${balColor}`}>
            {formatBalance(c.balance, c.balance_type)}
          </div>
          <StatusBadge customer={c} />
        </div>

        <button onClick={handleGo} className="btn-primary w-full py-4 text-sm">
          Abrir Perfil →
        </button>
      </div>
    </div>
  );
}
