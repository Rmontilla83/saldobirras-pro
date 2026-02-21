'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { formatMoney } from '@/lib/utils';
import type { Transaction } from '@/lib/types';

interface Props {
  onLoadTransactions: () => Promise<Transaction[]>;
}

export default function StatsView({ onLoadTransactions }: Props) {
  const { customers } = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '365d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    onLoadTransactions().then(data => { setTransactions(data); setLoading(false); });
  }, []);

  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const cutoff = new Date(Date.now() - days * 86400000);
  const filtered = transactions.filter(t => new Date(t.created_at) >= cutoff);

  const totalRecharge = filtered.filter(t => t.type === 'recharge').reduce((s, t) => s + t.amount, 0);
  const totalConsume = filtered.filter(t => t.type === 'consume').reduce((s, t) => s + t.amount, 0);
  const consumeCount = filtered.filter(t => t.type === 'consume').length;
  const avgTicket = consumeCount > 0 ? totalConsume / consumeCount : 0;

  // Top customers by consumption
  const topCustomers: Record<string, { name: string; total: number; count: number }> = {};
  filtered.filter(t => t.type === 'consume').forEach(t => {
    if (!topCustomers[t.customer_id]) topCustomers[t.customer_id] = { name: t.customer_name || '—', total: 0, count: 0 };
    topCustomers[t.customer_id].total += t.amount;
    topCustomers[t.customer_id].count++;
  });
  const top5 = Object.values(topCustomers).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      {/* Period selector */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {(['7d', '30d', '90d', '365d'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`nav-btn ${period === p ? 'active' : ''}`}>
            {p === '365d' ? '1 Año' : p === '90d' ? '3 Meses' : p === '30d' ? '30 Días' : '7 Días'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted py-12">
          <div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto mb-3" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { icon: '💰', value: formatMoney(totalRecharge), label: 'Recargas' },
              { icon: '🍺', value: formatMoney(totalConsume), label: 'Consumos' },
              { icon: '🧾', value: filtered.length, label: 'Transacciones' },
              { icon: '📊', value: formatMoney(avgTicket), label: 'Ticket Promedio' },
            ].map((s, i) => (
              <div key={i} className="card text-center py-5">
                <div className="text-[28px] mb-1.5">{s.icon}</div>
                <div className="text-[28px] font-black tracking-wider text-amber">{s.value}</div>
                <div className="text-[9px] text-dim mt-1.5 uppercase tracking-[2px] font-bold">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top customers */}
          <div className="card">
            <h3 className="text-[13px] font-extrabold tracking-[2.5px] uppercase text-amber mb-4">🏆 Top Clientes</h3>
            {!top5.length ? (
              <div className="text-center text-dim py-5">Sin datos</div>
            ) : (
              top5.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-amber/[0.03]">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold flex-shrink-0
                      ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-bg' :
                        i === 1 ? 'bg-gray-400 text-bg' :
                        i === 2 ? 'bg-amber-700 text-white' :
                        'bg-amber/[0.06] text-muted'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-[11px] text-dim">{t.count} consumos</div>
                    </div>
                  </div>
                  <div className="font-bold text-amber text-base">{formatMoney(t.total)}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
