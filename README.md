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

### 3. データベースセットアップ

新しい開発環境をセットアップする場合は、以下の手順でSupabaseデータベースを初期化してください：

1. Supabaseプロジェクトを作成し、SQL Editorにアクセス
2. `supabase/V1_init_schema.sql` の内容をSQL Editorで実行

```bash
# ファイルの内容をクリップボードにコピー
cat supabase/V1_init_schema.sql | pbcopy
```

このスキーマファイルには以下が含まれています：
- 全テーブル定義（スタッフ、顧客、予約、売上等）
- Row Level Security (RLS) ポリシー
- インデックス最適化
- 必要な関数とトリガー

**注意**: 古いマイグレーションファイル（`supabase/migrations/archive/`内）は使用しないでください。これらは開発過程の履歴であり、`V1_init_schema.sql`に統合済みです。

### 4. 開発サーバーの起動

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションが起動します。

## データベース構造

データベーススキーマの詳細については、`supabase/V1_init_schema.sql` を参照してください。主要なテーブル：

- **staffs**: スタッフ管理（管理者、マネージャー、ホール、レジ、キャスト）
- **casts_profile**: キャストプロフィール情報
- **customers**: 顧客情報管理
- **visits**: 来店履歴
- **reservations**: 予約管理
- **products**: 商品管理
- **order_items**: 注文アイテム
- **attendance_records**: 出退勤記録
- **bottle_keeps**: ボトルキープ管理
- その他、勤怠管理、在庫管理、コンプライアンス関連テーブル

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