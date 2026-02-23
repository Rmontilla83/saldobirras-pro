'use client';

import { useState } from 'react';
import { X, Camera, Save } from 'lucide-react';
import Avatar from './Avatar';
import type { Customer } from '@/lib/types';

interface Props { customer: Customer; onSave: (data: FormData) => Promise<any>; onClose: () => void; }

export default function EditCustomerModal({ customer, onSave, onClose }: Props) {
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [allowNegative, setAllowNegative] = useState((customer as any).allow_negative || false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(customer.photo_url);
  const [loading, setLoading] = useState(false);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhoto(file);
    const reader = new FileReader(); reader.onload = () => setPhotoPreview(reader.result as string); reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('customer_id', customer.id);
    formData.append('name', name.trim());
    formData.append('email', email.trim());
    formData.append('phone', phone.trim());
    formData.append('allow_negative', String(allowNegative));
    if (photo) formData.append('photo', photo);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xl flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#101828] border border-amber/10 rounded-3xl p-7 max-w-[400px] w-[90%] shadow-[0_32px_80px_rgba(0,0,0,0.5)] animate-[popScale_0.3s_ease]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-white/90">Editar Cliente</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.03] text-slate-500 flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition-colors"><X size={15}/></button>
        </div>
        <div className="space-y-4">
          <div className="text-center">
            <label className="cursor-pointer inline-block group">
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {photoPreview ? (
                <div className="relative inline-block">
                  <img src={photoPreview} alt="" className="w-[72px] h-[72px] rounded-2xl object-cover border-2 border-amber/15" />
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={16} className="text-white"/>
                  </div>
                </div>
              ) : (
                <div className="relative inline-block">
                  <Avatar name={customer.name} large />
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={16} className="text-white"/>
                  </div>
                </div>
              )}
            </label>
          </div>
          <div><label className="label">Nombre</label><input type="text" className="input" value={name} onChange={e=>setName(e.target.value)} /></div>
          <div><label className="label">Correo</label><input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
          <div><label className="label">Teléfono</label><input type="tel" className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+58 412 ..." /></div>
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
            <button onClick={() => setAllowNegative(!allowNegative)}
              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-all flex-shrink-0
                ${allowNegative ? 'bg-amber/20 text-amber border border-amber/30' : 'bg-slate-800 border border-slate-700'}`}>
              {allowNegative ? '✓' : ''}
            </button>
            <div>
              <div className="text-xs text-white/80 font-medium">Permitir saldo negativo</div>
              <div className="text-[10px] text-slate-500">El cliente puede consumir sin saldo (postpago)</div>
            </div>
          </div>
          <div className="flex gap-2.5 pt-1">
            <button onClick={onClose} className="btn-outline flex-1">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50">
              {loading ? <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> : <><Save size={13}/> Guardar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
