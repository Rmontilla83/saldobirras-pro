import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// GET /api/settings
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('business_settings')
    .select('*')
    .eq('business_id', user.business_id)
    .single();

  return ok(data || { tax_percentage: 15 });
}

// PUT /api/settings
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el propietario puede cambiar configuración');

  const { tax_percentage } = await req.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('business_settings')
    .upsert({
      business_id: user.business_id,
      tax_percentage: parseFloat(tax_percentage) || 15,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id' })
    .select()
    .single();

  if (error) return badRequest(error.message);
  return ok(data);
}
