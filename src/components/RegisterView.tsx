'use client';

import { useState } from 'react';
import type { BalanceType } from '@/lib/types';

interface Props {
  onSubmit: (data: any) => Promise<any>;
}

export default function RegisterView({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [balanceType, setBalanceType] = useState<BalanceType>('money');
  const [initialBalance, setInitialBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !initialBalance) return;
    setLoading(true);
    await onSubmit({
      name,
      email: email || undefined,
      phone: phone || undefined,
      balance_type: balanceType,
      initial_balance: parseFloat(initialBalance),
    });
    setLoading(false);
    setName(''); setEmail(''); setPhone(''); setInitialBalance('');
  };

  return (
    <div className="max-w-[460px] mx-auto animate-[fadeIn_0.25s_ease]">
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <img src="/logo.png" className="w-[52px] h-[52px]" alt="" />
          <h2 className="text-[13px] font-extrabold tracking-[2.5px] uppercase text-amber">Nuevo Cliente</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@email.com" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+58 412 1234567" />
          </div>
          <div>
            <label className="label">Tipo de saldo</label>
            <div className="flex gap-2">
              {(['money', 'beers'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setBalanceType(t)}
                  className={`flex-1 py-3 rounded-xl border-[1.5px] text-center font-semibold text-sm transition-all
                    ${balanceType === t
                      ? 'border-amber bg-amber/[0.06] text-amber'
                      : 'border-amber/[0.06] bg-transparent text-muted'
                    }`}
                >
                  {t === 'money' ? '💵 Dólares' : '🍺 Cervezas'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{balanceType === 'money' ? 'Monto inicial (USD)' : 'Cantidad de cervezas'}</label>
            <input
              type="number"
              min="0"
              step={balanceType === 'money' ? '0.01' : '1'}
              className="input"
              value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
              placeholder={balanceType === 'money' ? '50.00' : '10'}
            />
          </div>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-4 disabled:opacity-50">
            {loading ? 'Registrando...' : 'Registrar Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}
