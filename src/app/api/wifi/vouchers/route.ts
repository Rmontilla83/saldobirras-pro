import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// GET /api/wifi/vouchers — stats (owner only)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el owner puede ver vouchers WiFi');

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('wifi_vouchers')
    .select('status')
    .eq('business_id', user.business_id);

  if (error) return badRequest(error.message);

  const stats = {
    total: data.length,
    available: data.filter((v: any) => v.status === 'available').length,
    assigned: data.filter((v: any) => v.status === 'assigned').length,
    used: data.filter((v: any) => v.status === 'used').length,
    expired: data.filter((v: any) => v.status === 'expired').length,
    alert: false,
  };
  stats.alert = stats.available < 10;

  return ok(stats);
}

// POST /api/wifi/vouchers — bulk load (owner only)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el owner puede cargar vouchers WiFi');

  const { codes } = await req.json();
  if (!codes || !Array.isArray(codes) || codes.length === 0) {
    return badRequest('Se requiere un array de códigos');
  }

  if (codes.length > 5000) {
    return badRequest('Máximo 5000 códigos por carga');
  }

  const supabase = createAdminClient();

  const rows = codes
    .map((code: string) => code?.toString().trim())
    .filter(Boolean)
    .map((code: string) => ({
      business_id: user.business_id,
      code,
      status: 'available',
    }));

  const { data, error } = await supabase
    .from('wifi_vouchers')
    .upsert(rows, { onConflict: 'business_id,code', ignoreDuplicates: true })
    .select('id');

  if (error) return badRequest(error.message);

  const inserted = data?.length || 0;
  const duplicates = rows.length - inserted;

  return ok({ inserted, duplicates, total: rows.length });
}
