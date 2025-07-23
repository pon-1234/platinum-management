# Database Scripts

このディレクトリには、データベースのセットアップと管理用のスクリプトが含まれています。

## セキュリティに関する重要な変更

すべてのスクリプトは環境変数を使用するように更新されました。ハードコードされた認証情報は削除されています。

## 必要な環境変数

スクリプトを実行する前に、プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase Service Role (サーバーサイドのみ)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

`.env.local.example` ファイルをコピーして開始できます：

```bash
cp .env.local.example .env.local
```

## 利用可能なスクリプト

### setup-database.js
データベースの初期セットアップを行います。マイグレーションとデモデータの挿入を実行します。

```bash
node scripts/setup-database.js
```

### check-data.js
データベース内のデータを確認します。

```bash
node scripts/check-data.js
```

### check-tables.js
データベース内のテーブル構造を確認します。

```bash
node scripts/check-tables.js
```

### insert-demo-data.js
デモデータのみを挿入します。

```bash
node scripts/insert-demo-data.js
```

## セキュリティに関する注意

- **重要**: Supabaseのサービスロールキーは極めて機密性の高い情報です
- 本番環境では、これらのスクリプトは信頼できる環境でのみ実行してください
- サービスロールキーは絶対にクライアントサイドのコードに含めないでください
- 定期的にキーをローテーションすることを推奨します