// Simple nanoid implementation (no external dependency)
export function nanoid(size = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < size; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

// Format currency
export function formatMoney(amount: number): string {
  return '$' + amount.toFixed(2);
}

// Format balance display
export function formatBalance(amount: number, type: 'money' | 'beers'): string {
  return type === 'money' ? formatMoney(amount) : `${amount} 🍺`;
}

// Format date for display
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Get consistent color from name
export function getAvatarColor(name: string): string {
  const colors = [
    '#F5A623', '#D4881A', '#3B82F6', '#00D68F', '#A855F7',
    '#FF4757', '#06B6D4', '#EC4899', '#F97316', '#1B2A4A',
  ];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Low balance thresholds
export const LOW_BALANCE_MONEY = 10;
export const LOW_BALANCE_BEERS = 2;

export function isLowBalance(balance: number, type: 'money' | 'beers'): boolean {
  return type === 'money' ? balance <= LOW_BALANCE_MONEY : balance <= LOW_BALANCE_BEERS;
}

// Banks list for Venezuela
export const BANKS = [
  'Efectivo',
  'Banesco',
  'Mercantil',
  'Provincial',
  'BNC',
  'Venezuela',
  'Bicentenario',
  'Zelle',
  'Binance',
  'PayPal',
  'Otro',
];
