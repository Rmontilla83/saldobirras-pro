import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// GET /api/zones — list zones
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('zones')
    .select('*')
    .eq('business_id', user.business_id)
    .order('sort_order', { ascending: true });

  if (error) return badRequest(error.message);
  return ok(data);
}

// POST /api/zones — create zone
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el propietario puede crear zonas');

  const { name, description, color } = await req.json();
  if (!name) return badRequest('Nombre es requerido');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('zones')
    .insert({ business_id: user.business_id, name, description: description || null, color: color || '#F5A623' })
    .select()
    .single();

  if (error) return badRequest(error.message);
  return ok(data);
}

// PUT /api/zones — update zone
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el propietario puede editar zonas');

  const { id, name, description, color, is_active, sort_order } = await req.json();
  if (!id) return badRequest('id es requerido');

  const allowed: Record<string, any> = {};
  if (name !== undefined) allowed.name = name;
  if (description !== undefined) allowed.description = description;
  if (color !== undefined) allowed.color = color;
  if (is_active !== undefined) allowed.is_active = is_active;
  if (sort_order !== undefined) allowed.sort_order = sort_order;

  if (Object.keys(allowed).length === 0) return badRequest('No hay campos para actualizar');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('zones')
    .update(allowed)
    .eq('id', id)
    .eq('business_id', user.business_id)
    .select()
    .single();

  if (error) return badRequest(error.message);
  return ok(data);
}
