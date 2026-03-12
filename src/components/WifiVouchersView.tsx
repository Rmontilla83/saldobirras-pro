'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { WifiVoucher } from '@/lib/types';
import { Upload, Clipboard, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  showToast: (msg: string, type?: 'ok' | 'error' | 'warn') => void;
}

interface VoucherStats {
  total: number;
  available: number;
  assigned: number;
  alert: boolean;
}

export default function WifiVouchersView({ showToast }: Props) {
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [vouchers, setVouchers] = useState<WifiVoucher[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [manualCodes, setManualCodes] = useState('');
  const [previewCodes, setPreviewCodes] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const getSession = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const apiCall = async (url: string, method = 'GET', body?: any) => {
    const session = await getSession();
    if (!session) return null;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };

  const loadStats = async () => {
    const res = await apiCall('/api/wifi/vouchers');
    if (res?.success) setStats(res.data);
  };

  const loadVouchers = async (statusFilter?: string) => {
    const s = statusFilter || filter;
    const url = s === 'all' ? '/api/wifi/vouchers/list' : `/api/wifi/vouchers/list?status=${s}`;
    const res = await apiCall(url);
    if (res?.success) setVouchers(res.data);
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadVouchers()]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    loadVouchers(filter);
  }, [filter]);

  const uploadCodes = async (codes: string[]) => {
    setUploading(true);
    const res = await apiCall('/api/wifi/vouchers', 'POST', { codes });
    if (res?.success) {
      const d = res.data;
      showToast(`${d.inserted} vouchers cargados${d.duplicates > 0 ? ` (${d.duplicates} duplicados ignorados)` : ''}`);
      setPreviewCodes(null);
      setManualCodes('');
      refresh();
    } else {
      showToast(res?.error || 'Error al cargar vouchers', 'error');
    }
    setUploading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
        const codes = data
          .slice(1)
          .map((row: any[]) => row[0]?.toString().trim())
          .filter(Boolean);
        if (codes.length === 0) {
          showToast('No se encontraron códigos en el archivo', 'error');
          return;
        }
        setPreviewCodes(codes);
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      showToast('Error al leer el archivo', 'error');
    }
    // Reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleManualLoad = () => {
    const codes = manualCodes
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (codes.length === 0) {
      showToast('Pega al menos un código', 'warn');
      return;
    }
    setPreviewCodes(codes);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      assigned: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    };
    const labels: Record<string, string> = {
      available: 'Disponible',
      assigned: 'Asignado',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold border ${map[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="animate-[fadeIn_0.25s_ease] space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
          <span className="text-xl">📶</span> Vouchers WiFi
        </h2>
        <button onClick={refresh} className="btn-outline text-[10px] px-3 py-2 flex items-center gap-1.5">
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`card text-center ${stats.available < 10 ? '!border-red-500/30 !bg-red-500/[0.03]' : ''}`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Disponibles</div>
            <div className={`text-2xl font-extrabold ${stats.available < 10 ? 'text-red-400' : 'text-emerald-400'}`}>
              {stats.available}
            </div>
            {stats.available < 10 && (
              <div className="flex items-center justify-center gap-1 mt-1 text-[9px] text-red-400 font-semibold">
                <AlertTriangle size={10} /> Quedan pocos!
              </div>
            )}
          </div>
          <div className="card text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Asignados</div>
            <div className="text-2xl font-extrabold text-blue-400">{stats.assigned}</div>
          </div>
          <div className="card text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Total</div>
            <div className="text-2xl font-extrabold text-slate-400">{stats.total}</div>
          </div>
        </div>
      )}

      {/* Upload section */}
      <div className="card">
        <h3 className="text-xs font-bold text-white/80 mb-4">Cargar Vouchers</h3>

        {/* Preview modal */}
        {previewCodes && (
          <div className="mb-4 p-4 rounded-xl bg-amber/[0.04] border border-amber/10">
            <div className="text-sm font-semibold text-white/80 mb-2">
              Se encontraron {previewCodes.length} vouchers. ¿Cargar?
            </div>
            <div className="max-h-[120px] overflow-y-auto mb-3 text-[11px] text-slate-400 font-mono space-y-0.5">
              {previewCodes.slice(0, 20).map((code, i) => (
                <div key={i}>{code}</div>
              ))}
              {previewCodes.length > 20 && (
                <div className="text-slate-600">... y {previewCodes.length - 20} más</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => uploadCodes(previewCodes)}
                disabled={uploading}
                className="btn-green text-[10px] px-4 py-2 disabled:opacity-50"
              >
                {uploading ? 'Cargando...' : `Cargar ${previewCodes.length} vouchers`}
              </button>
              <button
                onClick={() => setPreviewCodes(null)}
                className="btn-outline text-[10px] px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 1: Excel upload */}
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
              Subir archivo de Ruijie
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-white/[0.06] hover:border-amber/20 hover:bg-amber/[0.02] transition-all text-slate-400 hover:text-amber text-xs font-semibold"
            >
              <Upload size={16} />
              Seleccionar archivo .xlsx
            </button>
          </div>

          {/* Option 2: Manual paste */}
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
              Pegar códigos manualmente
            </div>
            <textarea
              value={manualCodes}
              onChange={e => setManualCodes(e.target.value)}
              placeholder="Pega aquí los códigos de voucher, uno por línea..."
              className="input text-xs h-[80px] resize-none font-mono"
            />
            <button
              onClick={handleManualLoad}
              disabled={!manualCodes.trim()}
              className="btn-outline w-full mt-2 text-[10px] px-3 py-2 flex items-center justify-center gap-1.5 disabled:opacity-30"
            >
              <Clipboard size={12} /> Cargar Vouchers
            </button>
          </div>
        </div>
      </div>

      {/* Voucher list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-white/80">Vouchers Recientes</h3>
          <div className="flex gap-0.5">
            {['all', 'available', 'assigned'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2.5 py-1.5 text-[10px] rounded-lg font-semibold border transition-all
                  ${filter === s ? 'bg-amber/10 text-amber border-amber/20' : 'border-transparent text-slate-500 hover:text-slate-400'}`}
              >
                {s === 'all' ? 'Todos' : s === 'available' ? 'Disponibles' : 'Asignados'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-xs">
            No hay vouchers {filter !== 'all' ? `con estado "${filter}"` : ''}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/[0.03]">
                  <th className="text-left py-2 px-2">Código</th>
                  <th className="text-left py-2 px-2">Cliente</th>
                  <th className="text-left py-2 px-2">Estado</th>
                  <th className="text-left py-2 px-2">Asignado</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => (
                  <tr key={v.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                    <td className="py-2.5 px-2 font-mono text-white/80 font-semibold">{v.code}</td>
                    <td className="py-2.5 px-2 text-slate-400">{v.customer_name || '—'}</td>
                    <td className="py-2.5 px-2">{statusBadge(v.status)}</td>
                    <td className="py-2.5 px-2 text-slate-600">
                      {v.assigned_at ? new Date(v.assigned_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
