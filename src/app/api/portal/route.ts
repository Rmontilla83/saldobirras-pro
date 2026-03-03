import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/api-auth';

// GET /api/portal?qr=SB-XXXX or ?pin=123456 — public lookup
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`portal:${ip}`, 20, 60000)) {
    return NextResponse.json({ success: false, error: 'Demasiadas solicitudes' }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const qr = searchParams.get('qr');
  const pin = searchParams.get('pin');

  if (!qr && !pin) {
    return NextResponse.json({ success: false, error: 'QR o PIN requerido' }, { status: 400 });
  }

  // Rate limit by PIN to prevent brute force (5 attempts per PIN every 5 min)
  if (pin) {
    if (!rateLimit(`portal:pin:${pin}`, 5, 300000)) {
      return NextResponse.json({ success: false, error: 'Demasiados intentos para este PIN. Intenta en 5 minutos.' }, { status: 429 });
    }
  }

  const supabase = createAdminClient();

  let customer: any = null;
  let error: any = null;

  if (qr) {
    const result = await supabase
      .from('customers')
      .select('id, name, balance, balance_held, balance_type, qr_code, photo_url, business_id, allow_negative')
      .eq('qr_code', qr)
      .eq('is_active', true)
      .single();
    customer = result.data;
    error = result.error;
  } else if (pin) {
    // PIN lookup — find across all businesses
    const result = await supabase
      .from('customers')
      .select('id, name, balance, balance_held, balance_type, qr_code, photo_url, business_id, allow_negative')
      .eq('pin', pin)
      .eq('is_active', true);
    if (result.data && result.data.length === 1) {
      customer = result.data[0];
    } else if (result.data && result.data.length > 1) {
      return NextResponse.json({ success: false, error: 'PIN duplicado, usa tu código QR' }, { status: 400 });
    } else {
      error = { message: 'PIN no encontrado' };
    }
  }

  if (error || !customer) {
    return NextResponse.json({ success: false, error: 'Cliente no encontrado' }, { status: 404 });
  }

  // Get available products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, category, price, is_available')
    .eq('business_id', customer.business_id)
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  // Get zones
  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, color')
    .eq('business_id', customer.business_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Get recent transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, type, amount, balance_after, note, bank, reference, created_at, cashier_id, items, order_id')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get order details for transactions that have order_id
  let ordersMap: Record<string, any> = {};
  if (transactions) {
    const orderIds = transactions.filter(t => t.order_id).map(t => t.order_id);
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, items, order_type, created_at, updated_at, status')
        .in('id', orderIds);
      if (orders) {
        ordersMap = Object.fromEntries(orders.map(o => [o.id, o]));
      }
    }
  }

  // Get cashier names for recharge transactions
  let cashierMap: Record<string, string> = {};
  if (transactions) {
    const cashierIds = Array.from(new Set(transactions.filter(t => t.cashier_id).map(t => t.cashier_id)));
    if (cashierIds.length > 0) {
      const { data: cashiers } = await supabase
        .from('users')
        .select('id, name')
        .in('id', cashierIds);
      if (cashiers) {
        cashierMap = Object.fromEntries(cashiers.map(c => [c.id, c.name]));
      }
    }
  }

  const enrichedTransactions = (transactions || []).map(t => ({
    ...t,
    order: t.order_id ? ordersMap[t.order_id] || null : null,
    cashier_name: t.cashier_id ? cashierMap[t.cashier_id] || null : null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      customer: {
        id: customer.id,
        name: customer.name,
        balance: customer.balance,
        balance_held: customer.balance_held || 0,
        available_balance: customer.balance - (customer.balance_held || 0),
        balance_type: customer.balance_type,
        qr_code: customer.qr_code,
        photo_url: customer.photo_url,
      },
      products: products || [],
      zones: zones || [],
      transactions: enrichedTransactions,
    },
  });
}
