# 本番環境リセット手順

## 警告
**このプロセスは全てのデータを削除します！必ずバックアップを取得してください。**

## 手順

### 1. Supabase Dashboardにログイン

### 2. SQL Editorで以下を実行

```sql
-- 既存のスキーマを完全に削除
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 必要な拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 3. マイグレーションファイルの内容を実行
`/supabase/migrations/20250129000002_complete_clean_setup.sql` の内容を全てコピーして実行

### 4. 管理者ユーザーの作成

1. Supabase Dashboard > Authentication でユーザーを作成
   - Email: admin@platinum-demo.com
   - Password: 任意の安全なパスワード

2. 作成されたユーザーのUUIDをコピー

3. 以下のSQLを実行（UUIDを置き換えて）：
```sql
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
```

### 5. 動作確認
```sql
SELECT * FROM get_dashboard_stats(CURRENT_DATE);
```

### 6. Vercel環境変数の確認
以下が設定されていることを確認：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QR_CODE_SECRET_KEY`（32文字以上のランダム文字列）

### 7. Vercelの再デプロイ
Vercel Dashboardから再デプロイをトリガー