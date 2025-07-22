# データベースセットアップガイド

## 概要

Platinum Management Systemでは、データベースの初期セットアップを簡単にするため、`supabase/V1_init_schema.sql`という単一のスキーマファイルを提供しています。

## 新規セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. データベースの初期化が完了するまで待機

### 2. スキーマファイルの実行

#### 方法1: SQL Editorを使用（推奨）

1. SupabaseダッシュボードのSQL Editorにアクセス
2. `supabase/V1_init_schema.sql`の内容をコピー&ペースト
3. 「RUN」ボタンをクリックして実行

#### 方法2: ローカルからpsqlを使用

```bash
# 環境変数から接続URLを取得して実行
psql "$(grep POSTGRES_URL_NON_POOLING .env.local | cut -d= -f2- | tr -d '"')" \
  -f supabase/V1_init_schema.sql
```

### 3. セットアップの確認

以下のクエリでテーブルが正常に作成されたことを確認してください：

```sql
-- テーブル一覧を確認
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- RLS関数の確認
SELECT proname FROM pg_proc WHERE proname LIKE 'current_user%' OR proname = 'get_current_user_staff_role';

-- ポリシー一覧の確認
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
```

## スキーマファイルに含まれる内容

`V1_init_schema.sql`には以下が含まれています：

### テーブル定義
- **staffs**: スタッフ管理（管理者、マネージャー、ホール、レジ、キャスト）
- **casts_profile**: キャストプロフィール情報
- **cast_performances**: キャスト実績記録
- **customers**: 顧客情報管理
- **visits**: 来店履歴
- **tables**: テーブル管理
- **reservations**: 予約管理
- **products**: 商品管理
- **order_items**: 注文アイテム
- **shift_templates**: シフトテンプレート
- **shift_requests**: シフト希望
- **confirmed_shifts**: 確定シフト
- **attendance_records**: 出退勤記録
- **attendance_corrections**: 出退勤修正
- **qr_codes**: QRコード管理
- **qr_attendance_logs**: QR出退勤ログ
- **inventory_movements**: 在庫変動履歴
- **bottle_keeps**: ボトルキープ管理
- **bottle_keep_usage**: ボトルキープ使用履歴
- **id_verifications**: 身分証確認記録
- **compliance_reports**: 法定帳簿出力履歴

### セキュリティ設定
- **Row Level Security (RLS)**: 全テーブルでRLSを有効化
- **セキュリティポリシー**: ユーザーロールに応じたアクセス制御
- **SECURITY DEFINER関数**: RLS無限再帰を回避する安全な関数群

### パフォーマンス最適化
- **インデックス**: クエリパフォーマンス向上のためのインデックス
- **トリガー**: updated_at自動更新等のトリガー関数

### ユーティリティ関数
- **get_current_user_staff_role()**: 現在ユーザーのロール取得
- **current_user_has_role()**: ロール権限チェック
- **get_cast_ranking()**: キャストランキング計算

## アーカイブされたマイグレーションファイルについて

`supabase/migrations/archive/`ディレクトリには、開発過程で作成された古いマイグレーションファイルが保存されています。これらは：

- **使用しないでください**: 開発の試行錯誤の履歴であり、最新のスキーマとは異なる場合があります
- **参考資料**: テーブル設計の変遷や、特定の機能の実装方法を理解するための参考資料として利用できます
- **統合済み**: 全ての内容は`V1_init_schema.sql`に統合されています

## トラブルシューティング

### よくあるエラーと対処法

#### 1. "extension "uuid-ossp" already exists"
- **原因**: 拡張機能が既にインストール済み
- **対処**: NOTICEメッセージなので、無視して問題ありません

#### 2. "relation already exists" エラー
- **原因**: テーブルが既に存在している
- **対処**: `DROP TABLE IF EXISTS テーブル名 CASCADE;` で削除してから再実行、または新しいSupabaseプロジェクトで実行

#### 3. RLS関数のエラー
- **原因**: auth.uid()関数が利用できない環境
- **対処**: Supabaseの認証機能が有効になっていることを確認

### 問題が解決しない場合

1. Supabaseプロジェクトのログを確認
2. SQL Editorでクエリを分割して実行
3. 新しいSupabaseプロジェクトで再試行

## 本番環境への適用

**注意**: 本番環境で既にデータが存在する場合は、このスキーマファイルをそのまま実行しないでください。代わりに、段階的なマイグレーション戦略を検討してください。

新しい本番環境の場合は、開発環境と同じ手順でセットアップできます。