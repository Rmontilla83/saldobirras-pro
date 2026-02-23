import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// GET /api/portal?qr=SB-XXXX — public lookup
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qr = searchParams.get('qr');

  if (!qr) {
    return NextResponse.json({ success: false, error: 'QR code requerido' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find customer by QR
  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, balance, balance_type, qr_code, photo_url, business_id')
    .eq('qr_code', qr)
    .single();

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
        balance_type: customer.balance_type,
        qr_code: customer.qr_code,
        photo_url: customer.photo_url,
      },
      products: products || [],
      zones: zones || [],
    },
  });
}
