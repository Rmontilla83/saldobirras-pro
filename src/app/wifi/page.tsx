'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wifi, Loader2, Star } from 'lucide-react';

interface GatewayParams {
  gw_address: string;
  gw_port: string;
  gw_id: string;
  mac: string;
  url: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  balance: number;
  is_active: boolean;
  is_vip: boolean;
  qr_code: string;
}

export default function WifiPortalPage() {
  const [gwParams, setGwParams] = useState<GatewayParams | null>(null);
  const [step, setStep] = useState<'loading' | 'pin' | 'connecting' | 'error' | 'debug'>('loading');
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [debugUrl, setDebugUrl] = useState('');

  // 1. Capture gateway params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setGwParams({
      gw_address: params.get('gw_address') || '',
      gw_port: params.get('gw_port') || '2060',
      gw_id: params.get('gw_id') || '',
      mac: params.get('mac') || '',
      url: params.get('url') || '',
    });
  }, []);

  // 2. Try auto-login from localStorage
  useEffect(() => {
    if (!gwParams) return;

    const savedQr = localStorage.getItem('birrasport_customer_qr');
    if (savedQr) {
      autoConnect(savedQr);
    } else {
      setStep('pin');
    }
  }, [gwParams]);

  const autoConnect = async (qrCode: string) => {
    setStep('loading');
    try {
      const res = await fetch(`/api/portal?qr=${encodeURIComponent(qrCode)}`);
      const data = await res.json();
      if (data.success && data.data.customer) {
        const customer: CustomerInfo = data.data.customer;
        if (customer.is_vip || (customer.balance > 0 && customer.is_active)) {
          setCustomerName(customer.name.split(' ')[0]);
          setIsVip(customer.is_vip);
          setStep('connecting');
          await createSessionAndRedirect(customer);
        } else {
          setStep('pin');
          setError('Tu cuenta no tiene saldo activo. Recarga en la barra.');
          localStorage.removeItem('birrasport_customer_qr');
        }
      } else {
        // Saved QR is invalid
        localStorage.removeItem('birrasport_customer_qr');
        setStep('pin');
      }
    } catch {
      localStorage.removeItem('birrasport_customer_qr');
      setStep('pin');
    }
  };

  const createSessionAndRedirect = async (customer: CustomerInfo) => {
    if (!gwParams?.gw_address) {
      // No gateway params — show success without redirect
      setStep('error');
      setError('Parámetros del gateway no encontrados. Conéctate a la red BirraSport WiFi.');
      return;
    }

    // Generate 32-char hex token (works in both HTTP and HTTPS contexts)
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');

    try {
      const res = await fetch('/api/wifi/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          token,
          mac: gwParams.mac,
          gw_address: gwParams.gw_address,
        }),
      });
      const data = await res.json();

      if (data.success) {
        // Save session for portal auto-detect and WiFi status display
        localStorage.setItem('birrasport_customer_qr', customer.qr_code);
        localStorage.setItem('birrasport_wifi_expires', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
        // Redirect to gateway — plain HTTP, exact path, no trailing slash
        window.location.href = `http://${gwParams.gw_address}:${gwParams.gw_port}/wifidog/auth?token=${token}`;
      } else {
        setStep('error');
        setError(data.error || 'Error al crear sesión WiFi');
      }
    } catch {
      setStep('error');
      setError('Error de conexión. Intenta de nuevo.');
    }
  };

  const handlePinSubmit = useCallback(async (pin: string) => {
    setError('');
    setStep('connecting');

    try {
      const res = await fetch(`/api/portal?pin=${encodeURIComponent(pin)}`);
      const data = await res.json();

      if (data.success && data.data.customer) {
        const customer: CustomerInfo = data.data.customer;

        if (!customer.is_vip && !customer.is_active) {
          setStep('pin');
          setError('Tu cuenta está inactiva.');
          setPinInput('');
          return;
        }

        if (!customer.is_vip && customer.balance <= 0) {
          setStep('pin');
          setError('Necesitas saldo activo para usar el WiFi. Recarga en la barra.');
          setPinInput('');
          return;
        }

        setCustomerName(customer.name.split(' ')[0]);
        setIsVip(customer.is_vip);
        await createSessionAndRedirect(customer);
      } else {
        setStep('pin');
        setError(data.error || 'PIN no encontrado');
        setPinInput('');
      }
    } catch {
      setStep('pin');
      setError('Error de conexión');
      setPinInput('');
    }
  }, [gwParams]);

  const handlePinChange = (index: number, value: string) => {
    const v = value.replace(/\D/g, '');
    const newPin = pinInput.split('');
    newPin[index] = v;
    const joined = newPin.join('').slice(0, 6);
    setPinInput(joined);

    if (v && index < 5) {
      document.getElementById(`wifi-pin-${index + 1}`)?.focus();
    }

    if (joined.length === 6) {
      handlePinSubmit(joined);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinInput[index] && index > 0) {
      const prev = pinInput.split('');
      prev[index - 1] = '';
      setPinInput(prev.join(''));
      document.getElementById(`wifi-pin-${index - 1}`)?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#060A13] text-white flex flex-col">
      {/* ── LOADING: Auto-detecting saved session ── */}
      {step === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
            <Wifi size={40} className="text-amber-400 animate-pulse" />
          </div>
          <p className="text-slate-400 text-lg font-semibold">Detectando sesión...</p>
          <Loader2 size={24} className="text-amber-400 animate-spin mt-4" />
        </div>
      )}

      {/* ── CONNECTING: Authenticated, redirecting to gateway ── */}
      {step === 'connecting' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
            <Wifi size={40} className="text-amber-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">
            {customerName ? `Hola, ${customerName}!` : 'Conectando...'}
          </h1>
          {isVip && (
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/20 mb-3">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="text-amber-400 text-sm font-bold">Acceso VIP — WiFi Libre</span>
            </div>
          )}
          <p className="text-slate-400 text-lg">Conectándote al WiFi...</p>
          <Loader2 size={28} className="text-amber-400 animate-spin mt-6" />
        </div>
      )}

      {/* ── PIN: Enter PIN to authenticate ── */}
      {step === 'pin' && (
        <div className="flex-1 flex flex-col">
          {/* Branding */}
          <div className="pt-14 pb-6 text-center">
            <img
              src="/birrasport-logo.png"
              alt="BirraSport"
              className="w-20 h-20 mx-auto mb-4 drop-shadow-[0_4px_24px_rgba(245,166,35,0.3)]"
            />
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              WUIPI-Birrasport
            </h1>
            <p className="text-slate-500 text-sm mt-2">Ingresa tu PIN de 6 dígitos para conectarte</p>
          </div>

          <div className="flex-1 px-6 pb-8 max-w-md mx-auto w-full">
            {/* PIN inputs */}
            <div className="flex justify-center gap-2.5 mb-6">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <input
                  key={i}
                  id={`wifi-pin-${i}`}
                  type="tel"
                  maxLength={1}
                  inputMode="numeric"
                  pattern="[0-9]"
                  autoComplete="off"
                  className="w-12 h-16 bg-[#0D1424] rounded-2xl border-2 border-white/10 text-center text-2xl font-extrabold text-amber-400 focus:outline-none focus:border-amber-500/60 focus:shadow-[0_0_20px_rgba(245,166,35,0.15)] transition-all"
                  value={pinInput[i] || ''}
                  onChange={e => handlePinChange(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center mb-6">
                <p className="text-red-400 text-sm font-semibold">{error}</p>
              </div>
            )}

            {/* Connect button */}
            <button
              onClick={() => pinInput.length === 6 && handlePinSubmit(pinInput)}
              disabled={pinInput.length < 6}
              className="w-full py-5 bg-amber-500 text-black font-extrabold rounded-2xl text-lg disabled:opacity-20 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Wifi size={22} />
              Conectar
            </button>

            {/* Help text */}
            <p className="text-center text-slate-600 text-xs mt-6 leading-relaxed">
              Tu PIN es el número de 6 dígitos de tu tarjeta BirraSport.
              <br />
              Si no lo recuerdas, pregunta en la barra.
            </p>
          </div>
        </div>
      )}

      {/* ── ERROR: Something went wrong ── */}
      {step === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <Wifi size={40} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Error de conexión</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => { setStep('pin'); setError(''); setPinInput(''); }}
            className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold active:bg-white/10 transition-all"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* ── GATEWAY: Activate internet ── */}
      {step === 'debug' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <Wifi size={40} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">
            {customerName ? `Hola, ${customerName}!` : 'Autenticado!'}
          </h1>
          {isVip && (
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/20 mb-3">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="text-amber-400 text-sm font-bold">Acceso VIP</span>
            </div>
          )}
          <p className="text-slate-400 mb-6">Toca el botón para activar tu internet</p>
          <a
            href={debugUrl}
            className="w-full max-w-xs py-5 bg-emerald-500 text-black font-extrabold rounded-2xl text-lg flex items-center justify-center gap-3 active:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Wifi size={22} />
            Activar Internet
          </a>
          <p className="text-slate-600 text-xs mt-6">Si no funciona, intenta de nuevo desde el inicio</p>
        </div>
      )}
    </div>
  );
}
