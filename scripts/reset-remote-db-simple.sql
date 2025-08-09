-- =====================================================
-- リモートデータベースリセットスクリプト（簡易版）
-- 既存データを削除してサンプルデータを投入
-- =====================================================

-- 既存データを削除（外部キー制約の順序に注意）
DELETE FROM order_items;
DELETE FROM visits;
DELETE FROM bottle_keeps;
DELETE FROM inventory_movements;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM casts_profile;
DELETE FROM tables;
DELETE FROM staffs;

-- シーケンスをリセット
ALTER SEQUENCE tables_id_seq RESTART WITH 1;

-- =====================================================
-- サンプルデータ投入
-- =====================================================

-- サンプルスタッフ
INSERT INTO staffs (id, full_name, email, phone, role, is_active, hire_date) VALUES
  ('550e8400-e29b-41d4-a716-446655440101', '山田太郎', 'yamada@example.com', '090-1111-1111', 'manager', true, '2023-01-01'),
  ('550e8400-e29b-41d4-a716-446655440102', '鈴木花子', 'suzuki@example.com', '090-2222-2222', 'cast', true, '2023-06-01'),
  ('550e8400-e29b-41d4-a716-446655440103', '田中美咲', 'tanaka@example.com', '090-3333-3333', 'cast', true, '2023-09-01'),
  ('550e8400-e29b-41d4-a716-446655440104', '佐藤健', 'sato@example.com', '090-4444-4444', 'hall', true, '2024-01-01'),
  ('550e8400-e29b-41d4-a716-446655440105', '渡辺みゆき', 'watanabe@example.com', '090-5555-5555', 'cast', true, '2024-03-01')
ON CONFLICT (id) DO NOTHING;

-- サンプルテーブル
INSERT INTO tables (table_number, capacity, location, current_status) VALUES
  ('A-1', 4, '1階窓際', 'available'),
  ('A-2', 4, '1階窓際', 'available'),
  ('A-3', 4, '1階窓際', 'available'),
  ('B-1', 6, '1階中央', 'available'),
  ('B-2', 6, '1階中央', 'available'),
  ('B-3', 6, '1階中央', 'available'),
  ('C-1', 8, '1階奥', 'available'),
  ('C-2', 8, '1階奥', 'available'),
  ('VIP-1', 10, '2階VIPルーム', 'available'),
  ('VIP-2', 12, '2階VIPルーム', 'available')
ON CONFLICT DO NOTHING;

-- サンプルキャストプロフィール
INSERT INTO casts_profile (id, staff_id, stage_name, experience_months, hourly_rate, is_active) VALUES
  ('650e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440102', 'はな', 18, 5000, true),
  ('650e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440103', 'みさき', 12, 4500, true),
  ('650e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440105', 'みゆき', 6, 4000, true)
ON CONFLICT (id) DO NOTHING;

-- サンプル顧客
INSERT INTO customers (id, name, name_kana, phone_number, email, status, first_visit_date, total_visits, total_spent) VALUES
  ('750e8400-e29b-41d4-a716-446655440101', '佐藤一郎', 'サトウイチロウ', '090-5555-5555', 'sato@customer.com', 'active', '2023-01-15', 24, 480000),
  ('750e8400-e29b-41d4-a716-446655440102', '高橋二郎', 'タカハシジロウ', '090-6666-6666', 'takahashi@customer.com', 'vip', '2023-02-20', 48, 1200000),
  ('750e8400-e29b-41d4-a716-446655440103', '伊藤三郎', 'イトウサブロウ', '090-7777-7777', 'ito@customer.com', 'active', '2023-03-10', 36, 720000),
  ('750e8400-e29b-41d4-a716-446655440104', '田中花子', 'タナカハナコ', '090-8888-8888', 'tanaka@customer.com', 'active', '2024-01-05', 12, 180000),
  ('750e8400-e29b-41d4-a716-446655440105', '山田美穂', 'ヤマダミホ', '090-9999-9999', 'yamada@customer.com', 'new', '2024-06-01', 3, 45000)
ON CONFLICT (id) DO NOTHING;

-- サンプル商品（IDを整数に変更）
INSERT INTO products (name, category, price, cost, stock_quantity, low_stock_threshold, is_active) VALUES
  -- ドリンク
  ('ビール（生）', 'drink', 800, 300, 100, 20, true),
  ('ハイボール', 'drink', 700, 250, 80, 20, true),
  ('レモンサワー', 'drink', 700, 250, 80, 20, true),
  ('ウーロン茶', 'drink', 500, 150, 50, 10, true),
  ('オレンジジュース', 'drink', 600, 200, 40, 10, true),
  
  -- ボトル
  ('シャンパン（モエ）', 'bottle', 25000, 12000, 10, 2, true),
  ('ドンペリニヨン', 'bottle', 80000, 40000, 5, 1, true),
  ('ヘネシーVSOP', 'bottle', 30000, 15000, 8, 2, true),
  ('響17年', 'bottle', 45000, 25000, 6, 1, true),
  ('焼酎（魔王）', 'bottle', 18000, 9000, 12, 3, true),
  
  -- フード
  ('枝豆', 'food', 500, 200, 50, 10, true),
  ('ミックスナッツ', 'food', 800, 300, 30, 10, true),
  ('チーズ盛り合わせ', 'food', 1500, 600, 20, 5, true),
  ('フルーツ盛り合わせ', 'food', 3000, 1500, 15, 3, true),
  ('チョコレート', 'food', 1200, 500, 25, 5, true),
  
  -- その他
  ('おしぼり', 'other', 100, 30, 200, 50, true),
  ('氷', 'other', 300, 100, 100, 20, true)
ON CONFLICT DO NOTHING;

-- 初期在庫設定
INSERT INTO inventory_movements (product_id, movement_type, quantity, notes, created_by) 
SELECT 
  id, 
  'purchase',
  stock_quantity,
  '初期在庫',
  '550e8400-e29b-41d4-a716-446655440101'
FROM products
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_movements im 
  WHERE im.product_id = products.id 
  AND im.notes = '初期在庫'
);

-- サンプル来店データ（本日分）
INSERT INTO visits (id, customer_id, table_id, check_in_at, num_guests, status, primary_customer_id, session_code, is_group_visit) VALUES
  ('a50e8400-e29b-41d4-a716-446655440101', '750e8400-e29b-41d4-a716-446655440102', 1, NOW() - INTERVAL '2 hours', 2, 'active', '750e8400-e29b-41d4-a716-446655440102', 'V20250109-ABC1', true),
  ('a50e8400-e29b-41d4-a716-446655440102', '750e8400-e29b-41d4-a716-446655440101', 4, NOW() - INTERVAL '1 hour', 1, 'active', '750e8400-e29b-41d4-a716-446655440101', 'V20250109-DEF2', false)
ON CONFLICT (id) DO NOTHING;

-- サンプル注文（製品IDを動的に取得）
INSERT INTO order_items (visit_id, product_id, quantity, unit_price, total_price, created_by) 
SELECT 
  'a50e8400-e29b-41d4-a716-446655440101',
  p.id,
  1,
  p.price,
  p.price,
  '550e8400-e29b-41d4-a716-446655440104'
FROM products p
WHERE p.name = 'シャンパン（モエ）'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO order_items (visit_id, product_id, quantity, unit_price, total_price, created_by) 
SELECT 
  'a50e8400-e29b-41d4-a716-446655440101',
  p.id,
  4,
  p.price,
  p.price * 4,
  '550e8400-e29b-41d4-a716-446655440104'
FROM products p
WHERE p.name = 'ビール（生）'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO order_items (visit_id, product_id, quantity, unit_price, total_price, created_by) 
SELECT 
  'a50e8400-e29b-41d4-a716-446655440102',
  p.id,
  2,
  p.price,
  p.price * 2,
  '550e8400-e29b-41d4-a716-446655440104'
FROM products p
WHERE p.name = 'ハイボール'
LIMIT 1
ON CONFLICT DO NOTHING;

-- visitsテーブルの金額を更新
UPDATE visits SET 
  subtotal = 28200,
  service_charge = 2820,
  tax_amount = 3102,
  total_amount = 34122
WHERE id = 'a50e8400-e29b-41d4-a716-446655440101';

UPDATE visits SET 
  subtotal = 1400,
  service_charge = 140,
  tax_amount = 154,
  total_amount = 1694
WHERE id = 'a50e8400-e29b-41d4-a716-446655440102';

-- テーブルステータスを更新
UPDATE tables SET current_status = 'occupied', current_visit_id = 'a50e8400-e29b-41d4-a716-446655440101' WHERE id = 1;
UPDATE tables SET current_status = 'occupied', current_visit_id = 'a50e8400-e29b-41d4-a716-446655440102' WHERE id = 4;