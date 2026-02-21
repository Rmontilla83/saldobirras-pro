import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// GET /api/users — list users (owner only)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el propietario puede gestionar usuarios');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('business_id', user.business_id)
    .order('created_at', { ascending: true });

  if (error) return badRequest(error.message);
  return ok(data);
}

// POST /api/users — create new user (owner only)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el propietario puede crear usuarios');

  const { name, email, password, role, permissions } = await req.json();

  if (!name || !email || !password) {
    return badRequest('Nombre, email y contraseña son requeridos');
  }
  if (password.length < 6) {
    return badRequest('La contraseña debe tener al menos 6 caracteres');
  }

  const supabase = createAdminClient();

  // Create auth user in Supabase
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr) {
    if (authErr.message.includes('already been registered')) {
      return badRequest('Este correo ya está registrado');
    }
    return badRequest(authErr.message);
  }

  const authUserId = authData.user.id;

  // Create user profile
  const { data: newUser, error: profileErr } = await supabase
    .from('users')
    .insert({
      id: authUserId,
      business_id: user.business_id,
      name,
      email,
      role: role || 'cashier',
      permissions: permissions || {},
      is_active: true,
    })
    .select()
    .single();

  if (profileErr) {
    // Rollback: delete auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authUserId);
    return badRequest(profileErr.message);
  }

  // Audit
  await supabase.from('audit_log').insert({
    business_id: user.business_id,
    user_id: user.id,
    action: 'create_user',
    entity: 'user',
    entity_id: authUserId,
    details: { name, email, role: role || 'cashier', permissions },
  });

  return ok(newUser);
}

// PUT /api/users — update user (owner only)
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return badRequest('Solo el propietario puede editar usuarios');

  const { user_id, name, role, permissions, is_active, password } = await req.json();
  if (!user_id) return badRequest('user_id es requerido');

  // Cannot edit yourself to non-owner
  if (user_id === user.id && role && role !== 'owner') {
    return badRequest('No puedes cambiar tu propio rol de propietario');
  }

  const supabase = createAdminClient();

  // Verify user belongs to business
  const { data: existing } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user_id)
    .eq('business_id', user.business_id)
    .single();

  if (!existing) return badRequest('Usuario no encontrado');

  // Update profile
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (permissions !== undefined) updates.permissions = permissions;
  if (is_active !== undefined) updates.is_active = is_active;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user_id);

    if (error) return badRequest(error.message);
  }

  // Update password if provided
  if (password && password.length >= 6) {
    const { error: pwErr } = await supabase.auth.admin.updateUserById(user_id, { password });
    if (pwErr) return badRequest('Error al cambiar contraseña: ' + pwErr.message);
  }

  // Audit
  await supabase.from('audit_log').insert({
    business_id: user.business_id,
    user_id: user.id,
    action: 'update_user',
    entity: 'user',
    entity_id: user_id,
    details: { ...updates, password_changed: !!password },
  });

  // Return updated user
  const { data: updated } = await supabase.from('users').select('*').eq('id', user_id).single();
  return ok(updated);
}
