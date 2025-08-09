-- =====================================================
-- リモートデータベースリセットスクリプト
-- 既存データを削除してサンプルデータを投入
-- =====================================================

-- 既存データを削除（外部キー制約の順序に注意）
TRUNCATE TABLE 
  guest_billing_splits,
  guest_cast_assignments,
  guest_orders,
  visit_guests,
  visit_nominations,
  bill_item_attributions,
  cast_engagements,
  visit_table_segments,
  order_items,
  visits,
  bottle_keeps,
  inventory_movements,
  products,
  customers,
  casts_profile,
  tables,
  staffs
CASCADE;

-- シーケンスをリセット
ALTER SEQUENCE tables_id_seq RESTART WITH 1;

-- =====================================================
-- サンプルデータ投入
-- =====================================================

-- サンプルスタッフ
INSERT INTO staffs (id, full_name, email, phone, role, is_active, hire_date) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '山田太郎', 'yamada@example.com', '090-1111-1111', 'manager', true, '2023-01-01'),
  ('550e8400-e29b-41d4-a716-446655440002', '鈴木花子', 'suzuki@example.com', '090-2222-2222', 'cast', true, '2023-06-01'),
  ('550e8400-e29b-41d4-a716-446655440003', '田中美咲', 'tanaka@example.com', '090-3333-3333', 'cast', true, '2023-09-01'),
  ('550e8400-e29b-41d4-a716-446655440004', '佐藤健', 'sato@example.com', '090-4444-4444', 'hall', true, '2024-01-01'),
  ('550e8400-e29b-41d4-a716-446655440005', '渡辺みゆき', 'watanabe@example.com', '090-5555-5555', 'cast', true, '2024-03-01');

-- サンプルテーブル
INSERT INTO tables (table_number, capacity, location, current_status, display_order) VALUES
  ('A-1', 4, '1階窓際', 'available', 1),
  ('A-2', 4, '1階窓際', 'available', 2),
  ('A-3', 4, '1階窓際', 'available', 3),
  ('B-1', 6, '1階中央', 'available', 4),
  ('B-2', 6, '1階中央', 'available', 5),
  ('B-3', 6, '1階中央', 'available', 6),
  ('C-1', 8, '1階奥', 'available', 7),
  ('C-2', 8, '1階奥', 'available', 8),
  ('VIP-1', 10, '2階VIPルーム', 'available', 9),
  ('VIP-2', 12, '2階VIPルーム', 'available', 10);

-- サンプルキャストプロフィール
INSERT INTO casts_profile (id, staff_id, stage_name, experience_months, hourly_rate, nomination_fee, is_active) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'はな', 18, 5000, 3000, true),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'みさき', 12, 4500, 2500, true),
  ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'みゆき', 6, 4000, 2000, true);

-- サンプル顧客
INSERT INTO customers (id, name, name_kana, phone_number, email, gender, age_group, status, first_visit_date, total_visits, total_spent) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', '佐藤一郎', 'サトウイチロウ', '090-5555-5555', 'sato@customer.com', 'male', '30s', 'active', '2023-01-15', 24, 480000),
  ('750e8400-e29b-41d4-a716-446655440002', '高橋二郎', 'タカハシジロウ', '090-6666-6666', 'takahashi@customer.com', 'male', '40s', 'vip', '2023-02-20', 48, 1200000),
  ('750e8400-e29b-41d4-a716-446655440003', '伊藤三郎', 'イトウサブロウ', '090-7777-7777', 'ito@customer.com', 'male', '50s', 'active', '2023-03-10', 36, 720000),
  ('750e8400-e29b-41d4-a716-446655440004', '田中花子', 'タナカハナコ', '090-8888-8888', 'tanaka@customer.com', 'female', '30s', 'active', '2024-01-05', 12, 180000),
  ('750e8400-e29b-41d4-a716-446655440005', '山田美穂', 'ヤマダミホ', '090-9999-9999', 'yamada@customer.com', 'female', '20s', 'new', '2024-06-01', 3, 45000);

-- サンプル商品
INSERT INTO products (id, name, category, price, cost, stock_quantity, low_stock_threshold, unit, is_active) VALUES
  -- ドリンク
  ('850e8400-e29b-41d4-a716-446655440001', 'ビール（生）', 'drink', 800, 300, 100, 20, 'glass', true),
  ('850e8400-e29b-41d4-a716-446655440002', 'ハイボール', 'drink', 700, 250, 80, 20, 'glass', true),
  ('850e8400-e29b-41d4-a716-446655440003', 'レモンサワー', 'drink', 700, 250, 80, 20, 'glass', true),
  ('850e8400-e29b-41d4-a716-446655440004', 'ウーロン茶', 'drink', 500, 150, 50, 10, 'glass', true),
  ('850e8400-e29b-41d4-a716-446655440005', 'オレンジジュース', 'drink', 600, 200, 40, 10, 'glass', true),
  
  -- ボトル
  ('850e8400-e29b-41d4-a716-446655440011', 'シャンパン（モエ）', 'bottle', 25000, 12000, 10, 2, 'bottle', true),
  ('850e8400-e29b-41d4-a716-446655440012', 'ドンペリニヨン', 'bottle', 80000, 40000, 5, 1, 'bottle', true),
  ('850e8400-e29b-41d4-a716-446655440013', 'ヘネシーVSOP', 'bottle', 30000, 15000, 8, 2, 'bottle', true),
  ('850e8400-e29b-41d4-a716-446655440014', '響17年', 'bottle', 45000, 25000, 6, 1, 'bottle', true),
  ('850e8400-e29b-41d4-a716-446655440015', '焼酎（魔王）', 'bottle', 18000, 9000, 12, 3, 'bottle', true),
  
  -- フード
  ('850e8400-e29b-41d4-a716-446655440021', '枝豆', 'food', 500, 200, 50, 10, 'plate', true),
  ('850e8400-e29b-41d4-a716-446655440022', 'ミックスナッツ', 'food', 800, 300, 30, 10, 'plate', true),
  ('850e8400-e29b-41d4-a716-446655440023', 'チーズ盛り合わせ', 'food', 1500, 600, 20, 5, 'plate', true),
  ('850e8400-e29b-41d4-a716-446655440024', 'フルーツ盛り合わせ', 'food', 3000, 1500, 15, 3, 'plate', true),
  ('850e8400-e29b-41d4-a716-446655440025', 'チョコレート', 'food', 1200, 500, 25, 5, 'plate', true),
  
  -- その他
  ('850e8400-e29b-41d4-a716-446655440031', 'おしぼり', 'other', 100, 30, 200, 50, 'piece', true),
  ('850e8400-e29b-41d4-a716-446655440032', '氷', 'other', 300, 100, 100, 20, 'bucket', true);

-- 指名タイプ
INSERT INTO nomination_types (id, type_name, display_name, fee_amount, back_percentage, is_active, display_order) VALUES
  ('950e8400-e29b-41d4-a716-446655440001', 'shimei', '指名', 3000, 50.00, true, 1),
  ('950e8400-e29b-41d4-a716-446655440002', 'douhan', '同伴', 5000, 60.00, true, 2),
  ('950e8400-e29b-41d4-a716-446655440003', 'after', 'アフター', 8000, 70.00, true, 3),
  ('950e8400-e29b-41d4-a716-446655440004', 'help', 'ヘルプ', 0, 30.00, true, 4);

-- 初期在庫設定
INSERT INTO inventory_movements (product_id, movement_type, quantity, unit_price, notes, created_by) 
SELECT 
  id, 
  'purchase',
  stock_quantity,
  cost,
  '初期在庫',
  '550e8400-e29b-41d4-a716-446655440001'
FROM products;

-- サンプル来店データ（本日分）
INSERT INTO visits (id, customer_id, table_id, check_in_at, num_guests, status, primary_customer_id, session_code, is_group_visit) VALUES
  ('a50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440002', 1, NOW() - INTERVAL '2 hours', 2, 'active', '750e8400-e29b-41d4-a716-446655440002', 'V20250109-ABC1', true),
  ('a50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 4, NOW() - INTERVAL '1 hour', 1, 'active', '750e8400-e29b-41d4-a716-446655440001', 'V20250109-DEF2', false);

-- キャストエンゲージメント
INSERT INTO cast_engagements (visit_id, cast_id, role, nomination_type_id, started_at, is_active, fee_amount) VALUES
  ('a50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'primary', '950e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 hours', true, 3000),
  ('a50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'primary', '950e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '1 hour', true, 2500);

-- サンプル注文
INSERT INTO order_items (visit_id, product_id, quantity, unit_price, total_price, created_by) VALUES
  -- VIPテーブルの注文
  ('a50e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440011', 1, 25000, 25000, '550e8400-e29b-41d4-a716-446655440004'),
  ('a50e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 4, 800, 3200, '550e8400-e29b-41d4-a716-446655440004'),
  ('a50e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440024', 1, 3000, 3000, '550e8400-e29b-41d4-a716-446655440004'),
  
  -- 通常テーブルの注文
  ('a50e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440002', 2, 700, 1400, '550e8400-e29b-41d4-a716-446655440004'),
  ('a50e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440021', 1, 500, 500, '550e8400-e29b-41d4-a716-446655440004');

-- visitsテーブルの金額を更新
UPDATE visits SET 
  subtotal = 31200,
  service_charge = 3120,
  tax_amount = 3432,
  total_amount = 37752
WHERE id = 'a50e8400-e29b-41d4-a716-446655440001';

UPDATE visits SET 
  subtotal = 1900,
  service_charge = 190,
  tax_amount = 209,
  total_amount = 2299
WHERE id = 'a50e8400-e29b-41d4-a716-446655440002';

-- テーブルステータスを更新
UPDATE tables SET current_status = 'occupied', current_visit_id = 'a50e8400-e29b-41d4-a716-446655440001' WHERE id = 1;
UPDATE tables SET current_status = 'occupied', current_visit_id = 'a50e8400-e29b-41d4-a716-446655440002' WHERE id = 4;