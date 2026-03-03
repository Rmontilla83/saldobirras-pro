'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

// ── Types ──────────────────────────────────────────────────────────
interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_photo: string | null;
  items: { name: string; qty: number; price: number; subtotal: number }[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  order_type: 'bar' | 'kitchen' | 'mixed' | null;
  zone_name: string | null;
  zone_color: string | null;
  note: string | null;
  created_at: string;
}

// ── Alarm sound (same as OrdersView) ──────────────────────────────
function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [0, 0.18, 0.36, 0.54, 0.72].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      osc.type = 'square';
      gain.gain.value = 1.0;
      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
    [1.0, 1.25, 1.5, 1.75].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = i % 2 === 0 ? 1000 : 700;
      osc.type = 'sawtooth';
      gain.gain.value = 0.9;
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
    const oscFinal = ctx.createOscillator();
    const gainFinal = ctx.createGain();
    oscFinal.connect(gainFinal);
    gainFinal.connect(ctx.destination);
    oscFinal.frequency.value = 880;
    oscFinal.type = 'square';
    gainFinal.gain.value = 1.0;
    oscFinal.start(now + 2.1);
    oscFinal.stop(now + 2.8);
  } catch {}
}

// ── Time helpers ──────────────────────────────────────────────────
function minutesSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
}

function timeSinceLabel(date: string) {
  const mins = minutesSince(date);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
}

function timeColor(date: string) {
  const mins = minutesSince(date);
  if (mins < 5) return 'text-white';
  if (mins <= 15) return 'text-yellow-400';
  return 'text-red-500';
}

function shortId(id: string) {
  return '#' + id.slice(-4).toUpperCase();
}

// ── Venezuela clock (UTC-4) ───────────────────────────────────────
function useVenezuelaClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString('es-VE', {
          timeZone: 'America/Caracas',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return time;
}

// ── Max visible items per card ────────────────────────────────────
const MAX_ITEMS = 6;

// ══════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════
type TypeFilter = 'all' | 'bar' | 'kitchen';

export default function ProduccionPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-[#080D19] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    }>
      <ProduccionContent />
    </Suspense>
  );
}

function ProduccionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const clock = useVenezuelaClock();

  const [authed, setAuthed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [pendingFlash, setPendingFlash] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const prevPendingIds = useRef<string[]>([]);
  const sessionRef = useRef<string | null>(null);

  // Read URL param ?tipo=cocina|barra on mount
  useEffect(() => {
    const tipo = searchParams.get('tipo');
    if (tipo === 'cocina') setTypeFilter('kitchen');
    else if (tipo === 'barra') setTypeFilter('bar');
  }, [searchParams]);

  // ── Auth check ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      sessionRef.current = session.access_token;
      setAuthed(true);
    })();
  }, []);

  // ── Polling ─────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!sessionRef.current) return;
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${sessionRef.current}` },
      });
      const json = await res.json();
      if (!json.success) return;

      const incoming: Order[] = json.data;
      setOrders(incoming);

      // Detect new pending orders (only for the filtered type)
      const filteredIncoming = typeFilter === 'all'
        ? incoming
        : incoming.filter(o => o.order_type === typeFilter || o.order_type === 'mixed');
      const pendingIds = filteredIncoming.filter(o => o.status === 'pending').map(o => o.id);
      const prev = prevPendingIds.current;
      const brandNew = pendingIds.filter(id => !prev.includes(id));

      if (brandNew.length > 0 && prev.length > 0) {
        if (audioUnlocked) playAlarmSound();
        setPendingFlash(true);
        setTimeout(() => setPendingFlash(false), 3000);
      }

      prevPendingIds.current = pendingIds;
    } catch {}
  }, [audioUnlocked, typeFilter]);

  useEffect(() => {
    if (!authed) return;
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [authed, load]);

  // Refresh session token periodically
  useEffect(() => {
    if (!authed) return;
    const iv = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) sessionRef.current = session.access_token;
    }, 60000);
    return () => clearInterval(iv);
  }, [authed]);

  // ── Derived data ────────────────────────────────────────────────
  const filtered = typeFilter === 'all'
    ? orders
    : orders.filter(o => o.order_type === typeFilter || o.order_type === 'mixed');
  const pending = filtered.filter(o => o.status === 'pending');
  const preparing = filtered.filter(o => o.status === 'preparing');
  const ready = filtered.filter(o => o.status === 'ready');

  // Sort each column: oldest first (longest wait on top)
  pending.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  preparing.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  ready.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // ── Audio unlock overlay ────────────────────────────────────────
  if (authed && !audioUnlocked) {
    return (
      <div
        onClick={() => setAudioUnlocked(true)}
        className="fixed inset-0 bg-[#080D19] flex flex-col items-center justify-center cursor-pointer select-none z-50"
      >
        <div className="text-8xl mb-8 animate-bounce">🔔</div>
        <div className="text-4xl font-black text-white mb-4">Toca para activar alertas</div>
        <div className="text-xl text-slate-400">
          El navegador requiere interacción para reproducir sonido
        </div>
        <div className="mt-12 px-8 py-4 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 text-lg font-bold animate-pulse">
          Toca en cualquier parte
        </div>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="fixed inset-0 bg-[#080D19] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden select-none">
      {/* ═══ BACKGROUND ═══ */}
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('/fondo.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#080D19]/[0.92] via-[#080D19]/80 to-[#080D19]/95" />
      </div>

      {/* ═══ HEADER ═══ */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-6 py-3 bg-[#0C1324]/80 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="BirraSport" className="w-12 h-12 object-contain" />
          <span className="text-2xl font-black text-white tracking-tight">PRODUCCIÓN</span>
          <span className="text-lg font-semibold text-amber-400 ml-1">BirraSport</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Type filter */}
          <div className="flex items-center gap-1">
            {([
              { key: 'all' as TypeFilter, label: 'TODOS', emoji: '' },
              { key: 'bar' as TypeFilter, label: 'BARRA', emoji: '🍺 ' },
              { key: 'kitchen' as TypeFilter, label: 'COCINA', emoji: '🍔 ' },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  typeFilter === f.key
                    ? f.key === 'bar'
                      ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                      : f.key === 'kitchen'
                      ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40'
                      : 'bg-white/10 text-white ring-1 ring-white/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {f.emoji}{f.label}
              </button>
            ))}
          </div>

          {/* Counters */}
          <div className="flex items-center gap-4 text-lg font-bold">
            <span className="text-yellow-400">{pending.length} pend</span>
            <span className="text-white/20">·</span>
            <span className="text-blue-400">{preparing.length} prep</span>
            <span className="text-white/20">·</span>
            <span className="text-emerald-400">{ready.length} listo{ready.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Clock */}
          <div className="text-xl font-mono text-white/60 tabular-nums min-w-[130px] text-right">
            {clock}
          </div>
        </div>
      </header>

      {/* ═══ KANBAN COLUMNS ═══ */}
      <div className="relative z-10 flex-1 grid grid-cols-3 gap-0 min-h-0">
        {/* ── PENDIENTE ── */}
        <KanbanColumn
          title="PENDIENTE"
          emoji="⏳"
          count={pending.length}
          orders={pending}
          headerBg="bg-yellow-400/8"
          headerText="text-yellow-400"
          borderColor="border-yellow-400/20"
          cardBorder="border-l-yellow-500"
          flash={pendingFlash}
          emptyIcon="☕"
          emptyText="Sin pedidos pendientes"
          typeFilter={typeFilter !== 'all' ? typeFilter : undefined}
        />

        {/* ── PREPARANDO ── */}
        <KanbanColumn
          title="PREPARANDO"
          emoji="👨‍🍳"
          count={preparing.length}
          orders={preparing}
          headerBg="bg-blue-400/8"
          headerText="text-blue-400"
          borderColor="border-blue-400/20"
          cardBorder="border-l-blue-500"
          flash={false}
          emptyIcon="🍳"
          emptyText="Nada en preparación"
          typeFilter={typeFilter !== 'all' ? typeFilter : undefined}
        />

        {/* ── LISTO ── */}
        <KanbanColumn
          title="LISTO"
          emoji="✅"
          count={ready.length}
          orders={ready}
          headerBg="bg-emerald-400/8"
          headerText="text-emerald-400"
          borderColor="border-emerald-400/20"
          cardBorder="border-l-emerald-500"
          flash={false}
          glow
          emptyIcon="🎉"
          emptyText="Todo entregado"
          typeFilter={typeFilter !== 'all' ? typeFilter : undefined}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Kanban Column
// ══════════════════════════════════════════════════════════════════
function KanbanColumn({
  title, emoji, count, orders, headerBg, headerText, borderColor,
  cardBorder, flash, glow, emptyIcon, emptyText, typeFilter,
}: {
  title: string;
  emoji: string;
  count: number;
  orders: Order[];
  headerBg: string;
  headerText: string;
  borderColor: string;
  cardBorder: string;
  flash: boolean;
  glow?: boolean;
  emptyIcon: string;
  emptyText: string;
  typeFilter?: TypeFilter;
}) {
  const columnBorderColor = typeFilter === 'bar'
    ? 'border-blue-400/20'
    : typeFilter === 'kitchen'
    ? 'border-orange-400/20'
    : borderColor;

  return (
    <div className={`flex flex-col border-r border-white/[0.04] last:border-r-0 min-h-0 ${glow ? 'glow-column' : ''}`}>
      {/* Column Header */}
      <div
        className={`flex-shrink-0 flex items-center justify-center gap-3 py-3 ${headerBg} border-b ${columnBorderColor} transition-all
          ${flash ? 'animate-header-flash' : ''}`}
      >
        <span className="text-2xl">{emoji}</span>
        <span className={`text-xl font-black ${headerText} tracking-wide`}>{title}</span>
        <span className={`text-2xl font-black ${headerText}`}>({count})</span>
      </div>

      {/* Cards area */}
      <div className="flex-1 overflow-y-auto p-3 gap-3 flex flex-col scrollbar-none">
        {orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30">
            <span className="text-6xl mb-4">{emptyIcon}</span>
            <span className="text-lg text-slate-500 font-semibold">{emptyText}</span>
          </div>
        ) : (
          orders.map((order, idx) => (
            <OrderCard
              key={order.id}
              order={order}
              borderClass={cardBorder}
              glow={glow}
              animDelay={idx * 60}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Order Card
// ══════════════════════════════════════════════════════════════════
function OrderCard({
  order, borderClass, glow, animDelay,
}: {
  order: Order;
  borderClass: string;
  glow?: boolean;
  animDelay: number;
}) {
  const visibleItems = order.items.slice(0, MAX_ITEMS);
  const extraCount = order.items.length - MAX_ITEMS;

  const typeBadge = order.order_type === 'bar'
    ? { label: '🍺 BARRA', bg: 'bg-blue-500/15', text: 'text-blue-400' }
    : order.order_type === 'kitchen'
    ? { label: '🍔 COCINA', bg: 'bg-orange-500/15', text: 'text-orange-400' }
    : null;

  // Type-based card styling
  const typeBg = order.order_type === 'bar'
    ? 'bg-[#0F1A35]/80 border-l-blue-400'
    : order.order_type === 'kitchen'
    ? 'bg-[#1A1710]/80 border-l-orange-400'
    : `bg-[#111A30]/80 ${borderClass}`;

  return (
    <div
      className={`rounded-2xl border-l-4 ${typeBg} p-4 flex-shrink-0
        animate-card-in ${glow ? 'ring-1 ring-emerald-400/30 shadow-[0_0_20px_rgba(0,214,143,0.15)]' : ''}
      `}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Top row: ID + time */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-mono font-bold text-white/50">{shortId(order.id)}</span>
        <span className={`text-lg font-bold tabular-nums ${timeColor(order.created_at)}`}>
          {timeSinceLabel(order.created_at)}
          {minutesSince(order.created_at) > 15 && ' 🔴'}
        </span>
      </div>

      {/* Customer name */}
      <div className="text-xl font-bold text-white truncate mb-2">{order.customer_name}</div>

      {/* Type badge */}
      {typeBadge && (
        <div className="mb-3">
          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${typeBadge.bg} ${typeBadge.text}`}>
            {typeBadge.label}
          </span>
        </div>
      )}

      {/* Items */}
      <div className="space-y-1 mb-2">
        {visibleItems.map((item, i) => (
          <div key={i} className="text-base text-slate-300 truncate">
            <span className="text-white/70 font-semibold">{item.qty}×</span> {item.name}
          </div>
        ))}
        {extraCount > 0 && (
          <div className="text-sm text-slate-500 font-semibold">+{extraCount} más</div>
        )}
      </div>

      {/* Note */}
      {order.note && (
        <div className="mt-2 px-3 py-2 rounded-xl bg-yellow-400/5 border border-yellow-400/10 text-sm text-yellow-300/90 italic truncate">
          &ldquo;{order.note}&rdquo;
        </div>
      )}
    </div>
  );
}
