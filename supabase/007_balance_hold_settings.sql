-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 007: Balance hold + Settings
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Balance held by active orders
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_held NUMERIC(10,2) DEFAULT 0;

-- Business settings (tax percentage, etc)
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  tax_percentage NUMERIC(5,2) DEFAULT 15.00,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings visible to business users" ON business_settings
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Settings managed by business users" ON business_settings
  FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Insert default settings for BirraSport
INSERT INTO business_settings (business_id, tax_percentage)
VALUES ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 15.00)
ON CONFLICT (business_id) DO NOTHING;

-- Update process_consume to support negative balance
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

  -- Allow negative only if allow_negative is true
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

-- Function to hold balance for an order
CREATE OR REPLACE FUNCTION hold_balance(p_customer_id UUID, p_amount NUMERIC)
RETURNS JSONB AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_available NUMERIC;
BEGIN
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Cliente no encontrado'); END IF;

  v_available := v_customer.balance - COALESCE(v_customer.balance_held, 0);

  IF v_available < p_amount AND NOT COALESCE(v_customer.allow_negative, false) THEN
    RETURN jsonb_build_object('error', 'Saldo disponible insuficiente', 'available', v_available);
  END IF;

  UPDATE customers SET balance_held = COALESCE(balance_held, 0) + p_amount WHERE id = p_customer_id;

  RETURN jsonb_build_object('success', true, 'held', COALESCE(v_customer.balance_held, 0) + p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release held balance
CREATE OR REPLACE FUNCTION release_hold(p_customer_id UUID, p_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET balance_held = GREATEST(COALESCE(balance_held, 0) - p_amount, 0) WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Migration 007 complete' AS status;
