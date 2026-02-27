'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { formatMoney, isLowBalance } from '@/lib/utils';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import ConfirmModal from './ConfirmModal';
import { createClient } from '@/lib/supabase-browser';
import type { Product, OrderItem, ProductCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

interface Props {
  onConsume: (data: any) => Promise<any>;
  showToast: (msg: string, type?: 'ok' | 'error' | 'warn') => void;
}

export default function CajeraView({ onConsume, showToast }: Props) {
  const { selectedCustomer: c, setView } = useStore();

  const [step, setStep] = useState<'profile' | 'products' | 'review'>('profile');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [filterCat, setFilterCat] = useState('all');
  const [processing, setProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cobrar' | 'enviar' | null>(null);

  // Auto-refresh customer data every 8s
  useEffect(() => {
    if (!c) return;
    const refreshCustomer = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/customers?id=${c.id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (json.success && json.data) {
        const updated = Array.isArray(json.data) ? json.data.find((cu: any) => cu.id === c.id) : json.data;
        if (updated && (updated.balance !== c.balance || updated.balance_held !== (c as any).balance_held)) {
          useStore.getState().setView('customer', updated);
        }
      }
    };
    const iv = setInterval(refreshCustomer, 8000);
    return () => clearInterval(iv);
  }, [c?.id, c?.balance]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.success) setProducts(json.data.filter((p: Product) => p.is_available));
    };
    loadProducts();
  }, []);

  if (!c) return null;

  const balanceHeld = (c as any).balance_held || 0;
  const availableBalance = c.balance - balanceHeld;
  const low = isLowBalance(c.balance, c.balance_type) || c.balance <= 0;
  const balColor = c.balance <= 0 ? 'text-red-400' : low ? 'text-yellow-500' : 'text-emerald-400';

  // Cart helpers
  const addToCart = (productId: string) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
    navigator.vibrate?.([10]);
  };
  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const n = (prev[productId] || 0) - 1;
      if (n <= 0) { const { [productId]: _, ...rest } = prev; return rest; }
      return { ...prev, [productId]: n };
    });
  };
  const clearCart = () => setCart({});

  const cartItems: (OrderItem & { product: Product })[] = Object.entries(cart)
    .map(([pid, qty]) => {
      const product = products.find(p => p.id === pid);
      if (!product) return null;
      return { product_id: pid, name: product.name, qty, price: Number(product.price), subtotal: Number(product.price) * qty, product };
    })
    .filter(Boolean) as any;

  const cartTotal = cartItems.reduce((s, i) => s + i.subtotal, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const canAfford = availableBalance >= cartTotal || (c as any).allow_negative;

  const handleConsumeProducts = async () => {
    if (cartItems.length === 0) return;
    setProcessing(true);
    const items = cartItems.map(({ product, ...item }) => item);
    const note = items.map(i => `${i.qty}x ${i.name}`).join(', ');
    await onConsume({ customer_id: c.id, amount: cartTotal, note, items });
    clearCart();
    setProcessing(false);
    showToast(`✅ Cobro exitoso — ${formatMoney(cartTotal)}`);
    setTimeout(() => setView('scan'), 2000);
  };

  const handleSendToBar = async () => {
    if (cartItems.length === 0) return;
    setProcessing(true);
    const items = cartItems.map(({ product, ...item }) => item);
    const supabase = (await import('@/lib/supabase-browser')).createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setProcessing(false); return; }
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: c.id, items }),
    });
    const json = await res.json();
    if (json.success) {
      clearCart();
      showToast('📤 Pedido enviado a la barra');
      setTimeout(() => setView('scan'), 2000);
    } else {
      showToast(json.error || 'Error al enviar pedido', 'error');
    }
    setProcessing(false);
  };

  const filteredProducts = filterCat === 'all' ? products : products.filter(p => p.category === filterCat);
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const itemsSummary = cartItems.map(i => `${i.qty}x ${i.name}`).join(', ');
  const balanceAfter = c.balance - cartTotal;

  // ═══════════════════════════════════════════════
  // STEP 1: Profile
  // ═══════════════════════════════════════════════
  if (step === 'profile') {
    return (
      <div className="animate-[fadeIn_0.25s_ease] px-1">
        <button onClick={() => setView('scan')} className="flex items-center gap-1.5 text-slate-500 hover:text-amber text-sm font-semibold mb-5 transition-colors min-h-[44px]">
          <ArrowLeft size={18}/> Volver
        </button>

        <div className="flex flex-col items-center text-center">
          <Avatar name={c.name} photoUrl={c.photo_url} large />
          <h2 className="text-xl font-bold text-white/95 mt-3">{c.name}</h2>

          {/* Balance */}
          <div className={`text-[56px] font-extrabold tracking-tight tabular-nums mt-2 leading-none ${balColor}`}>
            {c.balance_type === 'money' ? formatMoney(c.balance) : c.balance}
          </div>
          {c.balance_type === 'beers' && <div className="text-slate-500 text-sm mt-1">cervezas</div>}

          {balanceHeld > 0 && (
            <div className="mt-2 text-xs text-yellow-500">
              🔒 ${balanceHeld.toFixed(2)} retenido · Disponible: ${availableBalance.toFixed(2)}
            </div>
          )}

          <div className="mt-3"><StatusBadge customer={c} /></div>
        </div>

        <button
          onClick={() => setStep('products')}
          className="w-full mt-8 min-h-[56px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-base font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
        >
          🛒 TOMAR PEDIDO
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STEP 2: Products (fullscreen POS)
  // ═══════════════════════════════════════════════
  if (step === 'products') {
    return (
      <div className="animate-[fadeIn_0.2s_ease] flex flex-col min-h-[100dvh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-2 py-3 sticky top-0 z-40 bg-[#080D19]/95 backdrop-blur-sm">
          <button onClick={() => { setStep('profile'); }} className="flex items-center gap-1 text-slate-400 hover:text-amber text-sm font-semibold min-h-[44px] min-w-[44px] transition-colors">
            <ArrowLeft size={18}/>
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white/90 truncate">{c.name}</div>
            <div className={`text-xs font-semibold ${balColor}`}>
              Saldo: {c.balance_type === 'money' ? formatMoney(availableBalance) : availableBalance}
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-2 pb-3 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`min-h-[44px] px-4 text-[14px] font-bold rounded-xl border whitespace-nowrap transition-all flex-shrink-0
                ${filterCat === cat ? 'bg-white/[0.07] text-white/90 border-white/10' : 'border-transparent text-slate-600 hover:text-slate-400'}`}>
              {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat as ProductCategory] || cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className={`flex-1 overflow-y-auto px-2 ${cartCount > 0 ? 'pb-[100px]' : 'pb-4'}`}>
          {products.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              No hay productos disponibles
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredProducts.map(p => {
                const qty = cart[p.id] || 0;
                return (
                  <div key={p.id} onClick={() => addToCart(p.id)}
                    className={`relative min-h-[80px] p-4 rounded-xl border cursor-pointer transition-all select-none active:scale-[0.97]
                      ${qty > 0 ? 'border-amber/30 bg-amber/[0.06]' : 'border-white/[0.04] hover:border-white/[0.08]'}`}>
                    <div className="text-[16px] font-semibold text-white/85 leading-tight">{p.name}</div>
                    <div className="text-[15px] text-amber font-bold mt-1.5">${Number(p.price).toFixed(2)}</div>
                    {qty > 0 && (
                      <div className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-amber font-bold text-black flex items-center justify-center text-[15px] shadow-lg">
                        {qty}
                      </div>
                    )}
                    {qty > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); removeFromCart(p.id); }}
                        className="absolute -bottom-2 -right-2 min-w-[44px] min-h-[44px] rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-95">
                        <Minus size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0C1324]/95 backdrop-blur-xl border-t border-white/[0.06] shadow-[0_-8px_30px_rgba(0,0,0,0.4)] px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">
                <span className="font-bold text-white">{cartCount}</span> productos · <span className="font-bold text-amber">${cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={() => setStep('review')}
                className="min-h-[48px] px-6 rounded-xl bg-amber hover:bg-amber-dark text-black font-bold text-sm transition-colors active:scale-[0.97]">
                VER PEDIDO →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STEP 3: Review
  // ═══════════════════════════════════════════════
  return (
    <div className="animate-[fadeIn_0.2s_ease] px-1">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setStep('products')} className="flex items-center gap-1 text-slate-400 hover:text-amber text-sm font-semibold min-h-[44px] min-w-[44px] transition-colors">
          <ArrowLeft size={18}/>
        </button>
        <div className="text-base font-bold text-white/90">Pedido de {c.name}</div>
      </div>

      {/* Items list */}
      <div className="space-y-1">
        {cartItems.map(item => (
          <div key={item.product_id} className="flex items-center gap-3 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <button onClick={() => removeFromCart(item.product_id)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center active:scale-95 transition-transform">
                <Minus size={18}/>
              </button>
              <span className="text-lg font-bold text-white/90 w-8 text-center tabular-nums">{item.qty}</span>
              <button onClick={() => addToCart(item.product_id)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center active:scale-95 transition-transform">
                <Plus size={18}/>
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-white/85 truncate">{item.name}</div>
              <div className="text-xs text-slate-500">${Number(item.price).toFixed(2)} c/u</div>
            </div>
            <div className="text-[15px] font-bold text-white/80 tabular-nums">${item.subtotal.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between py-4 mt-2 border-t border-white/[0.08]">
        <span className="text-2xl font-extrabold text-white/95">Total</span>
        <span className="text-2xl font-extrabold text-amber tabular-nums">${cartTotal.toFixed(2)}</span>
      </div>

      {/* Clear button */}
      <button onClick={() => { clearCart(); setStep('products'); }}
        className="text-red-400 text-sm font-semibold flex items-center gap-1.5 mb-6">
        <Trash2 size={14}/> Limpiar todo
      </button>

      {/* Action buttons */}
      <div className="space-y-3 pb-8">
        {/* COBRAR */}
        <button
          onClick={() => setConfirmAction('cobrar')}
          disabled={processing || !canAfford}
          className="w-full min-h-[64px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex flex-col items-center justify-center transition-colors active:scale-[0.98]"
        >
          {processing ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-lg font-bold">✅ COBRAR {formatMoney(cartTotal)}</span>
              <span className="text-sm opacity-80">
                {canAfford ? 'Descuenta del saldo' : 'Saldo insuficiente'}
              </span>
            </>
          )}
        </button>

        {/* ENVIAR A LA BARRA */}
        <button
          onClick={() => setConfirmAction('enviar')}
          disabled={processing || !canAfford}
          className="w-full min-h-[56px] rounded-2xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex flex-col items-center justify-center transition-colors active:scale-[0.98]"
        >
          {processing ? (
            <span className="w-5 h-5 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-lg font-bold">📤 ENVIAR PEDIDO</span>
              <span className="text-sm opacity-80">
                {canAfford ? 'La barra lo prepara' : 'Saldo insuficiente'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Confirm modal */}
      {confirmAction === 'cobrar' && (
        <ConfirmModal
          title={`Cobrar ${formatMoney(cartTotal)}`}
          message={`${itemsSummary}. Saldo después: ${formatMoney(balanceAfter)}`}
          confirmLabel="Cobrar"
          variant="danger"
          onConfirm={() => { setConfirmAction(null); handleConsumeProducts(); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'enviar' && (
        <ConfirmModal
          title="Enviar pedido"
          message={`${itemsSummary}. Se reservará ${formatMoney(cartTotal)} del saldo.`}
          confirmLabel="Enviar"
          variant="default"
          onConfirm={() => { setConfirmAction(null); handleSendToBar(); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
