-- 給与計算ルールテーブル
CREATE TABLE payroll_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_hourly_rate INTEGER NOT NULL DEFAULT 0,
    base_back_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL,
    effective_until DATE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 指名種別テーブル
CREATE TABLE nomination_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    back_percentage DECIMAL(5,2) NOT NULL,
    priority_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 売上スライドテーブル
CREATE TABLE sales_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_rule_id UUID NOT NULL REFERENCES payroll_rules(id) ON DELETE CASCADE,
    tier_name VARCHAR(50) NOT NULL,
    min_sales_amount INTEGER NOT NULL,
    max_sales_amount INTEGER,
    back_percentage DECIMAL(5,2) NOT NULL,
    bonus_amount INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 項目別バック率テーブル
CREATE TABLE item_back_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_rule_id UUID NOT NULL REFERENCES payroll_rules(id) ON DELETE CASCADE,
    item_category VARCHAR(50) NOT NULL,
    back_percentage DECIMAL(5,2) NOT NULL,
    min_guarantee_amount INTEGER DEFAULT 0,
    max_limit_amount INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ホステス給与ルール割り当てテーブル
CREATE TABLE hostess_payroll_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostess_id UUID NOT NULL REFERENCES casts_profile(id) ON DELETE CASCADE,
    payroll_rule_id UUID NOT NULL REFERENCES payroll_rules(id) ON DELETE CASCADE,
    assigned_from DATE NOT NULL,
    assigned_until DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(hostess_id, assigned_from)
);

-- 給与計算結果テーブル
CREATE TABLE payroll_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostess_id UUID NOT NULL REFERENCES casts_profile(id),
    calculation_period_start DATE NOT NULL,
    calculation_period_end DATE NOT NULL,
    payroll_rule_id UUID NOT NULL REFERENCES payroll_rules(id),
    base_salary INTEGER NOT NULL DEFAULT 0,
    total_back_amount INTEGER NOT NULL DEFAULT 0,
    total_bonus_amount INTEGER NOT NULL DEFAULT 0,
    total_deductions INTEGER NOT NULL DEFAULT 0,
    gross_amount INTEGER NOT NULL DEFAULT 0,
    net_amount INTEGER NOT NULL DEFAULT 0,
    calculation_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    calculated_by UUID REFERENCES staffs(id),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(hostess_id, calculation_period_start, calculation_period_end)
);

-- 給与計算詳細テーブル
CREATE TABLE payroll_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_calculation_id UUID NOT NULL REFERENCES payroll_calculations(id) ON DELETE CASCADE,
    detail_type VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    base_amount INTEGER NOT NULL DEFAULT 0,
    rate_percentage DECIMAL(5,2),
    calculated_amount INTEGER NOT NULL DEFAULT 0,
    source_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 既存のorder_itemsテーブルへの指名種別追加
ALTER TABLE order_items 
ADD COLUMN nomination_type_id UUID REFERENCES nomination_types(id),
ADD COLUMN nomination_fee INTEGER DEFAULT 0;

-- インデックスの作成
CREATE INDEX idx_payroll_rules_active ON payroll_rules(is_active, effective_from, effective_until);
CREATE INDEX idx_nomination_types_active ON nomination_types(is_active);
CREATE INDEX idx_sales_tiers_rule ON sales_tiers(payroll_rule_id);
CREATE INDEX idx_item_back_rates_rule ON item_back_rates(payroll_rule_id);
CREATE INDEX idx_hostess_payroll_rules_hostess ON hostess_payroll_rules(hostess_id, is_active);
CREATE INDEX idx_hostess_payroll_rules_rule ON hostess_payroll_rules(payroll_rule_id);
CREATE INDEX idx_payroll_calculations_hostess ON payroll_calculations(hostess_id, calculation_period_start, calculation_period_end);
CREATE INDEX idx_payroll_calculations_status ON payroll_calculations(calculation_status);
CREATE INDEX idx_payroll_details_calculation ON payroll_details(payroll_calculation_id);
CREATE INDEX idx_order_items_nomination ON order_items(nomination_type_id);

-- トリガー関数の作成（更新日時の自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
CREATE TRIGGER update_payroll_rules_updated_at BEFORE UPDATE ON payroll_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_calculations_updated_at BEFORE UPDATE ON payroll_calculations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシーの設定
ALTER TABLE payroll_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomination_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_back_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostess_payroll_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_details ENABLE ROW LEVEL SECURITY;

-- スタッフ（経理・管理者）のみアクセス可能なポリシー
CREATE POLICY "Staff can view payroll rules" ON payroll_rules
    FOR SELECT USING (auth.uid() IN (SELECT id FROM staffs));

CREATE POLICY "Staff can manage payroll rules" ON payroll_rules
    FOR ALL USING (auth.uid() IN (SELECT id FROM staffs WHERE role IN ('admin', 'manager')));

CREATE POLICY "Staff can view nomination types" ON nomination_types
    FOR SELECT USING (auth.uid() IN (SELECT id FROM staffs));

CREATE POLICY "Staff can manage nomination types" ON nomination_types
    FOR ALL USING (auth.uid() IN (SELECT id FROM staffs WHERE role IN ('admin', 'manager')));

CREATE POLICY "Staff can view sales tiers" ON sales_tiers
    FOR SELECT USING (auth.uid() IN (SELECT id FROM staffs));

CREATE POLICY "Staff can manage sales tiers" ON sales_tiers
    FOR ALL USING (auth.uid() IN (SELECT id FROM staffs WHERE role IN ('admin', 'manager')));

CREATE POLICY "Staff can view item back rates" ON item_back_rates
    FOR SELECT USING (auth.uid() IN (SELECT id FROM staffs));

CREATE POLICY "Staff can manage item back rates" ON item_back_rates
    FOR ALL USING (auth.uid() IN (SELECT id FROM staffs WHERE role IN ('admin', 'manager')));

CREATE POLICY "Staff can view hostess payroll rules" ON hostess_payroll_rules
    FOR SELECT USING (auth.uid() IN (SELECT id FROM staffs));

CREATE POLICY "Staff can manage hostess payroll rules" ON hostess_payroll_rules
    FOR ALL USING (auth.uid() IN (SELECT id FROM staffs WHERE role IN ('admin', 'manager')));

-- 給与計算結果のアクセス制御（キャストは自分のデータのみ閲覧可能）
CREATE POLICY "Staff can view all payroll calculations" ON payroll_calculations
    FOR SELECT USING (auth.uid() IN (SELECT id FROM staffs));

CREATE POLICY "Cast can view own payroll calculations" ON payroll_calculations
    FOR SELECT USING (auth.uid() = hostess_id);

CREATE POLICY "Staff can manage payroll calculations" ON payroll_calculations
    FOR ALL USING (auth.uid() IN (SELECT id FROM staffs WHERE role IN ('admin', 'manager')));

CREATE POLICY "Staff can view all payroll details" ON payroll_details
    FOR SELECT USING (auth.uid() IN (SELECT id FROM staffs));

CREATE POLICY "Cast can view own payroll details" ON payroll_details
    FOR SELECT USING (
        auth.uid() IN (
            SELECT pc.hostess_id 
            FROM payroll_calculations pc 
            WHERE pc.id = payroll_details.payroll_calculation_id
        )
    );

CREATE POLICY "Staff can manage payroll details" ON payroll_details
    FOR ALL USING (auth.uid() IN (SELECT id FROM staffs WHERE role IN ('admin', 'manager')));