import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// GET /api/wifi/vouchers/customer?customer_id=xxx — get last assigned voucher for a customer
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el owner puede ver vouchers WiFi');

  const { searchParams } = new URL(req.url);
  const customer_id = searchParams.get('customer_id');
  if (!customer_id) return badRequest('customer_id es requerido');

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('wifi_vouchers')
    .select('code, status, assigned_at')
    .eq('business_id', user.business_id)
    .eq('customer_id', customer_id)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return badRequest(error.message);

  return ok(data);
}
