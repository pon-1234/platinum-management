# データベースセットアップガイド

## 概要

本ドキュメントでは、platinum-managementシステムのデータベースセットアップ手順を説明します。

## セットアップ方法

### 推奨方法: 自動セットアップスクリプト

最も簡単で確実な方法は、自動セットアップスクリプトを使用することです：

```bash
# データベースのセットアップ（テーブル作成、RLS設定、初期データ投入）
npm run db:setup-v2
```

このスクリプトは以下を自動的に実行します：
1. 必要なテーブルの作成
2. Row Level Security (RLS) の設定
3. インデックスの作成
4. 初期データの投入

### 手動セットアップ（開発者向け）

開発環境で細かい制御が必要な場合は、以下の手順で手動セットアップも可能です：

1. **スキーマの作成**
   ```bash
   # Supabase Dashboardで以下のSQLを実行
   # supabase/migrations/V1_init_schema.sql の内容を実行
   ```

2. **テーブルの確認**
   ```bash
   npm run db:check-tables
   ```

3. **デモデータの投入（オプション）**
   ```bash
   npm run db:insert-demo
   ```

## マイグレーション管理

### 新しいマイグレーションの作成

```bash
# Supabase CLIを使用して差分マイグレーションを生成
supabase db diff -f "マイグレーション名"
```

### マイグレーションの適用

```bash
# ローカル環境
supabase db push

# 本番環境
supabase db push --linked
```

## トラブルシューティング

### よくある問題

1. **RLSポリシーエラー**
   - 原因: Row Level Securityが有効だが、適切なポリシーが設定されていない
   - 解決: `npm run db:setup-v2` を実行してRLSポリシーを再設定

2. **外部キー制約エラー**
   - 原因: 依存関係のあるテーブルの順序が正しくない
   - 解決: 自動セットアップスクリプトを使用（正しい順序で実行される）

3. **権限エラー**
   - 原因: Supabaseのサービスロールキーが設定されていない
   - 解決: `.env.local` に `SUPABASE_SERVICE_ROLE_KEY` を設定

### データベースの状態確認

```bash
# テーブルの存在確認
npm run db:check-tables

# データの確認
npm run db:check-data
```

## 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [システム設計書](./SYSTEM_DESIGN.md)
- [開発ガイド](./DEVELOPMENT_GUIDE.md)