-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 016: Stadium Seat Locations
-- Adds seat_zone/seat_row/seat_number to customers & orders
-- Updates zones table with real 8 stadium zones
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Add seat location columns to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS seat_zone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS seat_row TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS seat_number TEXT;

-- Add seat location columns to orders (snapshot at order time)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seat_zone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seat_row TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seat_number TEXT;

-- Clear old zone references before replacing zones
UPDATE orders SET zone_id = NULL WHERE zone_id IS NOT NULL;
UPDATE customers SET zone_id = NULL WHERE zone_id IS NOT NULL;

-- Remove old generic zones
DELETE FROM zones WHERE business_id = '2fabcc89-154e-46c4-b9ca-3c5014a7856d';

-- Insert real stadium zones
INSERT INTO zones (business_id, name, description, color, sort_order) VALUES
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'Zona Media A', 'Zona Media A del estadio', '#3B82F6', 1),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'Zona Media B', 'Zona Media B del estadio', '#10B981', 2),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'Zona Media C', 'Zona Media C del estadio', '#F59E0B', 3),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'VIP A', 'Zona VIP A', '#8B5CF6', 4),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'VIP B', 'Zona VIP B', '#EC4899', 5),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'VIP C', 'Zona VIP C', '#06B6D4', 6),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'VIP D', 'Zona VIP D', '#F97316', 7),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'Tabloncillo A', 'Tabloncillo sección A', '#EF4444', 8);

-- Indexes for delivery routing
CREATE INDEX IF NOT EXISTS idx_customers_seat_zone ON customers(seat_zone) WHERE seat_zone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_seat_zone ON orders(seat_zone) WHERE seat_zone IS NOT NULL;

SELECT '✅ Migration 016 complete: stadium seat locations' AS status;
