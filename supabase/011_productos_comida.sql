-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 011: Productos de comida
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

INSERT INTO products (business_id, name, description, category, price, is_available, sort_order) VALUES

-- Burgers
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Burger Special',
 'Pan batata tipo brioche, pollo crispy, vegetales (lechuga, tomate, cebolla), tocineta, salsas (ketchup, mayonesa, mostaza), queso fundido Kraft. Incluye papas fritas y bebida 355 ml',
 'food', 9.99, true, 100),

-- Sushi
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Marinos Rolls (10 piezas)',
 'Frío. Arroz, alga, queso crema, aguacate, kani temporizado, topping de ensalada kani, salsa Masago, salsa anguila, lluvia de ajonjolí',
 'food', 9.99, true, 110),

-- Kids
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Kids Menú',
 '6 nuggets de pollo, papas fritas, ketchup, juguito o bebida 355 ml',
 'food', 8.99, true, 120),

-- Tequeños
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Tequeños de Mozarella (5 unid)',
 'Tequeños rellenos de queso mozarella',
 'food', 6.99, true, 130),

-- Perros
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Perro Caliente',
 'Pan de batata tipo brioche, salchicha tradicional, vegetales (cebolla y mix repollo), papas, salsas (ketchup, mayonesa, mostaza)',
 'food', 2.50, true, 140),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Perro Polaco',
 'Pan de batata tipo brioche, salchicha polaca, vegetales (cebolla y mix repollo), papas, salsas (ketchup, mayonesa, mostaza)',
 'food', 3.99, true, 150),

-- Alitas
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Marinos Wings 5 unid',
 'Alitas spicy o bbq (5 unidades)',
 'food', 4.99, true, 160),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Marinos Wings 5 unid + Papas',
 'Alitas spicy o bbq (5 unidades) con papas fritas',
 'food', 6.99, true, 161),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Marinos Wings 10 unid',
 'Alitas spicy o bbq (10 unidades)',
 'food', 9.99, true, 170),

('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Marinos Wings 10 unid + Papas',
 'Alitas spicy o bbq (10 unidades) con papas fritas',
 'food', 11.99, true, 171),

-- Papas
('2fabcc89-154e-46c4-b9ca-3c5014a7856d',
 'Ración de Papas Fritas',
 'Porción de papas fritas',
 'food', 3.00, true, 180);

SELECT '✅ Migration 011 complete: 11 productos de comida agregados' AS status;
