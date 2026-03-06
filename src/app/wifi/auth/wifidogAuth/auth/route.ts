import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const PLAIN = { headers: { 'Content-Type': 'text/plain' } };

/**
 * GET /wifi/auth/wifidogAuth/auth/
 *
 * WifiDog "auth" endpoint — called SERVER-TO-SERVER by the Ruijie gateway.
 * Must respond with exactly "Auth: 1" or "Auth: 0" as text/plain.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const token = searchParams.get('token');

  console.log('[wifidogAuth/auth] params:', JSON.stringify(Object.fromEntries(searchParams.entries())));

  if (!token) {
    return new Response('Auth: 0', PLAIN);
  }

  const supabase = createAdminClient();

  // Clean expired sessions opportunistically
  supabase
    .from('wifi_sessions')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true)
    .then(() => {});

  async function isTokenValid(): Promise<boolean> {
    const { data: session, error } = await supabase
      .from('wifi_sessions')
      .select('*, customers!inner(balance, is_active, is_vip)')
      .eq('token', token!)
      .eq('is_active', true)
      .single();

    console.log('[wifidogAuth/auth] DB:', { found: !!session, error: error?.message });

    if (!session || new Date(session.expires_at) <= new Date()) return false;
    const cust = (session as any).customers;
    return cust.is_vip === true || (cust.is_active === true && cust.balance > 0);
  }

  if (stage === 'counters') {
    const valid = await isTokenValid();
    if (valid) {
      await supabase.from('wifi_sessions').update({ last_ping_at: new Date().toISOString() }).eq('token', token);
    } else {
      await supabase.from('wifi_sessions').update({ is_active: false }).eq('token', token);
    }
    console.log(`[wifidogAuth/auth] counters → Auth: ${valid ? 1 : 0}`);
    return new Response(`Auth: ${valid ? 1 : 0}`, PLAIN);
  }

  if (stage === 'logout') {
    await supabase.from('wifi_sessions').update({ is_active: false }).eq('token', token);
    return new Response('Auth: 1', PLAIN);
  }

  // stage=login or no stage
  const valid = await isTokenValid();
  console.log(`[wifidogAuth/auth] ${stage || 'no-stage'} → Auth: ${valid ? 1 : 0}`);
  return new Response(`Auth: ${valid ? 1 : 0}`, PLAIN);
}
