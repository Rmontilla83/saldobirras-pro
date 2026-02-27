'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase-browser';
import { Users, UserPlus, Shield, ShieldCheck, ShieldAlert, Pencil, X, Save, Eye, EyeOff, Power } from 'lucide-react';
import type { User, UserPermissions } from '@/lib/types';

const DEFAULT_PERMS: UserPermissions = {
  dashboard: true,
  register: false,
  recharge: false,
  consume: true,
  transactions: false,
  stats: false,
  export: false,
  edit_customer: false,
  send_email: false,
  manage_users: false,
};

const PERM_LABELS: Record<keyof UserPermissions, { label: string; desc: string }> = {
  dashboard: { label: 'Ver Panel', desc: 'Ver lista de clientes y alertas' },
  register: { label: 'Registrar Clientes', desc: 'Crear nuevos clientes' },
  recharge: { label: 'Recargar Saldo', desc: 'Agregar saldo a clientes' },
  consume: { label: 'Descontar Saldo', desc: 'Cobrar consumos a clientes' },
  transactions: { label: 'Ver Movimientos', desc: 'Acceder al historial completo' },
  stats: { label: 'Ver Informes', desc: 'Acceder a estadísticas y reportes' },
  export: { label: 'Exportar Excel', desc: 'Descargar reportes en Excel' },
  edit_customer: { label: 'Editar Clientes', desc: 'Modificar datos de clientes' },
  send_email: { label: 'Enviar Correos', desc: 'Enviar QR por correo' },
  manage_users: { label: 'Gestionar Usuarios', desc: 'Crear y editar usuarios' },
};

const ROLE_PRESETS: Record<string, { label: string; icon: React.ReactNode; perms: Partial<UserPermissions> }> = {
  cashier_basic: {
    label: 'Cajero Básico',
    icon: <Shield size={14} />,
    perms: { dashboard: true, consume: true, register: false, recharge: false, transactions: false, stats: false, export: false, edit_customer: false, send_email: false, manage_users: false },
  },
  cashier_full: {
    label: 'Cajero Completo',
    icon: <ShieldCheck size={14} />,
    perms: { dashboard: true, consume: true, recharge: true, register: true, transactions: true, stats: false, export: false, edit_customer: false, send_email: true, manage_users: false },
  },
  admin: {
    label: 'Administrador',
    icon: <ShieldAlert size={14} />,
    perms: { dashboard: true, consume: true, recharge: true, register: true, transactions: true, stats: true, export: true, edit_customer: true, send_email: true, manage_users: false },
  },
};

interface Props {
  showToast: (msg: string, type: 'ok' | 'error' | 'warn') => void;
}

export default function UsersView({ showToast }: Props) {
  const { user: currentUser } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formShowPw, setFormShowPw] = useState(false);
  const [formRole, setFormRole] = useState<string>('cashier');
  const [formPerms, setFormPerms] = useState<UserPermissions>({ ...DEFAULT_PERMS });
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const apiCall = async (method: string, body?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const res = await fetch('/api/users', {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };

  const loadUsers = async () => {
    setLoading(true);
    const res = await apiCall('GET');
    if (res?.success) setUsers(res.data);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const applyPreset = (presetKey: string) => {
    const preset = ROLE_PRESETS[presetKey];
    if (preset) setFormPerms({ ...DEFAULT_PERMS, ...preset.perms });
  };

  const togglePerm = (key: keyof UserPermissions) => {
    setFormPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openCreate = () => {
    setEditingUser(null);
    setFormName(''); setFormEmail(''); setFormPassword(''); setFormShowPw(false);
    setFormRole('cashier'); setFormPerms({ ...DEFAULT_PERMS });
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setFormName(u.name); setFormEmail(u.email); setFormPassword(''); setFormShowPw(false);
    setFormRole(u.role); setFormPerms({ ...DEFAULT_PERMS, ...(u.permissions || {}) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName) return;
    setSaving(true);

    if (editingUser) {
      const res = await apiCall('PUT', {
        user_id: editingUser.id,
        name: formName,
        role: formRole,
        permissions: formPerms,
        password: formPassword || undefined,
      });
      if (res?.success) {
        showToast('✓ Usuario actualizado', 'ok');
        setShowForm(false);
        loadUsers();
      } else {
        showToast(res?.error || 'Error', 'error');
      }
    } else {
      if (!formEmail || !formPassword) { setSaving(false); return; }
      const res = await apiCall('POST', {
        name: formName,
        email: formEmail,
        password: formPassword,
        role: formRole,
        permissions: formPerms,
      });
      if (res?.success) {
        showToast('✓ Usuario creado', 'ok');
        setShowForm(false);
        loadUsers();
      } else {
        showToast(res?.error || 'Error', 'error');
      }
    }
    setSaving(false);
  };

  const toggleActive = async (u: User) => {
    if (u.id === currentUser?.id) return;
    const res = await apiCall('PUT', { user_id: u.id, is_active: !u.is_active });
    if (res?.success) {
      showToast(res.data.is_active ? '✓ Usuario activado' : '✓ Usuario desactivado', 'ok');
      loadUsers();
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <ShieldAlert size={14} className="text-amber" />;
    if (role === 'auditor') return <ShieldCheck size={14} className="text-blue-400" />;
    return <Shield size={14} className="text-slate-400" />;
  };

  const getRoleLabel = (role: string) => {
    if (role === 'owner') return 'Propietario';
    if (role === 'auditor') return 'Auditor';
    return 'Cajero';
  };

  const countPerms = (perms: any) => {
    if (!perms) return 0;
    return Object.values(perms).filter(Boolean).length;
  };

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="icon-box" style={{ background: 'rgba(245,166,35,0.08)' }}><Users size={16} className="text-amber" /></div>
            <div>
              <h3 className="text-sm font-bold text-white/90">Usuarios del Sistema</h3>
              <p className="text-[11px] text-slate-500">Gestiona accesos y permisos</p>
            </div>
          </div>
          <button onClick={openCreate} className="btn-primary py-2.5 px-4 flex items-center gap-1.5">
            <UserPlus size={13} /> Nuevo Usuario
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10"><div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-1.5">
            {users.map(u => (
              <div key={u.id} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150 ${u.is_active !== false ? 'hover:bg-white/[0.02]' : 'opacity-40'}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: u.role === 'owner' ? 'rgba(245,166,35,0.1)' : 'rgba(100,116,139,0.08)' }}>
                  {getRoleIcon(u.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white/90">{u.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${u.role === 'owner' ? 'bg-amber/10 text-amber' : 'bg-slate-500/10 text-slate-400'}`}>
                      {getRoleLabel(u.role)}
                    </span>
                    {u.is_active === false && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Inactivo</span>}
                  </div>
                  <div className="text-[11px] text-slate-500">{u.email} · {countPerms(u.permissions)} permisos</div>
                </div>
                <div className="flex items-center gap-1">
                  {u.id !== currentUser?.id && (
                    <button onClick={() => toggleActive(u)} className="w-10 h-10 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-center transition-colors" title={u.is_active !== false ? 'Desactivar' : 'Activar'}>
                      <Power size={14} className={u.is_active !== false ? 'text-emerald-400' : 'text-red-400'} />
                    </button>
                  )}
                  <button onClick={() => openEdit(u)} className="w-10 h-10 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-center transition-colors" title="Editar">
                    <Pencil size={14} className="text-slate-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xl flex items-center justify-center overflow-y-auto py-8" onClick={() => setShowForm(false)}>
          <div className="bg-[#101828] border border-amber/10 rounded-3xl p-7 max-w-[480px] w-[92%] shadow-[0_32px_80px_rgba(0,0,0,0.5)] animate-[popScale_0.3s_ease] my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white/90">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl bg-white/[0.03] text-slate-500 flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition-colors"><X size={15} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input type="text" className="input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="María García" />
              </div>
              <div>
                <label className="label">Correo electrónico</label>
                <input type="email" className="input" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="maria@birrasport.com" disabled={!!editingUser} />
              </div>
              <div>
                <label className="label">{editingUser ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
                <div className="relative">
                  <input type={formShowPw ? 'text' : 'password'} className="input pr-10" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'} />
                  <button type="button" onClick={() => setFormShowPw(!formShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                    {formShowPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Role presets */}
              {(!editingUser || editingUser.role !== 'owner') && (
                <>
                  <div>
                    <label className="label">Plantilla de permisos</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                        <button key={key} onClick={() => applyPreset(key)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold border border-slate-800 hover:border-amber/20 hover:bg-amber/[0.03] text-slate-400 hover:text-amber transition-all">
                          {preset.icon} {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Granular permissions */}
                  <div>
                    <label className="label">Permisos individuales</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.entries(PERM_LABELS) as [keyof UserPermissions, { label: string; desc: string }][]).map(([key, { label, desc }]) => (
                        <button key={key} onClick={() => togglePerm(key)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all duration-150 border
                            ${formPerms[key]
                              ? 'bg-emerald-500/[0.06] border-emerald-500/15 text-emerald-400'
                              : 'bg-transparent border-slate-800/50 text-slate-500 hover:border-slate-700'}`}>
                          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[10px]
                            ${formPerms[key] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800'}`}>
                            {formPerms[key] ? '✓' : ''}
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold">{label}</div>
                            <div className="text-[9px] opacity-60">{desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {saving ? <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> : <><Save size={13} /> {editingUser ? 'Guardar' : 'Crear'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
