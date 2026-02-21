'use client';

import { isLowBalance } from '@/lib/utils';
import type { Customer } from '@/lib/types';

export default function StatusBadge({ customer }: { customer: Customer }) {
  if (customer.balance <= 0) return <span className="badge badge-red">● Sin saldo</span>;
  if (isLowBalance(customer.balance, customer.balance_type)) return <span className="badge badge-orange">● Saldo bajo</span>;
  return <span className="badge badge-green">● Activo</span>;
}
