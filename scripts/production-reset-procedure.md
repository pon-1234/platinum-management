# 本番データベースリセット手順

## 警告
**このプロセスは全てのデータを削除します！必ずバックアップを取得してください。**

## 手順

### 1. データのバックアップ（重要！）
```sql
-- 必要に応じて重要なデータをエクスポート
-- 例: 顧客データ、売上データなど
```

### 2. データベースのリセット
Supabase Dashboardで以下のSQLを実行：

```sql
-- 既存のオブジェクトを全て削除
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 必要な拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 3. スキーマの再作成
`/supabase/migrations/20250128000006_complete_reset_with_optimizations.sql`の内容を全て実行

### 4. 管理者ユーザーの作成
Supabase Dashboardの認証セクションで：
1. 新しいユーザーを作成
   - Email: admin@platinum-demo.com
   - Password: 任意の安全なパスワード
2. 作成されたユーザーのUUIDをコピー

### 5. Staffsレコードの作成
```sql
-- UUIDを実際の値に置き換えてください
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
) ON CONFLICT (user_id) 
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
```

### 6. 動作確認
```sql
-- get_dashboard_stats関数の確認
SELECT * FROM get_dashboard_stats(CURRENT_DATE);

-- テーブル構造の確認
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('staffs', 'tables', 'products', 'casts_profile')
ORDER BY table_name, ordinal_position;
```

### 7. 環境変数の確認
Vercelの環境変数に以下が設定されていることを確認：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QR_CODE_SECRET_KEY`（任意の32文字以上のランダム文字列）

### 8. デプロイの確認
1. Vercelでの再デプロイをトリガー
2. ビルドが成功することを確認
3. 本番環境で以下のページが正常に動作することを確認：
   - ログインページ
   - ダッシュボード
   - 顧客管理
   - テーブル管理
   - 在庫管理