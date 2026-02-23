import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';

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

// POST /api/orders — create order (public, from portal)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer_id, qr_code, items, note, zone_id } = body;

  if ((!customer_id && !qr_code) || !items || !items.length) {
    return badRequest('customer_id/qr_code e items son requeridos');
  }

  const supabase = createAdminClient();

  // Find customer
  let custId = customer_id;
  if (!custId && qr_code) {
    const { data: cust } = await supabase
      .from('customers')
      .select('id, business_id, balance, balance_type')
      .eq('qr_code', qr_code)
      .single();
    if (!cust) return badRequest('Cliente no encontrado');
    custId = cust.id;

    // Calculate total
    const total = items.reduce((s: number, i: any) => s + (i.subtotal || i.price * i.qty), 0);

    // Check balance
    if (cust.balance < total) {
      return badRequest(`Saldo insuficiente. Disponible: ${cust.balance_type === 'money' ? '$' : ''}${cust.balance}`);
    }

    // Create order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        business_id: cust.business_id,
        customer_id: custId,
        items,
        total,
        status: 'pending',
        zone_id: zone_id || null,
        note: note || null,
      })
      .select()
      .single();

    if (error) return badRequest(error.message);
    return ok(order);
  }

  return badRequest('Datos incompletos');
}

// PUT /api/orders — update order status (authenticated)
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { id, status } = await req.json();
  if (!id || !status) return badRequest('id y status son requeridos');

  const supabase = createAdminClient();

  // If marking as delivered, process the consume
  if (status === 'delivered') {
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!order) return badRequest('Orden no encontrada');
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
