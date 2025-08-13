# Design Document

## Overview

名刺スキャン機能は、OCR技術を活用して紙の名刺から顧客情報を自動抽出し、システムに登録する機能です。画像処理、OCR処理、データ検証、顧客登録までの一連のフローを自動化し、手動入力の手間を大幅に削減します。モバイル対応により、接客現場での即座な顧客登録を可能にします。

## Architecture

### System Components

```mermaid
graph TB
    subgraph "UI Layer"
        A[名刺スキャン画面]
        B[画像プレビュー画面]
        C[情報確認・編集画面]
        D[スキャン履歴画面]
        E[精度分析画面]
    end

    subgraph "Service Layer"
        F[BusinessCardScanService]
        G[OCRProcessingService]
        H[ImageProcessingService]
        I[DataExtractionService]
        J[CustomerMatchingService]
    end

    subgraph "Data Layer"
        K[business_card_scans]
        L[ocr_results]
        M[scan_accuracy_logs]
        N[extracted_customer_data]
    end

    subgraph "External Services"
        O[OCR API (Google Vision)]
        P[Image Storage (S3)]
        Q[Customer Database]
        R[Company Database]
    end

    A --> F
    B --> H
    C --> I
    D --> F
    E --> F

    F --> K
    G --> L
    H --> P
    I --> N
    J --> Q

    G --> O
    H --> P
    I --> R
    J --> Q
```

### Database Schema Design

#### 新規テーブル設計

**business_card_scans (名刺スキャン記録)**

```sql
CREATE TABLE business_card_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_image_url TEXT NOT NULL,
    processed_image_url TEXT,
    scan_method VARCHAR(20) NOT NULL, -- 'upload', 'camera', 'batch'
    image_format VARCHAR(10) NOT NULL, -- 'jpeg', 'png', 'pdf'
    image_size_bytes INTEGER,
    image_dimensions JSONB, -- {width: number, height: number}
    scan_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_start_time TIMESTAMPTZ,
    processing_end_time TIMESTAMPTZ,
    processing_duration_ms INTEGER,
    customer_id UUID REFERENCES customers(id),
    scanned_by UUID REFERENCES staffs(id),
    scan_location VARCHAR(100), -- 'reception', 'table', 'office'
    device_info JSONB, -- デバイス情報
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**ocr_results (OCR処理結果)**

```sql
CREATE TABLE ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_card_scan_id UUID NOT NULL REFERENCES business_card_scans(id) ON DELETE CASCADE,
    ocr_provider VARCHAR(50) NOT NULL, -- 'google_vision', 'aws_textract', 'azure_cognitive'
    raw_ocr_response JSONB NOT NULL, -- OCR APIの生レスポンス
    extracted_text TEXT NOT NULL,
    confidence_score DECIMAL(5,4), -- 0-1の信頼度
    detected_language VARCHAR(10), -- 'ja', 'en', 'mixed'
    text_blocks JSONB, -- テキストブロック情報
    processing_time_ms INTEGER,
    api_cost_cents INTEGER, -- API利用コスト（セント単位）
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**extracted_customer_data (抽出顧客データ)**

```sql
CREATE TABLE extracted_customer_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_card_scan_id UUID NOT NULL REFERENCES business_card_scans(id) ON DELETE CASCADE,
    extraction_method VARCHAR(50) NOT NULL, -- 'regex', 'nlp', 'manual'
    extracted_name VARCHAR(200),
    extracted_name_kana VARCHAR(200),
    extracted_company VARCHAR(200),
    extracted_department VARCHAR(200),
    extracted_position VARCHAR(200),
    extracted_phone VARCHAR(50),
    extracted_email VARCHAR(200),
    extracted_address TEXT,
    extracted_website VARCHAR(500),
    extraction_confidence JSONB, -- 項目別信頼度
    validation_results JSONB, -- バリデーション結果
    suggested_corrections JSONB, -- 修正提案
    is_manually_corrected BOOLEAN DEFAULT false,
    manual_corrections JSONB, -- 手動修正内容
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**scan_accuracy_logs (スキャン精度ログ)**

```sql
CREATE TABLE scan_accuracy_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_card_scan_id UUID NOT NULL REFERENCES business_card_scans(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL, -- 'name', 'company', 'phone', etc.
    extracted_value TEXT,
    corrected_value TEXT,
    is_correct BOOLEAN,
    correction_type VARCHAR(20), -- 'none', 'minor', 'major', 'complete'
    accuracy_score DECIMAL(5,4), -- 0-1の精度スコア
    error_category VARCHAR(50), -- 'ocr_error', 'extraction_error', 'format_error'
    feedback_provided_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**business_card_templates (名刺テンプレート)**

```sql
CREATE TABLE business_card_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL,
    company_pattern VARCHAR(500), -- 会社名の抽出パターン
    name_pattern VARCHAR(500), -- 氏名の抽出パターン
    phone_pattern VARCHAR(500), -- 電話番号の抽出パターン
    email_pattern VARCHAR(500), -- メールアドレスの抽出パターン
    layout_hints JSONB, -- レイアウトヒント
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,4), -- 成功率
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Components and Interfaces

### Service Layer Components

#### BusinessCardScanService

名刺スキャンの全体的な制御を担当するサービス

**主要メソッド:**

- `initiateScan(imageFile: File, scanOptions: ScanOptions): Promise<BusinessCardScan>`
- `getScanStatus(scanId: string): Promise<ScanStatus>`
- `getScanHistory(filters: ScanHistoryFilters): Promise<BusinessCardScan[]>`
- `retryFailedScan(scanId: string): Promise<BusinessCardScan>`
- `deleteScanData(scanId: string, deleteOptions: DeleteOptions): Promise<void>`

#### OCRProcessingService

OCR処理を担当するサービス

**主要メソッド:**

- `processImage(imageUrl: string, provider: string): Promise<OCRResult>`
- `extractTextFromImage(imageFile: File): Promise<ExtractedText>`
- `validateOCRResult(ocrResult: OCRResult): Promise<ValidationResult>`
- `improveOCRAccuracy(imageUrl: string, hints: ProcessingHints): Promise<OCRResult>`
- `compareOCRProviders(imageUrl: string): Promise<ProviderComparison>`

#### ImageProcessingService

画像処理・最適化を担当するサービス

**主要メソッド:**

- `preprocessImage(imageFile: File): Promise<ProcessedImage>`
- `detectBusinessCard(imageFile: File): Promise<CardDetectionResult>`
- `enhanceImageQuality(imageFile: File): Promise<EnhancedImage>`
- `cropBusinessCard(imageFile: File, coordinates: Coordinates): Promise<CroppedImage>`
- `validateImageFormat(imageFile: File): Promise<FormatValidation>`

#### DataExtractionService

抽出データの処理・検証を担当するサービス

**主要メソッド:**

- `extractCustomerData(ocrResult: OCRResult): Promise<ExtractedCustomerData>`
- `validateExtractedData(extractedData: ExtractedCustomerData): Promise<ValidationResult>`
- `suggestCorrections(extractedData: ExtractedCustomerData): Promise<CorrectionSuggestions>`
- `applyManualCorrections(dataId: string, corrections: ManualCorrections): Promise<ExtractedCustomerData>`
- `enrichDataWithExternalSources(extractedData: ExtractedCustomerData): Promise<EnrichedData>`

#### CustomerMatchingService

既存顧客との照合を担当するサービス

**主要メソッド:**

- `findSimilarCustomers(extractedData: ExtractedCustomerData): Promise<SimilarCustomer[]>`
- `calculateMatchScore(customer1: Customer, customer2: ExtractedCustomerData): Promise<number>`
- `suggestCustomerMerge(customerId: string, extractedDataId: string): Promise<MergeSuggestion>`
- `mergeCustomerData(customerId: string, extractedDataId: string): Promise<Customer>`
- `createNewCustomerFromExtraction(extractedDataId: string): Promise<Customer>`

### UI Components

#### BusinessCardScanModal

名刺スキャンのメインモーダル

**機能:**

- 画像アップロード・カメラ撮影
- リアルタイム名刺検出
- 処理進捗表示
- エラーハンドリング

#### ImagePreviewComponent

画像プレビューと編集コンポーネント

**機能:**

- 画像プレビュー表示
- 名刺領域の手動調整
- 画像回転・補正
- 品質確認

#### ExtractedDataEditor

抽出データの確認・編集コンポーネント

**機能:**

- 抽出結果の表示
- 信頼度スコア表示
- 手動修正機能
- バリデーション結果表示

#### ScanHistoryViewer

スキャン履歴の表示コンポーネント

**機能:**

- スキャン履歴一覧
- 詳細情報表示
- 再処理機能
- データエクスポート

#### AccuracyAnalyticsDashboard

精度分析ダッシュボード

**機能:**

- 精度統計の表示
- エラーパターン分析
- 改善提案表示
- トレンド分析

## Data Models

### Core Types

```typescript
interface BusinessCardScan {
  id: string;
  originalImageUrl: string;
  processedImageUrl?: string;
  scanMethod: "upload" | "camera" | "batch";
  imageFormat: "jpeg" | "png" | "pdf";
  imageSizeBytes: number;
  imageDimensions: { width: number; height: number };
  scanStatus: "pending" | "processing" | "completed" | "failed";
  processingStartTime?: Date;
  processingEndTime?: Date;
  processingDurationMs?: number;
  customerId?: string;
  scannedBy?: string;
  scanLocation?: string;
  deviceInfo?: DeviceInfo;
  ocrResult?: OCRResult;
  extractedData?: ExtractedCustomerData;
  createdAt: Date;
  updatedAt: Date;
}

interface OCRResult {
  id: string;
  businessCardScanId: string;
  ocrProvider: "google_vision" | "aws_textract" | "azure_cognitive";
  rawOcrResponse: any;
  extractedText: string;
  confidenceScore: number;
  detectedLanguage: string;
  textBlocks: TextBlock[];
  processingTimeMs: number;
  apiCostCents: number;
}

interface ExtractedCustomerData {
  id: string;
  businessCardScanId: string;
  extractionMethod: "regex" | "nlp" | "manual";
  extractedName?: string;
  extractedNameKana?: string;
  extractedCompany?: string;
  extractedDepartment?: string;
  extractedPosition?: string;
  extractedPhone?: string;
  extractedEmail?: string;
  extractedAddress?: string;
  extractedWebsite?: string;
  extractionConfidence: { [field: string]: number };
  validationResults: ValidationResult;
  suggestedCorrections?: CorrectionSuggestions;
  isManuallycorrected: boolean;
  manualCorrections?: ManualCorrections;
}

interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  language?: string;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

interface ScanAccuracyLog {
  id: string;
  businessCardScanId: string;
  fieldName: string;
  extractedValue?: string;
  correctedValue?: string;
  isCorrect: boolean;
  correctionType: "none" | "minor" | "major" | "complete";
  accuracyScore: number;
  errorCategory: string;
  feedbackProvidedBy?: string;
}

interface ScanOptions {
  ocrProvider?: string;
  imageEnhancement: boolean;
  autoCorrection: boolean;
  duplicateCheck: boolean;
  templateMatching: boolean;
}

interface ProcessingHints {
  expectedLanguage?: string;
  cardOrientation?: "portrait" | "landscape";
  textDensity?: "low" | "medium" | "high";
  companyName?: string;
}
```

## Error Handling

### Image Processing Errors

1. **画像品質問題**
   - 解像度不足の検出・警告
   - ブレ・ボケの検出・補正提案
   - 照明不良の検出・調整提案

2. **フォーマット問題**
   - 非対応フォーマットの検出
   - ファイルサイズ制限の確認
   - 破損ファイルの検出

3. **名刺検出エラー**
   - 名刺が検出されない場合の処理
   - 複数名刺の分離エラー
   - 背景ノイズの除去失敗

### OCR Processing Errors

1. **API エラー**
   - 外部OCRサービスの障害対応
   - レート制限の処理
   - 認証エラーの処理

2. **認識精度問題**
   - 低信頼度結果の処理
   - 文字化けの検出・修正
   - 言語混在の処理

### Data Extraction Errors

1. **抽出失敗**
   - 必須項目の抽出失敗
   - フォーマット不正の処理
   - 重複データの検出

2. **バリデーションエラー**
   - 電話番号フォーマットエラー
   - メールアドレス形式エラー
   - 会社名の妥当性チェック

## Testing Strategy

### Unit Tests

1. **画像処理**
   - 各種画像フォーマットの処理テスト
   - 画像補正機能のテスト
   - 名刺検出精度のテスト

2. **OCR処理**
   - 各OCRプロバイダーのテスト
   - 言語別認識精度のテスト
   - エラーハンドリングのテスト

3. **データ抽出**
   - 正規表現パターンのテスト
   - バリデーション機能のテスト
   - 修正提案機能のテスト

### Integration Tests

1. **エンドツーエンドテスト**
   - 画像アップロードから顧客登録まで
   - モバイルカメラ撮影フロー
   - エラー回復フロー

2. **外部サービス連携**
   - OCR APIとの連携テスト
   - 画像ストレージとの連携テスト
   - 顧客データベースとの連携テスト

### Performance Tests

1. **処理速度**
   - 大容量画像の処理時間
   - 同時処理の負荷テスト
   - OCR API応答時間の測定

2. **精度テスト**
   - 様々な名刺デザインでの精度測定
   - 言語別・項目別精度の測定
   - 改善効果の測定

## Security Considerations

### Data Protection

1. **画像データの保護**
   - 画像ファイルの暗号化保存
   - アクセス制御の実装
   - 自動削除機能の実装

2. **個人情報の保護**
   - 抽出データの暗号化
   - アクセスログの記録
   - データ匿名化機能

### External API Security

1. **OCR API連携**
   - API キーの安全な管理
   - データ送信時の暗号化
   - プロバイダー別セキュリティ設定

2. **画像ストレージ**
   - S3バケットのセキュリティ設定
   - 署名付きURLの使用
   - アクセス期限の設定

## Performance Optimization

### Image Processing Optimization

1. **画像サイズ最適化**
   - 自動リサイズ機能
   - 圧縮率の最適化
   - フォーマット変換

2. **処理速度向上**
   - 並列処理の実装
   - キャッシュ機能の活用
   - 段階的処理の実装

### OCR Processing Optimization

1. **API利用最適化**
   - プロバイダー選択の最適化
   - バッチ処理の活用
   - コスト効率の向上

2. **結果キャッシュ**
   - 同一画像の結果キャッシュ
   - 部分結果の再利用
   - 学習データの蓄積

### UI Performance

1. **モバイル最適化**
   - カメラプレビューの最適化
   - 画像アップロードの最適化
   - オフライン対応

2. **レスポンシブデザイン**
   - 画面サイズ別最適化
   - タッチ操作の最適化
   - 処理状況の可視化

## Machine Learning Integration

### OCR精度向上

1. **カスタムモデル**
   - 名刺特化型OCRモデル
   - 日本語名刺の最適化
   - 継続学習機能

2. **後処理改善**
   - 抽出結果の自動修正
   - パターン学習による改善
   - ユーザーフィードバックの活用

### データ抽出改善

1. **NLP活用**
   - 固有表現抽出
   - 文脈理解による精度向上
   - 多言語対応の強化

2. **学習機能**
   - ユーザー修正の学習
   - 企業データベースとの照合学習
   - 精度向上の自動化
