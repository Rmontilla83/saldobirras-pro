import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthUser, unauthorized, badRequest } from '@/lib/api-auth';
import * as XLSX from 'xlsx';

// GET /api/export?from=2026-01-01&to=2026-02-28
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const type = searchParams.get('type'); // 'recharge', 'consume', or null for all

  if (!from || !to) return badRequest('from y to son requeridos (YYYY-MM-DD)');

  const supabase = createAdminClient();

  let query = supabase
    .from('transactions')
    .select('*, customers(name, email, phone)')
    .eq('business_id', user.business_id)
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false });

  if (type === 'recharge' || type === 'consume') {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) return badRequest(error.message);

  // Build Excel rows
  const rows = (data || []).map((t: any) => ({
    'Fecha': new Date(t.created_at).toLocaleDateString('es-VE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
    'Cliente': t.customers?.name || '—',
    'Tipo': t.type === 'recharge' ? 'Recarga' : 'Consumo',
    'Monto': t.amount,
    'Saldo Después': t.balance_after,
    'Método de Pago': t.bank || '—',
    'Referencia': t.reference || '—',
    'Detalle': t.note || '—',
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 18 }, // Fecha
    { wch: 22 }, // Cliente
    { wch: 10 }, // Tipo
    { wch: 12 }, // Monto
    { wch: 14 }, // Saldo Después
    { wch: 16 }, // Método de Pago
    { wch: 16 }, // Referencia
    { wch: 24 }, // Detalle
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

  // Add summary sheet
  const recharges = (data || []).filter((t: any) => t.type === 'recharge');
  const consumes = (data || []).filter((t: any) => t.type === 'consume');
  const totalRecharge = recharges.reduce((s: number, t: any) => s + t.amount, 0);
  const totalConsume = consumes.reduce((s: number, t: any) => s + t.amount, 0);

  const summary = [
    { 'Concepto': 'Período', 'Valor': `${from} al ${to}` },
    { 'Concepto': 'Total Movimientos', 'Valor': (data || []).length },
    { 'Concepto': 'Recargas', 'Valor': recharges.length },
    { 'Concepto': 'Consumos', 'Valor': consumes.length },
    { 'Concepto': 'Total Recargas ($)', 'Valor': totalRecharge.toFixed(2) },
    { 'Concepto': 'Total Consumos ($)', 'Valor': totalConsume.toFixed(2) },
    { 'Concepto': 'Balance Neto ($)', 'Valor': (totalRecharge - totalConsume).toFixed(2) },
  ];

  const ws2 = XLSX.utils.json_to_sheet(summary);
  ws2['!cols'] = [{ wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

  // Generate buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const filename = `SaldoBirras_Movimientos_${from}_${to}.xlsx`;

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
