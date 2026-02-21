-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- ─── ENUM TYPES ───
CREATE TYPE balance_type AS ENUM ('money', 'beers');
CREATE TYPE tx_type AS ENUM ('recharge', 'consume');
CREATE TYPE user_role AS ENUM ('owner', 'cashier', 'auditor');

-- ─── BUSINESSES ───
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#F5A623',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── USERS (staff/admins, linked to Supabase Auth) ───
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'cashier',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── CUSTOMERS (people who hold balances) ───
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  balance_type balance_type NOT NULL DEFAULT 'money',
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  qr_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TRANSACTIONS (immutable log) ───
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES users(id),
  type tx_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(12,2) NOT NULL,
  note TEXT,
  bank TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── SCAN QUEUE (real-time phone→PC sync) ───
CREATE TABLE scan_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES users(id),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── AUDIT LOG ───
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ INDEXES ═══
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_qr ON customers(qr_code);
CREATE INDEX idx_customers_email ON customers(business_id, email);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_business ON transactions(business_id, created_at DESC);
CREATE INDEX idx_scan_queue_business ON scan_queue(business_id, processed, created_at DESC);
CREATE INDEX idx_audit_business ON audit_log(business_id, created_at DESC);

-- ═══ AUTO-UPDATE updated_at ═══
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══ ROW LEVEL SECURITY ═══
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own business
CREATE POLICY "users_own_business" ON users
  FOR ALL USING (id = auth.uid());

CREATE POLICY "businesses_members" ON businesses
  FOR ALL USING (
    id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "customers_own_business" ON customers
  FOR ALL USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "transactions_own_business" ON transactions
  FOR ALL USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "scan_queue_own_business" ON scan_queue
  FOR ALL USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "audit_own_business" ON audit_log
  FOR ALL USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

-- ═══ REALTIME ═══
-- Enable realtime for scan_queue (phone→PC sync)
ALTER PUBLICATION supabase_realtime ADD TABLE scan_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- ═══ HELPER FUNCTIONS ═══

-- Function: Process a recharge
CREATE OR REPLACE FUNCTION process_recharge(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_note TEXT DEFAULT 'Recarga',
  p_bank TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_cashier_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_new_balance NUMERIC;
  v_tx_id UUID;
BEGIN
  -- Lock the customer row
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cliente no encontrado');
  END IF;

  v_new_balance := v_customer.balance + p_amount;

  -- Update balance
  UPDATE customers SET
    balance = v_new_balance,
    initial_balance = GREATEST(initial_balance, v_new_balance)
  WHERE id = p_customer_id;

  -- Create transaction
  INSERT INTO transactions (business_id, customer_id, cashier_id, type, amount, balance_after, note, bank, reference)
  VALUES (v_customer.business_id, p_customer_id, p_cashier_id, 'recharge', p_amount, v_new_balance, p_note, p_bank, p_reference)
  RETURNING id INTO v_tx_id;

  -- Audit
  INSERT INTO audit_log (business_id, user_id, action, entity, entity_id, details)
  VALUES (v_customer.business_id, p_cashier_id, 'recharge', 'customer', p_customer_id,
    jsonb_build_object('amount', p_amount, 'balance_after', v_new_balance, 'bank', p_bank, 'reference', p_reference));

  RETURN jsonb_build_object('success', true, 'tx_id', v_tx_id, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Process a consumption
CREATE OR REPLACE FUNCTION process_consume(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_note TEXT DEFAULT 'Consumo',
  p_cashier_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_new_balance NUMERIC;
  v_tx_id UUID;
BEGIN
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cliente no encontrado');
  END IF;

  v_new_balance := v_customer.balance - p_amount;
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('error', 'Saldo insuficiente', 'balance', v_customer.balance);
  END IF;

  UPDATE customers SET balance = v_new_balance WHERE id = p_customer_id;

  INSERT INTO transactions (business_id, customer_id, cashier_id, type, amount, balance_after, note)
  VALUES (v_customer.business_id, p_customer_id, p_cashier_id, 'consume', p_amount, v_new_balance, p_note)
  RETURNING id INTO v_tx_id;

  INSERT INTO audit_log (business_id, user_id, action, entity, entity_id, details)
  VALUES (v_customer.business_id, p_cashier_id, 'consume', 'customer', p_customer_id,
    jsonb_build_object('amount', p_amount, 'balance_after', v_new_balance));

  RETURN jsonb_build_object('success', true, 'tx_id', v_tx_id, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ SEED: Create BirraSport business ═══
INSERT INTO businesses (name, slug) VALUES ('BirraSport', 'birrasport');

SELECT '✅ Schema created successfully. Business ID:' AS status, id::text FROM businesses WHERE slug = 'birrasport';
