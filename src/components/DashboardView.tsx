'use client';

import { useStore } from '@/lib/store';
import { formatBalance, isLowBalance } from '@/lib/utils';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import type { Transaction } from '@/lib/types';

interface Props {
  onLoadTransactions: (customerId?: string) => Promise<Transaction[]>;
}

export default function DashboardView({ onLoadTransactions }: Props) {
  const { customers, setView, search, setSearch } = useStore();
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  const alerts = customers.filter(c => isLowBalance(c.balance, c.balance_type) || c.balance <= 0);
  const totalBalance = customers.reduce((s, c) => c.balance_type === 'money' ? s + c.balance : s, 0);
  const totalTx = customers.reduce((s, c) => s, 0); // Will count from transactions

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      {/* Stats */}
      {!isMobile && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: '👥', value: customers.length, label: 'Clientes' },
            { icon: '💵', value: `$${totalBalance.toFixed(2)}`, label: 'Saldo Total' },
            { icon: '🔔', value: alerts.length, label: 'Alertas', warn: alerts.length > 0 },
            { icon: '🧾', value: '—', label: 'Movimientos' },
          ].map((s, i) => (
            <div key={i} className="card text-center py-5">
              <div className="text-[28px] mb-1.5">{s.icon}</div>
              <div className={`text-[28px] font-black tracking-wider ${s.warn ? 'text-orange-400' : 'text-amber'}`}>
                {s.value}
              </div>
              <div className="text-[9px] text-dim mt-1.5 uppercase tracking-[2px] font-bold">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-xs font-bold tracking-[2px] uppercase text-orange-400 mb-4">🔔 Alertas de Saldo</h3>
          {alerts.map(c => (
            <CustomerRow key={c.id} customer={c} onClick={() => setView('customer', c)} />
          ))}
        </div>
      )}

      {/* Customer list */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
          <h3 className="text-[13px] font-extrabold tracking-[2.5px] uppercase text-amber">Clientes</h3>
          <input
            type="search"
            className="input max-w-[240px]"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {!filtered.length ? (
          <div className="text-center text-muted py-8">
            {customers.length ? 'Sin resultados para tu búsqueda' : 'Aún no hay clientes registrados'}
          </div>
        ) : (
          filtered.map(c => (
            <CustomerRow key={c.id} customer={c} onClick={() => setView('customer', c)} />
          ))
        )}
      </div>
    </div>
  );
}

function CustomerRow({ customer: c, onClick }: { customer: any; onClick: () => void }) {
  const balColor = c.balance <= 0 ? 'text-rd' : isLowBalance(c.balance, c.balance_type) ? 'text-orange-400' : 'text-amber';

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-amber/[0.02] cursor-pointer
        transition-all border border-transparent hover:bg-amber/[0.05] hover:border-amber/10 hover:translate-x-1 mb-1.5"
    >
      <Avatar name={c.name} photoUrl={c.photo_url} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{c.name}</div>
        <div className="text-[11px] text-muted truncate">
          {c.email}{c.phone ? ` · ${c.phone}` : ''}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`font-bold text-[18px] ${balColor}`}>{formatBalance(c.balance, c.balance_type)}</div>
        <StatusBadge customer={c} />
      </div>
    </div>
  );
}
