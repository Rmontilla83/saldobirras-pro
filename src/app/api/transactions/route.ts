import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

// GET /api/transactions — list transactions
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const customer_id = searchParams.get('customer_id');
  const limit = parseInt(searchParams.get('limit') || '100');

  const supabase = createAdminClient();
  let query = supabase
    .from('transactions')
    .select('*, customers(name)')
    .eq('business_id', user.business_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (customer_id) query = query.eq('customer_id', customer_id);

  const { data, error } = await query;
  if (error) return badRequest(error.message);

  // Flatten customer name
  const transactions = data?.map((t: any) => ({
    ...t,
    customer_name: t.customers?.name,
    customers: undefined,
  }));

  return ok(transactions);
}

// POST /api/transactions — create a recharge or consumption
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const { customer_id, type, amount, note, bank, reference } = body;

  if (!customer_id || !type || !amount || amount <= 0) {
    return badRequest('customer_id, type y amount son requeridos');
  }

  const supabase = createAdminClient();

  if (type === 'recharge') {
    const { data, error } = await supabase.rpc('process_recharge', {
      p_customer_id: customer_id,
      p_amount: amount,
      p_note: note || 'Recarga',
      p_bank: bank || null,
      p_reference: reference || null,
      p_cashier_id: user.id,
    });

    if (error) return badRequest(error.message);
    const result = data as any;
    if (result?.error) return badRequest(result.error);
    return ok(result);
  }

  if (type === 'consume') {
    const { data, error } = await supabase.rpc('process_consume', {
      p_customer_id: customer_id,
      p_amount: amount,
      p_note: note || 'Consumo',
      p_cashier_id: user.id,
    });

    if (error) return badRequest(error.message);
    const result = data as any;
    if (result?.error) return badRequest(result.error);
    return ok(result);
  }

  return badRequest('type debe ser "recharge" o "consume"');
}
