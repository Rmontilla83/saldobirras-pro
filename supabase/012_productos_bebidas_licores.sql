-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 012: Bebidas, Licores y Cócteles
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

INSERT INTO products (business_id, name, description, category, price, is_available, sort_order) VALUES

-- ── Refrescos / Soft Drinks ─────────────────────────────────
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Gatorade', NULL, 'soft_drink', 1.00, true, 200),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Agua', NULL, 'soft_drink', 1.00, true, 201),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Pepsi', NULL, 'soft_drink', 1.00, true, 202),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 '7up', NULL, 'soft_drink', 1.00, true, 203),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Colita', NULL, 'soft_drink', 1.00, true, 204),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Malta', NULL, 'soft_drink', 1.00, true, 205),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Lipton', NULL, 'soft_drink', 1.00, true, 206),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Soda', NULL, 'soft_drink', 1.00, true, 207),

-- ── Servicios (botella completa) ────────────────────────────
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Servicio Buchanas 12', NULL, 'spirit', 1.00, true, 300),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Servicio Buchanas 18', NULL, 'spirit', 1.00, true, 301),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Servicio Old Par 12', NULL, 'spirit', 1.00, true, 302),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Servicio Santa Teresa 1976', NULL, 'spirit', 1.00, true, 303),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Servicio Santa Teresa Linaje', NULL, 'spirit', 1.00, true, 304),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Servicio de Pampero', NULL, 'spirit', 1.00, true, 305),

-- ── Tragos (por copa) ───────────────────────────────────────
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Trago de Buchanas 12', NULL, 'spirit', 1.00, true, 400),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Trago de Buchanas 18', NULL, 'spirit', 1.00, true, 401),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Trago de Old Par 12', NULL, 'spirit', 1.00, true, 402),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Trago de Pampero', NULL, 'spirit', 1.00, true, 403),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Trago de ST Linaje', NULL, 'spirit', 1.00, true, 404),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Trago de ST 1976', NULL, 'spirit', 1.00, true, 405),

-- ── Cócteles ────────────────────────────────────────────────
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Daiquiri', NULL, 'cocktail', 1.00, true, 500),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Mojito', NULL, 'cocktail', 1.00, true, 501),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Piña Colada', NULL, 'cocktail', 1.00, true, 502),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Cuba Libre', NULL, 'cocktail', 1.00, true, 503),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Acorazado (de la casa)', NULL, 'cocktail', 1.00, true, 504),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Screwdriver', 'A base de vodka', 'cocktail', 1.00, true, 505),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Blue Ocean (de la casa)', 'A base de vodka', 'cocktail', 1.00, true, 506);

SELECT '✅ Migration 012 complete: 27 productos de bebidas, licores y cócteles agregados' AS status;
