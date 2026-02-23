'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { formatBalance, formatMoney, formatDate, isLowBalance, BANKS } from '@/lib/utils';
import { ArrowLeft, Pencil, Mail, QrCode, Minus, Plus, TrendingUp, TrendingDown, CreditCard, ShoppingCart, Trash2, Package, Link2, ExternalLink, Send } from 'lucide-react';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import EditCustomerModal from './EditCustomerModal';
import { createClient } from '@/lib/supabase-browser';
import type { Transaction, Product, OrderItem, ProductCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

interface Props {
  onRecharge: (data: any) => Promise<any>;
  onConsume: (data: any) => Promise<any>;
  onLoadTransactions: (customerId: string) => Promise<Transaction[]>;
  onSendQREmail: (customerId: string) => Promise<any>;
  onEditCustomer: (formData: FormData) => Promise<any>;
}

export default function CustomerView({ onRecharge, onConsume, onLoadTransactions, onSendQREmail, onEditCustomer }: Props) {
  const { selectedCustomer: c, setView, user } = useStore();
  const [rechargeAmt, setRechargeAmt] = useState('');
  const [rechargeBank, setRechargeBank] = useState('');
  const [rechargeRef, setRechargeRef] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Products & Cart
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [filterCat, setFilterCat] = useState('all');
  const [consumeMode, setConsumeMode] = useState<'products' | 'manual'>('products');
  const [manualAmt, setManualAmt] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const isOwner = user?.role === 'owner';
  const can = (perm: string) => isOwner || (user?.permissions as any)?.[perm];

  if (!c) return null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
  const pct = Math.min((c.balance / (c.initial_balance || 1)) * 100, 100);
  const low = isLowBalance(c.balance, c.balance_type) || c.balance <= 0;

  useEffect(() => { onLoadTransactions(c.id).then(setTransactions); }, [c.id, c.balance]);

  // Auto-refresh customer data every 8s to catch order deliveries
  useEffect(() => {
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
  }, [c.id, c.balance]);

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

  useEffect(() => {
    if (qrRef.current && typeof window !== 'undefined') {
      qrRef.current.innerHTML = '';
      import('qrcode').then(QRCode => {
        const canvas = document.createElement('canvas');
        // @ts-ignore
        QRCode.toCanvas(canvas, c.qr_code, { width: 130, color: { dark: '#1B2A4A', light: '#FFFFFF' }, margin: 1 });
        qrRef.current?.appendChild(canvas);
      });
    }
  }, [c.qr_code]);

  // Cart helpers
  const addToCart = (productId: string) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
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
  const balanceHeld = (c as any).balance_held || 0;
  const availableBalance = c.balance - balanceHeld;

  const handleConsumeProducts = async () => {
    if (cartItems.length === 0) return;
    setProcessing(true);
    const items = cartItems.map(({ product, ...item }) => item);
    const note = items.map(i => `${i.qty}x ${i.name}`).join(', ');
    await onConsume({ customer_id: c.id, amount: cartTotal, note, items });
    clearCart();
    setProcessing(false);
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
      alert('✓ Pedido enviado a la barra');
    } else {
      alert(json.error || 'Error al enviar pedido');
    }
    setProcessing(false);
  };

  const handleConsumeManual = async () => {
    const amt = parseFloat(manualAmt);
    if (!amt || amt <= 0) return;
    setProcessing(true);
    await onConsume({ customer_id: c.id, amount: amt, note: manualNote || 'Consumo' });
    setManualAmt(''); setManualNote('');
    setProcessing(false);
  };

  const handleRecharge = async () => {
    const amt = parseFloat(rechargeAmt);
    if (!amt || amt <= 0) return;
    setProcessing(true);
    await onRecharge({ customer_id: c.id, amount: amt, note: 'Recarga', bank: rechargeBank || undefined, reference: rechargeRef || undefined });
    setRechargeAmt(''); setRechargeBank(''); setRechargeRef('');
    setProcessing(false);
  };

  const balColor = c.balance <= 0 ? 'text-red-400' : low ? 'text-yellow-500' : 'text-amber';
  const barColor = c.balance <= 0 ? 'bg-red-500' : low ? 'bg-yellow-500' : 'bg-gradient-to-r from-amber to-amber-dark';

  const filteredProducts = filterCat === 'all' ? products : products.filter(p => p.category === filterCat);
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <button onClick={() => setView(isMobile ? 'scan' : 'dashboard')} className="flex items-center gap-1.5 text-slate-500 hover:text-amber text-xs font-semibold mb-4 transition-colors">
        <ArrowLeft size={14}/> Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left col: profile + actions (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Profile header */}
          <div className="card">
            <div className="flex items-start gap-4 mb-5">
              <Avatar name={c.name} photoUrl={c.photo_url} large />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white/95 truncate">{c.name}</h2>
                  {can('edit_customer') && (
                  <button onClick={() => setShowEdit(true)} className="w-7 h-7 rounded-lg bg-white/[0.03] hover:bg-amber/10 flex items-center justify-center transition-colors group">
                    <Pencil size={12} className="text-slate-500 group-hover:text-amber transition-colors"/>
                  </button>
                  )}
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5">{c.email}</div>
                {c.phone && <div className="text-[12px] text-slate-500">{c.phone}</div>}
                <div className="text-[11px] text-slate-600 mt-1">{formatDate(c.created_at)}</div>
              </div>
            </div>

            {/* Balance card */}
            <div className={`p-5 rounded-2xl text-center border ${low ? 'bg-gradient-to-br from-yellow-500/[0.03] to-red-500/[0.02] border-yellow-500/10' : 'bg-gradient-to-br from-amber/[0.03] to-transparent border-amber/[0.06]'}`}>
              <div className="text-[10px] text-slate-500 uppercase tracking-[3px] font-semibold mb-1.5">Saldo Disponible</div>
              <div className={`text-[44px] font-extrabold tracking-tight tabular-nums ${balColor}`}>
                {c.balance_type === 'money' ? formatMoney(c.balance) : c.balance}
              </div>
              {c.balance_type === 'beers' && <div className="text-slate-500 text-xs">cervezas</div>}
              <div className="h-1 rounded-full bg-white/[0.03] overflow-hidden mt-3 mx-auto max-w-[200px]">
                <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2.5"><StatusBadge customer={c} /></div>
              {balanceHeld > 0 && (
                <div className="mt-2 text-[10px] text-yellow-500">
                  🔒 ${balanceHeld.toFixed(2)} retenido en pedidos · Disponible: ${availableBalance.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* ═══ CONSUME SECTION ═══ */}
          {can('consume') && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="icon-box" style={{background:'rgba(239,68,68,0.06)'}}><ShoppingCart size={isMobile ? 18 : 15} className="text-red-400"/></div>
                <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-bold text-white/80`}>Cobrar</span>
              </div>
              <div className="flex gap-0.5">
                <button onClick={() => setConsumeMode('products')}
                  className={`${isMobile ? 'px-4 py-2.5 text-[13px]' : 'px-2.5 py-1.5 text-[10px]'} rounded-lg font-semibold border transition-all
                    ${consumeMode === 'products' ? 'bg-amber/10 text-amber border-amber/20' : 'border-transparent text-slate-500'}`}>
                  Productos
                </button>
                {isOwner && (
                <button onClick={() => setConsumeMode('manual')}
                  className={`${isMobile ? 'px-4 py-2.5 text-[13px]' : 'px-2.5 py-1.5 text-[10px]'} rounded-lg font-semibold border transition-all
                    ${consumeMode === 'manual' ? 'bg-amber/10 text-amber border-amber/20' : 'border-transparent text-slate-500'}`}>
                  Manual
                </button>
                )}
              </div>
            </div>

            {consumeMode === 'products' ? (
              <>
                {/* Category filter */}
                <div className="flex gap-1 mb-3 flex-wrap">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setFilterCat(cat)}
                      className={`${isMobile ? 'px-3 py-2 text-[12px]' : 'px-2 py-1 text-[9px]'} rounded-md font-semibold border transition-all
                        ${filterCat === cat ? 'bg-white/[0.05] text-white/80 border-white/10' : 'border-transparent text-slate-600 hover:text-slate-400'}`}>
                      {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat as ProductCategory] || cat}
                    </button>
                  ))}
                </div>

                {/* Products grid */}
                {products.length === 0 ? (
                  <div className="text-center py-6 text-slate-600 text-xs">
                    <Package size={20} className="mx-auto mb-2 opacity-30" />
                    No hay productos. Crea productos desde el menú Productos.
                  </div>
                ) : (
                <div className={`grid ${isMobile ? 'grid-cols-2 gap-2.5' : 'grid-cols-2 sm:grid-cols-3 gap-1.5'} max-h-[350px] overflow-y-auto pr-1`}>
                  {filteredProducts.map(p => {
                    const qty = cart[p.id] || 0;
                    return (
                      <div key={p.id} onClick={() => addToCart(p.id)}
                        className={`relative ${isMobile ? 'px-4 py-4' : 'px-3 py-2.5'} rounded-xl border cursor-pointer transition-all select-none
                          ${qty > 0 ? 'border-amber/20 bg-amber/[0.04]' : 'border-white/[0.03] hover:border-white/[0.06] hover:bg-white/[0.01]'}`}>
                        <div className={`${isMobile ? 'text-[15px]' : 'text-[11px]'} font-semibold text-white/85 truncate`}>{p.name}</div>
                        <div className={`${isMobile ? 'text-[14px] mt-1' : 'text-[10px]'} text-amber font-bold`}>${Number(p.price).toFixed(2)}</div>
                        {qty > 0 && (
                          <div className={`absolute ${isMobile ? '-top-2.5 -right-2.5 w-7 h-7 text-[13px]' : '-top-1.5 -right-1.5 w-5 h-5 text-[9px]'} rounded-full bg-amber font-bold text-black flex items-center justify-center`}>
                            {qty}
                          </div>
                        )}
                        {qty > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); removeFromCart(p.id); }}
                            className={`absolute ${isMobile ? '-bottom-1.5 -right-1.5 w-6 h-6 text-[11px]' : '-bottom-1 -right-1 w-4 h-4 text-[8px]'} rounded-full bg-red-500/80 text-white flex items-center justify-center`}>
                            −
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}

                {/* Cart summary */}
                {cartCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.03]">
                    <div className="space-y-1 mb-2.5">
                      {cartItems.map(item => (
                        <div key={item.product_id} className={`flex items-center justify-between ${isMobile ? 'text-[14px] py-1' : 'text-[11px]'}`}>
                          <span className="text-slate-400">{item.qty}x {item.name}</span>
                          <span className="text-white/70 font-semibold tabular-nums">${item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`flex items-center justify-between ${isMobile ? 'py-3' : 'py-2'} border-t border-white/[0.05]`}>
                      <div className="flex items-center gap-2">
                        <span className={`${isMobile ? 'text-base' : 'text-xs'} font-bold text-white/90`}>Total: ${cartTotal.toFixed(2)}</span>
                        <span className={`${isMobile ? 'text-[12px]' : 'text-[10px]'} text-slate-500`}>({cartCount} items)</span>
                      </div>
                      <button onClick={clearCart} className={`${isMobile ? 'text-[13px] px-3 py-1.5' : 'text-[10px]'} text-red-400 hover:text-red-300 flex items-center gap-1`}>
                        <Trash2 size={isMobile ? 14 : 10} /> Limpiar
                      </button>
                    </div>
                    <button onClick={handleConsumeProducts} disabled={processing}
                      className={`w-full mt-2 py-4 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 rounded-xl transition-colors
                        ${isOwner ? 'btn-red' : 'hidden'}`}>
                      {processing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                        <><ShoppingCart size={16} /> Cobrar ${cartTotal.toFixed(2)}</>}
                    </button>
                    <button onClick={handleSendToBar} disabled={processing}
                      className={`w-full py-4 bg-blue-500/15 text-blue-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-500/25 transition-colors disabled:opacity-50
                        ${isOwner ? 'mt-1.5' : 'mt-2'}`}>
                      {processing ? <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> :
                        <><Send size={16} /> ENVIAR PEDIDO</>}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Manual consume */
              <>
                <input type="number" min="0" className="input text-sm" value={manualAmt} onChange={e => setManualAmt(e.target.value)} placeholder={c.balance_type === 'money' ? '0.00' : '1'} />
                <input type="text" className="input text-sm mt-1.5" value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="Descripción..." />
                <button onClick={handleConsumeManual} disabled={processing}
                  className="btn-red w-full mt-2.5 py-2.5 text-[10px] disabled:opacity-50">
                  {processing ? 'Procesando...' : 'Descontar'}
                </button>
              </>
            )}
          </div>
          )}

          {/* ═══ RECHARGE SECTION ═══ */}
          {can('recharge') && (
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <div className="icon-box" style={{background:'rgba(16,185,129,0.06)'}}><Plus size={15} className="text-emerald-400"/></div>
              <span className="text-xs font-bold text-white/80">Recargar</span>
            </div>
            <input type="number" min="0" className="input text-sm" value={rechargeAmt} onChange={e => setRechargeAmt(e.target.value)} placeholder={c.balance_type === 'money' ? '0.00' : '5'} />
            <select className="input text-sm mt-1.5" value={rechargeBank} onChange={e => setRechargeBank(e.target.value)}>
              <option value="">Método de pago</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <input type="text" className="input text-sm mt-1.5" value={rechargeRef} onChange={e => setRechargeRef(e.target.value)} placeholder="Referencia" />
            <button onClick={handleRecharge} disabled={processing} className="btn-green w-full mt-2.5 py-2.5 text-[10px] disabled:opacity-50">
              {processing ? 'Procesando...' : 'Recargar'}
            </button>
          </div>
          )}
        </div>

        {/* Right col: QR + history (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <QrCode size={16} className="text-amber" />
              <h3 className="text-xs font-bold tracking-wide text-white/80">Código QR</h3>
            </div>
            <div className="inline-block p-3 bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)]" ref={qrRef} />
            <div className="text-[10px] text-slate-600 mt-2.5 font-mono">{c.qr_code}</div>
            {c.email && can('send_email') && (
              <button onClick={() => onSendQREmail(c.id)} className="btn-outline mt-3 text-[10px] px-3 py-2 flex items-center gap-1.5 mx-auto">
                <Mail size={12}/> Enviar por Correo
              </button>
            )}
            <button onClick={async () => {
              const { generateCard, preloadImage } = await import('@/lib/card-generator');
              const [photoBase64, logoBase64] = await Promise.all([
                c.photo_url ? preloadImage(c.photo_url) : Promise.resolve(null),
                preloadImage('/logo.png'),
              ]);
              await generateCard({ customer: c, photoBase64, logoBase64 });
            }} className="btn-outline mt-2 text-[10px] px-3 py-2 flex items-center gap-1.5 mx-auto">
              <CreditCard size={12}/> Imprimir Carnet
            </button>

            {/* Portal link */}
            <div className="mt-4 pt-3 border-t border-white/[0.03]">
              <div className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-center mb-2">Portal de Pedidos</div>
              <button onClick={() => {
                const url = `${window.location.origin}/portal?qr=${c.qr_code}`;
                navigator.clipboard.writeText(url);
                alert('Link copiado al portapapeles');
              }} className="btn-outline w-full text-[10px] px-3 py-2 flex items-center justify-center gap-1.5">
                <Link2 size={12}/> Copiar Link del Portal
              </button>
              {c.email && can('send_email') && (
                <button onClick={async () => {
                  const url = `${window.location.origin}/portal?qr=${c.qr_code}`;
                  const supabase = (await import('@/lib/supabase-browser')).createClient();
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  const res = await fetch('/api/portal/invite', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer_id: c.id, portal_url: url }),
                  });
                  const json = await res.json();
                  if (json.success) alert('✓ Invitación enviada por correo');
                  else alert(json.error || 'Error al enviar');
                }} className="btn-outline w-full mt-1.5 text-[10px] px-3 py-2 flex items-center justify-center gap-1.5">
                  <ExternalLink size={12}/> Enviar Invitación por Correo
                </button>
              )}
            </div>
          </div>

          <div className="card max-h-[340px] overflow-y-auto">
            <h3 className="text-xs font-bold tracking-wide text-white/80 mb-3">Historial</h3>
            {!transactions.length ? (
              <div className="text-center text-slate-600 py-6 text-xs">Sin movimientos</div>
            ) : (
              <div className="space-y-0.5">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.02]">
                    <div className="flex items-center gap-2.5">
                      <div className="icon-box w-8 h-8 rounded-lg" style={{background: t.type==='recharge' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'}}>
                        {t.type === 'recharge' ? <TrendingUp size={13} className="text-emerald-400"/> : <TrendingDown size={13} className="text-red-400"/>}
                      </div>
                      <div>
                        <div className="font-medium text-xs text-white/80">{t.note}</div>
                        <div className="text-[10px] text-slate-600">
                          {formatDate(t.created_at)}
                          {t.cashier_name && <span className="ml-1 text-slate-700">· {t.cashier_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold text-sm tabular-nums ${t.type === 'recharge' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'recharge' ? '+' : '-'}{c.balance_type === 'money' ? formatMoney(t.amount) : t.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <EditCustomerModal customer={c}
          onSave={async (formData) => { await onEditCustomer(formData); setShowEdit(false); }}
          onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
