# Visit Session中心の再設計 - 進捗状況

## 完了した作業

### 1. データベース設計（完了）

- `20250808_visit_session_redesign.sql`を作成
- 新規テーブル:
  - `visit_table_segments`: テーブル配席の時間区間管理
  - `cast_engagements`: キャスト着席の時間区間管理
  - `bill_item_attributions`: 明細ごとの売上寄与
  - `visit_nominations`: 訪問中の指名イベント
- 既存テーブル拡張:
  - `visits`: session_code, primary_customer_id, is_group_visit追加
- 時間重複防止の制約（EXCLUDE USING gist）
- 自動アトリビューション計算関数
- 給与計算用ビュー（payroll_revenue_facts）

### 2. サービス層（完了）

- `visit-session.service.ts`を作成
- 主要機能:
  - セッション管理（作成、マージ、詳細取得）
  - テーブル配席管理（移動、セグメント管理）
  - キャスト管理（エンゲージメント開始/終了）
  - アトリビューション管理（自動/手動計算）
  - 給与計算連携

## 残作業

### 3. UI/UXの更新（未着手）

必要な変更:

- TableDashboard: テーブル中心→セッション中心へ
- CastAssignmentDialog: エンゲージメント管理へ変更
- OrderTicketManagement: アトリビューション表示/編集
- BillingInterface: アトリビューション集計表示

### 4. 既存サービスの統合（未着手）

- cast-assignment.service.ts → cast_engagementsへ移行
- billing.service.ts → アトリビューション考慮
- payroll.service.ts → payroll_revenue_factsから集計

## 設計のポイント

### なぜVisit Session中心か

1. **柔軟性**: テーブル移動、合同卓、分割会計に対応
2. **正確性**: 時間区間で正確なキャスト管理
3. **透明性**: 明細レベルで売上寄与を追跡
4. **給与連携**: 自動で正確な給与計算

### 運用フロー

1. 来店 → visit_session作成
2. 配席 → visit_table_segment作成
3. キャスト着席 → cast_engagement作成
4. 注文 → bill_item + attribution自動計算
5. 会計 → attribution集計して精算
6. 給与 → payroll_revenue_factsから集計
