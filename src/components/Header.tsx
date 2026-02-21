'use client';

import { useStore } from '@/lib/store';

interface HeaderProps {
  onRefresh: () => void;
}

export default function Header({ onRefresh }: HeaderProps) {
  const { view, setView, synced, user } = useStore();
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 py-4 mb-6">
      <div className="flex items-center gap-3.5">
        <img src="/logo.png" alt="BirraSport" className="w-[90px] h-[90px] object-contain drop-shadow-[0_4px_16px_rgba(245,166,35,0.25)]" />
        <div>
          <div className="text-[26px] font-black tracking-[3px] uppercase bg-gradient-to-br from-amber to-amber-light bg-clip-text text-transparent leading-none">
            SaldoBirras
          </div>
          <div className="text-[9px] tracking-[4px] uppercase text-dim font-semibold mt-0.5 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${synced ? 'bg-gn shadow-[0_0_8px_theme(colors.gn.DEFAULT)]' : 'bg-rd'}`} />
            {synced ? 'Sincronizado' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {isMobile ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold tracking-wider uppercase bg-amber/[0.06] text-amber">
            📱 Escáner
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold tracking-wider uppercase bg-gn/[0.06] text-gn">
            🖥️ Panel
          </span>
        )}

        <nav className="flex gap-0.5">
          {isMobile ? (
            <>
              <NavBtn active={view === 'scan'} onClick={() => setView('scan')}>📷 Escanear</NavBtn>
              <NavBtn active={view === 'dashboard'} onClick={() => setView('dashboard')}>Clientes</NavBtn>
              <NavBtn active={view === 'register'} onClick={() => setView('register')}>+ Nuevo</NavBtn>
            </>
          ) : (
            <>
              <NavBtn active={view === 'dashboard'} onClick={() => setView('dashboard')}>Panel</NavBtn>
              <NavBtn active={view === 'register'} onClick={() => setView('register')}>Registrar</NavBtn>
              <NavBtn active={view === 'transactions'} onClick={() => setView('transactions')}>Movimientos</NavBtn>
              <NavBtn active={view === 'stats'} onClick={() => setView('stats')}>Informes</NavBtn>
              <NavBtn active={view === 'settings' as any} onClick={() => {}}>⚙</NavBtn>
              <NavBtn active={false} onClick={onRefresh}>🔄</NavBtn>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`nav-btn ${active ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}
