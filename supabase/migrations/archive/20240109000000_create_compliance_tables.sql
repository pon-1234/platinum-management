-- 身分証確認記録テーブル
CREATE TABLE id_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  id_type VARCHAR(20) NOT NULL CHECK (id_type IN ('license', 'passport', 'mynumber', 'residence_card')),
  id_image_url TEXT, -- Supabase Storageのファイルパス
  birth_date DATE,
  verification_date TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES staffs(id),
  ocr_result JSONB, -- OCR抽出データ
  is_verified BOOLEAN DEFAULT false,
  expiry_date DATE, -- 身分証の有効期限
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 法定帳簿出力履歴テーブル
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('employee_list', 'complaint_log', 'business_report', 'tax_report')),
  generated_by UUID REFERENCES staffs(id),
  file_path TEXT,
  period_start DATE,
  period_end DATE,
  status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'submitted', 'approved')),
  notes TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QRコード管理テーブル（勤怠打刻用）
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staffs(id) ON DELETE CASCADE,
  qr_data TEXT NOT NULL,
  signature TEXT NOT NULL, -- セキュリティ署名
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR打刻履歴テーブル
CREATE TABLE qr_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staffs(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  location_data JSONB, -- GPS座標等の位置情報
  device_info JSONB, -- デバイス情報
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX idx_id_verifications_customer ON id_verifications(customer_id);
CREATE INDEX idx_id_verifications_verified_by ON id_verifications(verified_by, verification_date);
CREATE INDEX idx_compliance_reports_type_date ON compliance_reports(report_type, generated_at);
CREATE INDEX idx_qr_codes_staff_active ON qr_codes(staff_id, is_active, expires_at);
CREATE INDEX idx_qr_attendance_logs_staff_date ON qr_attendance_logs(staff_id, created_at);

-- RLS設定: 管理者限定
ALTER TABLE id_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_attendance_logs ENABLE ROW LEVEL SECURITY;

-- 身分証情報: 管理者限定
CREATE POLICY "id_verification_policy" ON id_verifications
  FOR ALL TO authenticated  
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- 法定帳簿: 管理者限定
CREATE POLICY "compliance_reports_policy" ON compliance_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- QRコード: 本人または管理者
CREATE POLICY "qr_codes_policy" ON qr_codes
  FOR ALL TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- QR打刻ログ: 本人または管理者
CREATE POLICY "qr_attendance_logs_policy" ON qr_attendance_logs
  FOR ALL TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- 自動更新トリガー
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_id_verifications_updated_at
  BEFORE UPDATE ON id_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();