'use client';

import { isLowBalance } from '@/lib/utils';
import type { Customer } from '@/lib/types';

export default function StatusBadge({ customer }: { customer: Customer }) {
  const allowNeg = (customer as any).allow_negative;
  if (customer.balance < 0 && allowNeg) return <span className="badge badge-purple">● Con Deuda</span>;
  if (customer.balance <= 0 && allowNeg) return <span className="badge badge-orange">● Postpago</span>;
  if (customer.balance <= 0) return <span className="badge badge-red">● Sin saldo</span>;
  if (isLowBalance(customer.balance, customer.balance_type)) return <span className="badge badge-orange">● Saldo bajo</span>;
  return <span className="badge badge-green">● Activo</span>;
}
