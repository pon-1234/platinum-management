# Platinum Management

ラウンジ運営管理システム

## 技術スタック

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Testing**: Vitest, Playwright
- **Quality Assurance**: ESLint, Prettier, Husky

## セットアップ

### 1. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、Supabaseの認証情報を設定してください：

```bash
cp .env.local.example .env.local
```

以下の環境変数を設定してください：
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseのサービスロールキー（サーバーサイドのみ）
- `QR_CODE_SECRET_KEY`: QRコード署名用の秘密鍵（以下のコマンドで生成）

```bash
# QRコード署名用の安全な秘密鍵を生成
openssl rand -base64 32
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. データベースセットアップ

新しい開発環境をセットアップする場合は、Supabase CLIを使用してデータベースをリセットします。これにより、最新のスキーマが適用され、`seed.sql`からサンプルデータが投入されます。

```bash
# Supabaseローカル開発環境を起動
supabase start

# データベースをリセットし、最新のスキーマとシードデータを適用
supabase db reset
```

### 4. 開発サーバーの起動

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションが起動します。

## データベースのマイグレーション

本プロジェクトでは、Supabase CLIの差分マイグレーションを採用しています。

データベースのスキーマを変更した場合は、以下のコマンドで新しいマイグレーションファイルを作成してください。

```bash
# "feat/add-new-table" のような、変更内容がわかる名前を付けます
supabase db diff -f "migration_name"
```

これにより、変更履歴がバージョン管理され、チームメンバー全員が安全にスキーマを更新できます。

## 開発コマンド

- `pnpm dev` - 開発サーバーを起動
- `pnpm build` - プロダクションビルドを作成
- `pnpm start` - プロダクションサーバーを起動
- `pnpm lint` - ESLintを実行
- `pnpm typecheck` - TypeScriptの型チェックを実行
- `pnpm test` - Vitestでユニットテストを実行
- `pnpm test:coverage` - テストカバレッジを計測
- `pnpm playwright` - Playwrightでe2eテストを実行

## 開発方針

詳細な開発ガイドラインは [docs/development_guide.md](./docs/development_guide.md) を参照してください。

- TDD（テスト駆動開発）を採用
- Code Hooksによる自動品質チェック
- TypeScriptの厳格な型付け（`any`型の使用禁止）
- テストカバレッジ80%以上を維持