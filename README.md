# Platinum Management

キャバクラ運営管理システム

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

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 開発サーバーの起動

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションが起動します。

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

詳細な開発ガイドラインは [development_guide.md](./development_guide.md) を参照してください。

- TDD（テスト駆動開発）を採用
- Code Hooksによる自動品質チェック
- TypeScriptの厳格な型付け（`any`型の使用禁止）
- テストカバレッジ80%以上を維持