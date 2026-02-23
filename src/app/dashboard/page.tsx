'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useStore } from '@/lib/store';
import type { Customer, Transaction } from '@/lib/types';
import Header from '@/components/Header';
import DashboardView from '@/components/DashboardView';
import RegisterView from '@/components/RegisterView';
import CustomerView from '@/components/CustomerView';
import TransactionsView from '@/components/TransactionsView';
import StatsView from '@/components/StatsView';
import ScanView from '@/components/ScanView';
import ScanPopup from '@/components/ScanPopup';
import UsersView from '@/components/UsersView';
import ProductsView from '@/components/ProductsView';
import Toast from '@/components/Toast';

export default function DashboardPage() {
  const router = useRouter();
  const store = useStore();
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'error' | 'warn' } | null>(null);
  const supabase = createClient();

  const showToast = useCallback((msg: string, type: 'ok' | 'error' | 'warn' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Check auth and load data
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile) { router.replace('/login'); return; }

      // Check if user is deactivated
      if (profile.is_active === false) {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      // Get business
      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', profile.business_id)
        .single();

      store.setAuth(profile, business);
      loadCustomers();

      // Set mobile default view
      if (window.innerWidth <= 700) store.setView('scan');
    };
    init();
  }, []);

  const loadCustomers = async () => {
    store.setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/customers', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (json.success) {
      store.setCustomers(json.data);
      store.setSynced(true);
    }
    store.setLoading(false);
  };

  // Realtime: listen for scan events (PC receives phone scans)
  useEffect(() => {
    if (!store.user || window.innerWidth <= 700) return;

    const channel = supabase
      .channel('scan-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'scan_queue',
        filter: `business_id=eq.${store.user.business_id}`,
      }, async (payload: any) => {
        const customerId = payload.new.customer_id;
        // Refresh customers to get latest balance
        await loadCustomers();
        const customer = useStore.getState().customers.find(c => c.id === customerId);
        if (customer) {
          store.setScanPopup(customer);
          // Mark as processed
          await supabase.from('scan_queue').update({ processed: true }).eq('id', payload.new.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [store.user]);

  // Auto-refresh every 45s
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadCustomers();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const apiCall = async (url: string, method: string = 'GET', body?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };

  const createCustomer = async (data: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    let res;
    if (data.photo) {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.email) formData.append('email', data.email);
      if (data.phone) formData.append('phone', data.phone);
      formData.append('balance_type', data.balance_type);
      formData.append('initial_balance', String(data.initial_balance));
      formData.append('photo', data.photo);

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      res = await response.json();
    } else {
      const { photo, ...jsonData } = data;
      res = await apiCall('/api/customers', 'POST', jsonData);
    }

    if (res?.success) {
      await loadCustomers();
      const customer = useStore.getState().customers.find(c => c.qr_code === res.data.qr_code);
      if (customer) {
        store.setView('customer', customer);
        // Auto-generate card PDF
        import('@/lib/card-generator').then(async ({ generateCard, preloadImage }) => {
          const [photoBase64, logoBase64] = await Promise.all([
            customer.photo_url ? preloadImage(customer.photo_url) : Promise.resolve(null),
            preloadImage('/logo.png'),
          ]);
          await generateCard({ customer, photoBase64, logoBase64 });
        }).catch(console.error);
      }
      showToast(`✓ ${data.name} registrado — carnet descargado`);
    } else {
      showToast(res?.error || 'Error al registrar', 'error');
    }
    return res;
  };

  const processTransaction = async (type: 'recharge' | 'consume', data: any) => {
    const res = await apiCall('/api/transactions', 'POST', { type, ...data });
    if (res?.success) {
      // Small delay to let DB trigger update is_active
      await new Promise(r => setTimeout(r, 200));
      await loadCustomers();
      const updated = useStore.getState().customers.find(c => c.id === data.customer_id);
      if (updated) store.setView('customer', updated);
      if (type === 'recharge') showToast('✓ Recarga exitosa');
      else {
        showToast('✓ Consumo registrado');
        if (updated && updated.balance <= 0) setTimeout(() => showToast('⚠ Saldo agotado', 'error'), 400);
        else if (updated && updated.balance <= 10) setTimeout(() => showToast('⚠ Saldo bajo', 'warn'), 400);
      }
    } else {
      showToast(res?.error || 'Error', 'error');
    }
    return res;
  };

  const scanQR = async (qr_code: string) => {
    const res = await apiCall(`/api/scan?qr_code=${encodeURIComponent(qr_code)}`);
    if (res?.success) {
      await loadCustomers();
      const customer = useStore.getState().customers.find(c => c.id === res.data.id);
      if (customer) {
        showToast(`✓ ${customer.name}`);
        // On mobile, notify PC via scan_queue
        if (window.innerWidth <= 700) {
          await apiCall('/api/scan', 'POST', { qr_code });
        } else {
          store.setView('customer', customer);
        }
        return customer;
      }
    }
    showToast('No encontrado', 'error');
    return null;
  };

  const searchCustomer = async (query: string) => {
    const res = await apiCall(`/api/scan?q=${encodeURIComponent(query)}`);
    if (res?.success && res.data?.length > 0) {
      const customer = res.data[0];
      showToast(`✓ ${customer.name}`);
      if (window.innerWidth > 700) {
        store.setView('customer', customer);
      }
      return customer;
    }
    showToast('No encontrado', 'error');
    return null;
  };

  const sendQREmail = async (customerId: string) => {
    const res = await apiCall('/api/email', 'POST', { customer_id: customerId });
    if (res?.success) showToast('✓ Correo enviado');
    else showToast(res?.error || 'Error al enviar correo', 'error');
    return res;
  };

  const editCustomer = async (formData: FormData) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const res = await fetch('/api/customers/update', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });
    const json = await res.json();
    if (json?.success) {
      await loadCustomers();
      const updated = useStore.getState().customers.find(c => c.id === json.data.id);
      if (updated) store.setView('customer', updated);
      showToast('✓ Cliente actualizado');
    } else {
      showToast(json?.error || 'Error al actualizar', 'error');
    }
    return json;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    store.clearAuth();
    router.replace('/login');
  };

  const loadTransactions = async (customerId?: string) => {
    const url = customerId
      ? `/api/transactions?customer_id=${customerId}`
      : '/api/transactions?limit=200';
    const res = await apiCall(url);
    return res?.success ? res.data : [];
  };

  if (!store.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  return (
    <>
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('/fondo.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-bg/[0.92] via-bg/80 to-bg/95" />
      </div>

      <div className="relative z-10 max-w-[1060px] mx-auto px-5 pb-12">
        <Header onRefresh={loadCustomers} onLogout={handleLogout} />

        {store.view === 'dashboard' && (
          <DashboardView onLoadTransactions={loadTransactions} />
        )}
        {store.view === 'register' && (
          <RegisterView onSubmit={createCustomer} />
        )}
        {store.view === 'customer' && store.selectedCustomer && (
          <CustomerView
            onRecharge={(data) => processTransaction('recharge', data)}
            onConsume={(data) => processTransaction('consume', data)}
            onLoadTransactions={loadTransactions}
            onSendQREmail={sendQREmail}
            onEditCustomer={editCustomer}
          />
        )}
        {store.view === 'transactions' && (
          <TransactionsView onLoadTransactions={loadTransactions} />
        )}
        {store.view === 'stats' && (
          <StatsView onLoadTransactions={loadTransactions} />
        )}
        {store.view === 'scan' && (
          <ScanView onScan={scanQR} onSearch={searchCustomer} />
        )}
        {store.view === 'users' && store.user?.role === 'owner' && (
          <UsersView showToast={showToast} />
        )}
        {store.view === 'products' && store.user?.role === 'owner' && (
          <ProductsView showToast={showToast} />
        )}
      </div>

      {store.scanPopup && <ScanPopup />}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  );
}
