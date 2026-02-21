'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { formatBalance } from '@/lib/utils';
import { Camera, Search, StopCircle, ArrowRight } from 'lucide-react';
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
    const { Html5Qrcode } = await import('html5-qrcode');
    setTimeout(async () => {
      const el = document.getElementById('qr-scanner');
      if (!el) return;
      const scanner = new Html5Qrcode('qr-scanner');
      scannerRef.current = scanner;
      try {
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => { stopScan(); const customer = await onScan(decodedText); if (customer) setResult(customer); }, () => {});
      } catch { setScanning(false); }
    }, 150);
  };

  const stopScan = () => {
    if (scannerRef.current) { try { scannerRef.current.stop().catch(() => {}); } catch {} scannerRef.current = null; }
    setScanning(false);
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    const customer = await onSearch(searchInput.trim());
    if (customer) setResult(customer);
  };

  return (
    <div className="max-w-[400px] mx-auto animate-[fadeIn_0.25s_ease]">
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="icon-box" style={{background:'rgba(245,166,35,0.08)'}}><Camera size={18} className="text-amber"/></div>
          <div>
            <h2 className="text-sm font-bold text-white/90">Escanear QR</h2>
            <p className="text-[11px] text-slate-500">Identifica un cliente</p>
          </div>
        </div>

        {scanning ? (
          <>
            <div id="qr-scanner" className="w-full max-w-[300px] mx-auto rounded-2xl overflow-hidden border-2 border-amber/20 shadow-[0_0_40px_rgba(245,166,35,0.08)] mb-4" />
            <button onClick={stopScan} className="btn-red text-[10px] w-auto mx-auto flex items-center gap-1.5 px-4 py-2">
              <StopCircle size={13}/> Detener
            </button>
          </>
        ) : (
          <>
            <button onClick={startScan} className="btn-primary w-full py-4 text-xs flex items-center justify-center gap-2">
              <Camera size={16}/> Abrir Cámara
            </button>
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent my-5" />
            <label className="label">Búsqueda manual</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input type="text" className="input pl-9 text-xs" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSearch()} placeholder="Nombre, correo o ID..." />
            </div>
            <button onClick={handleSearch} className="btn-outline w-full mt-2">Buscar</button>
          </>
        )}

        {result && (
          <div className="mt-5 p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02]">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={result.name} photoUrl={result.photo_url} />
              <div>
                <div className="font-bold text-sm text-amber">{result.name}</div>
                <div className="text-[11px] text-slate-500">{result.email}</div>
              </div>
            </div>
            <div className="text-center mb-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-[2px] font-semibold">Saldo</div>
              <div className={`text-[28px] font-extrabold tabular-nums mt-0.5 ${result.balance <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {formatBalance(result.balance, result.balance_type)}
              </div>
              <StatusBadge customer={result} />
            </div>
            <button onClick={() => setView('customer', result)} className="btn-primary w-full flex items-center justify-center gap-1.5">
              Abrir Perfil <ArrowRight size={14}/>
            </button>
            <div className="text-center text-[10px] text-slate-600 mt-2">✓ Notificación enviada al dashboard</div>
          </div>
        )}
      </div>
    </div>
  );
}
