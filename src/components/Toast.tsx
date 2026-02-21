'use client';

interface ToastProps {
  msg: string;
  type: 'ok' | 'error' | 'warn';
}

export default function Toast({ msg, type }: ToastProps) {
  const cls = type === 'ok' ? 'toast-ok' : type === 'error' ? 'toast-error' : 'toast-warn';
  return <div className={`toast ${cls}`}>{msg}</div>;
}
