import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// GET /api/wifi/vouchers/list — list vouchers with optional status filter
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el owner puede ver vouchers WiFi');

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const supabase = createAdminClient();

  let query = supabase
    .from('wifi_vouchers')
    .select('*, customers!customer_id(name)')
    .eq('business_id', user.business_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return badRequest(error.message);

  const vouchers = data?.map((v: any) => ({
    ...v,
    customer_name: v.customers?.name || null,
    customers: undefined,
  }));

  return ok(vouchers);
}
