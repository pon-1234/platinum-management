# デモデータセットアップガイド

このガイドでは、Platinum Management SystemのデモデータをSupabaseに投入する手順を説明します。

## 前提条件

- Supabaseプロジェクトが作成済み
- 全てのマイグレーションが適用済み
- Supabaseダッシュボードにアクセス可能

## セットアップ手順

### 1. デモデータの投入

Supabaseダッシュボードで以下を実行：

1. **SQL Editor**にアクセス
2. `supabase/demo_data.sql`の内容をコピー&ペースト
3. **Run**ボタンをクリックして実行

### 2. テストユーザーの作成

Supabaseダッシュボードの**Authentication > Users**で以下のユーザーを作成：

#### 管理者ユーザー

- **Email**: `***REMOVED***`
- **Password**: `DemoAdmin123!`
- **Role**: admin

#### マネージャーユーザー

- **Email**: `manager@platinum-demo.com`
- **Password**: `DemoManager123!`
- **Role**: manager

#### ホールスタッフユーザー

- **Email**: `hall@platinum-demo.com`
- **Password**: `DemoHall123!`
- **Role**: hall

#### レジ担当ユーザー

- **Email**: `cashier@platinum-demo.com`
- **Password**: `DemoCashier123!`
- **Role**: cashier

#### キャストユーザー

- **Email**: `cast@platinum-demo.com`
- **Password**: `DemoCast123!`
- **Role**: cast

### 3. ユーザーIDの紐付け

各ユーザー作成後、そのuser_idをコピーして以下のSQLを実行：

```sql
-- 作成したユーザーのIDに置き換えてください
UPDATE staffs SET user_id = '[admin-user-id]' WHERE full_name = '田中 太郎';
UPDATE staffs SET user_id = '[manager-user-id]' WHERE full_name = '佐藤 花子';
UPDATE staffs SET user_id = '[hall-user-id]' WHERE full_name = '鈴木 一郎';
UPDATE staffs SET user_id = '[cashier-user-id]' WHERE full_name = '高橋 美咲';
UPDATE staffs SET user_id = '[cast-user-id]' WHERE full_name = '山田 愛';
```

## デモデータの内容

### 顧客データ

- 5名の顧客（VIP含む）
- 連絡先、職業、ステータス情報

### スタッフデータ

- 6名のスタッフ（管理者、マネージャー、ホール、レジ、キャスト2名）
- 雇用日、役職、アクティブ状態

### テーブルデータ

- 6つのテーブル（通常テーブル、VIPルーム、カウンター）
- 容量、場所、VIP区分

### 在庫商品データ

- 6つの商品（アルコール、ノンアルコール、フード）
- 価格、原価、在庫数、仕入先情報

### 来店・予約データ

- 完了した来店記録2件
- 進行中の来店1件
- 今後の予約3件

### 勤怠データ

- スタッフの出勤記録
- 打刻時間、休憩時間

### ボトルキープデータ

- VIPお客様のボトルキープ記録

### キャスト成績データ

- 売上実績、指名数、評価

## ログイン情報

以下の認証情報でログインできます：

| 役職           | メールアドレス            | パスワード      |
| -------------- | ------------------------- | --------------- |
| 管理者         | **_REMOVED_**             | DemoAdmin123!   |
| マネージャー   | manager@platinum-demo.com | DemoManager123! |
| ホールスタッフ | hall@platinum-demo.com    | DemoHall123!    |
| レジ担当       | cashier@platinum-demo.com | DemoCashier123! |
| キャスト       | cast@platinum-demo.com    | DemoCast123!    |

## 機能テスト

### 管理者でログイン後に確認できる機能

- ダッシュボード（売上サマリー）
- 顧客管理（5名の顧客）
- スタッフ管理
- テーブル管理
- 在庫管理
- 会計管理
- 予約管理
- 勤怠管理
- コンプライアンス

### キャストでログイン後に確認できる機能

- 出勤管理（QR打刻）
- シフト申請
- 成績確認

### データの確認方法

SQL Editorで以下を実行してデータを確認：

```sql
-- データ投入確認
SELECT
  'Customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'Staff', COUNT(*) FROM staffs
UNION ALL
SELECT 'Tables', COUNT(*) FROM tables
UNION ALL
SELECT 'Products', COUNT(*) FROM inventory_products
UNION ALL
SELECT 'Visits', COUNT(*) FROM visits
UNION ALL
SELECT 'Reservations', COUNT(*) FROM reservations;
```

## トラブルシューティング

### ログインできない場合

1. Supabaseの**Authentication > Users**でユーザーが作成されているか確認
2. メールアドレスとパスワードが正確か確認
3. ユーザーの**Email Confirmed**が`true`になっているか確認

### データが表示されない場合

1. SQL Editorでデモデータが正常に投入されているか確認
2. Row Level Security (RLS) ポリシーが適切に設定されているか確認
3. ブラウザの開発者ツールでエラーを確認

### 権限エラーが発生する場合

1. staffsテーブルのuser_idが正しく設定されているか確認
2. 該当ユーザーの役職が正しく設定されているか確認

## 注意事項

- これはデモ環境用のデータです
- 本番環境では使用しないでください
- パスワードは定期的に変更してください
- テストデータは定期的にリセットすることをお勧めします
