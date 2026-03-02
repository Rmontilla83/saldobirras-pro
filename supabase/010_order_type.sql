-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 010: Order type (bar/kitchen)
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Add order_type column to orders table
-- Values: 'bar' (drinks), 'kitchen' (food), 'mixed' (legacy orders)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'bar';

-- Add items column to transactions for order detail tracking
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS items JSONB;

-- Add order_id to transactions for linking to orders
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);

-- Index for filtering by order_type
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(business_id, order_type);

-- Index for transaction order lookup
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);

SELECT '✅ Migration 010 complete: order_type column added' AS status;
