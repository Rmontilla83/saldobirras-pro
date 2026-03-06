import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// In-memory rate limiter for POST (session creation)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

// Cleanup expired sessions (runs on each request)
async function cleanupExpiredSessions() {
  const supabase = createAdminClient();
  await supabase
    .from('wifi_sessions')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true);
}

/**
 * GET /api/wifi/auth
 * Called by the Ruijie gateway to verify tokens.
 * Must respond with plain text: "Auth: 1" (authorized) or "Auth: 0" (denied)
 *
 * Query params from gateway:
 * - stage: "login" | "counters" | "logout"
 * - token: session token
 * - mac: client MAC address
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const token = searchParams.get('token');

  if (!token) {
    return new Response('Auth: 0', { status: 200 });
  }

  const supabase = createAdminClient();

  // Clean expired sessions opportunistically
  cleanupExpiredSessions().catch(() => {});

  if (stage === 'login') {
    // Gateway asks if the token is valid for login
    const { data: session } = await supabase
      .from('wifi_sessions')
      .select('*, customers!inner(balance, is_active, is_vip)')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (
      session &&
      new Date(session.expires_at) > new Date() &&
      ((session as any).customers.is_vip === true || ((session as any).customers.is_active === true && (session as any).customers.balance > 0))
    ) {
      return new Response('Auth: 1', { status: 200 });
    }
    return new Response('Auth: 0', { status: 200 });
  }

  if (stage === 'counters') {
    // Periodic ping from gateway — verify session still active
    const { data: session } = await supabase
      .from('wifi_sessions')
      .select('*, customers!inner(balance, is_active, is_vip)')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (session && new Date(session.expires_at) > new Date()) {
      const cust = (session as any).customers;
      // Check customer is active and has balance (or is VIP)
      if (cust.is_vip === true || (cust.is_active === true && cust.balance > 0)) {
        await supabase
          .from('wifi_sessions')
          .update({ last_ping_at: new Date().toISOString() })
          .eq('token', token);
        return new Response('Auth: 1', { status: 200 });
      }
      // Customer lost balance (non-VIP) or was deactivated — revoke session
      await supabase
        .from('wifi_sessions')
        .update({ is_active: false })
        .eq('token', token);
    }
    return new Response('Auth: 0', { status: 200 });
  }

  if (stage === 'logout') {
    // Client disconnected
    await supabase
      .from('wifi_sessions')
      .update({ is_active: false })
      .eq('token', token);
    return new Response('Auth: 1', { status: 200 });
  }

  return new Response('Auth: 0', { status: 200 });
}

/**
 * POST /api/wifi/auth
 * Called by the WiFi portal frontend to create a session after authenticating a customer.
 * Returns JSON: { success: true, token } or { error: string }
 */
export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(`wifi-post:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }

  let body: { customer_id?: string; token?: string; mac?: string; gw_address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { customer_id, token, mac, gw_address } = body;

  if (!customer_id || !token) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  // Validate token format (alphanumeric, 32 chars)
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify customer exists, has balance (or is VIP), and is active
  const { data: customer } = await supabase
    .from('customers')
    .select('id, balance, is_active, is_vip')
    .eq('id', customer_id)
    .single();

  if (!customer || (!customer.is_active && !customer.is_vip)) {
    return NextResponse.json({ error: 'No autorizado — cuenta inactiva' }, { status: 403 });
  }

  if (!customer.is_vip && customer.balance <= 0) {
    return NextResponse.json({ error: 'No autorizado — saldo insuficiente' }, { status: 403 });
  }

  // Deactivate previous sessions for this customer
  await supabase
    .from('wifi_sessions')
    .update({ is_active: false })
    .eq('customer_id', customer_id)
    .eq('is_active', true);

  // Create new session
  const { data: session, error } = await supabase
    .from('wifi_sessions')
    .insert({
      customer_id,
      token,
      mac_address: mac || null,
      gw_address: gw_address || null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Error creando sesión WiFi' }, { status: 500 });
  }

  return NextResponse.json({ success: true, token: session.token });
}
