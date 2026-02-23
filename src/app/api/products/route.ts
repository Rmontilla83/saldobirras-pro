import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// GET /api/products — list products
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', user.business_id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) return badRequest(error.message);
  return ok(data);
}

// POST /api/products — create product (owner/admin only)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner' && !(user as any).permissions?.manage_users) {
    return badRequest('No tienes permiso para gestionar productos');
  }

  const body = await req.json();
  const { name, description, category, price, is_available } = body;

  if (!name || price == null) return badRequest('Nombre y precio son requeridos');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('products')
    .insert({
      business_id: user.business_id,
      name,
      description: description || null,
      category: category || 'beer',
      price: parseFloat(price),
      is_available: is_available !== false,
    })
    .select()
    .single();

  if (error) return badRequest(error.message);

  await supabase.from('audit_log').insert({
    business_id: user.business_id,
    user_id: user.id,
    action: 'create_product',
    entity: 'product',
    entity_id: data.id,
    details: { name, price },
  });

  return ok(data);
}

// PUT /api/products — update product
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner' && !(user as any).permissions?.manage_users) {
    return badRequest('No tienes permiso para gestionar productos');
  }

  const body = await req.json();
  const { product_id, ...updates } = body;
  if (!product_id) return badRequest('product_id requerido');

  const supabase = createAdminClient();

  // Verify product belongs to business
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('id', product_id)
    .eq('business_id', user.business_id)
    .single();

  if (!existing) return badRequest('Producto no encontrado');

  const allowed: Record<string, any> = {};
  if (updates.name !== undefined) allowed.name = updates.name;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.category !== undefined) allowed.category = updates.category;
  if (updates.price !== undefined) allowed.price = parseFloat(updates.price);
  if (updates.is_available !== undefined) allowed.is_available = updates.is_available;
  if (updates.sort_order !== undefined) allowed.sort_order = updates.sort_order;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('products')
    .update(allowed)
    .eq('id', product_id)
    .select()
    .single();

  if (error) return badRequest(error.message);
  return ok(data);
}

// DELETE /api/products — delete product
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el propietario puede eliminar productos');

  const { searchParams } = new URL(req.url);
  const product_id = searchParams.get('product_id');
  if (!product_id) return badRequest('product_id requerido');

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', product_id)
    .eq('business_id', user.business_id);

  if (error) return badRequest(error.message);
  return ok({ deleted: true });
}
