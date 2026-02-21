'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { formatBalance } from '@/lib/utils';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import type { Customer } from '@/lib/types';

interface Props {
  onScan: (qr: string) => Promise<Customer | null>;
  onSearch: (query: string) => Promise<Customer | null>;
}

export default function ScanView({ onScan, onSearch }: Props) {
  const { setView } = useStore();
  const [scanning, setScanning] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState<Customer | null>(null);
  const scannerRef = useRef<any>(null);

  const startScan = async () => {
    setScanning(true);
    // Dynamic import html5-qrcode
    const { Html5Qrcode } = await import('html5-qrcode');
    setTimeout(async () => {
      const el = document.getElementById('qr-scanner');
      if (!el) return;
      const scanner = new Html5Qrcode('qr-scanner');
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            stopScan();
            const customer = await onScan(decodedText);
            if (customer) setResult(customer);
          },
          () => {}
        );
      } catch {
        setScanning(false);
      }
    }, 150);
  };

  const stopScan = () => {
    if (scannerRef.current) {
      try { scannerRef.current.stop().catch(() => {}); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    const customer = await onSearch(searchInput.trim());
    if (customer) setResult(customer);
  };

  return (
    <div className="max-w-[420px] mx-auto animate-[fadeIn_0.25s_ease]">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <img src="/logo.png" className="w-12 h-12" alt="" />
          <h2 className="text-[13px] font-extrabold tracking-[2.5px] uppercase text-amber">Escanear QR</h2>
        </div>

        {scanning ? (
          <>
            <div id="qr-scanner" className="w-full max-w-[320px] mx-auto rounded-card overflow-hidden border-[3px] border-amber shadow-[0_0_40px_rgba(245,166,35,0.15)] mb-4" />
            <button onClick={() => { stopScan(); }} className="btn-red text-xs w-auto mx-auto block px-4 py-2">
              ⏹ Detener Cámara
            </button>
          </>
        ) : (
          <>
            <button onClick={startScan} className="btn-primary w-full py-4 text-sm mb-3">
              📷 Abrir Cámara
            </button>

            <div className="h-px bg-gradient-to-r from-transparent via-amber/[0.12] to-transparent my-5" />

            <div className="mb-2">
              <label className="label">Búsqueda manual</label>
              <input
                type="text"
                className="input"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="ID, nombre o correo del cliente..."
              />
            </div>
            <button onClick={handleSearch} className="btn-outline w-full">Buscar</button>
          </>
        )}

        {result && (
          <div className="mt-5 p-5 rounded-card bg-gn/[0.04] border border-gn/[0.12]">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={result.name} photoUrl={result.photo_url} />
              <div>
                <div className="font-bold text-amber text-base">{result.name}</div>
                <div className="text-[11px] text-muted">{result.email}</div>
              </div>
            </div>
            <div className="text-center mb-3">
              <div className="text-[10px] text-muted uppercase tracking-[2px] font-bold">Saldo</div>
              <div className={`text-[32px] font-black tracking-wider mt-1 ${result.balance <= 0 ? 'text-rd' : 'text-gn'}`}>
                {formatBalance(result.balance, result.balance_type)}
              </div>
              <div className="mt-1.5"><StatusBadge customer={result} /></div>
            </div>
            <button onClick={() => setView('customer', result)} className="btn-primary w-full">
              Abrir Perfil →
            </button>
            <div className="text-center text-[11px] text-dim mt-2.5">✓ Notificación enviada al dashboard</div>
          </div>
        )}
      </div>
    </div>
  );
}
