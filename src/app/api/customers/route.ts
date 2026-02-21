import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';
import { nanoid } from '@/lib/utils';

// GET /api/customers — list all customers for the business
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', user.business_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return badRequest(error.message);
  return ok(data);
}

// POST /api/customers — create a new customer
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const { name, email, phone, balance_type, initial_balance } = body;

  if (!name || !balance_type || initial_balance == null) {
    return badRequest('Nombre, tipo de saldo y saldo inicial son requeridos');
  }

  const supabase = createAdminClient();
  const qr_code = `SB-${nanoid(12)}`;

  // Create customer
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .insert({
      business_id: user.business_id,
      name,
      email: email || null,
      phone: phone || null,
      balance_type,
      balance: initial_balance,
      initial_balance,
      qr_code,
    })
    .select()
    .single();

  if (custErr) return badRequest(custErr.message);

  // Create initial transaction
  if (initial_balance > 0) {
    await supabase.from('transactions').insert({
      business_id: user.business_id,
      customer_id: customer.id,
      cashier_id: user.id,
      type: 'recharge',
      amount: initial_balance,
      balance_after: initial_balance,
      note: 'Saldo inicial',
    });
  }

  // Audit log
  await supabase.from('audit_log').insert({
    business_id: user.business_id,
    user_id: user.id,
    action: 'create_customer',
    entity: 'customer',
    entity_id: customer.id,
    details: { name, balance_type, initial_balance },
  });

  return ok(customer);
}
