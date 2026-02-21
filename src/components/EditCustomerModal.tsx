'use client';

import { useState } from 'react';
import Avatar from './Avatar';
import type { Customer } from '@/lib/types';

interface Props {
  customer: Customer;
  onSave: (data: FormData) => Promise<any>;
  onClose: () => void;
}

export default function EditCustomerModal({ customer, onSave, onClose }: Props) {
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(customer.photo_url);
  const [loading, setLoading] = useState(false);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('customer_id', customer.id);
    formData.append('name', name.trim());
    formData.append('email', email.trim());
    formData.append('phone', phone.trim());
    if (photo) formData.append('photo', photo);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-bg/70 backdrop-blur-lg flex items-center justify-center" onClick={onClose}>
      <div className="bg-bg-3 border border-amber/15 rounded-[20px] p-7 max-w-[420px] w-[90%] shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-[popScale_0.3s_ease]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[13px] font-extrabold tracking-[2.5px] uppercase text-amber">Editar Cliente</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 text-muted text-lg flex items-center justify-center hover:bg-rd/10 hover:text-rd">✕</button>
        </div>

        <div className="space-y-4">
          {/* Photo */}
          <div className="text-center">
            <label className="cursor-pointer inline-block">
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {photoPreview ? (
                <div className="relative inline-block">
                  <img src={photoPreview} alt="Foto" className="w-[80px] h-[80px] rounded-[20px] object-cover border-2 border-amber/20" />
                  <div className="absolute inset-0 rounded-[20px] bg-bg/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-amber text-xs font-bold">Cambiar</span>
                  </div>
                </div>
              ) : (
                <div className="relative inline-block">
                  <Avatar name={customer.name} large />
                  <div className="absolute inset-0 rounded-[20px] bg-bg/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-amber text-xs font-bold">+ Foto</span>
                  </div>
                </div>
              )}
            </label>
            <p className="text-[10px] text-dim mt-1.5">Clic para cambiar foto</p>
          </div>

          <div>
            <label className="label">Nombre</label>
            <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+58 412 1234567" />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button onClick={onClose} className="btn-outline flex-1">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
