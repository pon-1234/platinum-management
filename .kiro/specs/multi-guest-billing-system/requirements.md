# Requirements Document

## Introduction

現在のシステムでは1組の来店（visits）に対して1名の顧客が紐づく設計になっていますが、実際のキャバクラ業務では1組に複数名の顧客がおり、それぞれが異なるキャストを指名し、個別の会計を行うケースが頻繁に発生します。このシステムでは、複数客の会計と担当キャストの正確な紐付けを実現し、正確な顧客分析とキャスト評価を可能にします。

## Requirements

### Requirement 1

**User Story:** As a ホール担当者, I want 1組の来店に複数の顧客を登録できる機能, so that 実際の来店状況を正確に記録できる

#### Acceptance Criteria

1. WHEN ホール担当者が来店受付を行う THEN システム SHALL 主要顧客に加えて同伴者を追加登録できる
2. WHEN 同伴者を追加する THEN システム SHALL 既存顧客の選択または新規顧客登録を選択できる
3. WHEN 複数顧客が登録される THEN システム SHALL 各顧客の席順や関係性を記録できる
4. IF 顧客情報が不完全な場合 THEN システム SHALL 最低限の情報で仮登録し後で補完できる

### Requirement 2

**User Story:** As a キャスト, I want 複数客の中から自分の担当客を明確に識別, so that 正確な接客と売上管理ができる

#### Acceptance Criteria

1. WHEN キャストが注文を取る THEN システム SHALL どの顧客の注文かを明確に選択できる
2. WHEN 指名を受ける THEN システム SHALL 指名した顧客を正確に記録できる
3. WHEN 同伴やアフターを行う THEN システム SHALL 対象顧客を特定して記録できる
4. IF 複数顧客から同時に注文がある THEN システム SHALL それぞれを区別して処理できる

### Requirement 3

**User Story:** As a 会計担当者, I want 複数客の会計を個別または合算で処理, so that 柔軟な支払い方法に対応できる

#### Acceptance Criteria

1. WHEN 会計処理を行う THEN システム SHALL 顧客別の消費明細を表示できる
2. WHEN 個別会計を選択 THEN システム SHALL 各顧客の消費分のみを計算できる
3. WHEN 合算会計を選択 THEN システム SHALL 全体の合計金額を計算できる
4. IF 一部の顧客のみ先に帰る場合 THEN システム SHALL 部分会計処理ができる

### Requirement 4

**User Story:** As a 店長, I want 顧客別の消費パターンと担当キャストの成績を正確に分析, so that 効果的な営業戦略を立てられる

#### Acceptance Criteria

1. WHEN 顧客分析レポートを確認 THEN システム SHALL 個人別の来店頻度と消費額を表示する
2. WHEN キャスト成績を確認 THEN システム SHALL 担当顧客別の売上貢献度を表示する
3. WHEN 同伴実績を確認 THEN システム SHALL どの顧客との同伴かを特定できる
4. IF 複数キャストが同じ組を担当した場合 THEN システム SHALL それぞれの貢献度を算出できる

### Requirement 5

**User Story:** As a 経理担当者, I want 複数客システムに対応した正確な売上集計, so that 財務管理と税務処理を適切に行える

#### Acceptance Criteria

1. WHEN 日次売上を集計 THEN システム SHALL 顧客数と組数を正確に区別して計算する
2. WHEN 月次レポートを作成 THEN システム SHALL 実際の来店客数と売上の関係を正確に表示する
3. WHEN キャスト給与を計算 THEN システム SHALL 担当顧客別の売上を正確に集計する
4. IF データに不整合がある場合 THEN システム SHALL 警告を表示し修正を促す

### Requirement 6

**User Story:** As a システム管理者, I want 既存データを新システムに移行, so that 過去の来店履歴を失うことなく新機能を利用できる

#### Acceptance Criteria

1. WHEN データ移行を実行 THEN システム SHALL 既存の単一顧客データを主要顧客として設定する
2. WHEN 移行後の検証を行う THEN システム SHALL データの整合性を確認できる
3. WHEN 移行中にエラーが発生 THEN システム SHALL 詳細なログを記録し復旧手順を提供する
4. IF 移行に失敗した場合 THEN システム SHALL 元の状態に安全にロールバックできる

### Requirement 7

**User Story:** As a ホール担当者, I want テーブル管理画面で複数客の状況を一目で把握, so that 効率的な接客とテーブル管理ができる

#### Acceptance Criteria

1. WHEN テーブル状況を確認 THEN システム SHALL 各テーブルの顧客数と担当キャストを表示する
2. WHEN 顧客の詳細を確認 THEN システム SHALL 組内の各顧客情報と消費状況を表示する
3. WHEN テーブル移動が必要 THEN システム SHALL 組全体を一括で移動できる
4. IF 一部顧客のみ退店する場合 THEN システム SHALL 残りの顧客で継続利用できる
