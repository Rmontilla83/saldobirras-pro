'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useStore } from '@/lib/store';
import { ClipboardList, Clock, ChefHat, CheckCircle, XCircle, RefreshCw, PackageCheck, BellRing } from 'lucide-react';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_photo: string | null;
  items: { name: string; qty: number; price: number; subtotal: number }[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  zone_name: string | null;
  zone_color: string | null;
  note: string | null;
  created_at: string;
}

interface Props { showToast: (msg: string, type: 'ok' | 'error' | 'warn') => void; }

const STATUS_CONFIG: Record<string, any> = {
  pending: { label: 'Pendiente', icon: <Clock size={12} />, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  preparing: { label: 'Preparando', icon: <ChefHat size={12} />, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  ready: { label: 'Listo', icon: <PackageCheck size={12} />, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  delivered: { label: 'Entregado', icon: <CheckCircle size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  cancelled: { label: 'Cancelado', icon: <XCircle size={12} />, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
};

// Generate notification beep sound
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Play 3 urgent beeps
    [0, 0.25, 0.5].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.value = 0.3;
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    });
    // Lower longer tone after beeps
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 660;
    osc2.type = 'square';
    gain2.gain.value = 0.25;
    osc2.start(ctx.currentTime + 0.85);
    osc2.stop(ctx.currentTime + 1.3);
  } catch (e) { /* Audio not supported */ }
}

export default function OrdersView({ showToast }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');
  const [flash, setFlash] = useState(false);
  const supabase = createClient();
  const { user, setPendingOrders, view } = useStore();
  const isOwner = user?.role === 'owner';
  const prevPendingRef = useRef<string[]>([]);
  const hasInteracted = useRef(false);

  // Track user interaction for audio policy
  useEffect(() => {
    const mark = () => { hasInteracted.current = true; };
    document.addEventListener('click', mark, { once: true });
    document.addEventListener('keydown', mark, { once: true });
    return () => { document.removeEventListener('click', mark); document.removeEventListener('keydown', mark); };
  }, []);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${session.access_token}` } });
    const json = await res.json();
    if (json.success) {
      const newOrders: Order[] = json.data;
      setOrders(newOrders);

      // Count pending orders and update store
      const pendingIds = newOrders.filter(o => o.status === 'pending').map(o => o.id);
      setPendingOrders(pendingIds.length);

      // Detect NEW pending orders (not seen before)
      const prevIds = prevPendingRef.current;
      const brandNew = pendingIds.filter(id => !prevIds.includes(id));
      
      if (brandNew.length > 0 && prevIds.length > 0) {
        // New order arrived! Alert!
        if (hasInteracted.current) {
          playNotificationSound();
        }
        setFlash(true);
        setTimeout(() => setFlash(false), 3000);
        
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification('🍺 Nuevo Pedido!', {
            body: `${brandNew.length} pedido(s) nuevo(s) en cola`,
            icon: '/icon-192.png',
            tag: 'new-order',
          });
        }
        
        // Change page title to flash
        const origTitle = document.title;
        let titleFlash = true;
        const titleInterval = setInterval(() => {
          document.title = titleFlash ? `🔴 (${pendingIds.length}) NUEVO PEDIDO!` : origTitle;
          titleFlash = !titleFlash;
        }, 800);
        setTimeout(() => { clearInterval(titleInterval); document.title = origTitle; }, 8000);
      }

      // Update title with pending count always
      if (pendingIds.length > 0) {
        document.title = `(${pendingIds.length}) Pedidos — SaldoBirras`;
      } else {
        document.title = 'SaldoBirras — BirraSport';
      }

      prevPendingRef.current = pendingIds;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/orders', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status }),
    });
    const json = await res.json();
    if (json.success) {
      showToast(status === 'delivered' ? '✓ Pedido entregado y cobrado' : `✓ Estado actualizado`, 'ok');
      load();
    } else {
      showToast(json.error || 'Error', 'error');
    }
  };

  const filtered = filter === 'active'
    ? orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
    : filter === 'all' ? orders
    : orders.filter(o => o.status === filter);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      {/* ═══ NEW ORDER FLASH ALERT ═══ */}
      {flash && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-yellow-400/20 border-2 border-yellow-400/50 flex items-center gap-3 animate-pulse">
          <BellRing size={24} className="text-yellow-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-yellow-300">🔔 NUEVO PEDIDO!</div>
            <div className="text-xs text-yellow-400/80">Hay pedidos nuevos en la cola</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="icon-box" style={{ background: 'rgba(245,166,35,0.08)' }}><ClipboardList size={16} className="text-amber" /></div>
          <div>
            <h3 className="text-sm font-bold text-white/90">Pedidos</h3>
            <p className="text-[11px] text-slate-500">
              {pendingCount > 0 && <span className="text-yellow-400 font-semibold">{pendingCount} pendientes</span>}
              {pendingCount > 0 && (preparingCount > 0 || readyCount > 0) && ' · '}
              {preparingCount > 0 && <span className="text-blue-400 font-semibold">{preparingCount} preparando</span>}
              {preparingCount > 0 && readyCount > 0 && ' · '}
              {readyCount > 0 && <span className="text-purple-400 font-semibold">{readyCount} listos</span>}
              {pendingCount === 0 && preparingCount === 0 && readyCount === 0 && 'Sin pedidos activos'}
            </p>
          </div>
        </div>
        <button onClick={load} className="btn-outline py-2 px-3 flex items-center gap-1.5 text-[10px]">
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4">
        {[
          { key: 'active', label: `Activos (${pendingCount + preparingCount + readyCount})` },
          { key: 'pending', label: `Pendientes (${pendingCount})` },
          { key: 'preparing', label: `Preparando (${preparingCount})` },
          { key: 'ready', label: `Listos (${readyCount})` },
          { key: 'delivered', label: 'Entregados' },
          { key: 'all', label: 'Todos' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all
              ${filter === f.key ? 'bg-amber/10 text-amber border-amber/20' : 'border-transparent text-slate-500'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16"><div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto" /></div>
      ) : !filtered.length ? (
        <div className="card text-center py-16">
          <ClipboardList size={32} className="mx-auto mb-3 text-slate-700" />
          <div className="text-slate-500 text-sm">No hay pedidos</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status];
            return (
              <div key={order.id} className={`card border ${sc.border} transition-all`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${sc.bg} ${sc.color}`}>
                      {sc.icon} {sc.label}
                    </span>
                    {order.zone_name && (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-semibold" style={{ background: `${order.zone_color}15`, color: order.zone_color || '#F5A623' }}>
                        {order.zone_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600">{timeSince(order.created_at)}</span>
                </div>

                {/* Customer */}
                <div className="text-xs font-semibold text-white/85 mb-0.5">{order.customer_name}</div>
                {order.customer_phone && <div className="text-[10px] text-slate-500 mb-2">{order.customer_phone}</div>}

                {/* Items */}
                <div className="bg-white/[0.02] rounded-xl p-2.5 mb-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 text-[11px]">
                      <span className="text-slate-300">{item.qty}× {item.name}</span>
                      <span className="text-white/60 tabular-nums">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-white/[0.04]">
                    <span className="text-xs font-bold text-white/90">Total</span>
                    <span className="text-xs font-extrabold text-amber">${order.total.toFixed(2)}</span>
                  </div>
                </div>

                {order.note && <div className="text-[10px] text-slate-500 italic mb-3">"{order.note}"</div>}

                {/* Actions — Barra/Owner: pending→preparing→ready, Cajera: ready→delivered */}
                {order.status === 'pending' && isOwner && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(order.id, 'preparing')}
                      className="flex-1 py-2.5 bg-blue-500/10 text-blue-400 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-blue-500/20 transition-colors">
                      <ChefHat size={12} /> Preparar
                    </button>
                    <button onClick={() => updateStatus(order.id, 'cancelled')}
                      className="py-2.5 px-3 bg-red-500/10 text-red-400 rounded-xl text-[10px] hover:bg-red-500/20 transition-colors">
                      <XCircle size={12} />
                    </button>
                  </div>
                )}
                {order.status === 'preparing' && isOwner && (
                  <button onClick={() => updateStatus(order.id, 'ready')}
                    className="w-full py-2.5 bg-purple-500/10 text-purple-400 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-purple-500/20 transition-colors">
                    <PackageCheck size={12} /> Marcar Listo para Entrega
                  </button>
                )}
                {order.status === 'ready' && (
                  <button onClick={() => updateStatus(order.id, 'delivered')}
                    className="w-full py-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-emerald-500/20 transition-colors">
                    <CheckCircle size={12} /> Marcar Entregado
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
