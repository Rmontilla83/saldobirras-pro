import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// POST /api/scan — phone sends scanned QR, creates realtime event for PC
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { qr_code } = await req.json();
  if (!qr_code) return badRequest('qr_code es requerido');

  const supabase = createAdminClient();

  // Find customer by QR code
  const { data: customer, error: findErr } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', user.business_id)
    .eq('qr_code', qr_code)
    .eq('is_active', true)
    .single();

  if (findErr || !customer) {
    return badRequest('Cliente no encontrado');
  }

  // Insert scan event (triggers realtime for PC)
  const { error: scanErr } = await supabase.from('scan_queue').insert({
    business_id: user.business_id,
    customer_id: customer.id,
    scanned_by: user.id,
  });

  if (scanErr) return badRequest(scanErr.message);

  return ok(customer);
}

// GET /api/scan?qr_code=xxx — lookup customer by QR (manual search)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const qr_code = searchParams.get('qr_code');
  const query = searchParams.get('q'); // name/email search

  const supabase = createAdminClient();

  if (qr_code) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', user.business_id)
      .eq('qr_code', qr_code)
      .eq('is_active', true)
      .single();

    if (error || !data) return badRequest('No encontrado');
    return ok(data);
  }

  if (query) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', user.business_id)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);

    if (error) return badRequest(error.message);
    return ok(data);
  }

  return badRequest('qr_code o q es requerido');
}
