'use client';

import { useStore } from '@/lib/store';
import { LayoutDashboard, UserPlus, ArrowLeftRight, BarChart3, Settings, RefreshCw, ScanLine, Users, Smartphone, Monitor } from 'lucide-react';

interface HeaderProps { onRefresh: () => void; }

export default function Header({ onRefresh }: HeaderProps) {
  const { view, setView, synced } = useStore();
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 py-5 mb-4">
      <div className="flex items-center gap-3.5">
        <img src="/logo.png" alt="BirraSport" className="w-[72px] h-[72px] object-contain drop-shadow-[0_4px_24px_rgba(245,166,35,0.2)]" />
        <div>
          <div className="text-[24px] font-extrabold tracking-[2px] uppercase bg-gradient-to-r from-amber to-amber-light bg-clip-text text-transparent leading-none">
            SaldoBirras
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${synced ? 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]' : 'bg-red-400'}`} />
            <span className="text-[10px] tracking-[2px] uppercase text-slate-500 font-medium">
              {synced ? 'Sincronizado' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wider uppercase" style={{background:'rgba(245,166,35,0.04)', color: isMobile ? '#10B981' : '#F5A623'}}>
          {isMobile ? <Smartphone size={12}/> : <Monitor size={12}/>}
          {isMobile ? 'Móvil' : 'Panel'}
        </div>

        <nav className="flex gap-0.5">
          {isMobile ? (
            <>
              <NavBtn icon={<ScanLine size={14}/>} active={view==='scan'} onClick={()=>setView('scan')}>Escanear</NavBtn>
              <NavBtn icon={<Users size={14}/>} active={view==='dashboard'} onClick={()=>setView('dashboard')}>Clientes</NavBtn>
              <NavBtn icon={<UserPlus size={14}/>} active={view==='register'} onClick={()=>setView('register')}>Nuevo</NavBtn>
            </>
          ) : (
            <>
              <NavBtn icon={<LayoutDashboard size={14}/>} active={view==='dashboard'} onClick={()=>setView('dashboard')}>Panel</NavBtn>
              <NavBtn icon={<UserPlus size={14}/>} active={view==='register'} onClick={()=>setView('register')}>Registrar</NavBtn>
              <NavBtn icon={<ArrowLeftRight size={14}/>} active={view==='transactions'} onClick={()=>setView('transactions')}>Movimientos</NavBtn>
              <NavBtn icon={<BarChart3 size={14}/>} active={view==='stats'} onClick={()=>setView('stats')}>Informes</NavBtn>
              <NavBtn icon={<RefreshCw size={14}/>} active={false} onClick={onRefresh}></NavBtn>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}

function NavBtn({ icon, active, onClick, children }: { icon: React.ReactNode; active: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`nav-btn ${active ? 'active' : ''}`}>
      {icon}{children}
    </button>
  );
}
