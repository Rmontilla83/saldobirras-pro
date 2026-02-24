import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';
import { sendQREmail } from '@/lib/email';
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
    .order('created_at', { ascending: false });

  if (error) return badRequest(error.message);
  return ok(data);
}

// POST /api/customers — create a new customer
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  // Parse FormData (supports file upload)
  const contentType = req.headers.get('content-type') || '';
  let name: string, email: string | undefined, phone: string | undefined;
  let balance_type: string, initial_balance: number;
  let photoFile: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    name = formData.get('name') as string;
    email = (formData.get('email') as string) || undefined;
    phone = (formData.get('phone') as string) || undefined;
    balance_type = formData.get('balance_type') as string;
    initial_balance = parseFloat(formData.get('initial_balance') as string);
    photoFile = formData.get('photo') as File | null;
  } else {
    const body = await req.json();
    name = body.name;
    email = body.email;
    phone = body.phone;
    balance_type = body.balance_type;
    initial_balance = body.initial_balance;
  }

  if (!name || !balance_type || initial_balance == null) {
    return badRequest('Nombre, tipo de saldo y saldo inicial son requeridos');
  }

  const supabase = createAdminClient();
  const qr_code = `SB-${nanoid(12)}`;

  // Generate unique 4-digit PIN
  let pin = '';
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const { data: exists } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', user.business_id)
      .eq('pin', candidate)
      .maybeSingle();
    if (!exists) { pin = candidate; break; }
  }

  // Upload photo if provided
  let photo_url: string | null = null;
  if (photoFile && photoFile.size > 0) {
    const ext = photoFile.name.split('.').pop() || 'jpg';
    const path = `customers/${qr_code}.${ext}`;
    const buffer = Buffer.from(await photoFile.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(path, buffer, { contentType: photoFile.type, upsert: true });

    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
      photo_url = urlData.publicUrl;
    }
  }

  // Create customer
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .insert({
      business_id: user.business_id,
      name,
      email: email || null,
      phone: phone || null,
      photo_url,
      balance_type,
      balance: initial_balance,
      initial_balance,
      qr_code,
      pin: pin || null,
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

  // Send QR email automatically
  if (email) {
    sendQREmail(email, name, initial_balance, balance_type, qr_code).catch(console.error);
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
