'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Send, ArrowLeft, Beer, Wine, Coffee, UtensilsCrossed, CircleDot, Package, CheckCircle, Download } from 'lucide-react';

interface Product { id: string; name: string; description: string | null; category: string; price: number; is_available: boolean; }
interface Zone { id: string; name: string; color: string; }
interface CartItem { product: Product; qty: number; }
interface CustomerInfo { id: string; name: string; balance: number; balance_held: number; available_balance: number; balance_type: string; qr_code: string; photo_url: string | null; }

const CAT_ICONS: Record<string, any> = {
  beer: <Beer size={16} />, cocktail: <Wine size={16} />, spirit: <Wine size={16} />,
  soft_drink: <Coffee size={16} />, food: <UtensilsCrossed size={16} />, other: <CircleDot size={16} />,
};
const CAT_LABELS: Record<string, string> = {
  beer: 'Cervezas', cocktail: 'Cócteles', spirit: 'Licores', wine: 'Vinos',
  soft_drink: 'Sin Alcohol', food: 'Comida', other: 'Otros',
};

export default function PortalPage() {
  const [step, setStep] = useState<'scan' | 'menu' | 'confirm' | 'done'>('scan');
  const [qrInput, setQrInput] = useState('');
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedZone, setSelectedZone] = useState('');
  const [note, setNote] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // PWA Install prompt
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  // Check URL for QR code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qr = params.get('qr');
    if (qr) { setQrInput(qr); lookupCustomer(qr); }
  }, []);

  const lookupCustomer = async (qr: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/portal?qr=${encodeURIComponent(qr)}`);
      const data = await res.json();
      if (data.success) {
        setCustomer(data.data.customer);
        setProducts(data.data.products);
        setZones(data.data.zones || []);
        setStep('menu');
      } else {
        setError(data.error || 'QR no encontrado');
      }
    } catch { setError('Error de conexión'); }
    setLoading(false);
  };

  const addToCart = (id: string) => setCart(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
  const removeFromCart = (id: string) => setCart(p => {
    const n = (p[id] || 0) - 1;
    if (n <= 0) { const { [id]: _, ...rest } = p; return rest; }
    return { ...p, [id]: n };
  });

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find(p => p.id === id)!, qty }))
    .filter(i => i.product);
  const cartTotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const submitOrder = async () => {
    if (!customer || cartItems.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const items = cartItems.map(i => ({
        product_id: i.product.id,
        name: i.product.name,
        qty: i.qty,
        price: i.product.price,
        subtotal: i.product.price * i.qty,
      }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: customer.qr_code, items, note, zone_id: selectedZone || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderNumber(data.data.id.substring(0, 8).toUpperCase());
        setStep('done');
        setCart({});
      } else {
        setError(data.error || 'Error al crear pedido');
      }
    } catch { setError('Error de conexión'); }
    setLoading(false);
  };

  const filteredProducts = filterCat === 'all' ? products.filter(p => p.is_available) : products.filter(p => p.is_available && p.category === filterCat);
  const categories = ['all', ...Array.from(new Set(products.filter(p => p.is_available).map(p => p.category)))];

  return (
    <div className="min-h-screen bg-[#060A13] text-white">
      {/* Header */}
      <div className="bg-[#0A1020] border-b border-amber/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="BirraSport" className="w-8 h-8" />
            <div>
              <div className="text-sm font-bold text-amber">SALDOBIRRAS</div>
              <div className="text-[9px] text-slate-500">BirraSport</div>
            </div>
          </div>
          {customer && (
            <div className="text-right">
              <div className="text-[10px] text-slate-500">Saldo</div>
              <div className="text-sm font-bold text-amber tabular-nums">
                {customer.balance_type === 'money' ? `$${customer.balance.toFixed(2)}` : `${customer.balance} 🍺`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Install Banner */}
      {showInstallBanner && (
        <div className="bg-amber/10 border-b border-amber/20 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-amber" />
              <span className="text-sm text-white/90">Instala la app en tu teléfono</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleInstall} className="px-4 py-1.5 bg-amber text-black text-xs font-bold rounded-lg">
                Instalar
              </button>
              <button onClick={() => setShowInstallBanner(false)} className="text-slate-500 text-xs">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* ═══ STEP 1: SCAN ═══ */}
        {step === 'scan' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-amber/5 border border-amber/10 flex items-center justify-center mx-auto mb-6">
              <Package size={32} className="text-amber" />
            </div>
            <h1 className="text-xl font-bold mb-2">Bienvenido</h1>
            <p className="text-slate-500 text-sm mb-8">Ingresa tu código de cliente para hacer un pedido</p>

            <input type="text" className="w-full px-5 py-4 bg-[#101828] rounded-2xl border border-white/5 text-center text-lg font-mono focus:outline-none focus:border-amber/30 transition-colors"
              value={qrInput} onChange={e => setQrInput(e.target.value)} placeholder="SB-XXXXXXXXXXXX"
              onKeyDown={e => e.key === 'Enter' && qrInput && lookupCustomer(qrInput)} />

            {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}

            <button onClick={() => qrInput && lookupCustomer(qrInput)} disabled={loading || !qrInput}
              className="w-full mt-4 py-4 bg-amber text-black font-bold rounded-2xl text-sm disabled:opacity-40 transition-opacity">
              {loading ? 'Buscando...' : 'Entrar'}
            </button>
          </div>
        )}

        {/* ═══ STEP 2: MENU ═══ */}
        {step === 'menu' && customer && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => { setStep('scan'); setCustomer(null); setCart({}); }} className="text-slate-500">
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="text-base font-bold">Hola, {customer.name.split(' ')[0]} 👋</div>
                <div className="text-xs text-slate-500">Selecciona lo que quieres pedir</div>
              </div>
            </div>

            {/* Zone selector */}
            {zones.length > 0 && (
              <div className="mb-4">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">¿Dónde estás?</label>
                <div className="flex gap-1.5 flex-wrap">
                  {zones.map(z => (
                    <button key={z.id} onClick={() => setSelectedZone(z.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                        ${selectedZone === z.id ? 'border-amber/30 bg-amber/10 text-amber' : 'border-white/5 text-slate-400'}`}>
                      {z.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category filter */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all
                    ${filterCat === cat ? 'bg-amber/10 text-amber' : 'text-slate-500'}`}>
                  {cat === 'all' ? 'Todos' : CAT_LABELS[cat] || cat}
                </button>
              ))}
            </div>

            {/* Products */}
            <div className="space-y-2 mb-24">
              {filteredProducts.map(p => {
                const qty = cart[p.id] || 0;
                return (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all
                    ${qty > 0 ? 'border-amber/15 bg-amber/[0.03]' : 'border-white/[0.03] bg-white/[0.01]'}`}>
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-amber flex-shrink-0">
                      {CAT_ICONS[p.category] || <CircleDot size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white/90">{p.name}</div>
                      {p.description && <div className="text-[11px] text-slate-600">{p.description}</div>}
                      <div className="text-xs font-bold text-amber mt-0.5">${Number(p.price).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {qty > 0 && (
                        <button onClick={() => removeFromCart(p.id)} className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                          <Minus size={14} />
                        </button>
                      )}
                      {qty > 0 && <span className="text-sm font-bold w-5 text-center">{qty}</span>}
                      <button onClick={() => addToCart(p.id)} className="w-8 h-8 rounded-xl bg-amber/10 text-amber flex items-center justify-center">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating cart bar */}
            {cartCount > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-[#0A1020] border-t border-amber/10 px-4 py-3 z-50">
                <div className="max-w-lg mx-auto">
                  <button onClick={() => setStep('confirm')}
                    className="w-full py-4 bg-amber text-black font-bold rounded-2xl text-sm flex items-center justify-center gap-2">
                    <ShoppingCart size={16} />
                    Ver Pedido ({cartCount}) · ${cartTotal.toFixed(2)}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ STEP 3: CONFIRM ═══ */}
        {step === 'confirm' && customer && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setStep('menu')} className="text-slate-500"><ArrowLeft size={18} /></button>
              <h2 className="text-base font-bold">Confirmar Pedido</h2>
            </div>

            <div className="bg-[#101828] rounded-2xl border border-white/5 p-4 mb-4">
              {cartItems.map(({ product: p, qty }) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0">
                  <div>
                    <div className="text-sm font-medium text-white/90">{p.name}</div>
                    <div className="text-xs text-slate-500">{qty} × ${Number(p.price).toFixed(2)}</div>
                  </div>
                  <div className="text-sm font-bold text-white/80">${(p.price * qty).toFixed(2)}</div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 mt-1">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-lg font-extrabold text-amber">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Balance check */}
            <div className={`rounded-2xl p-4 mb-4 border ${cartTotal <= customer.available_balance ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Tu saldo</span>
                <span className={`text-sm font-bold ${cartTotal <= customer.available_balance ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${customer.available_balance.toFixed(2)}
                </span>
              </div>
              {cartTotal > customer.available_balance && (
                <div className="text-xs text-red-400 mt-1">Saldo insuficiente. Recarga para poder hacer el pedido.</div>
              )}
            </div>

            <input type="text" className="w-full px-4 py-3 bg-[#101828] rounded-2xl border border-white/5 text-sm mb-4 focus:outline-none focus:border-amber/20"
              placeholder="Nota (opcional)" value={note} onChange={e => setNote(e.target.value)} />

            {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

            <button onClick={submitOrder} disabled={loading || cartTotal > customer.available_balance}
              className="w-full py-4 bg-amber text-black font-bold rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-40">
              {loading ? 'Enviando...' : <><Send size={16} /> Enviar Pedido</>}
            </button>
          </>
        )}

        {/* ═══ STEP 4: DONE ═══ */}
        {step === 'done' && (
          <div className="text-center py-10">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">¡Pedido Enviado!</h2>
            <p className="text-slate-500 text-sm mb-2">Tu pedido está siendo preparado</p>
            <div className="text-xs text-slate-600 font-mono mb-8">#{orderNumber}</div>

            <button onClick={() => { setStep('menu'); setNote(''); setError(''); }}
              className="px-6 py-3 bg-amber/10 text-amber font-semibold rounded-2xl text-sm">
              Hacer otro pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
