import { create } from 'zustand';
import type { Customer, Transaction, User, Business } from './types';

interface AppState {
  // Auth
  user: User | null;
  business: Business | null;
  setAuth: (user: User, business: Business) => void;
  clearAuth: () => void;

  // Data
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  updateCustomer: (customer: Customer) => void;

  // UI
  view: 'dashboard' | 'register' | 'customer' | 'transactions' | 'stats' | 'scan' | 'settings' | 'users';
  selectedCustomer: Customer | null;
  scanPopup: Customer | null;
  search: string;
  loading: boolean;
  synced: boolean;

  setView: (view: AppState['view'], customer?: Customer) => void;
  setScanPopup: (customer: Customer | null) => void;
  setSearch: (search: string) => void;
  setLoading: (loading: boolean) => void;
  setSynced: (synced: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  user: null,
  business: null,
  setAuth: (user, business) => set({ user, business }),
  clearAuth: () => set({ user: null, business: null }),

  // Data
  customers: [],
  setCustomers: (customers) => set({ customers }),
  updateCustomer: (customer) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customer.id ? customer : c
      ),
      selectedCustomer:
        state.selectedCustomer?.id === customer.id ? customer : state.selectedCustomer,
    })),

  // UI
  view: 'dashboard',
  selectedCustomer: null,
  scanPopup: null,
  search: '',
  loading: false,
  synced: false,

  setView: (view, customer) =>
    set({
      view,
      selectedCustomer: customer || null,
      scanPopup: null,
      search: view === 'dashboard' ? '' : undefined,
    }),
  setScanPopup: (customer) => set({ scanPopup: customer }),
  setSearch: (search) => set({ search }),
  setLoading: (loading) => set({ loading }),
  setSynced: (synced) => set({ synced }),
}));
