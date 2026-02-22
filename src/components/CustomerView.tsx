'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { formatBalance, formatMoney, formatDate, isLowBalance, BANKS } from '@/lib/utils';
import { ArrowLeft, Pencil, Mail, QrCode, Minus, Plus, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import EditCustomerModal from './EditCustomerModal';
import type { Transaction } from '@/lib/types';

interface Props {
  onRecharge: (data: any) => Promise<any>;
  onConsume: (data: any) => Promise<any>;
  onLoadTransactions: (customerId: string) => Promise<Transaction[]>;
  onSendQREmail: (customerId: string) => Promise<any>;
  onEditCustomer: (formData: FormData) => Promise<any>;
}

export default function CustomerView({ onRecharge, onConsume, onLoadTransactions, onSendQREmail, onEditCustomer }: Props) {
  const { selectedCustomer: c, setView, user } = useStore();
  const [consumeAmt, setConsumeAmt] = useState('');
  const [consumeNote, setConsumeNote] = useState('');
  const [rechargeAmt, setRechargeAmt] = useState('');
  const [rechargeBank, setRechargeBank] = useState('');
  const [rechargeRef, setRechargeRef] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.role === 'owner';
  const can = (perm: string) => isOwner || (user?.permissions as any)?.[perm];

  if (!c) return null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
  const pct = Math.min((c.balance / (c.initial_balance || 1)) * 100, 100);
  const low = isLowBalance(c.balance, c.balance_type) || c.balance <= 0;

  useEffect(() => { onLoadTransactions(c.id).then(setTransactions); }, [c.id, c.balance]);

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

  const handleConsume = async () => {
    const amt = parseFloat(consumeAmt);
    if (!amt || amt <= 0) return;
    await onConsume({ customer_id: c.id, amount: amt, note: consumeNote || 'Consumo' });
    setConsumeAmt(''); setConsumeNote('');
  };

  const handleRecharge = async () => {
    const amt = parseFloat(rechargeAmt);
    if (!amt || amt <= 0) return;
    await onRecharge({ customer_id: c.id, amount: amt, note: 'Recarga', bank: rechargeBank || undefined, reference: rechargeRef || undefined });
    setRechargeAmt(''); setRechargeBank(''); setRechargeRef('');
  };

  const balColor = c.balance <= 0 ? 'text-red-400' : low ? 'text-yellow-500' : 'text-amber';
  const barColor = c.balance <= 0 ? 'bg-red-500' : low ? 'bg-yellow-500' : 'bg-gradient-to-r from-amber to-amber-dark';

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
            </div>
          </div>

          {/* Actions — only show cards the user has permission for */}
          <div className={`grid gap-3 ${can('consume') && can('recharge') ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {can('consume') && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <div className="icon-box" style={{background:'rgba(239,68,68,0.06)'}}><Minus size={15} className="text-red-400"/></div>
                <span className="text-xs font-bold text-white/80">Cobrar</span>
              </div>
              <input type="number" min="0" className="input text-sm" value={consumeAmt} onChange={e => setConsumeAmt(e.target.value)} placeholder={c.balance_type === 'money' ? '0.00' : '1'} />
              <input type="text" className="input text-sm mt-1.5" value={consumeNote} onChange={e => setConsumeNote(e.target.value)} placeholder="IPA, Stout, Lager..." />
              <button onClick={handleConsume} className="btn-red w-full mt-2.5 py-2.5 text-[10px]">Descontar</button>
            </div>
            )}
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
              <button onClick={handleRecharge} className="btn-green w-full mt-2.5 py-2.5 text-[10px]">Recargar</button>
            </div>
            )}
            {!can('consume') && !can('recharge') && (
              <div className="card text-center py-8">
                <div className="text-slate-600 text-sm">No tienes permisos para operar saldos</div>
              </div>
            )}
          </div>
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
              const { generateCard } = await import('@/lib/card-generator');
              await generateCard(c);
            }} className="btn-outline mt-2 text-[10px] px-3 py-2 flex items-center gap-1.5 mx-auto">
              <CreditCard size={12}/> Imprimir Carnet
            </button>
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
                        <div className="text-[10px] text-slate-600">{formatDate(t.created_at)}</div>
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
