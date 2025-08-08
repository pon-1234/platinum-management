# コードベースのリファクタリング課題

## 1. サービス層の重複
- `src/services/` と `src/lib/services/` に同じ機能のサービスが重複している
  - multiGuestBillingService.ts が両方に存在
  - multiGuestOrderService.ts が両方に存在
  - visitGuestService.ts が両方に存在

## 2. 命名規則の不統一
- ケバブケース: multi-guest-billing.service.ts
- キャメルケース: multiGuestBillingService.ts
- 混在している状態

## 3. ディレクトリ構造の問題
- サービス層が2箇所に分散（src/services と src/lib/services）
- 役割分担が不明確

## 4. 型定義の分散
- database.types.ts に巨大な型定義
- 各ドメインごとの型ファイルとの重複可能性

## 推奨アクション
1. サービス層を src/services に統一
2. 命名規則をケバブケースに統一
3. 重複コードの削除
4. 型定義の整理