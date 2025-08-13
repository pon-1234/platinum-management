# Requirements Document

## Introduction

platinum-managementは、キャバクラ（接待飲食等営業）の運営における、顧客・キャスト・売上・予約・在庫等の情報を一元管理し、業務効率化、法令遵守、および売上向上を実現するWebアプリケーションシステムです。VercelとSupabaseを採用したモダンな技術スタックで、リアルタイム連携と段階的導入を特徴とします。

## Requirements

### Requirement 1

**User Story:** As a システム管理者, I want ユーザー認証とロールベースアクセス制御を実装したい, so that 各スタッフが適切な権限でシステムにアクセスできる

#### Acceptance Criteria

1. WHEN ユーザーがログインを試行する THEN システム SHALL メールアドレスとパスワードで認証を行う
2. WHEN 認証が成功する THEN システム SHALL ユーザーのロール（Admin, Manager, Hall Staff, Cashier, Cast）に基づいてアクセス権限を設定する
3. WHEN 権限のないページにアクセスを試行する THEN システム SHALL アクセスを拒否し適切なエラーメッセージを表示する
4. IF ユーザーがキャストロールの場合 THEN システム SHALL 自身の情報のみアクセス可能にする

### Requirement 2

**User Story:** As a マネージャー, I want 顧客情報を管理したい, so that 顧客の来店履歴や特徴を把握して適切なサービスを提供できる

#### Acceptance Criteria

1. WHEN 顧客情報を登録する THEN システム SHALL 氏名、フリガナ、電話番号、LINE ID、誕生日、メモを保存する
2. WHEN 顧客を検索する THEN システム SHALL あらゆる項目でインクリメンタル検索を提供する
3. WHEN 顧客の来店履歴を表示する THEN システム SHALL 過去の来店日、利用金額、同伴キャスト、注文内容を時系列で表示する
4. WHEN 顧客にステータスを設定する THEN システム SHALL VIP、要注意、ブラックリストなどのフラグを管理する
5. IF 顧客がブラックリストの場合 THEN システム SHALL 予約時や来店時にアラートを表示する

### Requirement 3

**User Story:** As a マネージャー, I want キャスト情報を管理したい, so that キャストのプロフィール、成績、報酬を適切に管理できる

#### Acceptance Criteria

1. WHEN キャストがプロフィールを更新する THEN システム SHALL 源氏名、写真、自己紹介文の変更を許可する
2. WHEN マネージャーが報酬設定を行う THEN システム SHALL 時給、各種バック率（指名、ボトル等）を設定する
3. WHEN キャストの成績を表示する THEN システム SHALL 日/週/月単位で指名本数、売上、同伴数を自動集計する
4. WHEN 報酬計算データが必要な場合 THEN システム SHALL 設定された時給とバック率、勤怠記録、成績に基づきCSV/Excel形式でデータを出力する

### Requirement 4

**User Story:** As a ホールスタッフ, I want 予約と席の状況を管理したい, so that 効率的な席案内と予約管理ができる

#### Acceptance Criteria

1. WHEN 席レイアウトを表示する THEN システム SHALL 店舗の座席レイアウトをGUIで可視化する
2. WHEN 席の状況が変更される THEN システム SHALL リアルタイムで全端末に状況を同期する
3. WHEN 予約を登録する THEN システム SHALL 日付、時間、人数、顧客情報、指名キャスト、要望を記録する
4. WHEN 予約一覧を表示する THEN システム SHALL カレンダー形式とリスト形式で表示する

### Requirement 5

**User Story:** As a マネージャー, I want 勤怠とシフトを管理したい, so that スタッフの労働時間を適切に管理し給与計算に活用できる

#### Acceptance Criteria

1. WHEN キャストがシフト希望を提出する THEN システム SHALL 専用画面からシフト希望日を登録する
2. WHEN マネージャーがシフトを確定する THEN システム SHALL 希望を基にシフトを確定しカレンダーで表示する
3. WHEN スタッフが出退勤する THEN システム SHALL 従業員番号やQRコードで打刻し時刻を自動記録する
4. WHEN 勤怠レポートが必要な場合 THEN システム SHALL 月次の勤怠データを一覧表示しCSV形式で出力する

### Requirement 6

**User Story:** As a 会計担当, I want 売上と会計処理を管理したい, so that 正確な売上管理と会計処理ができる

#### Acceptance Criteria

1. WHEN 伝票を作成する THEN システム SHALL テーブルごとに伝票を作成しオーダー内容を登録する
2. WHEN 料金を計算する THEN システム SHALL オーダー内容に基づき小計、サービス料、消費税を自動計算する
3. WHEN 会計処理を行う THEN システム SHALL 支払い方法を記録し会計完了後は伝票をロックする
4. WHEN レジ締めを行う THEN システム SHALL 当日の全伝票を集計し売上レポートを自動生成する

### Requirement 7

**User Story:** As a マネージャー, I want 在庫とボトルキープを管理したい, so that 商品の在庫状況とボトルキープ情報を適切に管理できる

#### Acceptance Criteria

1. WHEN 商品マスタを管理する THEN システム SHALL 酒類、フード、タバコ等の商品名、価格、原価を登録する
2. WHEN オーダーが入る THEN システム SHALL 紐づく商品の在庫数を自動で減少させる
3. WHEN 在庫が閾値を下回る THEN システム SHALL アラートを通知する
4. WHEN ボトルキープを管理する THEN システム SHALL 顧客情報に紐づけて銘柄、開封日、保管期限を登録する

### Requirement 8

**User Story:** As a マネージャー, I want 年齢確認と法令対応を行いたい, so that 風営法等の法令を遵守した営業ができる

#### Acceptance Criteria

1. WHEN 初回顧客の身分証を確認する THEN システム SHALL 身分証明書をスキャンまたは撮影し暗号化して保管する
2. WHEN 法定帳票が必要な場合 THEN システム SHALL 従業者名簿、苦情処理簿などのフォーマットでデータを出力する
3. IF 身分証画像にアクセスする場合 THEN システム SHALL マネージャー以上の権限を要求する
