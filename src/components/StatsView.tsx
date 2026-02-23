'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { formatMoney } from '@/lib/utils';
import { DollarSign, ShoppingBag, Receipt, TrendingUp, Trophy, Crown, Clock, CreditCard, Users, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import type { Transaction } from '@/lib/types';

interface Props { onLoadTransactions: () => Promise<Transaction[]>; }

const GOLD = '#D49B28';
const GREEN = '#10B981';
const RED = '#EF4444';
const BLUE = '#3B82F6';
const PURPLE = '#8B5CF6';
const CYAN = '#06B6D4';
const PIE_COLORS = [GOLD, GREEN, BLUE, PURPLE, CYAN, RED, '#F59E0B', '#EC4899'];

export default function StatsView({ onLoadTransactions }: Props) {
  const { customers } = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d' | '365d'>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    onLoadTransactions().then(d => { setTransactions(d); setLoading(false); });
  }, []);

  const cutoff = period === 'today' 
    ? new Date(new Date().setHours(0, 0, 0, 0)) 
    : new Date(Date.now() - (period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365) * 86400000);
  const days = period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const filtered = useMemo(() => transactions.filter(t => new Date(t.created_at) >= cutoff), [transactions, period]);

  // ─── KPIs ───
  const recharges = filtered.filter(t => t.type === 'recharge');
  const consumes = filtered.filter(t => t.type === 'consume');
  const totalRecharge = recharges.reduce((s, t) => s + t.amount, 0);
  const totalConsume = consumes.reduce((s, t) => s + t.amount, 0);
  const avgTicket = consumes.length > 0 ? totalConsume / consumes.length : 0;
  const netFlow = totalRecharge - totalConsume;

  // ─── Daily chart data ───
  const dailyData = useMemo(() => {
    const map: Record<string, { date: string; recargas: number; consumos: number; neto: number }> = {};
    const fmt = (d: string) => {
      const dt = new Date(d);
      return `${dt.getDate()}/${dt.getMonth() + 1}`;
    };
    filtered.forEach(t => {
      const key = new Date(t.created_at).toISOString().split('T')[0];
      if (!map[key]) map[key] = { date: fmt(key), recargas: 0, consumos: 0, neto: 0 };
      if (t.type === 'recharge') map[key].recargas += t.amount;
      else map[key].consumos += t.amount;
      map[key].neto = map[key].recargas - map[key].consumos;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // ─── Hourly distribution ───
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hora: `${i}h`, consumos: 0, recargas: 0 }));
    filtered.forEach(t => {
      const h = new Date(t.created_at).getHours();
      if (t.type === 'consume') hours[h].consumos++;
      else hours[h].recargas++;
    });
    return hours.filter(h => h.consumos > 0 || h.recargas > 0);
  }, [filtered]);

  // ─── Payment methods ───
  const paymentData = useMemo(() => {
    const map: Record<string, number> = {};
    recharges.forEach(t => {
      const method = t.bank || 'Sin especificar';
      map[method] = (map[method] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // ─── Top customers ───
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    consumes.forEach(t => {
      if (!map[t.customer_id]) map[t.customer_id] = { name: t.customer_name || '—', total: 0, count: 0 };
      map[t.customer_id].total += t.amount;
      map[t.customer_id].count++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filtered]);

  const maxTopAmount = topCustomers.length > 0 ? topCustomers[0].total : 1;

  // ─── Top products ───
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    consumes.forEach(t => {
      if (t.items && Array.isArray(t.items) && t.items.length > 0) {
        t.items.forEach((item: any) => {
          const key = item.product_id || item.name;
          if (!map[key]) map[key] = { name: item.name, qty: 0, revenue: 0 };
          map[key].qty += item.qty || 1;
          map[key].revenue += item.subtotal || item.price || 0;
        });
      }
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [filtered]);

  const maxProductQty = topProducts.length > 0 ? topProducts[0].qty : 1;

  // ─── Cumulative trend ───
  const cumulativeData = useMemo(() => {
    let cumRecharge = 0, cumConsume = 0;
    const sorted = [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const map: Record<string, { date: string; recargas: number; consumos: number }> = {};
    sorted.forEach(t => {
      const key = new Date(t.created_at).toISOString().split('T')[0];
      if (t.type === 'recharge') cumRecharge += t.amount;
      else cumConsume += t.amount;
      map[key] = {
        date: `${new Date(key).getDate()}/${new Date(key).getMonth() + 1}`,
        recargas: Math.round(cumRecharge * 100) / 100,
        consumos: Math.round(cumConsume * 100) / 100,
      };
    });
    return Object.values(map);
  }, [filtered]);

  const tooltipStyle = {
    contentStyle: { background: '#101828', border: '1px solid rgba(200,155,40,0.15)', borderRadius: 12, fontSize: 11 },
    labelStyle: { color: '#94A3B8' },
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-6 h-6 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      {/* Period selector */}
      <div className="flex gap-1 mb-5">
        {(['today', '7d', '30d', '90d', '365d'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`nav-btn ${period === p ? 'active' : ''}`}>
            {p === '365d' ? '1 Año' : p === '90d' ? '3 Meses' : p === '30d' ? '30 Días' : p === '7d' ? '7 Días' : 'Hoy'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <KPI icon={<ArrowUpRight size={16} />} bg="rgba(16,185,129,0.06)" color={GREEN} value={formatMoney(totalRecharge)} label="Recargas" sub={`${recharges.length} ops`} />
        <KPI icon={<ArrowDownRight size={16} />} bg="rgba(239,68,68,0.06)" color={RED} value={formatMoney(totalConsume)} label="Consumos" sub={`${consumes.length} ops`} />
        <KPI icon={<Receipt size={16} />} bg="rgba(59,130,246,0.06)" color={BLUE} value={String(filtered.length)} label="Transacciones" sub={`${(filtered.length / Math.max(days, 1)).toFixed(1)}/día`} />
        <KPI icon={<TrendingUp size={16} />} bg="rgba(200,155,40,0.06)" color={GOLD} value={formatMoney(avgTicket)} label="Ticket Promedio" />
        <KPI icon={<DollarSign size={16} />} bg={netFlow >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'} color={netFlow >= 0 ? GREEN : RED} value={formatMoney(Math.abs(netFlow))} label="Flujo Neto" sub={netFlow >= 0 ? 'Positivo' : 'Negativo'} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Daily Bar Chart */}
        <div className="card">
          <ChartHeader icon={<ShoppingBag size={14} />} title="Recargas vs Consumos" subtitle="Por día" />
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, '']} />
                <Bar dataKey="recargas" name="Recargas" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="consumos" name="Consumos" fill={RED} radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Cumulative Area Chart */}
        <div className="card">
          <ChartHeader icon={<TrendingUp size={14} />} title="Tendencia Acumulada" subtitle="Recargas vs Consumos" />
          {cumulativeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={RED} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, '']} />
                <Area type="monotone" dataKey="recargas" name="Recargas" stroke={GREEN} fill="url(#gGreen)" strokeWidth={2} />
                <Area type="monotone" dataKey="consumos" name="Consumos" stroke={RED} fill="url(#gRed)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Hourly Distribution */}
        <div className="card">
          <ChartHeader icon={<Clock size={14} />} title="Horas Pico" subtitle="Actividad por hora" />
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="hora" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="consumos" name="Consumos" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="recargas" name="Recargas" fill={BLUE} radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Payment Methods Pie */}
        <div className="card">
          <ChartHeader icon={<CreditCard size={14} />} title="Métodos de Pago" subtitle="Distribución de recargas" />
          {paymentData.length > 0 ? (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {paymentData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] text-slate-400 flex-1 truncate">{p.name}</span>
                    <span className="text-[10px] text-white/80 font-semibold tabular-nums">${p.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyChart />}
        </div>

        {/* Top Customers */}
        <div className="card">
          <ChartHeader icon={<Trophy size={14} />} title="Top Clientes" subtitle="Por consumo" />
          {topCustomers.length > 0 ? (
            <div className="space-y-2.5 mt-2">
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold flex-shrink-0
                    ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-black' :
                      i === 1 ? 'bg-slate-400/15 text-slate-300' :
                      i === 2 ? 'bg-amber-700/15 text-amber-600' :
                      'bg-white/[0.03] text-slate-500'}`}>
                    {i === 0 ? <Crown size={11} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-semibold text-white/85 truncate">{c.name}</span>
                      <span className="text-[11px] font-bold text-amber tabular-nums ml-2">{formatMoney(c.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(c.total / maxTopAmount) * 100}%`, background: i === 0 ? GOLD : i === 1 ? '#94A3B8' : BLUE }} />
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{c.count} consumos · ${(c.total / c.count).toFixed(2)} promedio</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Charts Row 3 — Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Top Products Bar Chart */}
        <div className="card">
          <ChartHeader icon={<Package size={14} />} title="Top Productos" subtitle="Más vendidos por cantidad" />
          {topProducts.length > 0 ? (
            <div className="space-y-2 mt-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold flex-shrink-0
                    ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-black' :
                      i === 1 ? 'bg-slate-400/15 text-slate-300' :
                      i === 2 ? 'bg-amber-700/15 text-amber-600' :
                      'bg-white/[0.03] text-slate-500'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-semibold text-white/85 truncate">{p.name}</span>
                      <span className="text-[11px] font-bold text-amber tabular-nums ml-2">{p.qty} uds</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(p.qty / maxProductQty) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{formatMoney(p.revenue)} en ventas · ${(p.revenue / p.qty).toFixed(2)} c/u</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyChart />}
        </div>

        {/* Products Pie Chart by Revenue */}
        <div className="card">
          <ChartHeader icon={<ShoppingBag size={14} />} title="Ventas por Producto" subtitle="Distribución de ingresos" />
          {topProducts.length > 0 ? (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={topProducts.map(p => ({ name: p.name, value: p.revenue }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {topProducts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] text-slate-400 flex-1 truncate">{p.name}</span>
                    <span className="text-[10px] text-white/80 font-semibold tabular-nums">${p.revenue.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Summary footer */}
      <div className="card flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="icon-box" style={{ background: 'rgba(200,155,40,0.06)' }}><Users size={14} className="text-amber" /></div>
          <div>
            <div className="text-xs font-bold text-white/80">{customers.length} clientes activos</div>
            <div className="text-[10px] text-slate-500">Balance total: {formatMoney(customers.reduce((s, c) => c.balance_type === 'money' ? s + c.balance : s, 0))}</div>
          </div>
        </div>
        <div className="text-[10px] text-slate-600">
          Período: {days} días · Última actualización: {new Date().toLocaleDateString('es-VE')}
        </div>
      </div>
    </div>
  );
}

function KPI({ icon, bg, color, value, label, sub }: { icon: React.ReactNode; bg: string; color: string; value: string; label: string; sub?: string }) {
  return (
    <div className="card py-4 px-5">
      <div className="flex items-center gap-3">
        <div className="icon-box" style={{ background: bg }}><span style={{ color }}>{icon}</span></div>
        <div>
          <div className="text-[17px] font-extrabold tabular-nums text-white">{value}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-[1px] font-semibold">{label}</div>
          {sub && <div className="text-[9px] text-slate-600">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function ChartHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="icon-box w-8 h-8 rounded-lg" style={{ background: 'rgba(200,155,40,0.06)' }}>
        <span className="text-amber">{icon}</span>
      </div>
      <div>
        <div className="text-xs font-bold text-white/85">{title}</div>
        <div className="text-[10px] text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return <div className="text-center text-slate-600 py-10 text-xs">Sin datos para este período</div>;
}
