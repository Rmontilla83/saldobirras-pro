export type BalanceType = 'money' | 'beers';
export type TxType = 'recharge' | 'consume';
export type UserRole = 'owner' | 'cashier' | 'auditor';

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
}

export interface User {
  id: string;
  business_id: string;
  name: string;
  email: string;
  role: UserRole;
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
