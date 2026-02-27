'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warn' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'default', onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const btnClass = variant === 'danger' ? 'btn-red' : 'btn-primary';

  return (
    <div className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-xl flex items-center justify-center" onClick={onCancel}>
      <div ref={ref} tabIndex={-1} className="bg-[#101828] border border-amber/10 rounded-3xl p-7 max-w-[380px] w-[90%] shadow-[0_32px_80px_rgba(0,0,0,0.5)] animate-[popScale_0.3s_ease] outline-none" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${variant === 'danger' ? 'bg-red-500/10' : 'bg-amber/10'}`}>
            <AlertTriangle size={24} className={variant === 'danger' ? 'text-red-400' : 'text-amber'} />
          </div>
          <h3 className="text-base font-bold text-white/90 mb-1">{title}</h3>
          <p className="text-sm text-slate-400">{message}</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="btn-outline flex-1">{cancelLabel}</button>
          <button onClick={onConfirm} className={`${btnClass} flex-1`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
