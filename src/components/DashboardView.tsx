'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatBalance, isLowBalance } from '@/lib/utils';
import { Users, DollarSign, Bell, ArrowLeftRight, AlertTriangle, Search, UserCheck, UserX } from 'lucide-react';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import type { Transaction } from '@/lib/types';

interface Props { onLoadTransactions: (customerId?: string) => Promise<Transaction[]>; }

type Filter = 'all' | 'active' | 'inactive';

export default function DashboardView({ onLoadTransactions }: Props) {
  const { customers, setView, search, setSearch } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  const activeCustomers = customers.filter(c => c.balance > 0);
  const inactiveCustomers = customers.filter(c => c.balance <= 0);
  const alerts = customers.filter(c => c.balance > 0 && isLowBalance(c.balance, c.balance_type));
  const totalBalance = customers.reduce((s, c) => c.balance_type === 'money' ? s + c.balance : s, 0);

  const filtered = customers.filter(c => {
    // Status filter
    if (filter === 'active' && c.balance <= 0) return false;
    if (filter === 'inactive' && c.balance > 0) return false;
    // Search filter
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      {!isMobile && (
        <div className="grid grid-cols-5 gap-3 mb-5">
          <StatCard icon={<Users size={18}/>} iconBg="rgba(59,130,246,0.08)" iconColor="#3B82F6" value={customers.length} label="Total Clientes" />
          <StatCard icon={<UserCheck size={18}/>} iconBg="rgba(16,185,129,0.08)" iconColor="#10B981" value={activeCustomers.length} label="Con Saldo" />
          <StatCard icon={<UserX size={18}/>} iconBg="rgba(239,68,68,0.08)" iconColor="#EF4444" value={inactiveCustomers.length} label="Sin Saldo" warn={inactiveCustomers.length > 0} />
          <StatCard icon={<DollarSign size={18}/>} iconBg="rgba(245,166,35,0.08)" iconColor="#F5A623" value={`$${totalBalance.toFixed(2)}`} label="Saldo Total" />
          <StatCard icon={<Bell size={18}/>} iconBg="rgba(245,158,11,0.08)" iconColor="#F59E0B" value={alerts.length} label="Saldo Bajo" warn={alerts.length > 0} />
        </div>
      )}

      {alerts.length > 0 && (
        <div className="card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-box" style={{background:'rgba(245,158,11,0.08)'}}><AlertTriangle size={16} className="text-yellow-500"/></div>
            <h3 className="text-xs font-bold tracking-[2px] uppercase text-yellow-500">Alertas de Saldo Bajo</h3>
            <span className="text-[10px] text-yellow-500/60 ml-1">({alerts.length})</span>
          </div>
          {alerts.map(c => <CustomerRow key={c.id} customer={c} onClick={() => setView('customer', c)} />)}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
          <div className="flex items-center gap-2">
            <div className="icon-box" style={{background:'rgba(245,166,35,0.08)'}}><Users size={16} className="text-amber"/></div>
            <h3 className="text-sm font-bold tracking-wide text-white/90">Clientes</h3>
            <span className="text-[11px] text-slate-500 font-medium">({filtered.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <div className="flex gap-0.5">
              <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>
                Todos ({customers.length})
              </FilterBtn>
              <FilterBtn active={filter === 'active'} onClick={() => setFilter('active')} color="emerald">
                Activos ({activeCustomers.length})
              </FilterBtn>
              <FilterBtn active={filter === 'inactive'} onClick={() => setFilter('inactive')} color="red">
                Inactivos ({inactiveCustomers.length})
              </FilterBtn>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input type="search" className="input pl-9 max-w-[200px] text-xs" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {!filtered.length ? (
          <div className="text-center text-slate-500 py-10 text-sm">
            {customers.length ? (filter !== 'all' ? `Sin clientes ${filter === 'active' ? 'activos' : 'inactivos'}` : 'Sin resultados') : 'Aún no hay clientes registrados'}
          </div>
        ) : (
          <div className="space-y-1">{filtered.map(c => <CustomerRow key={c.id} customer={c} onClick={() => setView('customer', c)} />)}</div>
        )}
      </div>
    </div>
  );
}

function FilterBtn({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  const activeClass = color === 'emerald' 
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
    : color === 'red' 
    ? 'bg-red-500/10 text-red-400 border-red-500/20'
    : 'bg-amber/10 text-amber border-amber/20';
  
  return (
    <button onClick={onClick} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all duration-150
      ${active ? activeClass : 'border-transparent text-slate-500 hover:text-slate-400 hover:bg-white/[0.02]'}`}>
      {children}
    </button>
  );
}

function StatCard({ icon, iconBg, iconColor, value, label, warn }: { icon: React.ReactNode; iconBg: string; iconColor: string; value: any; label: string; warn?: boolean }) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div className="icon-box" style={{ background: iconBg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div>
        <div className={`text-xl font-extrabold tracking-wide ${warn ? 'text-yellow-500' : 'text-white'}`}>{value}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-[1.5px] font-semibold mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function CustomerRow({ customer: c, onClick }: { customer: any; onClick: () => void }) {
  const inactive = c.balance <= 0;
  const balColor = inactive ? 'text-red-400' : isLowBalance(c.balance, c.balance_type) ? 'text-yellow-500' : 'text-amber';
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 hover:bg-white/[0.02] group ${inactive ? 'opacity-50' : ''}`}>
      <Avatar name={c.name} photoUrl={c.photo_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-white/90 group-hover:text-amber transition-colors">{c.name}</span>
          {inactive && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Inactivo</span>}
        </div>
        <div className="text-[11px] text-slate-500 truncate">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`font-bold text-base tabular-nums ${balColor}`}>{formatBalance(c.balance, c.balance_type)}</div>
        <StatusBadge customer={c} />
      </div>
    </div>
  );
}
