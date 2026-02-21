'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { formatMoney } from '@/lib/utils';
import { DollarSign, ShoppingBag, Receipt, TrendingUp, Trophy, Crown } from 'lucide-react';
import type { Transaction } from '@/lib/types';

interface Props { onLoadTransactions: () => Promise<Transaction[]>; }

export default function StatsView({ onLoadTransactions }: Props) {
  const { customers } = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'|'365d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(true); onLoadTransactions().then(d => { setTransactions(d); setLoading(false); }); }, []);

  const days = period==='7d'?7:period==='30d'?30:period==='90d'?90:365;
  const cutoff = new Date(Date.now()-days*86400000);
  const filtered = transactions.filter(t => new Date(t.created_at)>=cutoff);
  const totalRecharge = filtered.filter(t=>t.type==='recharge').reduce((s,t)=>s+t.amount,0);
  const totalConsume = filtered.filter(t=>t.type==='consume').reduce((s,t)=>s+t.amount,0);
  const consumeCount = filtered.filter(t=>t.type==='consume').length;
  const avgTicket = consumeCount>0 ? totalConsume/consumeCount : 0;

  const topCustomers: Record<string,{name:string;total:number;count:number}> = {};
  filtered.filter(t=>t.type==='consume').forEach(t => {
    if(!topCustomers[t.customer_id]) topCustomers[t.customer_id]={name:t.customer_name||'—',total:0,count:0};
    topCustomers[t.customer_id].total+=t.amount; topCustomers[t.customer_id].count++;
  });
  const top5 = Object.values(topCustomers).sort((a,b)=>b.total-a.total).slice(0,5);

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="flex gap-1 mb-5">
        {(['7d','30d','90d','365d'] as const).map(p => (
          <button key={p} onClick={()=>setPeriod(p)} className={`nav-btn ${period===p?'active':''}`}>
            {p==='365d'?'1 Año':p==='90d'?'3 Meses':p==='30d'?'30 Días':'7 Días'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard icon={<DollarSign size={16}/>} bg="rgba(16,185,129,0.06)" color="#10B981" value={formatMoney(totalRecharge)} label="Recargas" />
            <StatCard icon={<ShoppingBag size={16}/>} bg="rgba(239,68,68,0.06)" color="#EF4444" value={formatMoney(totalConsume)} label="Consumos" />
            <StatCard icon={<Receipt size={16}/>} bg="rgba(59,130,246,0.06)" color="#3B82F6" value={filtered.length} label="Transacciones" />
            <StatCard icon={<TrendingUp size={16}/>} bg="rgba(245,166,35,0.06)" color="#F5A623" value={formatMoney(avgTicket)} label="Ticket Promedio" />
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="icon-box" style={{background:'rgba(245,166,35,0.08)'}}><Trophy size={16} className="text-amber"/></div>
              <h3 className="text-sm font-bold text-white/90">Top Clientes</h3>
            </div>
            {!top5.length ? (
              <div className="text-center text-slate-600 py-6 text-xs">Sin datos para este período</div>
            ) : (
              <div className="space-y-1">
                {top5.map((t,i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold flex-shrink-0
                        ${i===0?'bg-gradient-to-br from-yellow-400 to-orange-400 text-black':
                          i===1?'bg-slate-400/20 text-slate-300':
                          i===2?'bg-amber-700/20 text-amber-600':
                          'bg-white/[0.03] text-slate-500'}`}>
                        {i===0 ? <Crown size={13}/> : i+1}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white/85">{t.name}</div>
                        <div className="text-[10px] text-slate-500">{t.count} consumos</div>
                      </div>
                    </div>
                    <div className="font-bold text-amber tabular-nums">{formatMoney(t.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, bg, color, value, label }: { icon:React.ReactNode; bg:string; color:string; value:any; label:string }) {
  return (
    <div className="card flex items-center gap-3 py-5">
      <div className="icon-box" style={{background:bg}}><span style={{color}}>{icon}</span></div>
      <div>
        <div className="text-lg font-extrabold tabular-nums text-white">{value}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-[1px] font-semibold">{label}</div>
      </div>
    </div>
  );
}
