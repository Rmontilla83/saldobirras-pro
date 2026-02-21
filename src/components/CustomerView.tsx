'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { formatBalance, formatMoney, formatDate, isLowBalance, BANKS } from '@/lib/utils';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import type { Transaction } from '@/lib/types';

interface Props {
  onRecharge: (data: any) => Promise<any>;
  onConsume: (data: any) => Promise<any>;
  onLoadTransactions: (customerId: string) => Promise<Transaction[]>;
  onSendQREmail: (customerId: string) => Promise<any>;
}

export default function CustomerView({ onRecharge, onConsume, onLoadTransactions, onSendQREmail }: Props) {
  const { selectedCustomer: c, setView } = useStore();
  const [consumeAmt, setConsumeAmt] = useState('');
  const [consumeNote, setConsumeNote] = useState('');
  const [rechargeAmt, setRechargeAmt] = useState('');
  const [rechargeBank, setRechargeBank] = useState('');
  const [rechargeRef, setRechargeRef] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!c) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
  const pct = Math.min((c.balance / (c.initial_balance || 1)) * 100, 100);
  const low = isLowBalance(c.balance, c.balance_type) || c.balance <= 0;

  useEffect(() => {
    onLoadTransactions(c.id).then(setTransactions);
  }, [c.id, c.balance]);

  // Generate QR code
  useEffect(() => {
    if (qrRef.current && typeof window !== 'undefined') {
      qrRef.current.innerHTML = '';
      // @ts-ignore
      import('qrcode').then(QRCode => {
        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, c.qr_code, { width: 140, color: { dark: '#1B2A4A', light: '#FFFFFF' } });
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
    await onRecharge({
      customer_id: c.id,
      amount: amt,
      note: 'Recarga',
      bank: rechargeBank || undefined,
      reference: rechargeRef || undefined,
    });
    setRechargeAmt(''); setRechargeBank(''); setRechargeRef('');
  };

  const balColor = c.balance <= 0 ? 'text-rd' : isLowBalance(c.balance, c.balance_type) ? 'text-orange-400' : 'text-amber';
  const barColor = c.balance <= 0 ? 'bg-rd' : isLowBalance(c.balance, c.balance_type) ? 'bg-orange-400' : 'bg-gradient-to-r from-amber to-amber-dark';

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <button onClick={() => setView(isMobile ? 'scan' : 'dashboard')} className="btn-outline text-xs mb-4 w-auto px-4 py-2">
        ← Volver
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left: Profile + actions */}
        <div className="card">
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={c.name} photoUrl={c.photo_url} large />
            <div>
              <div className="text-[22px] font-extrabold text-amber tracking-wide">{c.name}</div>
              <div className="text-sm text-muted mt-1">{c.email}</div>
              {c.phone && <div className="text-sm text-muted">{c.phone}</div>}
              <div className="text-[11px] text-dim mt-1">{formatDate(c.created_at)}</div>
            </div>
          </div>

          {/* Balance */}
          <div className={`p-6 rounded-card text-center mb-5 border ${low ? 'bg-gradient-to-br from-orange-400/[0.06] to-rd/[0.03] border-orange-400/[0.12]' : 'bg-gradient-to-br from-amber/[0.04] to-amber/[0.01] border-amber/[0.06]'}`}>
            <div className="text-[10px] text-muted uppercase tracking-[3px] font-bold mb-2">Saldo Disponible</div>
            <div className={`text-[52px] font-black tracking-wider ${balColor}`}>
              {c.balance_type === 'money' ? formatMoney(c.balance) : c.balance}
            </div>
            {c.balance_type === 'beers' && <div className="text-muted mt-1">cervezas restantes</div>}
            <div className="h-1 rounded bg-amber/[0.06] overflow-hidden mt-3">
              <div className={`h-full rounded transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2.5"><StatusBadge customer={c} /></div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cobrar consumo</label>
              <input type="number" min="0" className="input" value={consumeAmt} onChange={e => setConsumeAmt(e.target.value)}
                placeholder={c.balance_type === 'money' ? '0.00' : '1'} />
              <input type="text" className="input mt-1.5" value={consumeNote} onChange={e => setConsumeNote(e.target.value)}
                placeholder="IPA, Stout, Lager..." />
              <button onClick={handleConsume} className="btn-red w-full mt-2">Descontar</button>
            </div>
            <div>
              <label className="label">Recargar saldo</label>
              <input type="number" min="0" className="input" value={rechargeAmt} onChange={e => setRechargeAmt(e.target.value)}
                placeholder={c.balance_type === 'money' ? '0.00' : '5'} />
              <select className="input mt-1.5" value={rechargeBank} onChange={e => setRechargeBank(e.target.value)}>
                <option value="">Banco / Método de pago</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <input type="text" className="input mt-1.5" value={rechargeRef} onChange={e => setRechargeRef(e.target.value)}
                placeholder="Referencia de pago" />
              <button onClick={handleRecharge} className="btn-green w-full mt-2">Recargar</button>
            </div>
          </div>
        </div>

        {/* Right: QR + History */}
        <div className="flex flex-col gap-4">
          <div className="card text-center">
            <h3 className="text-[13px] font-extrabold tracking-[2.5px] uppercase text-amber mb-4">Código QR</h3>
            <div className="inline-block p-4 bg-white rounded-card shadow-[0_8px_32px_rgba(0,0,0,0.3)]" ref={qrRef} />
            <div className="text-[11px] text-dim mt-2.5 break-all">ID: {c.qr_code}</div>
            {c.email && (
              <button onClick={() => onSendQREmail(c.id)} className="btn-outline mt-3 text-[10px] px-3 py-2">
                📧 Enviar QR por Correo
              </button>
            )}
          </div>

          <div className="card flex-1 overflow-y-auto max-h-[300px]">
            <h3 className="text-[13px] font-extrabold tracking-[2.5px] uppercase text-amber mb-4">Historial de Movimientos</h3>
            {!transactions.length ? (
              <div className="text-center text-muted py-5">Sin movimientos registrados</div>
            ) : (
              transactions.map(t => (
                <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-amber/[0.03]">
                  <div>
                    <div className="font-semibold text-sm">
                      {t.type === 'recharge' ? '↑' : '↓'} {t.note}
                    </div>
                    <div className="text-[11px] text-dim">{formatDate(t.created_at)}</div>
                  </div>
                  <div className={`text-[17px] font-extrabold tracking-wide ${t.type === 'recharge' ? 'text-gn' : 'text-rd'}`}>
                    {t.type === 'recharge' ? '+' : '-'}{c.balance_type === 'money' ? formatMoney(t.amount) : t.amount}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
