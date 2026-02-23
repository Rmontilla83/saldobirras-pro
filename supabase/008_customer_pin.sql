-- ═══ MIGRATION 008: Customer PIN for portal login ═══

-- Add PIN column (4 digits, unique per business)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pin VARCHAR(4);

-- Generate PINs for existing customers
DO $$
DECLARE
  r RECORD;
  new_pin VARCHAR(4);
  attempts INT;
BEGIN
  FOR r IN SELECT id, business_id FROM customers WHERE pin IS NULL LOOP
    attempts := 0;
    LOOP
      new_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      -- Check uniqueness within business
      IF NOT EXISTS (
        SELECT 1 FROM customers WHERE business_id = r.business_id AND pin = new_pin AND id != r.id
      ) THEN
        UPDATE customers SET pin = new_pin WHERE id = r.id;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 100 THEN EXIT; END IF;
    END LOOP;
  END LOOP;
END $$;

-- Index for fast PIN lookup
CREATE INDEX IF NOT EXISTS idx_customers_pin ON customers(business_id, pin);
