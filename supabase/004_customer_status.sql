-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 004: Auto customer status
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Auto-update is_active based on balance after every transaction
CREATE OR REPLACE FUNCTION update_customer_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers 
  SET is_active = (balance > 0)
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on transactions table
DROP TRIGGER IF EXISTS trg_update_customer_status ON transactions;
CREATE TRIGGER trg_update_customer_status
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_status();

-- Set current status for existing customers
UPDATE customers SET is_active = (balance > 0);

SELECT '✅ Migration 004 complete: auto customer status' AS status;
