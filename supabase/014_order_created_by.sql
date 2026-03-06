-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 014: Add created_by to orders
-- Tracks which user/cashier created each order
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

SELECT '✅ Migration 014 complete: orders.created_by added' AS status;
