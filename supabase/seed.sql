-- Seed data for development environment
-- This file is automatically run after migrations during `supabase db reset`

-- Create test auth users first
-- Note: In production, users should be created through the Supabase Auth API
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  'a2b4d3c8-af32-4205-8ae6-207df5b5ac06',
  'admin@platinum-demo.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}'
)
ON CONFLICT (id) DO NOTHING;

-- Create admin user in staffs table
INSERT INTO public.staffs (
  user_id,
  full_name,
  email,
  phone,
  role,
  is_active
) VALUES (
  'a2b4d3c8-af32-4205-8ae6-207df5b5ac06',
  'Admin User',
  'admin@platinum-demo.com',
  '090-1234-5678',
  'admin',
  true
) ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- 開発環境用のサンプルデータ
-- =============================================================================

-- サンプルスタッフ（auth.usersへの外部キー制約なし）
INSERT INTO staffs (id, full_name, email, phone, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '山田太郎', 'yamada@example.com', '090-1111-1111', 'manager'),
  ('550e8400-e29b-41d4-a716-446655440002', '鈴木花子', 'suzuki@example.com', '090-2222-2222', 'cast'),
  ('550e8400-e29b-41d4-a716-446655440003', '田中美咲', 'tanaka@example.com', '090-3333-3333', 'cast')
ON CONFLICT (id) DO NOTHING;

-- サンプルテーブル
INSERT INTO tables (table_number, capacity, location) VALUES
  ('A-1', 4, '1階窓際'),
  ('A-2', 4, '1階窓際'),
  ('B-1', 6, '1階中央'),
  ('B-2', 6, '1階中央'),
  ('VIP-1', 8, '2階VIPルーム'),
  ('VIP-2', 10, '2階VIPルーム')
ON CONFLICT (table_number) DO NOTHING;

-- サンプルキャストプロフィール
INSERT INTO casts_profile (staff_id, stage_name, experience_months) VALUES
  ('550e8400-e29b-41d4-a716-446655440002', 'はなちゃん', 12),
  ('550e8400-e29b-41d4-a716-446655440003', 'みさきちゃん', 6)
ON CONFLICT (staff_id) DO NOTHING;

-- サンプル顧客
INSERT INTO customers (name, name_kana, phone_number, status) VALUES
  ('佐藤一郎', 'サトウイチロウ', '090-5555-5555', 'active'),
  ('高橋二郎', 'タカハシジロウ', '090-6666-6666', 'vip'),
  ('伊藤三郎', 'イトウサブロウ', '090-7777-7777', 'active')
ON CONFLICT (name, phone_number) DO NOTHING;

-- サンプル商品
INSERT INTO products (name, category, price, cost, stock_quantity, low_stock_threshold) VALUES
  ('ビール', 'ドリンク', 800, 300, 100, 20),
  ('ハイボール', 'ドリンク', 700, 250, 80, 20),
  ('シャンパン', 'ボトル', 15000, 8000, 10, 2),
  ('ウイスキー', 'ボトル', 12000, 6000, 15, 3),
  ('焼酎', 'ボトル', 8000, 4000, 20, 5),
  ('枝豆', 'フード', 500, 200, 50, 10),
  ('ミックスナッツ', 'フード', 800, 300, 30, 10),
  ('チーズ盛り合わせ', 'フード', 1500, 600, 20, 5),
  ('フルーツ盛り合わせ', 'フード', 2000, 1000, 15, 3),
  ('ドライフルーツ', 'フード', 1000, 400, 25, 5)
ON CONFLICT (name, category) DO NOTHING;