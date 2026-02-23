-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 005: Products & Zones
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Product categories
CREATE TYPE product_category AS ENUM ('beer', 'cocktail', 'spirit', 'wine', 'soft_drink', 'food', 'other');

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL DEFAULT 'beer',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_products_available ON products(business_id, is_available);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products visible to authenticated users" ON products
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Products managed by business users" ON products
  FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Zones table (for stadium sections)
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#F5A623',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_zones_business ON zones(business_id);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Zones visible to authenticated users" ON zones
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Zones managed by business users" ON zones
  FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Add zone to customers (optional, their default zone)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id);

-- Allow negative balance (postpago)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS allow_negative BOOLEAN DEFAULT false;

-- Add zone to transactions for reporting
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id);

-- Add product details to transactions (JSONB array of items)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';

-- Insert default zones for BirraSport stadium
INSERT INTO zones (business_id, name, description, color, sort_order) VALUES
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'Zona A', 'Tribuna Principal', '#3B82F6', 1),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'Zona B', 'Tribuna Lateral', '#10B981', 2),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'Zona C', 'Grada General', '#F59E0B', 3),
  ('2fabcc89-154e-46c4-b9ca-3c5014a7856d', 'Zona D', 'Zona VIP', '#8B5CF6', 4);

SELECT '✅ Migration 005 complete: products & zones' AS status;
