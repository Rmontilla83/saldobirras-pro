'use client';

import { useState } from 'react';
import { Camera, UserPlus } from 'lucide-react';
import type { BalanceType, VenueZone } from '@/lib/types';
import { ZONE_LABELS } from '@/lib/types';

interface Props { onSubmit: (data: any) => Promise<any>; }

export default function RegisterView({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [balanceType, setBalanceType] = useState<BalanceType>('money');
  const [initialBalance, setInitialBalance] = useState('');
  const [zone, setZone] = useState<VenueZone>('general');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!name || !initialBalance) return;
    setLoading(true);
    await onSubmit({ name, email: email || undefined, phone: phone || undefined, balance_type: balanceType, initial_balance: parseFloat(initialBalance), zone, photo });
    setLoading(false);
    setName(''); setEmail(''); setPhone(''); setInitialBalance(''); setZone('general'); setPhoto(null); setPhotoPreview(null);
  };

  return (
    <div className="max-w-[440px] mx-auto animate-[fadeIn_0.25s_ease]">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="icon-box" style={{background:'rgba(245,166,35,0.08)'}}>
            <UserPlus size={18} className="text-amber" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white/90">Nuevo Cliente</h2>
            <p className="text-[11px] text-slate-500">Registrar cliente con saldo inicial</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <label className="cursor-pointer inline-block group">
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-[72px] h-[72px] rounded-2xl object-cover border-2 border-amber/15 group-hover:border-amber/30 transition-colors" />
              ) : (
                <div className="w-[72px] h-[72px] rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center group-hover:border-amber/30 transition-colors">
                  <Camera size={20} className="text-slate-600 group-hover:text-amber/60 transition-colors" />
                  <span className="text-[8px] text-slate-600 mt-1 font-semibold uppercase tracking-wider">Foto</span>
                </div>
              )}
            </label>
          </div>

          <div>
            <label className="label">Nombre completo</label>
            <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Correo electrónico</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@email.com" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+58 412 ..." />
            </div>
          </div>
          <div>
            <label className="label">Tipo de saldo</label>
            <div className="flex gap-2">
              {(['money', 'beers'] as const).map(t => (
                <button key={t} onClick={() => setBalanceType(t)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                    ${balanceType === t
                      ? 'bg-amber/[0.08] text-amber border-[1.5px] border-amber/20'
                      : 'bg-transparent text-slate-500 border-[1.5px] border-slate-800 hover:border-slate-700'}`}>
                  {t === 'money' ? '$ Dólares' : '🍺 Cervezas'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{balanceType === 'money' ? 'Monto inicial (USD)' : 'Cantidad de cervezas'}</label>
              <input type="number" min="0" step={balanceType === 'money' ? '0.01' : '1'} className="input" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} placeholder={balanceType === 'money' ? '50.00' : '10'} />
            </div>
            <div>
              <label className="label">Zona</label>
              <select className="input" value={zone} onChange={e => setZone(e.target.value as VenueZone)}>
                {Object.entries(ZONE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={loading || !name || !initialBalance} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
            {loading ? <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> : <><UserPlus size={15}/> Registrar Cliente</>}
          </button>
        </div>
      </div>
    </div>
  );
}
