-- Demo Data for Platinum Management System
-- Run this after all migrations are applied

-- Insert demo staffs
INSERT INTO staffs (id, user_id, full_name, role, hire_date, is_active) VALUES
  ('01234567-89ab-cdef-0123-456789abcdef', null, '田中 太郎', 'admin', '2024-01-01', true),
  ('12345678-9abc-def0-1234-56789abcdef0', null, '佐藤 花子', 'manager', '2024-01-15', true),
  ('23456789-abcd-ef01-2345-6789abcdef01', null, '鈴木 一郎', 'hall', '2024-02-01', true),
  ('34567890-bcde-f012-3456-789abcdef012', null, '高橋 美咲', 'cashier', '2024-02-15', true),
  ('45678901-cdef-0123-4567-89abcdef0123', null, '山田 愛', 'cast', '2024-03-01', true),
  ('56789012-def0-1234-5678-9abcdef01234', null, '中村 麗奈', 'cast', '2024-03-15', true);

-- Insert demo customers
INSERT INTO customers (id, name, phone_number, email, line_id, birthday, address, occupation, notes, status) VALUES
  ('a1234567-89ab-cdef-0123-456789abcdef', '山田 太郎', '090-1234-5678', 'yamada@example.com', 'yamada_line', '1985-05-15', '東京都渋谷区', '会社員', 'VIPお客様', 'active'),
  ('b2345678-9abc-def0-1234-56789abcdef0', '田中 次郎', '090-2345-6789', 'tanaka@example.com', 'tanaka_line', '1990-08-20', '東京都新宿区', 'エンジニア', '常連客', 'active'),
  ('c3456789-abcd-ef01-2345-6789abcdef01', '佐藤 三郎', '090-3456-7890', 'sato@example.com', 'sato_line', '1988-12-10', '東京都港区', '営業', '', 'active'),
  ('d4567890-bcde-f012-3456-789abcdef012', '鈴木 四郎', '090-4567-8901', 'suzuki@example.com', null, '1992-03-25', '東京都品川区', '医師', '', 'active'),
  ('e5678901-cdef-0123-4567-89abcdef0123', '高橋 五郎', '090-5678-9012', 'takahashi@example.com', 'takahashi_line', '1987-07-30', '東京都目黒区', '弁護士', '', 'inactive');

-- Insert demo casts profile
INSERT INTO casts_profile (id, stage_name, real_name, birth_date, hire_date, hourly_rate, rank, specialties, profile_image_url, bio, is_active, staff_id) VALUES
  ('p1234567-89ab-cdef-0123-456789abcdef', 'あい', '山田 愛', '1998-04-12', '2024-03-01', 3000, 'regular', ARRAY['会話', 'カラオケ'], null, '明るい性格で楽しい時間をお約束します！', true, '45678901-cdef-0123-4567-89abcdef0123'),
  ('p2345678-9abc-def0-1234-56789abcdef0', 'れいな', '中村 麗奈', '1999-09-18', '2024-03-15', 2800, 'junior', ARRAY['ダンス', 'お酒'], null, '一緒に楽しい夜を過ごしましょう♪', true, '56789012-def0-1234-5678-9abcdef01234');

-- Insert demo tables
INSERT INTO tables (id, table_name, capacity, location, is_active, current_status) VALUES
  (1, 'テーブル1', 4, 'フロア1-A', true, 'available'),
  (2, 'テーブル2', 6, 'フロア1-B', true, 'available'),
  (3, 'VIPルーム1', 8, 'VIPフロア', true, 'available'),
  (4, 'VIPルーム2', 10, 'VIPフロア', true, 'available'),
  (5, 'カウンター1', 2, 'カウンター', true, 'available'),
  (6, 'カウンター2', 2, 'カウンター', true, 'available');

-- Insert demo inventory products
INSERT INTO inventory_products (id, name, category, price, cost, stock_quantity, low_stock_threshold, supplier_info, reorder_point, max_stock) VALUES
  (1, 'ビール（プレミアム）', 'アルコール', 800, 300, 100, 20, '{"supplier": "酒類卸A", "contact": "03-1234-5678"}', 30, 200),
  (2, 'ワイン（赤）', 'アルコール', 1200, 600, 50, 10, '{"supplier": "ワイン商事", "contact": "03-2345-6789"}', 15, 100),
  (3, 'ウイスキー（プレミアム）', 'アルコール', 1500, 800, 30, 5, '{"supplier": "洋酒専門店", "contact": "03-3456-7890"}', 10, 50),
  (4, 'カクテル（カシス）', 'アルコール', 900, 400, 80, 15, '{"supplier": "リキュール卸", "contact": "03-4567-8901"}', 20, 150),
  (5, 'ソフトドリンク', 'ノンアルコール', 500, 150, 200, 50, '{"supplier": "飲料卸B", "contact": "03-5678-9012"}', 80, 400),
  (6, 'おつまみセット', 'フード', 600, 300, 150, 30, '{"supplier": "食材卸C", "contact": "03-6789-0123"}', 50, 300);

-- Insert demo visits (some completed, some active)
INSERT INTO visits (id, customer_id, table_id, check_in_at, check_out_at, num_guests, subtotal, service_charge, tax_amount, total_amount, payment_method, payment_status, status, notes, created_by) VALUES
  ('v1234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 1, '2024-01-20 19:30:00+00', '2024-01-20 23:00:00+00', 2, 8000, 800, 880, 9680, 'card', 'completed', 'completed', 'VIPお客様のご利用', '01234567-89ab-cdef-0123-456789abcdef'),
  ('v2345678-9abc-def0-1234-56789abcdef0', 'b2345678-9abc-def0-1234-56789abcdef0', 2, '2024-01-21 20:00:00+00', '2024-01-21 22:30:00+00', 3, 6000, 600, 660, 7260, 'cash', 'completed', 'completed', '', '12345678-9abc-def0-1234-56789abcdef0'),
  ('v3456789-abcd-ef01-2345-6789abcdef01', 'c3456789-abcd-ef01-2345-6789abcdef01', 3, '2024-01-22 18:00:00+00', null, 4, null, null, null, null, null, 'pending', 'active', 'VIPルーム利用中', '01234567-89ab-cdef-0123-456789abcdef');

-- Insert demo order items
INSERT INTO order_items (id, visit_id, product_id, cast_id, quantity, unit_price, total_price, notes, created_by) VALUES
  (1, 'v1234567-89ab-cdef-0123-456789abcdef', 1, 'p1234567-89ab-cdef-0123-456789abcdef', 4, 800, 3200, '', '01234567-89ab-cdef-0123-456789abcdef'),
  (2, 'v1234567-89ab-cdef-0123-456789abcdef', 2, 'p1234567-89ab-cdef-0123-456789abcdef', 2, 1200, 2400, '', '01234567-89ab-cdef-0123-456789abcdef'),
  (3, 'v1234567-89ab-cdef-0123-456789abcdef', 6, null, 2, 600, 1200, '', '01234567-89ab-cdef-0123-456789abcdef'),
  (4, 'v2345678-9abc-def0-1234-56789abcdef0', 1, 'p2345678-9abc-def0-1234-56789abcdef0', 3, 800, 2400, '', '12345678-9abc-def0-1234-56789abcdef0'),
  (5, 'v2345678-9abc-def0-1234-56789abcdef0', 5, null, 4, 500, 2000, '', '12345678-9abc-def0-1234-56789abcdef0'),
  (6, 'v3456789-abcd-ef01-2345-6789abcdef01', 3, 'p1234567-89ab-cdef-0123-456789abcdef', 1, 1500, 1500, '進行中', '01234567-89ab-cdef-0123-456789abcdef');

-- Insert demo reservations
INSERT INTO reservations (id, customer_id, table_id, reservation_date, reservation_time, number_of_guests, assigned_cast_id, special_requests, status, notes, created_by) VALUES
  ('r1234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 3, '2024-01-25', '19:00:00', 4, 'p1234567-89ab-cdef-0123-456789abcdef', 'VIPルーム希望', 'confirmed', 'VIPお客様の予約', '01234567-89ab-cdef-0123-456789abcdef'),
  ('r2345678-9abc-def0-1234-56789abcdef0', 'b2345678-9abc-def0-1234-56789abcdef0', 2, '2024-01-26', '20:30:00', 2, 'p2345678-9abc-def0-1234-56789abcdef0', '', 'confirmed', '', '12345678-9abc-def0-1234-56789abcdef0'),
  ('r3456789-abcd-ef01-2345-6789abcdef01', 'd4567890-bcde-f012-3456-789abcdef012', 1, '2024-01-27', '18:00:00', 3, null, '静かな席希望', 'pending', '', '23456789-abcd-ef01-2345-6789abcdef01');

-- Insert demo attendance records
INSERT INTO attendance_records (id, staff_id, attendance_date, clock_in_time, clock_out_time, break_start_time, break_end_time, total_hours, overtime_hours, notes, created_by) VALUES
  ('ar123456-789a-bcde-f012-3456789abcde', '01234567-89ab-cdef-0123-456789abcdef', '2024-01-22', '2024-01-22 17:00:00+00', '2024-01-22 01:00:00+00', '2024-01-22 22:00:00+00', '2024-01-22 22:30:00+00', 7.5, 0, '管理業務', '01234567-89ab-cdef-0123-456789abcdef'),
  ('ar234567-89ab-cdef-0123-456789abcdef', '12345678-9abc-def0-1234-56789abcdef0', '2024-01-22', '2024-01-22 18:00:00+00', '2024-01-22 02:00:00+00', null, null, 8, 0, 'フロア管理', '01234567-89ab-cdef-0123-456789abcdef'),
  ('ar345678-9abc-def0-1234-56789abcdef', '45678901-cdef-0123-4567-89abcdef0123', '2024-01-22', '2024-01-22 19:00:00+00', '2024-01-22 02:00:00+00', '2024-01-22 23:00:00+00', '2024-01-22 23:15:00+00', 6.75, 0, 'キャスト業務', '12345678-9abc-def0-1234-56789abcdef0');

-- Insert demo bottle keep records
INSERT INTO bottle_keep_records (id, customer_id, product_name, brand, volume_ml, purchase_date, expiry_date, remaining_amount, location_info, status, notes, created_by) VALUES
  ('bk123456-789a-bcde-f012-3456789abcde', 'a1234567-89ab-cdef-0123-456789abcdef', 'プレミアムウイスキー', 'サントリー山崎', 700, '2024-01-20', '2025-01-20', 500, '{"shelf": "A", "position": "1"}', 'active', 'VIPお客様のボトル', '01234567-89ab-cdef-0123-456789abcdef'),
  ('bk234567-89ab-cdef-0123-456789abcdef', 'b2345678-9abc-def0-1234-56789abcdef0', 'プレミアム焼酎', '魔王', 720, '2024-01-21', '2025-01-21', 600, '{"shelf": "B", "position": "3"}', 'active', '', '12345678-9abc-def0-1234-56789abcdef0');

-- Insert demo cast performance records
INSERT INTO cast_performance (id, cast_id, date, sales_amount, drink_sales, customer_count, nomination_count, rating, tips_amount, notes, created_by) VALUES
  ('cp123456-789a-bcde-f012-3456789abcde', 'p1234567-89ab-cdef-0123-456789abcdef', '2024-01-20', 15000, 8000, 3, 2, 4.5, 2000, '好調な売上', '12345678-9abc-def0-1234-56789abcdef0'),
  ('cp234567-89ab-cdef-0123-456789abcdef', 'p2345678-9abc-def0-1234-56789abcdef0', '2024-01-20', 12000, 6000, 2, 1, 4.2, 1500, '', '12345678-9abc-def0-1234-56789abcdef0'),
  ('cp345678-9abc-def0-1234-56789abcdef', 'p1234567-89ab-cdef-0123-456789abcdef', '2024-01-21', 18000, 10000, 4, 3, 4.8, 3000, '過去最高売上', '12345678-9abc-def0-1234-56789abcdef0');

-- Insert demo shift requests
INSERT INTO shift_requests (id, cast_id, request_date, shift_type, start_time, end_time, reason, status, approved_by, approved_at, rejection_reason, notes) VALUES
  ('sr123456-789a-bcde-f012-3456789abcde', 'p1234567-89ab-cdef-0123-456789abcdef', '2024-01-25', 'regular', '19:00:00', '02:00:00', '通常シフト希望', 'approved', '12345678-9abc-def0-1234-56789abcdef0', '2024-01-23 10:00:00+00', null, ''),
  ('sr234567-89ab-cdef-0123-456789abcdef', 'p2345678-9abc-def0-1234-56789abcdef0', '2024-01-26', 'short', '20:00:00', '24:00:00', '短時間希望', 'pending', null, null, null, '用事があるため');

-- Insert demo QR codes for staff
INSERT INTO qr_codes (id, staff_id, qr_data, qr_image_url, is_active, expires_at) VALUES
  ('qr123456-789a-bcde-f012-3456789abcde', '45678901-cdef-0123-4567-89abcdef0123', 'QR_STAFF_45678901-cdef-0123-4567-89abcdef0123', null, true, '2024-12-31 23:59:59+00'),
  ('qr234567-89ab-cdef-0123-456789abcdef', '56789012-def0-1234-5678-9abcdef01234', 'QR_STAFF_56789012-def0-1234-5678-9abcdef01234', null, true, '2024-12-31 23:59:59+00');

-- Insert demo compliance ID verifications
INSERT INTO id_verifications (id, customer_id, id_type, id_image_url, birth_date, expiry_date, ocr_result, is_verified, verified_by, verified_at, notes) VALUES
  ('id123456-789a-bcde-f012-3456789abcde', 'a1234567-89ab-cdef-0123-456789abcdef', 'license', null, '1985-05-15', '2026-05-15', '{"extracted_name": "山田太郎", "extracted_birth": "1985-05-15"}', true, '01234567-89ab-cdef-0123-456789abcdef', '2024-01-20 18:00:00+00', 'VIPお客様の本人確認完了'),
  ('id234567-89ab-cdef-0123-456789abcdef', 'b2345678-9abc-def0-1234-56789abcdef0', 'license', null, '1990-08-20', '2025-08-20', '{"extracted_name": "田中次郎", "extracted_birth": "1990-08-20"}', true, '01234567-89ab-cdef-0123-456789abcdef', '2024-01-21 19:00:00+00', '');

-- Update table status for active visit
UPDATE tables SET current_status = 'occupied', current_visit_id = 'v3456789-abcd-ef01-2345-6789abcdef01' WHERE id = 3;

-- Insert some inventory movements
INSERT INTO inventory_movements (id, product_id, movement_type, quantity, unit_cost, total_cost, reason, notes, created_by) VALUES
  (1, 1, 'in', 50, 300, 15000, 'purchase', '月次仕入れ', '01234567-89ab-cdef-0123-456789abcdef'),
  (2, 2, 'in', 30, 600, 18000, 'purchase', '月次仕入れ', '01234567-89ab-cdef-0123-456789abcdef'),
  (3, 1, 'out', 4, 300, 1200, 'sale', 'オーダー消費', '23456789-abcd-ef01-2345-6789abcdef01'),
  (4, 2, 'out', 2, 600, 1200, 'sale', 'オーダー消費', '23456789-abcd-ef01-2345-6789abcdef01');