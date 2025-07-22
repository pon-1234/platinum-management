# Production Migration Applied - 2025-07-23

## Issue
キャスト管理機能で「新規追加」ボタンを押すと以下のエラーが発生していた：

```
POST https://pdomeeyvatachcothudq.supabase.co/rest/v1/rpc/get_unregistered_staff 404 (Not Found)
Failed to load available staff: Error: 未登録スタッフの取得に失敗しました
```

## Root Cause
本番環境のSupabaseデータベースに必要なマイグレーションが適用されていなかった。

## Applied Migrations

### 1. RLS Policies Migration
**File**: `supabase/migrations/20240120000000_add_rls_policies.sql`
- `has_permission()` 関数を作成
- 各テーブルのRow Level Security (RLS) ポリシーを設定
- 権限チェック機能を実装

### 2. Unregistered Staff Function Migration  
**File**: `supabase/migrations/20240120000001_create_unregistered_staff_function.sql`
- `get_unregistered_staff()` 関数を作成（ページネーション対応）
- `get_unregistered_staff_count()` 関数を作成
- `unregistered_staff_view` ビューを作成
- 必要なインデックスを追加

## Applied Commands

```bash
# Check if functions exist
PGPASSWORD="***REMOVED***" psql -h ***REMOVED*** -p 5432 -U postgres -d postgres -c "SELECT proname FROM pg_proc WHERE proname = 'get_unregistered_staff';"

# Apply migrations
PGPASSWORD="***REMOVED***" psql -h ***REMOVED*** -p 5432 -U postgres -d postgres -f supabase/migrations/20240120000000_add_rls_policies.sql

PGPASSWORD="***REMOVED***" psql -h ***REMOVED*** -p 5432 -U postgres -d postgres -f supabase/migrations/20240120000001_create_unregistered_staff_function.sql

# Verify functions are created
PGPASSWORD="***REMOVED***" psql -h ***REMOVED*** -p 5432 -U postgres -d postgres -c "SELECT proname FROM pg_proc WHERE proname LIKE '%unregistered_staff%';"
```

## Result
- ✅ `has_permission()` 関数が作成された
- ✅ `get_unregistered_staff()` 関数が作成された  
- ✅ `get_unregistered_staff_count()` 関数が作成された
- ✅ キャスト管理の「新規追加」機能が正常に動作するようになった

## Future Prevention
- 本番環境へのデプロイ時には必ずマイグレーションの適用状況を確認する
- CI/CDパイプラインでマイグレーションの自動適用を検討する
- Supabase CLI の `supabase db push` コマンドの活用を検討する