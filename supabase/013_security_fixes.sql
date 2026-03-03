-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 013: Security Fixes
-- Run this in Supabase SQL Editor BEFORE deploying app updates
-- ═══════════════════════════════════════════════════════════

-- ═══ 1. NEGATIVE AMOUNT PROTECTION IN RPCs ═══

-- Recreate process_recharge with amount > 0 guard
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
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser mayor a 0');
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cliente no encontrado');
  END IF;

  v_new_balance := v_customer.balance + p_amount;

  UPDATE customers SET
    balance = v_new_balance,
    initial_balance = GREATEST(initial_balance, v_new_balance)
  WHERE id = p_customer_id;

  INSERT INTO transactions (business_id, customer_id, cashier_id, type, amount, balance_after, note, bank, reference)
  VALUES (v_customer.business_id, p_customer_id, p_cashier_id, 'recharge', p_amount, v_new_balance, p_note, p_bank, p_reference)
  RETURNING id INTO v_tx_id;

  INSERT INTO audit_log (business_id, user_id, action, entity, entity_id, details)
  VALUES (v_customer.business_id, p_cashier_id, 'recharge', 'customer', p_customer_id,
    jsonb_build_object('amount', p_amount, 'balance_after', v_new_balance, 'bank', p_bank, 'reference', p_reference));

  RETURN jsonb_build_object('success', true, 'tx_id', v_tx_id, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate process_consume with amount > 0 guard
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
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser mayor a 0');
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cliente no encontrado');
  END IF;

  v_new_balance := v_customer.balance - p_amount;

  IF v_new_balance < 0 AND NOT COALESCE(v_customer.allow_negative, false) THEN
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

-- Recreate hold_balance with amount > 0 guard + audit logging
CREATE OR REPLACE FUNCTION hold_balance(p_customer_id UUID, p_amount NUMERIC)
RETURNS JSONB AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_available NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser mayor a 0');
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Cliente no encontrado'); END IF;

  v_available := v_customer.balance - COALESCE(v_customer.balance_held, 0);

  IF v_available < p_amount AND NOT COALESCE(v_customer.allow_negative, false) THEN
    RETURN jsonb_build_object('error', 'Saldo disponible insuficiente', 'available', v_available);
  END IF;

  UPDATE customers SET balance_held = COALESCE(balance_held, 0) + p_amount WHERE id = p_customer_id;

  INSERT INTO audit_log (business_id, user_id, action, entity, entity_id, details)
  VALUES (v_customer.business_id, NULL, 'hold_balance', 'customer', p_customer_id,
    jsonb_build_object('amount', p_amount, 'new_held', COALESCE(v_customer.balance_held, 0) + p_amount));

  RETURN jsonb_build_object('success', true, 'held', COALESCE(v_customer.balance_held, 0) + p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate release_hold with audit logging
CREATE OR REPLACE FUNCTION release_hold(p_customer_id UUID, p_amount NUMERIC)
RETURNS VOID AS $$
DECLARE
  v_customer customers%ROWTYPE;
BEGIN
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id;

  UPDATE customers SET balance_held = GREATEST(COALESCE(balance_held, 0) - p_amount, 0) WHERE id = p_customer_id;

  IF FOUND AND v_customer.business_id IS NOT NULL THEN
    INSERT INTO audit_log (business_id, user_id, action, entity, entity_id, details)
    VALUES (v_customer.business_id, NULL, 'release_hold', 'customer', p_customer_id,
      jsonb_build_object('amount', p_amount));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ 2. DATABASE CONSTRAINTS ═══

-- Prevent negative balance_held
ALTER TABLE customers ADD CONSTRAINT check_balance_held_nonneg CHECK (balance_held >= 0);

-- Order total must be positive
ALTER TABLE orders ADD CONSTRAINT check_order_total_positive CHECK (total > 0);

-- Product price must be non-negative
ALTER TABLE products ADD CONSTRAINT check_product_price_nonneg CHECK (price >= 0);

-- Unique PIN per business (skip if index already covers this)
DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT unique_pin_per_business UNIQUE (business_id, pin);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ═══ 3. UPGRADE PIN TO 6 DIGITS ═══

ALTER TABLE customers ALTER COLUMN pin TYPE VARCHAR(6);

-- ═══ 4. AUDIT LOG: RESTRICT TO SELECT-ONLY FOR AUTHENTICATED USERS ═══

-- Drop existing permissive policy
DROP POLICY IF EXISTS "audit_own_business" ON audit_log;

-- Audit log: users can only SELECT (read) their business logs
CREATE POLICY "audit_own_business_select" ON audit_log
  FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

-- ═══ 5. PERFORMANCE INDICES ═══

CREATE INDEX IF NOT EXISTS idx_transactions_customer_created
  ON transactions(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_business_status
  ON orders(business_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_business_active
  ON customers(business_id, is_active);

CREATE INDEX IF NOT EXISTS idx_customers_business_pin
  ON customers(business_id, pin);

-- ═══ 6. ORPHANED HOLDS CLEANUP FUNCTION ═══

CREATE OR REPLACE FUNCTION cleanup_orphaned_holds()
RETURNS VOID AS $$
BEGIN
  -- Release holds from pending orders older than 2 hours
  UPDATE customers c
  SET balance_held = GREATEST(COALESCE(c.balance_held, 0) - o.total, 0)
  FROM orders o
  WHERE o.customer_id = c.id
    AND o.status = 'pending'
    AND o.created_at < now() - interval '2 hours';

  -- Cancel those orphaned orders
  UPDATE orders
  SET status = 'cancelled', updated_at = now()
  WHERE status = 'pending'
    AND created_at < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Migration 013 (Security Fixes) complete' AS status;
