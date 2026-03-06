'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Send, ArrowLeft, Beer, Wine, Coffee, UtensilsCrossed, CircleDot, CheckCircle, Download, MessageSquare, Wallet, Clock, PartyPopper, ChevronDown, ChevronUp, Receipt, LogOut } from 'lucide-react';

interface Product { id: string; name: string; description: string | null; category: string; price: number; is_available: boolean; }
interface CustomerInfo { id: string; name: string; balance: number; balance_held: number; available_balance: number; balance_type: string; qr_code: string; photo_url: string | null; seat_zone: string | null; seat_row: string | null; seat_number: string | null; }
interface Transaction {
  id: string; type: 'recharge' | 'consume'; amount: number; balance_after: number;
  note: string | null; bank: string | null; reference: string | null;
  created_at: string; cashier_name: string | null; items: any[] | null;
  order_id: string | null;
  order: { id: string; items: any[]; order_type: string; created_at: string; updated_at: string; status: string } | null;
}

const formatDateVE = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleString('es-VE', {
    timeZone: 'America/Caracas',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const getDateLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const caracasOffset = -4 * 60;
  const toCaracas = (date: Date) => {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utc + caracasOffset * 60000);
  };
  const dCaracas = toCaracas(d);
  const nowCaracas = toCaracas(now);
  const dDay = new Date(dCaracas.getFullYear(), dCaracas.getMonth(), dCaracas.getDate());
  const nDay = new Date(nowCaracas.getFullYear(), nowCaracas.getMonth(), nowCaracas.getDate());
  const diff = (nDay.getTime() - dDay.getTime()) / 86400000;
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return dCaracas.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Caracas' });
};

const CAT_ICONS: Record<string, any> = {
  beer: <Beer size={22} />, cocktail: <Wine size={22} />, spirit: <Wine size={22} />,
  soft_drink: <Coffee size={22} />, food: <UtensilsCrossed size={22} />, other: <CircleDot size={22} />,
};
const CAT_LABELS: Record<string, string> = {
  beer: '🍺 Cervezas', cocktail: '🍸 Cócteles', spirit: '🥃 Licores', wine: '🍷 Vinos',
  soft_drink: '☕ Sin Alcohol', food: '🍔 Comida', other: '📦 Otros',
};
const CAT_EMOJI: Record<string, string> = {
  beer: '🍺', cocktail: '🍸', spirit: '🥃', wine: '🍷', soft_drink: '☕', food: '🍔', other: '📦',
};

export default function PortalPage() {
  const [step, setStep] = useState<'scan' | 'menu' | 'confirm' | 'done'>('scan');
  const [qrInput, setQrInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginMode, setLoginMode] = useState<'pin' | 'qr'>('pin');
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showStatement, setShowStatement] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  // PWA Install
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

  // Auto-refresh customer data every 60s + jitter when on menu/done steps
  useEffect(() => {
    if (!customer?.qr_code || step === 'scan') return;
    const ms = 60000 + Math.floor(Math.random() * 5000);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        lookupCustomer(customer.qr_code, 'qr');
      }
    }, ms);
    return () => clearInterval(interval);
  }, [customer?.qr_code, step]);

  // Auto-login from sessionStorage or localStorage
  useEffect(() => {
    const savedQr = sessionStorage.getItem('birrasport_customer_qr') || localStorage.getItem('birrasport_customer_qr');
    if (savedQr) {
      setLoading(true);
      lookupCustomer(savedQr, 'qr').then(() => {
        // If lookup failed, loading will be false and error will be set
      }).catch(() => {
        sessionStorage.removeItem('birrasport_customer_qr');
        localStorage.removeItem('birrasport_customer_qr');
      });
    }
  }, []);

  const lookupCustomer = async (value: string, mode: 'qr' | 'pin' = 'qr') => {
    setLoading(true);
    setError('');
    try {
      const param = mode === 'pin' ? `pin=${encodeURIComponent(value)}` : `qr=${encodeURIComponent(value)}`;
      const res = await fetch(`/api/portal?${param}`);
      const data = await res.json();
      if (data.success) {
        setCustomer(data.data.customer);
        setProducts(data.data.products);
        setTransactions(data.data.transactions || []);
        setStep('menu');
        // Persist session
        sessionStorage.setItem('birrasport_customer_qr', data.data.customer.qr_code);
        localStorage.setItem('birrasport_customer_qr', data.data.customer.qr_code);
      } else {
        setError(data.error || 'No encontrado');
        // Clear invalid saved session
        sessionStorage.removeItem('birrasport_customer_qr');
      }
    } catch { setError('Error de conexión'); }
    setLoading(false);
  };

  const logout = () => {
    sessionStorage.removeItem('birrasport_customer_qr');
    setStep('scan');
    setCustomer(null);
    setCart({});
    setPinInput('');
    setQrInput('');
    setError('');
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
        product_id: i.product.id, name: i.product.name, category: i.product.category,
        qty: i.qty, price: i.product.price, subtotal: i.product.price * i.qty,
      }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: customer.qr_code, items, note, seat_zone: customer.seat_zone, seat_row: customer.seat_row, seat_number: customer.seat_number }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderNumber(data.data.id.substring(0, 8).toUpperCase());
        setStep('done');
        setCart({});
        setNote('');
        // Refresh customer data to show updated balance_held
        if (customer.qr_code) {
          lookupCustomer(customer.qr_code, 'qr');
        }
      } else {
        setError(data.error || 'Error al crear pedido');
      }
    } catch { setError('Error de conexión'); }
    setLoading(false);
  };

  const filteredProducts = filterCat === 'all' ? products.filter(p => p.is_available) : products.filter(p => p.is_available && p.category === filterCat);
  const categories = ['all', ...Array.from(new Set(products.filter(p => p.is_available).map(p => p.category)))];

  return (
    <div className="min-h-screen bg-[#060A13] text-white overflow-x-hidden">

      {/* ══════════════════════════════════════════
          STEP 1: LOGIN — Big, friendly, simple
         ══════════════════════════════════════════ */}
      {step === 'scan' && (
        <div className="min-h-screen flex flex-col">
          {/* Top branding */}
          <div className="pt-12 pb-6 text-center">
            <img src="/birrasport-logo.png" alt="BirraSport" className="w-24 h-24 mx-auto mb-4 drop-shadow-[0_4px_24px_rgba(245,166,35,0.3)]" />
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber to-yellow-300 bg-clip-text text-transparent">
              BirraSport
            </h1>
            <p className="text-slate-500 text-sm mt-1">Pide desde tu mesa</p>
          </div>

          <div className="flex-1 px-6 pb-8 max-w-md mx-auto w-full">
            {/* Mode toggle */}
            <div className="flex gap-1 mb-8 bg-[#0D1424] rounded-2xl p-1.5">
              <button onClick={() => setLoginMode('pin')}
                className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all ${loginMode === 'pin' ? 'bg-amber text-black shadow-lg shadow-amber/20' : 'text-slate-500'}`}>
                🔢 Mi PIN
              </button>
              <button onClick={() => setLoginMode('qr')}
                className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all ${loginMode === 'qr' ? 'bg-amber text-black shadow-lg shadow-amber/20' : 'text-slate-500'}`}>
                📱 Código QR
              </button>
            </div>

            {loginMode === 'pin' ? (
              <div className="text-center">
                <p className="text-white/80 text-lg font-semibold mb-2">Ingresa tu PIN</p>
                <p className="text-slate-500 text-sm mb-6">Los 6 números de tu tarjeta</p>
                <div className="flex justify-center gap-2.5 mb-6">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <input key={i} id={`pin-${i}`} type="tel" maxLength={1} inputMode="numeric" pattern="[0-9]" autoComplete="off"
                      className="w-12 h-16 bg-[#0D1424] rounded-2xl border-2 border-white/10 text-center text-2xl font-extrabold text-amber focus:outline-none focus:border-amber/60 focus:shadow-[0_0_20px_rgba(245,166,35,0.15)] transition-all"
                      value={pinInput[i] || ''}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        const newPin = pinInput.split('');
                        newPin[i] = v;
                        const joined = newPin.join('').slice(0, 6);
                        setPinInput(joined);
                        if (v && i < 5) document.getElementById(`pin-${i + 1}`)?.focus();
                        if (joined.length === 6) lookupCustomer(joined, 'pin');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !pinInput[i] && i > 0) {
                          const prev = pinInput.split(''); prev[i - 1] = '';
                          setPinInput(prev.join(''));
                          document.getElementById(`pin-${i - 1}`)?.focus();
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-white/80 text-lg font-semibold mb-2">Ingresa tu código</p>
                <p className="text-slate-500 text-sm mb-6">El código que está en tu tarjeta</p>
                <input type="text" className="w-full px-5 py-5 bg-[#0D1424] rounded-2xl border-2 border-white/10 text-center text-xl font-mono font-bold focus:outline-none focus:border-amber/40 transition-all mb-4"
                  value={qrInput} onChange={e => setQrInput(e.target.value)} placeholder="SB-XXXXXXXXXXXX"
                  onKeyDown={e => e.key === 'Enter' && qrInput && lookupCustomer(qrInput, 'qr')} />
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-red-400 text-sm font-semibold">{error}</p>
                <p className="text-red-400/60 text-xs mt-1">Revisa tu PIN o código e intenta de nuevo</p>
              </div>
            )}

            <button onClick={() => loginMode === 'pin' ? (pinInput.length === 6 && lookupCustomer(pinInput, 'pin')) : (qrInput && lookupCustomer(qrInput, 'qr'))}
              disabled={loading || (loginMode === 'pin' ? pinInput.length < 6 : !qrInput)}
              className="w-full mt-6 py-5 bg-amber text-black font-extrabold rounded-2xl text-lg disabled:opacity-20 transition-all shadow-lg shadow-amber/20 active:scale-[0.98]">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Buscando...
                </span>
              ) : 'Entrar'}
            </button>

            {/* Install banner */}
            {showInstallBanner && (
              <button onClick={handleInstall}
                className="w-full mt-4 py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 active:bg-white/10">
                <Download size={20} className="text-amber" />
                <span className="text-sm font-semibold text-white/80">Instalar app en tu teléfono</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 2: MENU — Visual, big touch targets
         ══════════════════════════════════════════ */}
      {step === 'menu' && customer && (
        <div style={{ paddingBottom: 'calc(112px + env(safe-area-inset-bottom, 0px))' }}>
          {/* Welcome header */}
          <div className="bg-gradient-to-b from-[#0D1424] to-[#060A13] px-5 pt-5 pb-4">
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-4">
                <button onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 active:bg-white/10 transition-all" title="Cerrar sesión">
                  <LogOut size={16} className="text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-400">Salir</span>
                </button>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Disponible</div>
                  <div className="text-xl font-extrabold text-emerald-400">
                    {customer.balance_type === 'money' ? `$${customer.available_balance.toFixed(2)}` : `${customer.available_balance} 🍺`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {customer.photo_url ? (
                  <img src={customer.photo_url} alt={customer.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-amber/20" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-amber">
                      {customer.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-extrabold">Hola, {customer.name.split(' ')[0]}! 👋</h1>
                  {customer.seat_zone ? (
                    <p className="text-amber/70 text-xs font-semibold mt-0.5">
                      📍 {customer.seat_zone === 'sin_zona' ? 'Sin Zona' : (() => {
                        const parts = [];
                        const zoneNames: Record<string, string> = { zona_media_a: 'Zona Media A', zona_media_b: 'Zona Media B', zona_media_c: 'Zona Media C', vip_a: 'VIP A', vip_b: 'VIP B', vip_c: 'VIP C', vip_d: 'VIP D', tabloncillo_a: 'Tabloncillo A' };
                        parts.push(zoneNames[customer.seat_zone] || customer.seat_zone);
                        if (customer.seat_row) parts.push(`Fila ${customer.seat_row}`);
                        if (customer.seat_number) parts.push(`Asiento ${customer.seat_number}`);
                        return parts.join(' · ');
                      })()}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm">¿Qué quieres pedir hoy?</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto px-4">
            {/* Balance card */}
            <div className="mt-4 mb-5 rounded-2xl bg-gradient-to-r from-emerald-500/[0.06] to-transparent border border-emerald-500/10 p-4">
              <div className="flex items-center gap-3">
                <Wallet size={24} className="text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Saldo Disponible</div>
                  <div className="text-2xl font-extrabold text-emerald-400">
                    {customer.balance_type === 'money' ? `$${customer.available_balance.toFixed(2)}` : `${customer.available_balance} 🍺`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-600">Total</div>
                  <div className="text-sm font-semibold text-slate-400">
                    {customer.balance_type === 'money' ? `$${customer.balance.toFixed(2)}` : `${customer.balance} 🍺`}
                  </div>
                </div>
              </div>

              {customer.balance_held > 0 && (
                <div className="mt-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔒</span>
                    <span className="text-xs font-semibold text-amber">${customer.balance_held.toFixed(2)} retenido en pedidos pendientes</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Se descontará cuando te entreguen tu pedido.
                  </p>
                </div>
              )}
            </div>

            {/* Account Statement toggle */}
            <button onClick={() => setShowStatement(!showStatement)}
              className="w-full mb-5 py-3.5 rounded-2xl border-2 border-white/[0.06] bg-white/[0.02] flex items-center justify-center gap-2 active:bg-white/[0.04] transition-all">
              <Receipt size={18} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-300">Mis Movimientos</span>
              {showStatement ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>

            {/* Account Statement */}
            {showStatement && (
              <div className="mb-5 rounded-2xl bg-[#0D1424] border border-white/5 overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  {transactions.length === 0 ? (
                    <div className="py-10 text-center">
                      <Receipt size={32} className="mx-auto mb-3 text-slate-700" />
                      <p className="text-slate-500 text-sm">Sin movimientos aún</p>
                    </div>
                  ) : (
                    (() => {
                      let lastDateLabel = '';
                      return transactions.map(tx => {
                        const dateLabel = getDateLabel(tx.created_at);
                        const showDateHeader = dateLabel !== lastDateLabel;
                        lastDateLabel = dateLabel;
                        const isExpanded = expandedTx === tx.id;
                        const isRecharge = tx.type === 'recharge';

                        return (
                          <div key={tx.id}>
                            {showDateHeader && (
                              <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.04]">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{dateLabel}</span>
                              </div>
                            )}
                            <div
                              className="px-4 py-3 border-b border-white/[0.04] active:bg-white/[0.02] cursor-pointer transition-colors"
                              onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg flex-shrink-0">
                                  {isRecharge ? '💰' : '🛒'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white/85">
                                      {isRecharge ? 'Recarga' : 'Cobro'}
                                    </span>
                                    <span className={`text-sm font-extrabold tabular-nums ${isRecharge ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {isRecharge ? '+' : '-'}${tx.amount.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[10px] text-slate-500">{formatDateVE(tx.created_at)}</span>
                                    <span className="text-[10px] text-slate-600">Saldo: ${tx.balance_after.toFixed(2)}</span>
                                  </div>
                                  {tx.note && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{tx.note}</div>}
                                </div>
                                <span className="text-slate-600 flex-shrink-0">
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </span>
                              </div>

                              {/* Expanded details */}
                              {isExpanded && (
                                <div className="mt-3 ml-8 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 animate-[fadeIn_0.2s_ease]">
                                  {!isRecharge && (tx.items || tx.order?.items) && (
                                    <>
                                      <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Detalle del pedido</div>
                                      {(tx.items || tx.order?.items || []).map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between py-0.5 text-[11px]">
                                          <span className="text-slate-300">{item.qty}× {item.name}</span>
                                          <span className="text-white/50 tabular-nums">${(item.price * item.qty).toFixed(2)}</span>
                                        </div>
                                      ))}
                                      {tx.order?.order_type && (
                                        <div className="mt-2 text-[10px]">
                                          <span className={`px-2 py-0.5 rounded-lg font-semibold ${tx.order.order_type === 'kitchen' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {tx.order.order_type === 'kitchen' ? '🍔 Cocina' : '🍺 Barra'}
                                          </span>
                                        </div>
                                      )}
                                      {tx.order?.created_at && tx.order?.updated_at && tx.order.status === 'delivered' && (
                                        <div className="mt-2 text-[10px] text-slate-500">
                                          <div>Pedido: {formatDateVE(tx.order.created_at)}</div>
                                          <div>Entregado: {formatDateVE(tx.order.updated_at)}</div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {isRecharge && (
                                    <>
                                      <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Detalle de recarga</div>
                                      <div className="text-[11px] text-slate-300">Monto: <span className="text-emerald-400 font-bold">${tx.amount.toFixed(2)}</span></div>
                                      {tx.bank && <div className="text-[11px] text-slate-400 mt-0.5">Método: {tx.bank}</div>}
                                      {tx.reference && <div className="text-[11px] text-slate-400 mt-0.5">Referencia: {tx.reference}</div>}
                                      {tx.cashier_name && <div className="text-[11px] text-slate-400 mt-0.5">Cajero: {tx.cashier_name}</div>}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>
            )}

            {/* Category tabs — scrollable, big */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className={`px-4 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 flex-shrink-0
                    ${filterCat === cat
                      ? 'bg-amber/15 text-amber border-2 border-amber/20'
                      : 'bg-white/[0.02] text-slate-500 border-2 border-transparent'}`}>
                  {cat === 'all' ? '🏠 Todo' : CAT_LABELS[cat] || cat}
                </button>
              ))}
            </div>

            {/* Products — big cards */}
            <div className="space-y-3">
              {filteredProducts.map(p => {
                const qty = cart[p.id] || 0;
                return (
                  <div key={p.id}
                    className={`rounded-2xl border-2 transition-all overflow-hidden
                      ${qty > 0 ? 'border-amber/20 bg-amber/[0.04]' : 'border-white/[0.04] bg-white/[0.015]'}`}>
                    <div className="flex items-center gap-4 p-4">
                      {/* Category icon */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl
                        ${qty > 0 ? 'bg-amber/15' : 'bg-white/[0.04]'}`}>
                        {CAT_EMOJI[p.category] || '📦'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-bold text-white/90 leading-tight">{p.name}</div>
                        {p.description && <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>}
                        <div className="text-lg font-extrabold text-amber mt-1">${Number(p.price).toFixed(2)}</div>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {qty > 0 ? (
                          <>
                            <button onClick={() => removeFromCart(p.id)}
                              className="w-11 h-11 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center active:scale-90 transition-transform">
                              <Minus size={18} strokeWidth={3} />
                            </button>
                            <span className="text-xl font-extrabold w-8 text-center text-amber">{qty}</span>
                          </>
                        ) : null}
                        <button onClick={() => addToCart(p.id)}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center active:scale-90 transition-transform
                            ${qty > 0 ? 'bg-amber/20 text-amber' : 'bg-amber text-black'}`}>
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating cart button */}
          {cartCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#060A13] via-[#060A13] to-transparent pt-8 px-4"
              style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <div className="max-w-lg mx-auto">
                <button onClick={() => setStep('confirm')}
                  className="w-full py-5 bg-amber text-black font-extrabold rounded-2xl text-lg flex items-center justify-center gap-3 shadow-xl shadow-amber/25 active:scale-[0.98] transition-transform">
                  <ShoppingCart size={22} />
                  <span>Ver Pedido</span>
                  <span className="bg-black/20 px-3 py-1 rounded-xl text-sm">{cartCount} · ${cartTotal.toFixed(2)}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 3: CONFIRM — Clear summary
         ══════════════════════════════════════════ */}
      {step === 'confirm' && customer && (
        <div className="max-w-lg mx-auto px-4 py-5" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep('menu')}
              className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center active:bg-white/10">
              <ArrowLeft size={20} className="text-slate-400" />
            </button>
            <div>
              <h2 className="text-xl font-extrabold">Tu Pedido</h2>
              <p className="text-slate-500 text-xs">Revisa antes de enviar</p>
            </div>
          </div>

          {/* Items */}
          <div className="bg-[#0D1424] rounded-3xl border border-white/5 overflow-hidden mb-4">
            {cartItems.map(({ product: p, qty }, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-4 ${i < cartItems.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                <span className="text-2xl flex-shrink-0">{CAT_EMOJI[p.category] || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white/90 truncate">{p.name}</div>
                  <div className="text-sm text-slate-500">{qty} × ${Number(p.price).toFixed(2)}</div>
                </div>
                <div className="text-base font-extrabold text-white/80 flex-shrink-0">${(p.price * qty).toFixed(2)}</div>
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center justify-between px-4 py-4 bg-amber/[0.04] border-t border-amber/10">
              <span className="text-lg font-extrabold">Total</span>
              <span className="text-2xl font-extrabold text-amber">${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Balance check */}
          <div className={`rounded-2xl p-4 mb-4 border-2 flex items-center gap-3
            ${cartTotal <= customer.available_balance
              ? 'bg-emerald-500/5 border-emerald-500/15'
              : 'bg-red-500/5 border-red-500/15'}`}>
            <Wallet size={24} className={`flex-shrink-0 ${cartTotal <= customer.available_balance ? 'text-emerald-400' : 'text-red-400'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">Tu saldo disponible</div>
              <div className={`text-xl font-extrabold ${cartTotal <= customer.available_balance ? 'text-emerald-400' : 'text-red-400'}`}>
                ${customer.available_balance.toFixed(2)}
              </div>
            </div>
            {cartTotal <= customer.available_balance && (
              <CheckCircle size={24} className="text-emerald-400 flex-shrink-0" />
            )}
          </div>

          {cartTotal > customer.available_balance && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4 text-center">
              <p className="text-red-400 text-sm font-bold">No tienes saldo suficiente</p>
              <p className="text-red-400/60 text-xs mt-1">Pide a alguien de caja que recargue tu saldo</p>
            </div>
          )}

          {/* Note */}
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare size={16} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-400">Nota (opcional)</span>
          </div>
          <input type="text" className="w-full px-5 py-4 bg-[#0D1424] rounded-2xl border-2 border-white/5 text-base mb-5 focus:outline-none focus:border-amber/20"
            placeholder="Ej: Sin hielo, extra limón..." value={note} onChange={e => setNote(e.target.value)} />

          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4 text-center">
              <p className="text-red-400 text-sm font-semibold">{error}</p>
            </div>
          )}

          <button onClick={submitOrder} disabled={loading || cartTotal > customer.available_balance}
            className="w-full py-5 bg-amber text-black font-extrabold rounded-2xl text-lg flex items-center justify-center gap-3 disabled:opacity-30 shadow-lg shadow-amber/20 active:scale-[0.98] transition-transform">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Enviando...
              </span>
            ) : (
              <><Send size={20} /> Enviar Pedido</>
            )}
          </button>

          <button onClick={() => setStep('menu')}
            className="w-full mt-3 py-4 text-slate-500 font-semibold text-sm active:text-white/60">
            ← Volver al menú
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 4: DONE — Celebration!
         ══════════════════════════════════════════ */}
      {step === 'done' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="w-28 h-28 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 animate-[bounceIn_0.5s_ease]">
            <PartyPopper size={56} className="text-emerald-400" />
          </div>

          <h2 className="text-3xl font-extrabold mb-2">¡Pedido Enviado!</h2>
          <p className="text-slate-400 text-lg mb-2">Tu pedido está en camino 🎉</p>

          <div className="bg-[#0D1424] rounded-2xl border border-white/5 px-6 py-4 mb-8 inline-block">
            <div className="text-xs text-slate-500 mb-1">Número de pedido</div>
            <div className="text-2xl font-extrabold text-amber font-mono">#{orderNumber}</div>
          </div>

          <div className="flex items-center gap-3 mb-10 text-slate-500">
            <Clock size={18} />
            <span className="text-sm">Espera tu pedido, te lo llevaremos a tu mesa</span>
          </div>

          <button onClick={() => { setStep('menu'); setNote(''); setError(''); }}
            className="w-full max-w-xs py-5 bg-amber/10 text-amber font-extrabold rounded-2xl text-lg active:bg-amber/20 transition-all">
            Volver al inicio
          </button>

          <button onClick={logout}
            className="mt-3 py-3 text-slate-400 text-sm font-semibold hover:text-white/60 transition-colors">
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
