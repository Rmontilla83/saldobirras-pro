import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/api-auth';

// GET /api/portal?qr=SB-XXXX or ?pin=1234 — public lookup
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`portal:${ip}`, 20, 60000)) {
    return NextResponse.json({ success: false, error: 'Demasiadas solicitudes' }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const qr = searchParams.get('qr');
  const pin = searchParams.get('pin');

  if (!qr && !pin) {
    return NextResponse.json({ success: false, error: 'QR o PIN requerido' }, { status: 400 });
  }

  const supabase = createAdminClient();

  let customer: any = null;
  let error: any = null;

  if (qr) {
    const result = await supabase
      .from('customers')
      .select('id, name, balance, balance_held, balance_type, qr_code, photo_url, business_id, allow_negative, pin')
      .eq('qr_code', qr)
      .single();
    customer = result.data;
    error = result.error;
  } else if (pin) {
    // PIN lookup — find across all businesses (PIN is 4 digits)
    const result = await supabase
      .from('customers')
      .select('id, name, balance, balance_held, balance_type, qr_code, photo_url, business_id, allow_negative, pin')
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
    },
  });
}
