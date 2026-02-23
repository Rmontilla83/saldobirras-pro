'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { formatMoney, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase-browser';
import { ArrowLeftRight, Search, Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import type { Transaction } from '@/lib/types';

interface Props { onLoadTransactions: () => Promise<Transaction[]>; }

export default function TransactionsView({ onLoadTransactions }: Props) {
  const { search, setSearch, setView, customers } = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => { setLoading(true); onLoadTransactions().then(d => { setTransactions(d); setLoading(false); }); }, []);

  const filtered = transactions.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (t.customer_name||'').toLowerCase().includes(q) || (t.note||'').toLowerCase().includes(q);
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/export?from=${dateFrom}&to=${dateTo}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) { setExporting(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `SaldoBirras_${dateFrom}_${dateTo}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch(e) { console.error(e); }
    setExporting(false);
  };

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
          <div className="flex items-center gap-2">
            <div className="icon-box" style={{background:'rgba(245,166,35,0.08)'}}><ArrowLeftRight size={16} className="text-amber"/></div>
            <h3 className="text-sm font-bold text-white/90">Movimientos</h3>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input type="search" className="input pl-9 max-w-[220px] text-xs" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex items-end gap-2 flex-wrap mb-5 p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.03]">
          <div>
            <label className="label flex items-center gap-1"><Calendar size={10}/> Desde</label>
            <input type="date" className="input text-xs py-2" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label flex items-center gap-1"><Calendar size={10}/> Hasta</label>
            <input type="date" className="input text-xs py-2" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button onClick={handleExport} disabled={exporting} className="btn-green text-[10px] px-4 py-2.5 flex items-center gap-1.5 disabled:opacity-50">
            <Download size={13}/> {exporting ? 'Exportando...' : 'Excel'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-10"><div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto mb-3" /></div>
        ) : !filtered.length ? (
          <div className="text-center text-slate-600 py-10 text-sm">Sin movimientos registrados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Fecha','Cliente','Cajero','Tipo','Monto','Método','Ref','Detalle'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-slate-600 font-semibold text-[9px] uppercase tracking-[1px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-white/[0.015] cursor-pointer hover:bg-white/[0.01] transition-colors" onClick={() => { const cc = customers.find(c => c.id === t.customer_id); if(cc) setView('customer', cc); }}>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(t.created_at)}</td>
                    <td className="px-3 py-2.5 font-medium text-white/80">{t.customer_name||'—'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{t.cashier_name||'—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 ${t.type==='recharge' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type==='recharge' ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                        {t.type==='recharge' ? 'Recarga' : 'Consumo'}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 font-bold tabular-nums ${t.type==='recharge' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type==='recharge' ? '+' : '-'}{formatMoney(t.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{t.bank||'—'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{t.reference||'—'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{t.note||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent mt-5 mb-3" />
        <div className="flex justify-between text-slate-600 text-[11px]">
          <span>{filtered.length} movimientos</span>
          <span>Recargas: {filtered.filter(t=>t.type==='recharge').length} · Consumos: {filtered.filter(t=>t.type==='consume').length}</span>
        </div>
      </div>
    </div>
  );
}
