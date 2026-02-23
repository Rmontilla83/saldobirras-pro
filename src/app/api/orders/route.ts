import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok, rateLimit, rateLimited } from '@/lib/api-auth';

// GET /api/orders — list orders (authenticated)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const supabase = createAdminClient();
  let query = supabase
    .from('orders')
    .select('*, customers(name, phone, photo_url), zones(name, color)')
    .eq('business_id', user.business_id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return badRequest(error.message);

  const orders = data?.map((o: any) => ({
    ...o,
    customer_name: o.customers?.name,
    customer_phone: o.customers?.phone,
    customer_photo: o.customers?.photo_url,
    zone_name: o.zones?.name,
    zone_color: o.zones?.color,
    customers: undefined,
    zones: undefined,
  }));

  return ok(orders);
}

// POST /api/orders — create order (public from portal OR authenticated from cashier)
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`orders:${ip}`, 10, 60000)) return rateLimited();

  const body = await req.json();
  const { customer_id, qr_code, items, note, zone_id } = body;

  if ((!customer_id && !qr_code) || !items || !items.length) {
    return badRequest('customer_id/qr_code e items son requeridos');
  }

  const supabase = createAdminClient();

  // Resolve customer
  let cust: any = null;
  if (customer_id) {
    const { data } = await supabase
      .from('customers')
      .select('id, business_id, balance, balance_held, balance_type, allow_negative')
      .eq('id', customer_id)
      .single();
    cust = data;
  } else if (qr_code) {
    const { data } = await supabase
      .from('customers')
      .select('id, business_id, balance, balance_held, balance_type, allow_negative')
      .eq('qr_code', qr_code)
      .single();
    cust = data;
  }

  if (!cust) return badRequest('Cliente no encontrado');

  const total = items.reduce((s: number, i: any) => s + (i.subtotal || i.price * i.qty), 0);
  const available = cust.balance - (cust.balance_held || 0);

  // Check available balance (unless allow_negative)
  if (available < total && !cust.allow_negative) {
    return badRequest(`Saldo disponible insuficiente. Disponible: ${cust.balance_type === 'money' ? '$' : ''}${available.toFixed(2)}`);
  }

  // Hold balance
  const { data: holdResult, error: holdErr } = await supabase.rpc('hold_balance', {
    p_customer_id: cust.id,
    p_amount: total,
  });
  if (holdErr) return badRequest(holdErr.message);
  const hr = holdResult as any;
  if (hr?.error) return badRequest(hr.error);

  // Create order
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      business_id: cust.business_id,
      customer_id: cust.id,
      items,
      total,
      status: 'pending',
      zone_id: zone_id || null,
      note: note || null,
    })
    .select()
    .single();

  if (error) {
    // Release hold on failure
    await supabase.rpc('release_hold', { p_customer_id: cust.id, p_amount: total });
    return badRequest(error.message);
  }

  return ok(order);
}

// PUT /api/orders — update order status (authenticated)
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { id, status } = await req.json();
  if (!id || !status) return badRequest('id y status son requeridos');

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (!order) return badRequest('Orden no encontrada');

  // If marking as delivered, process the consume and release hold
  if (status === 'delivered') {
    if (order.status === 'delivered') return badRequest('Orden ya fue entregada');

    // Process consume
    const { data: result, error: rpcErr } = await supabase.rpc('process_consume', {
      p_customer_id: order.customer_id,
      p_amount: order.total,
      p_note: `Pedido: ${(order.items as any[]).map((i: any) => `${i.qty}x ${i.name}`).join(', ')}`,
      p_cashier_id: user.id,
    });

    if (rpcErr) return badRequest(rpcErr.message);
    const rpcResult = result as any;
    if (rpcResult?.error) return badRequest(rpcResult.error);

    // Update transaction with items
    if (rpcResult.tx_id) {
      await supabase.from('transactions').update({ items: order.items }).eq('id', rpcResult.tx_id);
    }

    // Release the hold
    await supabase.rpc('release_hold', { p_customer_id: order.customer_id, p_amount: order.total });
  }

  // If cancelling, release the hold
  if (status === 'cancelled' && order.status !== 'cancelled' && order.status !== 'delivered') {
    await supabase.rpc('release_hold', { p_customer_id: order.customer_id, p_amount: order.total });
  }

  // Update order status
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString(), delivered_by: status === 'delivered' ? user.id : null })
    .eq('id', id)
    .select()
    .single();

  if (error) return badRequest(error.message);
  return ok(data);
}
