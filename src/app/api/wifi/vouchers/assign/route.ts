import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';
import { sendWifiVoucherEmail } from '@/lib/email';

// POST /api/wifi/vouchers/assign — assign a new voucher to a customer
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el owner puede asignar vouchers WiFi');

  const { customer_id, send_email } = await req.json();
  if (!customer_id) return badRequest('customer_id es requerido');

  const supabase = createAdminClient();

  // Get first available voucher
  const { data: available, error: fetchErr } = await supabase
    .from('wifi_vouchers')
    .select('*')
    .eq('business_id', user.business_id)
    .eq('status', 'available')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) return badRequest(fetchErr.message);

  if (!available) {
    return Response.json(
      { success: false, error: 'no_vouchers', message: 'No hay vouchers WiFi disponibles. Carga más desde Ruijie Cloud.' },
      { status: 400 }
    );
  }

  // Assign it
  const { error: updateErr } = await supabase
    .from('wifi_vouchers')
    .update({
      customer_id,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', available.id);

  if (updateErr) return badRequest(updateErr.message);

  // Count remaining
  const { count } = await supabase
    .from('wifi_vouchers')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', user.business_id)
    .eq('status', 'available');

  // Send email if requested
  if (send_email) {
    const { data: customer } = await supabase
      .from('customers')
      .select('name, email')
      .eq('id', customer_id)
      .single();

    if (customer?.email) {
      sendWifiVoucherEmail(customer.email, customer.name, available.code).catch(console.error);
    }
  }

  return ok({
    voucher: { code: available.code, assigned_at: new Date().toISOString() },
    remaining: count || 0,
  });
}
