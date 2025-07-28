-- ==========================================
-- 本番環境シンプルリセット手順
-- 実行日: 2025-07-28
-- 
-- 警告: このスクリプトは全てのデータを削除します！
-- 本番環境で実行する前に必ずバックアップを取得してください
-- ==========================================

-- ステップ1: 既存のスキーマを削除して再作成
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 必要な拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- ステップ2: マイグレーションファイルを実行
-- ==========================================
-- Supabase Dashboardで以下のファイルの内容を全て実行してください：
-- /supabase/migrations/20250128000006_complete_reset_with_optimizations.sql

-- ==========================================
-- ステップ3: 管理者ユーザーを作成
-- ==========================================
-- 1. Supabase Dashboard > Authentication でユーザーを作成
--    Email: admin@platinum-demo.com
--    Password: 任意の安全なパスワード
-- 
-- 2. 作成されたユーザーのUUIDをコピー
-- 
-- 3. 以下のSQLを実行（UUIDを置き換えて）：
/*
INSERT INTO public.staffs (
  user_id,
  full_name,
  email,
  phone,
  role,
  is_active
) VALUES (
  'ここに実際のUUID',
  'Admin User',
  'admin@platinum-demo.com',
  '090-1234-5678',
  'admin',
  true
);
*/

-- ==========================================
-- ステップ4: 動作確認
-- ==========================================
-- 以下のクエリで正常に動作することを確認：
-- SELECT * FROM get_dashboard_stats(CURRENT_DATE);

-- ==========================================
-- 注意事項
-- ==========================================
-- マイグレーションファイルには修正済みのget_dashboard_stats関数が
-- 含まれているため、追加の修正は不要です。