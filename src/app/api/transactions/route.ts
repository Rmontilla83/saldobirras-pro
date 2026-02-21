import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';
import { sendRechargeEmail, sendLowBalanceEmail, sendZeroBalanceEmail } from '@/lib/email';
import { isLowBalance } from '@/lib/utils';

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

  // Permission check (owner bypasses)
  if (user.role !== 'owner') {
    const perms = (user as any).permissions || {};
    if (type === 'recharge' && !perms.recharge) return badRequest('No tienes permiso para recargar');
    if (type === 'consume' && !perms.consume) return badRequest('No tienes permiso para descontar');
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

    // Send recharge email (async, don't block response)
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customer?.email) {
      sendRechargeEmail(
        customer.email, customer.name, amount,
        result.new_balance, customer.balance_type,
        customer.qr_code, bank, reference
      ).catch(console.error);
    }

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

    // Check balance and send alerts (async)
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customer?.email) {
      const newBalance = result.new_balance;
      if (newBalance <= 0) {
        sendZeroBalanceEmail(customer.email, customer.name, customer.balance_type).catch(console.error);
      } else if (isLowBalance(newBalance, customer.balance_type)) {
        sendLowBalanceEmail(customer.email, customer.name, newBalance, customer.balance_type).catch(console.error);
      }
    }

    return ok(result);
  }

  return badRequest('type debe ser "recharge" o "consume"');
}
