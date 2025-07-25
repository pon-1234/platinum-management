# セキュリティ強化マイグレーションガイド

このドキュメントは、Geminiのレビューに基づいて実装したセキュリティとパフォーマンスの改善について説明します。

## 実装した内容

### 1. Row Level Security (RLS) の実装
- すべてのテーブルでRLSを有効化
- 権限ベースのアクセス制御を実装
- サーバーサイドでの権限チェックを強制

### 2. パフォーマンス改善
- キャスト登録時の全件読み込みを修正
- 未登録スタッフ取得用の専用関数を作成
- 検索・フィルタリングをサーバーサイドに移行

### 3. インデックスの追加
- `created_at`カラムにインデックスを追加
- 検索用インデックスを追加
- 権限チェック高速化用インデックスを追加

## マイグレーション手順

1. **データベースのバックアップを取る**
   ```bash
   # Supabaseダッシュボードからバックアップを作成
   ```

2. **マイグレーションファイルを実行**
   ```bash
   # Supabase CLIを使用
   supabase migration up

   # または、Supabaseダッシュボードから以下のSQLを実行：
   # 1. /supabase/migrations/20240120000000_add_rls_policies.sql
   # 2. /supabase/migrations/20240120000001_create_unregistered_staff_function.sql
   ```

3. **アプリケーションをデプロイ**
   ```bash
   git add .
   git commit -m "feat: implement RLS and performance improvements"
   git push
   ```

## 変更点の詳細

### RLSポリシー
各テーブルに以下のポリシーを追加：
- `SELECT`: 権限に基づいた閲覧制限
- `INSERT`: 権限に基づいた作成制限
- `UPDATE`: 権限に基づいた更新制限
- `DELETE`: 権限に基づいた削除制限

### 権限マトリクス
| リソース | admin | manager | hall | cashier | cast |
|---------|-------|---------|------|---------|------|
| staff   | CRUD  | CRUD    | -    | -       | -    |
| cast    | CRUD  | CRUD    | R    | -       | R    |
| customer| CRUD  | CRUD    | CRU  | R       | -    |
| attendance| CRUD | CRUD   | CRUD*| CRUD*   | CRUD*|
| billing | CRUD  | CRUD    | -    | CRU     | -    |
| inventory| CRUD | CRUD    | R    | -       | -    |

*自分の記録のみ操作可能

### API変更
- `staffService.getAllStaff()`: 検索・フィルタリングパラメータを追加
- `staffService.getUnregisteredStaff()`: 新規追加
- キャスト登録時の効率的なデータ取得

## 注意事項

1. **既存データへの影響**
   - RLSポリシーは既存データには影響しません
   - ただし、権限のないユーザーはデータにアクセスできなくなります

2. **パフォーマンス**
   - インデックスの追加により、初回実行時は若干時間がかかる可能性があります
   - 長期的にはパフォーマンスが向上します

3. **テスト**
   - 各ロールでのアクセス権限をテストしてください
   - 特に権限境界でのテストを重点的に行ってください

## トラブルシューティング

### RLSエラーが発生する場合
1. ユーザーのロールが正しく設定されているか確認
2. `staffs`テーブルにユーザーのレコードが存在するか確認
3. `has_permission`関数が正しく動作しているか確認

### パフォーマンスが悪化した場合
1. インデックスが正しく作成されているか確認
2. クエリプランを確認し、インデックスが使用されているか確認
3. 必要に応じて追加のインデックスを作成

## ロールバック手順

問題が発生した場合は、以下の手順でロールバックできます：

```sql
-- RLSを無効化
ALTER TABLE staffs DISABLE ROW LEVEL SECURITY;
ALTER TABLE casts_profile DISABLE ROW LEVEL SECURITY;
-- 他のテーブルも同様に...

-- ポリシーを削除
DROP POLICY IF EXISTS "staffs_select_policy" ON staffs;
DROP POLICY IF EXISTS "staffs_insert_policy" ON staffs;
-- 他のポリシーも同様に...

-- 関数を削除
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS has_permission(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_unregistered_staff(INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_unregistered_staff_count();

-- ビューを削除
DROP VIEW IF EXISTS unregistered_staff_view;
```