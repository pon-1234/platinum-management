-- =====================================================
-- Visit Session中心のデータモデル再設計
-- テーブル紐付けから訪問セッション中心へ移行
-- =====================================================

-- 1. visit_sessions（訪問セッション）テーブル
-- visitsテーブルを拡張して訪問セッション管理を強化
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS session_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS primary_customer_id UUID REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS is_group_visit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS merged_from_visit_id UUID REFERENCES visits(id),
ADD COLUMN IF NOT EXISTS merged_to_visit_id UUID REFERENCES visits(id);

-- セッションコードのインデックス
CREATE INDEX IF NOT EXISTS idx_visits_session_code ON visits(session_code);
CREATE INDEX IF NOT EXISTS idx_visits_merged_visits ON visits(merged_from_visit_id, merged_to_visit_id);

-- 2. visit_table_segments（テーブル配席の時間区間）
CREATE TABLE IF NOT EXISTS visit_table_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES tables(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    seat_numbers INTEGER[] DEFAULT '{}',
    reason VARCHAR(50), -- 'initial', 'move', 'merge', 'split'
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 同一テーブルの時間重複を防ぐ
    CONSTRAINT no_table_time_overlap EXCLUDE USING gist (
        table_id WITH =,
        tstzrange(started_at, COALESCE(ended_at, 'infinity'::timestamptz)) WITH &&
    ) WHERE (ended_at IS NULL OR ended_at > started_at)
);

-- インデックス
CREATE INDEX idx_visit_table_segments_visit_id ON visit_table_segments(visit_id);
CREATE INDEX idx_visit_table_segments_table_id ON visit_table_segments(table_id);
CREATE INDEX idx_visit_table_segments_time_range ON visit_table_segments USING gist(tstzrange(started_at, ended_at));

-- 3. cast_engagements（キャスト着席の時間区間）
CREATE TABLE IF NOT EXISTS cast_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    cast_id UUID NOT NULL REFERENCES casts_profile(id),
    role VARCHAR(50) NOT NULL, -- 'primary', 'inhouse', 'help', 'douhan', 'after'
    nomination_type_id UUID REFERENCES nomination_types(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    fee_amount INTEGER DEFAULT 0,
    back_percentage DECIMAL(5, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 同一キャストの時間重複を防ぐ
    CONSTRAINT no_cast_time_overlap EXCLUDE USING gist (
        cast_id WITH =,
        tstzrange(started_at, COALESCE(ended_at, 'infinity'::timestamptz)) WITH &&
    ) WHERE (is_active = true)
);

-- インデックス
CREATE INDEX idx_cast_engagements_visit_id ON cast_engagements(visit_id);
CREATE INDEX idx_cast_engagements_cast_id ON cast_engagements(cast_id);
CREATE INDEX idx_cast_engagements_role ON cast_engagements(role);
CREATE INDEX idx_cast_engagements_time_range ON cast_engagements USING gist(tstzrange(started_at, ended_at));
CREATE INDEX idx_cast_engagements_active ON cast_engagements(is_active) WHERE is_active = true;

-- 4. bill_item_attributions（明細ごとの売上寄与）
CREATE TABLE IF NOT EXISTS bill_item_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    cast_id UUID NOT NULL REFERENCES casts_profile(id),
    attribution_percentage DECIMAL(5, 2) NOT NULL CHECK (attribution_percentage >= 0 AND attribution_percentage <= 100),
    attribution_amount INTEGER NOT NULL DEFAULT 0,
    attribution_type VARCHAR(50) NOT NULL, -- 'nomination', 'drink_for_cast', 'time_share', 'manual'
    reason TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(order_item_id, cast_id, attribution_type)
);

-- インデックス
CREATE INDEX idx_bill_item_attributions_order_item ON bill_item_attributions(order_item_id);
CREATE INDEX idx_bill_item_attributions_cast ON bill_item_attributions(cast_id);
CREATE INDEX idx_bill_item_attributions_type ON bill_item_attributions(attribution_type);

-- 5. visit_nominations（訪問中の指名イベント）
CREATE TABLE IF NOT EXISTS visit_nominations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    cast_id UUID NOT NULL REFERENCES casts_profile(id),
    nomination_type_id UUID NOT NULL REFERENCES nomination_types(id),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fee_amount INTEGER NOT NULL DEFAULT 0,
    back_amount INTEGER NOT NULL DEFAULT 0,
    is_paid BOOLEAN DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_visit_nominations_visit ON visit_nominations(visit_id);
CREATE INDEX idx_visit_nominations_cast ON visit_nominations(cast_id);
CREATE INDEX idx_visit_nominations_type ON visit_nominations(nomination_type_id);
CREATE INDEX idx_visit_nominations_occurred ON visit_nominations(occurred_at);

-- 6. 既存のvisit_cast_assignmentsからデータ移行
INSERT INTO cast_engagements (
    visit_id,
    cast_id,
    role,
    nomination_type_id,
    started_at,
    ended_at,
    is_active,
    notes,
    created_by,
    created_at
)
SELECT 
    vca.visit_id,
    vca.cast_id,
    CASE 
        WHEN vca.is_primary THEN 'primary'
        WHEN nt.type_name = 'help' THEN 'help'
        WHEN nt.type_name = 'dohan' THEN 'douhan'
        WHEN nt.type_name = 'after' THEN 'after'
        ELSE 'inhouse'
    END as role,
    vca.nomination_type_id,
    vca.assigned_at as started_at,
    vca.ended_at,
    CASE WHEN vca.ended_at IS NULL THEN true ELSE false END as is_active,
    vca.notes,
    vca.created_by,
    vca.created_at
FROM visit_cast_assignments vca
LEFT JOIN nomination_types nt ON nt.id = vca.nomination_type_id
WHERE NOT EXISTS (
    SELECT 1 FROM cast_engagements ce 
    WHERE ce.visit_id = vca.visit_id 
    AND ce.cast_id = vca.cast_id
);

-- 7. 関数：自動アトリビューション計算
CREATE OR REPLACE FUNCTION calculate_auto_attribution(
    p_order_item_id UUID,
    p_visit_id UUID
) RETURNS void AS $$
DECLARE
    v_item RECORD;
    v_engagement RECORD;
    v_total_weight DECIMAL;
    v_attribution_pct DECIMAL;
BEGIN
    -- 注文明細の情報取得
    SELECT * INTO v_item FROM order_items WHERE id = p_order_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
    END IF;
    
    -- 既存のアトリビューションを削除
    DELETE FROM bill_item_attributions 
    WHERE order_item_id = p_order_item_id 
    AND attribution_type = 'auto';
    
    -- アクティブなキャスト着席を取得
    FOR v_engagement IN
        SELECT 
            ce.*,
            CASE ce.role
                WHEN 'primary' THEN 70
                WHEN 'inhouse' THEN 50
                WHEN 'help' THEN 30
                WHEN 'douhan' THEN 60
                WHEN 'after' THEN 40
                ELSE 20
            END as weight
        FROM cast_engagements ce
        WHERE ce.visit_id = p_visit_id
        AND ce.is_active = true
    LOOP
        -- 重み付けされた割合を計算
        SELECT SUM(
            CASE role
                WHEN 'primary' THEN 70
                WHEN 'inhouse' THEN 50
                WHEN 'help' THEN 30
                WHEN 'douhan' THEN 60
                WHEN 'after' THEN 40
                ELSE 20
            END
        ) INTO v_total_weight
        FROM cast_engagements
        WHERE visit_id = p_visit_id
        AND is_active = true;
        
        IF v_total_weight > 0 THEN
            v_attribution_pct := (v_engagement.weight::DECIMAL / v_total_weight) * 100;
            
            -- アトリビューションを挿入
            INSERT INTO bill_item_attributions (
                order_item_id,
                cast_id,
                attribution_percentage,
                attribution_amount,
                attribution_type,
                reason,
                is_primary
            ) VALUES (
                p_order_item_id,
                v_engagement.cast_id,
                v_attribution_pct,
                ROUND((v_item.total_amount * v_attribution_pct / 100)::numeric)::integer,
                'auto',
                'Automatic attribution based on engagement role',
                v_engagement.role = 'primary'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. 関数：テーブル移動
CREATE OR REPLACE FUNCTION move_visit_table(
    p_visit_id UUID,
    p_from_table_id INTEGER,
    p_to_table_id INTEGER,
    p_reason VARCHAR DEFAULT 'move'
) RETURNS void AS $$
BEGIN
    -- 現在のセグメントを終了
    UPDATE visit_table_segments
    SET ended_at = now(),
        updated_at = now()
    WHERE visit_id = p_visit_id
    AND table_id = p_from_table_id
    AND ended_at IS NULL;
    
    -- 新しいセグメントを開始
    INSERT INTO visit_table_segments (
        visit_id,
        table_id,
        started_at,
        reason
    ) VALUES (
        p_visit_id,
        p_to_table_id,
        now(),
        p_reason
    );
    
    -- visitsテーブルも更新
    UPDATE visits
    SET table_id = p_to_table_id,
        updated_at = now()
    WHERE id = p_visit_id;
END;
$$ LANGUAGE plpgsql;

-- 9. ビュー：給与計算用ファクト
CREATE OR REPLACE VIEW payroll_revenue_facts AS
SELECT 
    DATE(oi.created_at) as work_date,
    bia.cast_id,
    cp.stage_name as cast_name,
    oi.product_id,
    p.name as product_name,
    p.category as product_category,
    bia.attribution_amount,
    bia.attribution_percentage,
    bia.attribution_type,
    ce.role as engagement_role,
    nt.display_name as nomination_type,
    nt.back_rate,
    v.id as visit_id,
    v.session_code,
    oi.id as order_item_id
FROM bill_item_attributions bia
JOIN order_items oi ON oi.id = bia.order_item_id
JOIN products p ON p.id = oi.product_id
JOIN casts_profile cp ON cp.id = bia.cast_id
JOIN visits v ON v.id = oi.visit_id
LEFT JOIN cast_engagements ce ON ce.visit_id = v.id AND ce.cast_id = bia.cast_id AND ce.is_active = true
LEFT JOIN nomination_types nt ON nt.id = ce.nomination_type_id
WHERE oi.status != 'cancelled';

-- 10. トリガー：アトリビューション合計チェック
CREATE OR REPLACE FUNCTION check_attribution_total() RETURNS TRIGGER AS $$
DECLARE
    v_total DECIMAL;
BEGIN
    SELECT SUM(attribution_percentage) INTO v_total
    FROM bill_item_attributions
    WHERE order_item_id = NEW.order_item_id;
    
    IF v_total > 100.01 THEN  -- 0.01%の誤差を許容
        RAISE EXCEPTION 'Attribution total exceeds 100%% for order item %', NEW.order_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_attribution_total_trigger
AFTER INSERT OR UPDATE ON bill_item_attributions
FOR EACH ROW
EXECUTE FUNCTION check_attribution_total();

-- 11. RLS設定
ALTER TABLE visit_table_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cast_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_item_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_nominations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "visit_table_segments_select" ON visit_table_segments FOR SELECT USING (true);
CREATE POLICY "visit_table_segments_insert" ON visit_table_segments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "visit_table_segments_update" ON visit_table_segments FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "cast_engagements_select" ON cast_engagements FOR SELECT USING (true);
CREATE POLICY "cast_engagements_insert" ON cast_engagements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cast_engagements_update" ON cast_engagements FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "bill_item_attributions_select" ON bill_item_attributions FOR SELECT USING (true);
CREATE POLICY "bill_item_attributions_insert" ON bill_item_attributions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bill_item_attributions_update" ON bill_item_attributions FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "visit_nominations_select" ON visit_nominations FOR SELECT USING (true);
CREATE POLICY "visit_nominations_insert" ON visit_nominations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "visit_nominations_update" ON visit_nominations FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 12. 権限付与
GRANT ALL ON visit_table_segments TO authenticated;
GRANT ALL ON cast_engagements TO authenticated;
GRANT ALL ON bill_item_attributions TO authenticated;
GRANT ALL ON visit_nominations TO authenticated;
GRANT SELECT ON payroll_revenue_facts TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_auto_attribution(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION move_visit_table(UUID, INTEGER, INTEGER, VARCHAR) TO authenticated;

-- =====================================================
-- 注意事項:
-- 1. btree_gist拡張が必要（EXCLUDE制約のため）
-- 2. 既存のvisit_cast_assignmentsからデータ移行済み
-- 3. 給与計算はpayroll_revenue_factsビューから集計
-- =====================================================