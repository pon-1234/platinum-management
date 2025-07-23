# Supabase RLS 無限再帰問題の解決ガイド

## 問題の概要

Supabase Row Level Security (RLS) で無限再帰エラー「infinite recursion detected in policy for relation 'staffs'」が発生していました。これは、RLSポリシーが同じテーブルを自己参照することで起こります。

## 根本原因

```sql
-- 問題のあるポリシー例
CREATE POLICY "managers_can_view_all_staff" ON staffs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs s  -- ← ここで自己参照が発生
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
    )
  );
```

## 解決策

### 1. SECURITY DEFINER 関数を使用

```sql
-- RLSをバイパスする安全な関数
CREATE OR REPLACE FUNCTION get_current_user_staff_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- ← この属性でRLSをバイパス
STABLE
AS $$
DECLARE
  user_role TEXT;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- SECURITY DEFINERにより、RLSをバイパスして実行
  SELECT role INTO user_role
  FROM staffs
  WHERE user_id = current_user_id 
    AND is_active = true;
  
  RETURN user_role;
END;
$$;
```

### 2. 新しいRLSポリシー

```sql
-- 再帰のない安全なポリシー
CREATE POLICY "managers_can_view_all_staff" ON staffs
  FOR SELECT
  USING (current_user_is_manager_or_admin()); -- ← 関数を使用
```

## 実装手順

### ステップ 1: マイグレーションの実行

```bash
# 最新のマイグレーションを実行
supabase db push
```

または手動で以下のファイルを実行：
- `supabase/migrations/20240112000000_simple_rls_fix.sql`

### ステップ 2: ミドルウェアの更新

ミドルウェア (`src/middleware.ts`) は既に更新済みです：

```typescript
// 新しい安全なロール取得
const { data: userRole, error: roleError } = await serviceSupabase
  .rpc('get_current_user_staff_role');
```

### ステップ 3: 動作確認

1. アプリケーションを再起動
2. ログインを試行
3. 各ロールでのアクセス権限をテスト

## 利点

### ✅ この解決策の利点

1. **シンプル**: 複雑なキャッシュテーブル不要
2. **安全**: SECURITY DEFINERでRLSを適切にバイパス
3. **保守性**: 理解しやすく、デバッグが容易
4. **パフォーマンス**: 直接的なクエリで高速

### 🆚 他の解決策との比較

| 手法 | 複雑さ | パフォーマンス | 保守性 |
|------|--------|----------------|--------|
| SECURITY DEFINER | 低 | 高 | 高 |
| キャッシュテーブル | 中 | 中 | 中 |
| JWT Claims | 高 | 高 | 低 |

## トラブルシューティング

### よくある問題

1. **関数が見つからない**
   ```sql
   -- 関数の存在確認
   SELECT EXISTS (
     SELECT 1 FROM pg_proc 
     WHERE proname = 'get_current_user_staff_role'
   );
   ```

2. **権限エラー**
   ```sql
   -- 権限の再付与
   GRANT EXECUTE ON FUNCTION get_current_user_staff_role() TO authenticated;
   ```

3. **依然として無限再帰が発生**
   ```sql
   -- 古いポリシーの確認と削除
   SELECT policyname FROM pg_policies WHERE tablename = 'staffs';
   ```

## ベストプラクティス

### 🎯 推奨事項

1. **SECURITY DEFINER関数を使用** - RLS再帰を避ける最も安全な方法
2. **最小権限の原則** - 必要最小限の権限のみ付与
3. **ログの活用** - 問題発生時の診断のため

### ⚠️ 注意点

1. **SECURITY DEFINER** - セキュリティホールになる可能性があるため、慎重に実装
2. **権限管理** - 関数の実行権限を適切に管理
3. **テスト** - 各ロールでの動作を十分にテスト

## 関連ファイル

- `/src/middleware.ts` - ミドルウェアの更新
- `/src/lib/supabase-admin.ts` - 管理用ユーティリティ
- `/supabase/migrations/20240112000000_simple_rls_fix.sql` - RLS修正マイグレーション

## 参考資料

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)