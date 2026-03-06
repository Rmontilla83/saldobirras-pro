-- 017: Índices de rendimiento para escenario estadio
-- Optimiza búsquedas frecuentes bajo carga alta (500-1000 usuarios concurrentes)

-- Índice para búsqueda de PIN en portal (evita full table scan)
CREATE INDEX IF NOT EXISTS idx_customers_pin_lookup
  ON customers(pin) WHERE pin IS NOT NULL;

-- Índices trigram para búsqueda ILIKE de cajeras (nombre, email, teléfono)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON customers USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_email_trgm
  ON customers USING GIN (email gin_trgm_ops)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm
  ON customers USING GIN (phone gin_trgm_ops)
  WHERE phone IS NOT NULL;

-- Índice compuesto para producción/pedidos (status + created_at)
CREATE INDEX IF NOT EXISTS idx_orders_business_status_created
  ON orders(business_id, status, created_at DESC);

-- Índice para updated_at (queries de "recientemente actualizado")
CREATE INDEX IF NOT EXISTS idx_orders_updated_at
  ON orders(business_id, updated_at DESC);

-- Índice para transacciones por fecha (listados con ORDER BY created_at)
CREATE INDEX IF NOT EXISTS idx_transactions_business_created
  ON transactions(business_id, created_at DESC);
