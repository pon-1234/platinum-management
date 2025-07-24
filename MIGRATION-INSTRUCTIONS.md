# マイグレーション実行手順

## 実行するマイグレーションファイル

以下の3つのマイグレーションファイルを順番に実行してください：

1. `supabase/migrations/20240724_create_report_rpc_functions.sql`
2. `supabase/migrations/20240724_create_inventory_transaction_functions.sql`
3. `supabase/migrations/20240724_create_bottle_expiry_alert_functions.sql`

## 実行方法

### 方法1: Supabase ダッシュボードから実行（推奨）

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. 対象のプロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 各SQLファイルの内容をコピー＆ペースト
5. 「Run」ボタンをクリックして実行

### 方法2: Supabase CLIを使用（プロジェクトがリンクされている場合）

```bash
# プロジェクトをリンク（まだの場合）
supabase link --project-ref <your-project-ref>

# マイグレーションを実行
supabase db push
```

### 方法3: 直接PostgreSQLクライアントから実行

```bash
# psqlを使用する場合
psql <your-database-url> -f supabase/migrations/20240724_create_report_rpc_functions.sql
psql <your-database-url> -f supabase/migrations/20240724_create_inventory_transaction_functions.sql
psql <your-database-url> -f supabase/migrations/20240724_create_bottle_expiry_alert_functions.sql
```

## 環境変数の設定

マイグレーション実行後、以下の環境変数を設定してください：

1. `.env.local` ファイルを作成（`.env.local.example` をコピー）
2. 以下の値を設定：
   ```
   QR_CODE_SECRET_KEY=<secure-random-string>
   ```

### セキュアなキーの生成方法

```bash
# macOS/Linux
openssl rand -base64 32

# または Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 確認事項

マイグレーション実行後、以下を確認してください：

1. **RPC関数の確認**
   - Supabase Dashboard > Database > Functions で以下が作成されているか確認：
     - `get_monthly_sales`
     - `get_cast_performance`
     - `get_daily_revenue`
     - `create_inventory_movement_with_stock_update`
     - `process_bottle_keep_alerts`

2. **新しいテーブルの確認**
   - `bottle_keep_alerts_sent` テーブルが作成されているか確認

3. **権限の確認**
   - 各RPC関数に `authenticated` ロールの実行権限が付与されているか確認

## トラブルシューティング

### エラー: "function already exists"
- 既に関数が存在する場合は、`CREATE OR REPLACE FUNCTION` を使用しているため問題ありません

### エラー: "permission denied"
- Supabase Dashboardから実行するか、適切な権限を持つユーザーで実行してください

### エラー: "relation does not exist"
- 基本的なテーブル（products, bottle_keeps, etc.）が存在することを確認してください

## 次のステップ

1. アプリケーションを再起動
2. 新機能をテスト：
   - レポート画面でデータが正しく表示されるか
   - 在庫移動でエラーが発生しないか
   - ボトルキープのアラート機能が動作するか