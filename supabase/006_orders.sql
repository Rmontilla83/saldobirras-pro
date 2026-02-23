-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 006: Orders system
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'pending',
  zone_id UUID REFERENCES zones(id),
  note TEXT,
  delivered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_status ON orders(business_id, status);
CREATE INDEX idx_orders_customer ON orders(customer_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Public read for customers via QR (no auth needed for portal)
CREATE POLICY "Orders visible to business users" ON orders
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Orders managed by business users" ON orders
  FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Allow anon inserts for portal orders
CREATE POLICY "Customers can create orders" ON orders
  FOR INSERT TO anon
  WITH CHECK (true);

SELECT '✅ Migration 006 complete: orders system' AS status;
