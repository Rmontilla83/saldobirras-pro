export type BalanceType = 'money' | 'beers';
export type TxType = 'recharge' | 'consume';
export type UserRole = 'owner' | 'cashier' | 'auditor';
export type ProductCategory = 'beer' | 'cocktail' | 'spirit' | 'soft_drink' | 'food' | 'other';
export type VenueZone = 'general' | 'zone_a' | 'zone_b' | 'zone_c' | 'zone_d' | 'vip' | 'barra';

export const ZONE_LABELS: Record<VenueZone, string> = {
  general: 'General',
  zone_a: 'Zona A',
  zone_b: 'Zona B',
  zone_c: 'Zona C',
  zone_d: 'Zona D',
  vip: 'VIP',
  barra: 'Barra',
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  beer: 'Cerveza',
  cocktail: 'Cóctel',
  spirit: 'Licor',
  soft_drink: 'Sin Alcohol',
  food: 'Comida',
  other: 'Otro',
};

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
}

export interface UserPermissions {
  dashboard: boolean;
  register: boolean;
  recharge: boolean;
  consume: boolean;
  transactions: boolean;
  stats: boolean;
  export: boolean;
  edit_customer: boolean;
  send_email: boolean;
  manage_users: boolean;
}

export interface User {
  id: string;
  business_id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: UserPermissions;
  is_active: boolean;
  created_at: string;
}

export interface Zone {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  balance_type: BalanceType;
  balance: number;
  initial_balance: number;
  qr_code: string;
  is_active: boolean;
  zone_id: string | null;
  allow_negative: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  customer_id: string;
  cashier_id: string | null;
  type: TxType;
  amount: number;
  balance_after: number;
  note: string | null;
  bank: string | null;
  reference: string | null;
  items: OrderItem[];
  created_at: string;
  // Joined fields
  customer_name?: string;
  cashier_name?: string;
}

export interface ScanEvent {
  id: string;
  business_id: string;
  customer_id: string;
  scanned_by: string | null;
  processed: boolean;
  created_at: string;
}

// API request/response types
export interface RechargeRequest {
  customer_id: string;
  amount: number;
  note?: string;
  bank?: string;
  reference?: string;
}

export interface ConsumeRequest {
  customer_id: string;
  amount: number;
  note?: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  balance_type: BalanceType;
  initial_balance: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard stats
export interface DashboardStats {
  total_customers: number;
  total_balance: number;
  total_alerts: number;
  total_transactions: number;
  recent_transactions: Transaction[];
  low_balance_customers: Customer[];
}
