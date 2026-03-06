-- 015: Add VIP flag to customers
-- VIP customers get exclusive benefits

ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

-- Index for efficient VIP lookups
CREATE INDEX IF NOT EXISTS idx_customers_vip ON customers(is_vip) WHERE is_vip = true;
