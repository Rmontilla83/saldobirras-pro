import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest, ok } from '@/lib/api-auth';
import { sendQREmail } from '@/lib/email';

// POST /api/email — send QR email to customer
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { customer_id } = await req.json();
  if (!customer_id) return badRequest('customer_id es requerido');

  const supabase = createAdminClient();
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customer_id)
    .eq('business_id', user.business_id)
    .single();

  if (error || !customer) return badRequest('Cliente no encontrado');
  if (!customer.email) return badRequest('El cliente no tiene correo electrónico');

  const result = await sendQREmail(
    customer.email,
    customer.name,
    customer.balance,
    customer.balance_type,
    customer.qr_code
  );

  if (result.success) return ok({ message: 'Correo enviado' });
  return badRequest('Error al enviar correo');
}
