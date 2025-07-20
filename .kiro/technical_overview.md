# 技術アーキテクチャ概要

## 🏗️ 現在のシステム構成

### フロントエンド
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + TypeScript
- **Styling**: Tailwind CSS  
- **State**: Zustand + React Context
- **Forms**: React Hook Form + Zod validation

### バックエンド
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RLS
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime (WebSocket)

### 開発・品質管理
- **Testing**: Vitest + Playwright
- **Code Quality**: ESLint + Prettier + Husky
- **CI/CD**: Vercel deployment
- **Development**: TDD approach

## 📊 実装済みサービス

### 認証・認可システム
```typescript
AuthService
├── login/logout
├── role-based access control  
├── protected routes
└── session management
```

### ビジネスロジック層
```typescript
Services/
├── StaffService      ✅ 完了
├── CustomerService   ✅ 完了  
├── ReservationService ✅ 完了
├── TableService      ✅ 完了
├── CastService       ✅ 完了
├── BillingService    ✅ 完了
├── AttendanceService ✅ 完了
├── InventoryService  ❌ 未実装
├── BottleKeepService ❌ 未実装
├── ComplianceService ❌ 未実装
└── QRCodeService     ❌ 未実装
```

### UI コンポーネント
```typescript
Components/
├── auth/             ✅ 完了
├── staff/            ✅ 完了
├── customers/        ✅ 完了  
├── reservation/      ✅ 完了
├── table/            🔄 部分実装
├── cast/             ✅ 完了
├── attendance/       ✅ 完了
├── inventory/        ❌ 未実装
├── bottle-keep/      ❌ 未実装
└── compliance/       ❌ 未実装
```

## 🔧 必要な技術実装

### 1. リアルタイム機能強化

#### Supabase Realtime活用
```typescript
// 実装予定: リアルタイム席状況更新
const useRealtimeTableStatus = () => {
  useEffect(() => {
    const subscription = supabase
      .channel('table-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tables'
      }, (payload) => {
        // リアルタイム席状況更新
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);
};
```

### 2. QRコード機能

#### 必要ライブラリ
```json
{
  "dependencies": {
    "qrcode": "^1.5.3",
    "qr-scanner": "^1.4.2"
  }
}
```

#### QRコード生成・読み取り
```typescript
// QRコード生成
const generateStaffQR = (staffId: string) => {
  const qrData = {
    staffId,
    timestamp: Date.now(),
    signature: generateSignature(staffId)
  };
  return QRCode.toDataURL(JSON.stringify(qrData));
};

// QRコード読み取り
const scanQRCode = async (imageData: string) => {
  const result = await QrScanner.scanImage(imageData);
  const qrData = JSON.parse(result);
  return validateAndProcess(qrData);
};
```

### 3. カメラアクセス

#### ブラウザAPI活用
```typescript
// カメラアクセス (勤怠打刻用)
const useCameraAccess = () => {
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    return stream;
  };

  const captureImage = (video: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0);
    return canvas.toDataURL();
  };
};
```

### 4. 画像処理・OCR

#### 身分証確認用OCR
```typescript
// 実装予定: Tesseract.js等でOCR
import Tesseract from 'tesseract.js';

const extractIdInfo = async (imageFile: File) => {
  const { data: { text } } = await Tesseract.recognize(imageFile, 'jpn');
  
  // 生年月日抽出ロジック
  const birthDateMatch = text.match(/\d{4}[年\/]\d{1,2}[月\/]\d{1,2}/);
  
  return {
    birthDate: parseBirthDate(birthDateMatch?.[0]),
    extractedText: text
  };
};
```

## 🗄️ データベーススキーマ拡張

### 在庫管理テーブル
```sql
-- 商品マスタ (既存のproductsテーブル拡張)
ALTER TABLE products ADD COLUMN category VARCHAR(50);
ALTER TABLE products ADD COLUMN supplier_info JSONB;
ALTER TABLE products ADD COLUMN reorder_point INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN max_stock INTEGER DEFAULT 100;

-- 在庫変動履歴
CREATE TABLE inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  movement_type VARCHAR(20), -- 'in', 'out', 'adjustment'
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  reason VARCHAR(100),
  reference_id UUID, -- 注文ID等の参照
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ボトルキープテーブル  
```sql
CREATE TABLE bottle_keeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  product_id INTEGER REFERENCES products(id),
  opened_date DATE NOT NULL,
  expiry_date DATE,
  remaining_amount DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  bottle_number VARCHAR(20) UNIQUE,
  storage_location VARCHAR(50),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active', -- active, consumed, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 法令対応テーブル
```sql
-- 身分証確認記録
CREATE TABLE id_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  id_type VARCHAR(20), -- 'license', 'passport', 'mynumber'
  id_image_url TEXT, -- Supabase Storageのファイルパス
  birth_date DATE,
  verification_date TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES staffs(id),
  ocr_result JSONB, -- OCR抽出データ
  is_verified BOOLEAN DEFAULT false
);

-- 法定帳簿出力履歴
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50), -- 'employee_list', 'complaint_log'
  generated_by UUID REFERENCES staffs(id),
  file_path TEXT,
  period_start DATE,
  period_end DATE,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔐 セキュリティ考慮事項

### RLS (Row Level Security) 拡張
```sql
-- 在庫管理: admin/manager のみアクセス可能
CREATE POLICY "inventory_policy" ON inventory_movements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs 
      WHERE staffs.user_id = auth.uid() 
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- 身分証情報: 暗号化 + 管理者限定
CREATE POLICY "id_verification_policy" ON id_verifications
  FOR ALL TO authenticated  
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );
```

### 画像ファイル暗号化
```typescript
// Supabase Storage bucket設定
const createSecureBucket = async () => {
  await supabase.storage.createBucket('id-documents', {
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    fileSizeLimit: 10 * 1024 * 1024 // 10MB
  });

  // RLS設定: マネージャー以上のみアクセス
  await supabase.storage.from('id-documents')
    .createSignedUrl('path', 3600); // 1時間有効
};
```

## 📈 パフォーマンス最適化

### 1. データベースインデックス
```sql
-- 在庫検索用インデックス
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_inventory_movements_product_date 
  ON inventory_movements(product_id, created_at);

-- ボトルキープ検索用インデックス  
CREATE INDEX idx_bottle_keeps_customer 
  ON bottle_keeps(customer_id, status);
```

### 2. リアルタイム最適化
```typescript
// 効率的なSubscription管理
const useOptimizedRealtime = () => {
  useEffect(() => {
    // 必要な変更のみSubscribe
    const subscription = supabase
      .channel('essential-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public', 
        table: 'tables',
        filter: 'current_status=neq.available'
      }, handleTableUpdate)
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);
};
```

## 🚀 デプロイメント戦略

### 段階的リリース計画
1. **在庫管理** → 内部テスト → 本番リリース
2. **ボトルキープ** → 小規模テスト → 段階展開  
3. **QRコード打刻** → パイロット導入 → 全面展開
4. **法令対応** → 法務確認 → 正式運用

### 環境分離
- **Development**: 開発・テスト用
- **Staging**: 本番データでの最終確認
- **Production**: 本番環境