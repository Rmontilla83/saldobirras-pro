-- 014: WiFi sessions for captive portal (Ruijie Reyee / WiFiDog)
-- Tracks authenticated WiFi sessions so the gateway can verify access

CREATE TABLE IF NOT EXISTS wifi_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  mac_address VARCHAR(20),
  gw_address VARCHAR(45),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  last_ping_at TIMESTAMPTZ
);

-- Indices for fast lookups by the gateway
CREATE INDEX idx_wifi_token ON wifi_sessions(token);
CREATE INDEX idx_wifi_mac ON wifi_sessions(mac_address);
CREATE INDEX idx_wifi_customer ON wifi_sessions(customer_id);
CREATE INDEX idx_wifi_active_expires ON wifi_sessions(is_active, expires_at);

-- RLS: wifi_sessions only accessible via service role (API routes)
ALTER TABLE wifi_sessions ENABLE ROW LEVEL SECURITY;
