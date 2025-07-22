-- ボトルキープテーブル  
CREATE TABLE bottle_keeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
  opened_date DATE NOT NULL,
  expiry_date DATE,
  remaining_amount DECIMAL(3,2) DEFAULT 1.0 CHECK (remaining_amount >= 0.0 AND remaining_amount <= 1.0),
  bottle_number VARCHAR(20) UNIQUE,
  storage_location VARCHAR(50),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ボトルキープ使用履歴テーブル
CREATE TABLE bottle_keep_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_keep_id UUID REFERENCES bottle_keeps(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  amount_used DECIMAL(3,2) NOT NULL CHECK (amount_used > 0.0 AND amount_used <= 1.0),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX idx_bottle_keeps_customer ON bottle_keeps(customer_id, status);
CREATE INDEX idx_bottle_keeps_expiry ON bottle_keeps(expiry_date) WHERE status = 'active';
CREATE INDEX idx_bottle_keep_usage_bottle ON bottle_keep_usage(bottle_keep_id);

-- RLS設定
ALTER TABLE bottle_keeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_keep_usage ENABLE ROW LEVEL SECURITY;

-- ボトルキープ: 全スタッフがアクセス可能（顧客情報と連動）
CREATE POLICY "bottle_keeps_policy" ON bottle_keeps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs 
      WHERE staffs.user_id = auth.uid() 
      AND staffs.is_active = true
    )
  );

CREATE POLICY "bottle_keep_usage_policy" ON bottle_keep_usage
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs 
      WHERE staffs.user_id = auth.uid() 
      AND staffs.is_active = true
    )
  );

-- トリガー: updated_at自動更新
CREATE OR REPLACE FUNCTION update_bottle_keeps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bottle_keeps_updated_at
  BEFORE UPDATE ON bottle_keeps
  FOR EACH ROW
  EXECUTE FUNCTION update_bottle_keeps_updated_at();