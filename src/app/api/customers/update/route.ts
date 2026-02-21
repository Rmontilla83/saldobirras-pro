import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// PUT /api/customers/update — update customer details
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const contentType = req.headers.get('content-type') || '';
  const supabase = createAdminClient();

  let customer_id: string;
  let updates: Record<string, any> = {};

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    customer_id = formData.get('customer_id') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const photoFile = formData.get('photo') as File | null;

    if (name) updates.name = name;
    if (email !== null) updates.email = email || null;
    if (phone !== null) updates.phone = phone || null;

    // Upload new photo if provided
    if (photoFile && photoFile.size > 0) {
      const { data: customer } = await supabase
        .from('customers')
        .select('qr_code')
        .eq('id', customer_id)
        .single();

      if (customer) {
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const path = `customers/${customer.qr_code}.${ext}`;
        const buffer = Buffer.from(await photoFile.arrayBuffer());

        const { error: uploadErr } = await supabase.storage
          .from('photos')
          .upload(path, buffer, { contentType: photoFile.type, upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
          updates.photo_url = urlData.publicUrl;
        }
      }
    }
  } else {
    const body = await req.json();
    customer_id = body.customer_id;
    if (body.name) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email || null;
    if (body.phone !== undefined) updates.phone = body.phone || null;
  }

  if (!customer_id) return badRequest('customer_id es requerido');
  if (Object.keys(updates).length === 0) return badRequest('No hay datos para actualizar');

  // Verify customer belongs to business
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('id', customer_id)
    .eq('business_id', user.business_id)
    .single();

  if (!existing) return badRequest('Cliente no encontrado');

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customer_id)
    .select()
    .single();

  if (error) return badRequest(error.message);

  // Audit
  await supabase.from('audit_log').insert({
    business_id: user.business_id,
    user_id: user.id,
    action: 'update_customer',
    entity: 'customer',
    entity_id: customer_id,
    details: updates,
  });

  return ok(data);
}
