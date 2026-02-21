'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { formatMoney, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase-browser';
import type { Transaction } from '@/lib/types';

interface Props {
  onLoadTransactions: () => Promise<Transaction[]>;
}

export default function TransactionsView({ onLoadTransactions }: Props) {
  const { search, setSearch, setView, customers } = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Date range for export
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => {
    setLoading(true);
    onLoadTransactions().then(data => {
      setTransactions(data);
      setLoading(false);
    });
  }, []);

  const filtered = transactions.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (t.customer_name || '').toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q);
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/export?from=${dateFrom}&to=${dateTo}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) { setExporting(false); return; }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SaldoBirras_Movimientos_${dateFrom}_${dateTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
    setExporting(false);
  };

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
          <h3 className="text-[13px] font-extrabold tracking-[2.5px] uppercase text-amber">
            Todos los Movimientos
          </h3>
          <input
            type="search"
            className="input max-w-[260px]"
            placeholder="Buscar por cliente o nota..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Export bar */}
        <div className="flex items-end gap-2.5 flex-wrap mb-5 p-4 rounded-xl bg-amber/[0.02] border border-amber/[0.06]">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button onClick={handleExport} disabled={exporting} className="btn-green text-[10px] px-4 py-3 disabled:opacity-50">
            {exporting ? '⏳ Exportando...' : '📥 Descargar Excel'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-muted py-8">
            <div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto mb-3" />
            Cargando...
          </div>
        ) : !filtered.length ? (
          <div className="text-center text-muted py-8">Sin movimientos registrados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2.5 text-dim font-bold text-[9px] uppercase tracking-[1.5px] border-b border-amber/[0.06]">Fecha</th>
                  <th className="text-left px-3 py-2.5 text-dim font-bold text-[9px] uppercase tracking-[1.5px] border-b border-amber/[0.06]">Cliente</th>
                  <th className="text-left px-3 py-2.5 text-dim font-bold text-[9px] uppercase tracking-[1.5px] border-b border-amber/[0.06]">Tipo</th>
                  <th className="text-left px-3 py-2.5 text-dim font-bold text-[9px] uppercase tracking-[1.5px] border-b border-amber/[0.06]">Monto</th>
                  <th className="text-left px-3 py-2.5 text-dim font-bold text-[9px] uppercase tracking-[1.5px] border-b border-amber/[0.06]">Método</th>
                  <th className="text-left px-3 py-2.5 text-dim font-bold text-[9px] uppercase tracking-[1.5px] border-b border-amber/[0.06]">Referencia</th>
                  <th className="text-left px-3 py-2.5 text-dim font-bold text-[9px] uppercase tracking-[1.5px] border-b border-amber/[0.06]">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr
                    key={t.id}
                    className="cursor-pointer hover:bg-amber/[0.02]"
                    onClick={() => {
                      const c = customers.find(c => c.id === t.customer_id);
                      if (c) setView('customer', c);
                    }}
                  >
                    <td className="px-3 py-2.5 text-muted whitespace-nowrap border-b border-amber/[0.03]">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold border-b border-amber/[0.03]">
                      {t.customer_name || '—'}
                    </td>
                    <td className="px-3 py-2.5 border-b border-amber/[0.03]">
                      <span className={`badge ${t.type === 'recharge' ? 'badge-green' : 'badge-red'}`}>
                        {t.type === 'recharge' ? '↑ Recarga' : '↓ Consumo'}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 font-bold text-[15px] border-b border-amber/[0.03] ${t.type === 'recharge' ? 'text-gn' : 'text-rd'}`}>
                      {t.type === 'recharge' ? '+' : '-'}{formatMoney(t.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-muted border-b border-amber/[0.03]">{t.bank || '—'}</td>
                    <td className="px-3 py-2.5 text-muted border-b border-amber/[0.03]">{t.reference || '—'}</td>
                    <td className="px-3 py-2.5 text-muted border-b border-amber/[0.03]">{t.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-amber/[0.12] to-transparent my-5" />
        <div className="flex justify-between text-dim text-[11px]">
          <span>Total: {filtered.length} movimientos</span>
          <span>
            Recargas: {filtered.filter(t => t.type === 'recharge').length} |
            Consumos: {filtered.filter(t => t.type === 'consume').length}
          </span>
        </div>
      </div>
    </div>
  );
}
