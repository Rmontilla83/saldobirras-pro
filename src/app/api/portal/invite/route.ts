import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { customer_id, portal_url } = await req.json();
  if (!customer_id || !portal_url) return badRequest('customer_id y portal_url son requeridos');

  const supabase = createAdminClient();
  const { data: customer } = await supabase
    .from('customers')
    .select('name, email, balance, balance_type, qr_code')
    .eq('id', customer_id)
    .single();

  if (!customer?.email) return badRequest('El cliente no tiene correo registrado');

  // Send email via Resend
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return badRequest('Email no configurado');

  const balanceText = customer.balance_type === 'money'
    ? `$${customer.balance.toFixed(2)}`
    : `${customer.balance} cervezas`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #0A1020; color: #fff; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1B2A4A, #0A1020); padding: 30px 24px; text-align: center; border-bottom: 1px solid rgba(212,155,40,0.15);">
        <h1 style="color: #D49B28; font-size: 22px; margin: 0 0 4px;">SALDOBIRRAS</h1>
        <p style="color: #64748b; font-size: 12px; margin: 0;">BirraSport · Cervecería Premium</p>
      </div>
      <div style="padding: 30px 24px; text-align: center;">
        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 16px;">Hola <strong style="color: #fff;">${customer.name}</strong>,</p>
        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">
          Ya puedes hacer pedidos desde tu teléfono. Tu saldo actual es:
        </p>
        <div style="background: rgba(212,155,40,0.08); border: 1px solid rgba(212,155,40,0.15); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <div style="color: #D49B28; font-size: 32px; font-weight: 800;">${balanceText}</div>
        </div>
        <a href="${portal_url}" style="display: inline-block; background: #D49B28; color: #000; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
          Abrir Portal de Pedidos
        </a>
        <p style="color: #475569; font-size: 11px; margin: 20px 0 0;">
          Tu código: <strong style="font-family: monospace;">${customer.qr_code}</strong>
        </p>
      </div>
      <div style="padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.03);">
        <p style="color: #334155; font-size: 10px; margin: 0;">BirraSport © ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'SaldoBirras <onboarding@resend.dev>',
        to: customer.email,
        subject: '🍺 Tu Portal de Pedidos - BirraSport',
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return badRequest(err.message || 'Error al enviar correo');
    }

    return ok({ sent: true });
  } catch (e: any) {
    return badRequest(e.message || 'Error de conexión');
  }
}
