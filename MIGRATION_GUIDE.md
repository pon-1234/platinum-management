# マイグレーション実行ガイド

Supabaseでデータベーステーブルを作成するため、以下の順序でマイグレーションを実行してください。

## 実行順序

Supabaseダッシュボードの**SQL Editor**で、以下の順序でファイル内容を実行してください：

### 1. スタッフテーブル作成
ファイル: `20240101000000_create_staff_tables.sql`
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create staffs table
CREATE TABLE IF NOT EXISTS staffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'hall', 'cashier', 'cast')),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 残りの内容は元ファイルから...
```

### 2. 顧客テーブル作成
ファイル: `20240102000000_create_customer_tables.sql`

### 3. キャストテーブル更新
ファイル: `20240103000000_update_cast_tables.sql`

### 4. 予約テーブル作成
ファイル: `20240104000000_create_reservation_tables.sql`

### 5. 会計テーブル作成
ファイル: `20240105000000_create_billing_tables.sql`

### 6. 勤怠テーブル作成
ファイル: `20240106000000_create_attendance_tables.sql`

### 7. 在庫テーブル作成
ファイル: `20240107000000_create_inventory_tables.sql`

### 8. ボトルキープテーブル作成
ファイル: `20240108000000_create_bottle_keep_tables.sql`

### 9. コンプライアンステーブル作成
ファイル: `20240109000000_create_compliance_tables.sql`

## 手順

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」をクリック
4. 「New query」をクリック
5. 上記の順序で各マイグレーションファイルの内容をコピー&ペースト
6. 「Run」ボタンをクリックして実行
7. エラーがないことを確認
8. 次のマイグレーションファイルに進む

## 確認方法

全てのマイグレーション実行後、以下のSQLでテーブルが作成されているか確認：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

期待されるテーブル一覧：
- attendance_records
- bottle_keep_records
- bottle_keep_usage
- cast_performance
- casts_profile
- customers
- id_verifications
- inventory_movements
- inventory_products
- order_items
- qr_attendance_logs
- qr_codes
- reservations
- shift_requests
- staffs
- tables
- visits

## トラブルシューティング

### エラーが発生した場合
1. エラーメッセージを確認
2. 前のマイグレーションが正常に実行されているか確認
3. テーブル名の重複がないか確認
4. 権限エラーの場合、Supabaseプロジェクトの権限を確認

### よくあるエラー
- `relation already exists`: テーブルが既に存在する（通常は問題なし）
- `permission denied`: 権限不足（プロジェクトオーナーでログイン）
- `syntax error`: SQLの構文エラー（ファイル内容を正確にコピー）

## 次のステップ

マイグレーション完了後：
1. `demo_data.sql`を実行してサンプルデータを投入
2. Authentication画面でテストユーザーを作成
3. アプリケーションにログインしてテスト