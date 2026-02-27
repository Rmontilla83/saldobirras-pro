'use client';

import { Sparkles } from 'lucide-react';

type ChangeType = 'new' | 'improve' | 'fix' | 'security';

interface Change {
  type: ChangeType;
  text: string;
}

interface Release {
  version: string;
  date: string;
  title: string;
  changes: Change[];
}

const TYPE_CONFIG: Record<ChangeType, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  new:      { label: 'Nuevo',     emoji: '✨', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  improve:  { label: 'Mejora',    emoji: '🔧', bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
  fix:      { label: 'Fix',       emoji: '🐛', bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20' },
  security: { label: 'Seguridad', emoji: '🔒', bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20' },
};

const CHANGELOG: Release[] = [
  {
    version: 'v9.0',
    date: '2026-02-26',
    title: 'Auditoría UX completa — 24 mejoras',
    changes: [
      { type: 'new', text: 'Modal de confirmación antes de cobrar — evita cobros accidentales' },
      { type: 'new', text: 'Cajeras ahora ven pedidos en móvil (solo lectura)' },
      { type: 'fix', text: 'Alertas nativas reemplazadas por toasts elegantes' },
      { type: 'fix', text: 'isMobile ahora es reactivo — funciona al rotar teléfono' },
      { type: 'improve', text: 'Botones más grandes en Productos y Usuarios para móvil' },
      { type: 'improve', text: 'Movimientos ahora se ve como tarjetas en móvil' },
      { type: 'improve', text: 'Mejor contraste en textos para accesibilidad' },
      { type: 'improve', text: 'Inputs con teclado correcto (numérico para montos, tel para teléfono)' },
      { type: 'improve', text: 'Estados vacíos con mensajes útiles en listas' },
      { type: 'improve', text: 'Loading states en botones para evitar doble-click' },
    ]
  },
  {
    version: 'v8.7',
    date: '2026-02-26',
    title: 'Carnet en formato PNG',
    changes: [
      { type: 'improve', text: 'Carnet ahora se descarga como imagen PNG en vez de PDF' },
      { type: 'improve', text: 'Renderizado con Canvas API nativo — más rápido y nítido' },
    ]
  },
  {
    version: 'v8.5',
    date: '2026-02-26',
    title: 'Carnet premium con logos Marinos',
    changes: [
      { type: 'new', text: 'Logo BirraSport prominente en el carnet' },
      { type: 'new', text: 'Logo Marinos Gold 50 Años en header y marca de agua' },
      { type: 'new', text: 'PIN del cliente visible en el carnet' },
      { type: 'improve', text: 'Logo BirraSport sin fondo blanco — PNG limpio' },
    ]
  },
  {
    version: 'v8.4',
    date: '2026-02-26',
    title: 'Email de bienvenida completo',
    changes: [
      { type: 'new', text: 'Correo de registro incluye invitación al portal' },
      { type: 'new', text: 'PIN de acceso destacado en el correo' },
      { type: 'new', text: 'Botón directo "ENTRAR AL PORTAL" en el email' },
      { type: 'new', text: 'Instrucciones paso a paso para usar el portal' },
    ]
  },
  {
    version: 'v8.3',
    date: '2026-02-26',
    title: 'Fix registro de clientes',
    changes: [
      { type: 'fix', text: 'Error "zone column not found" al registrar cliente' },
    ]
  },
  {
    version: 'v8.2',
    date: '2026-02-26',
    title: 'Notificaciones persistentes en escritorio',
    changes: [
      { type: 'new', text: 'Barra amarilla persistente en desktop cuando hay pedidos pendientes' },
      { type: 'improve', text: 'En móvil solo burbuja roja — no ocupa espacio de pantalla' },
      { type: 'improve', text: 'Click en la barra lleva directo a pedidos' },
    ]
  },
  {
    version: 'v8.0',
    date: '2026-02-24',
    title: 'Fase F — Notificaciones, PIN y PWA',
    changes: [
      { type: 'new', text: 'Login con PIN de 4 dígitos en el portal — sin escribir códigos largos' },
      { type: 'new', text: 'Notificaciones sonoras urgentes al recibir pedidos nuevos' },
      { type: 'new', text: 'Badge rojo con contador en botón Pedidos' },
      { type: 'new', text: 'Título de pestaña parpadea con pedidos pendientes' },
      { type: 'new', text: 'Notificaciones del navegador para pedidos' },
      { type: 'new', text: 'PWA instalable desde Chrome para admin y cajeras' },
      { type: 'fix', text: 'Middleware redirect loop — app.birrasport.com cargaba infinito' },
    ]
  },
  {
    version: 'v7.0',
    date: '2026-02-22',
    title: 'Fase E — Portal de clientes y pedidos',
    changes: [
      { type: 'new', text: 'Portal de clientes en portal.birrasport.com' },
      { type: 'new', text: 'Sistema de pedidos con 5 estados (pendiente → entregado)' },
      { type: 'new', text: 'Menú de productos con carrito de compras' },
      { type: 'new', text: 'Balance held — saldo reservado durante pedido' },
      { type: 'new', text: 'Auto-refresh de saldo tras cobro' },
      { type: 'new', text: 'Zonas para identificar ubicación del cliente' },
    ]
  },
  {
    version: 'v6.0',
    date: '2026-02-20',
    title: 'Fase D — Correos automáticos y subdominios',
    changes: [
      { type: 'new', text: 'Correos automáticos de recarga, saldo bajo y saldo cero' },
      { type: 'new', text: 'Envío de QR por correo electrónico' },
      { type: 'new', text: 'Subdominio app.birrasport.com para admin' },
      { type: 'new', text: 'Subdominio portal.birrasport.com para clientes' },
      { type: 'improve', text: 'Correos desde noreply@birrasport.com con Resend' },
    ]
  },
  {
    version: 'v5.0',
    date: '2026-02-18',
    title: 'Fase C — Productos, usuarios y permisos',
    changes: [
      { type: 'new', text: 'Gestión de productos con precios y categorías' },
      { type: 'new', text: 'Sistema de usuarios con roles (owner, admin, cajera)' },
      { type: 'new', text: 'Permisos granulares por rol' },
      { type: 'new', text: 'Sistema postpago para clientes especiales' },
      { type: 'new', text: 'Informes y estadísticas de ventas' },
    ]
  },
  {
    version: 'v3.0',
    date: '2026-02-15',
    title: 'Fase B — Transacciones y QR',
    changes: [
      { type: 'new', text: 'Sistema de recargas con métodos de pago' },
      { type: 'new', text: 'Sistema de consumos/cobros' },
      { type: 'new', text: 'Códigos QR únicos por cliente' },
      { type: 'new', text: 'Carnet descargable con QR' },
      { type: 'new', text: 'Historial de transacciones' },
      { type: 'new', text: 'Escáner QR integrado' },
    ]
  },
  {
    version: 'v1.0',
    date: '2026-02-12',
    title: 'Fase A — Sistema base',
    changes: [
      { type: 'new', text: 'Registro de clientes con foto' },
      { type: 'new', text: 'Dashboard con búsqueda en tiempo real' },
      { type: 'new', text: 'Autenticación con Supabase' },
      { type: 'new', text: 'Saldo en dólares o cervezas' },
      { type: 'new', text: 'Interfaz dark theme premium' },
    ]
  },
];

function formatDateES(dateStr: string) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function Badge({ type }: { type: ChangeType }) {
  const c = TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase border ${c.bg} ${c.text} ${c.border} flex-shrink-0`}>
      {c.emoji} {c.label}
    </span>
  );
}

export default function ChangelogView() {
  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="icon-box" style={{ background: 'rgba(245,166,35,0.08)' }}>
          <Sparkles size={18} className="text-amber" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white/90">Novedades del Sistema</h2>
          <p className="text-[11px] text-slate-500">Historial de actualizaciones de SaldoBirras</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-amber/40 via-amber/15 to-transparent" />

        <div className="space-y-5">
          {CHANGELOG.map((release, idx) => {
            const isLatest = idx === 0;
            return (
              <div key={release.version} className="relative">
                {/* Timeline node */}
                <div className={`absolute -left-8 top-6 w-[22px] h-[22px] rounded-full flex items-center justify-center
                  ${isLatest
                    ? 'bg-amber shadow-[0_0_12px_rgba(245,166,35,0.4)]'
                    : 'bg-[#101828] border-2 border-amber/20'}`}>
                  <div className={`w-2 h-2 rounded-full ${isLatest ? 'bg-black' : 'bg-amber/40'}`} />
                </div>

                {/* Release card */}
                <div className={`card transition-all ${isLatest ? 'border-amber/20 shadow-[0_0_24px_rgba(245,166,35,0.06)]' : ''}`}>
                  {/* Card header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-lg font-extrabold tracking-wide ${isLatest ? 'text-amber' : 'text-white/70'}`}>
                        {release.version}
                      </span>
                      {isLatest && (
                        <span className="px-2 py-0.5 rounded-md bg-amber/10 border border-amber/20 text-[9px] font-bold uppercase tracking-widest text-amber">
                          Actual
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{formatDateES(release.date)}</span>
                  </div>

                  <h3 className={`font-semibold mb-4 ${isLatest ? 'text-base text-white/90' : 'text-sm text-white/70'}`}>
                    {release.title}
                  </h3>

                  {/* Changes list */}
                  <div className="space-y-2">
                    {release.changes.map((change, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <Badge type={change.type} />
                        <span className="text-[13px] text-slate-300 leading-relaxed">{change.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* End of timeline */}
        <div className="relative mt-6 mb-2">
          <div className="absolute -left-8 top-0 w-[22px] h-[22px] rounded-full bg-[#101828] border-2 border-slate-800 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          </div>
          <div className="text-xs text-slate-600 font-medium pl-1 py-1">Inicio del proyecto</div>
        </div>
      </div>
    </div>
  );
}
