# Requirements Document

## Introduction

キャバクラ業界特有の複雑な給与計算システムを実装します。現在のシステムは単純な時給と一律のバック率に基づいた計算になっていますが、実際の業務では100パターン近くある複雑なバック率（歩合）、指名種別による計算の違い、売上スライド制など、非常に複雑な給与体系に対応する必要があります。

## Requirements

### Requirement 1

**User Story:** As a 経理担当者, I want 複数の給与計算ルールを設定・管理できる機能, so that キャスト個人の契約条件や成績に応じた正確な給与計算ができる

#### Acceptance Criteria

1. WHEN 経理担当者が給与計算ルール設定画面にアクセス THEN システム SHALL 既存のルール一覧を表示する
2. WHEN 経理担当者が新しい給与計算ルールを作成 THEN システム SHALL バック率、売上スライド、指名種別による計算方法を設定できる
3. WHEN 経理担当者がルールをキャストに割り当て THEN システム SHALL そのキャストの給与計算に指定されたルールを適用する
4. IF ルールに矛盾や不整合がある THEN システム SHALL エラーメッセージを表示し保存を拒否する

### Requirement 2

**User Story:** As a 経理担当者, I want 指名種別（本指名・場内指名等）による異なる計算方法を設定, so that 指名の種類に応じた正確なバック計算ができる

#### Acceptance Criteria

1. WHEN 経理担当者が指名種別を定義 THEN システム SHALL 本指名、場内指名、その他のカスタム指名種別を作成できる
2. WHEN 各指名種別にバック率を設定 THEN システム SHALL 指名種別ごとに異なるバック率を保存する
3. WHEN 注文時に指名種別が選択される THEN システム SHALL その指名種別に対応するバック率で計算する
4. IF 指名種別が未設定の注文がある THEN システム SHALL デフォルトの計算方法を適用する

### Requirement 3

**User Story:** As a 経理担当者, I want 売上スライド制による段階的なバック率変動を設定, so that キャストの売上実績に応じたインセンティブ計算ができる

#### Acceptance Criteria

1. WHEN 経理担当者が売上スライドルールを作成 THEN システム SHALL 売上金額の閾値とそれに対応するバック率を設定できる
2. WHEN キャストの月間売上が特定の閾値を超える THEN システム SHALL 該当する段階のバック率を適用する
3. WHEN 複数の売上段階にまたがる場合 THEN システム SHALL 各段階に応じて段階的に計算する
4. IF 売上スライドの設定に重複や矛盾がある THEN システム SHALL 警告を表示し修正を促す

### Requirement 4

**User Story:** As a 経理担当者, I want ドリンクバック、同伴料、指名料などの項目別計算設定, so that 収入源ごとに異なるバック率を適用できる

#### Acceptance Criteria

1. WHEN 経理担当者が項目別バック設定を行う THEN システム SHALL ドリンク、同伴、指名料などの項目ごとにバック率を設定できる
2. WHEN 各項目に最低保証額を設定 THEN システム SHALL 計算結果が最低保証額を下回らないよう調整する
3. WHEN 項目別の上限額を設定 THEN システム SHALL バック額が上限を超えないよう制限する
4. IF 項目別設定が未定義の商品がある THEN システム SHALL デフォルトのバック率を適用する

### Requirement 5

**User Story:** As a 経理担当者, I want 月次給与計算の自動実行と結果確認機能, so that 正確で効率的な給与処理ができる

#### Acceptance Criteria

1. WHEN 経理担当者が月次給与計算を実行 THEN システム SHALL 全キャストの給与を自動計算し結果を表示する
2. WHEN 計算結果に異常値や警告がある THEN システム SHALL 該当項目をハイライト表示し詳細を提供する
3. WHEN 給与計算結果を確定 THEN システム SHALL 計算過程と根拠データを記録として保存する
4. IF 計算期間中にルール変更があった THEN システム SHALL 変更前後のルールを適切に適用し履歴を残す

### Requirement 6

**User Story:** As a 店長, I want キャスト個人の給与明細と計算根拠を確認, so that 給与に関する質問や疑問に正確に回答できる

#### Acceptance Criteria

1. WHEN 店長がキャストの給与明細を表示 THEN システム SHALL 基本給、各種バック、控除項目の詳細を表示する
2. WHEN 計算根拠の詳細を確認 THEN システム SHALL 適用されたルール、売上データ、計算過程を表示する
3. WHEN 過去の給与履歴を参照 THEN システム SHALL 指定期間の給与推移とルール変更履歴を表示する
4. IF 計算に使用されたデータに修正が必要 THEN システム SHALL 再計算機能を提供する

### Requirement 7

**User Story:** As a キャスト, I want 自分の給与見込みと実績をリアルタイムで確認, so that 目標設定と成績向上のモチベーション維持ができる

#### Acceptance Criteria

1. WHEN キャストが自分の成績画面にアクセス THEN システム SHALL 当月の売上実績と給与見込みを表示する
2. WHEN 日別・週別の成績推移を確認 THEN システム SHALL グラフ形式で視覚的に表示する
3. WHEN 目標達成までの必要売上を確認 THEN システム SHALL 次の売上段階までの差額と必要な売上を表示する
4. IF プライバシー設定により制限がある THEN システム SHALL 許可された範囲の情報のみ表示する