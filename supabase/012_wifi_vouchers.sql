-- 012: WiFi Vouchers System
-- Vouchers are generated in Ruijie Cloud and loaded into this table for distribution.

CREATE TABLE IF NOT EXISTS wifi_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id),
  code VARCHAR(50) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'available',
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, code)
);

-- status: 'available', 'assigned', 'used', 'expired'

CREATE INDEX idx_voucher_status ON wifi_vouchers(status);
CREATE INDEX idx_voucher_customer ON wifi_vouchers(customer_id);
CREATE INDEX idx_voucher_code ON wifi_vouchers(code);
CREATE INDEX idx_voucher_business ON wifi_vouchers(business_id);

-- RLS
ALTER TABLE wifi_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wifi_vouchers_business_isolation" ON wifi_vouchers
  FOR ALL USING (business_id = current_setting('app.business_id', true)::uuid);
