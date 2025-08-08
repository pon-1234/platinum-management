-- =====================================================
-- キャスト紐付けシステムのリファクタリング
-- 注文単位から会計単位への変更
-- =====================================================

-- 1. nomination_types（指名種別マスター）テーブルの作成
-- 既存テーブルがある場合は列を追加
DO $$ 
BEGIN
    -- テーブルが存在しない場合は作成
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'nomination_types') THEN
        CREATE TABLE nomination_types (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type_name VARCHAR(50) NOT NULL UNIQUE,
            display_name VARCHAR(100) NOT NULL,
            price INTEGER NOT NULL DEFAULT 0,
            back_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
            priority INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    ELSE
        -- 既存テーブルに不足している列を追加
        ALTER TABLE nomination_types ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE nomination_types ADD COLUMN IF NOT EXISTS back_rate DECIMAL(5, 2) NOT NULL DEFAULT 0;
        ALTER TABLE nomination_types ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE nomination_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE nomination_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

-- nomination_typesのインデックス
CREATE INDEX IF NOT EXISTS idx_nomination_types_type_name ON nomination_types(type_name);
CREATE INDEX IF NOT EXISTS idx_nomination_types_is_active ON nomination_types(is_active);

-- nomination_typesのコメント（存在する列のみコメント追加）
DO $$
BEGIN
    COMMENT ON TABLE nomination_types IS '指名種別を管理するマスターテーブル';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nomination_types' AND column_name = 'type_name') THEN
        COMMENT ON COLUMN nomination_types.type_name IS 'システム内部で使用する指名種別識別子';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nomination_types' AND column_name = 'display_name') THEN
        COMMENT ON COLUMN nomination_types.display_name IS 'UI表示用の指名種別名';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nomination_types' AND column_name = 'price') THEN
        COMMENT ON COLUMN nomination_types.price IS 'この指名種別を選択した際に発生する料金';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nomination_types' AND column_name = 'back_rate') THEN
        COMMENT ON COLUMN nomination_types.back_rate IS 'キャストへのバック率（パーセンテージ）';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nomination_types' AND column_name = 'priority') THEN
        COMMENT ON COLUMN nomination_types.priority IS '表示順序（小さいほど優先）';
    END IF;
END $$;

-- 2. visit_cast_assignments（来店とキャストの紐付け）テーブルの作成
CREATE TABLE IF NOT EXISTS visit_cast_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    cast_id UUID NOT NULL REFERENCES casts_profile(id) ON DELETE CASCADE,
    nomination_type_id UUID NOT NULL REFERENCES nomination_types(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- 割り当てられた時間
    ended_at TIMESTAMPTZ, -- 席を離れた時間（場内指名などの時間計算用）
    is_primary BOOLEAN NOT NULL DEFAULT false, -- メインキャストかどうか
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(visit_id, cast_id, nomination_type_id) -- 同一の来店で同じキャストが同じ指名種別で重複しないように
);

-- visit_cast_assignmentsのインデックス
CREATE INDEX idx_visit_cast_assignments_visit_id ON visit_cast_assignments(visit_id);
CREATE INDEX idx_visit_cast_assignments_cast_id ON visit_cast_assignments(cast_id);
CREATE INDEX idx_visit_cast_assignments_nomination_type_id ON visit_cast_assignments(nomination_type_id);
CREATE INDEX idx_visit_cast_assignments_assigned_at ON visit_cast_assignments(assigned_at);
CREATE INDEX idx_visit_cast_assignments_is_primary ON visit_cast_assignments(is_primary);

-- visit_cast_assignmentsのコメント
COMMENT ON TABLE visit_cast_assignments IS '来店（会計）とキャストの指名関係を管理するテーブル';
COMMENT ON COLUMN visit_cast_assignments.visit_id IS '来店ID';
COMMENT ON COLUMN visit_cast_assignments.cast_id IS 'キャストID';
COMMENT ON COLUMN visit_cast_assignments.nomination_type_id IS '指名種別ID';
COMMENT ON COLUMN visit_cast_assignments.assigned_at IS '割り当て開始時間';
COMMENT ON COLUMN visit_cast_assignments.ended_at IS '割り当て終了時間（場内指名などの時間計算用）';
COMMENT ON COLUMN visit_cast_assignments.is_primary IS 'メインキャストフラグ';

-- 3. 初期データの投入（指名種別マスター）
-- 既存の列名を確認して適切にINSERT
DO $$
DECLARE
    has_back_rate BOOLEAN;
    has_back_percentage BOOLEAN;
BEGIN
    -- 列の存在を確認
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nomination_types' AND column_name = 'back_rate'
    ) INTO has_back_rate;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nomination_types' AND column_name = 'back_percentage'
    ) INTO has_back_percentage;
    
    -- 適切な列名でINSERT
    IF has_back_percentage THEN
        INSERT INTO nomination_types (type_name, display_name, price, back_percentage, priority) VALUES
            ('main_nomination', '本指名', 3000, 50.00, 1),
            ('in_store_nomination', '場内指名', 2000, 30.00, 2),
            ('dohan', '同伴', 5000, 60.00, 3),
            ('after', 'アフター', 0, 40.00, 4),
            ('help', 'ヘルプ', 0, 10.00, 5)
        ON CONFLICT (type_name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            price = EXCLUDED.price,
            back_percentage = EXCLUDED.back_percentage,
            priority = EXCLUDED.priority;
    ELSIF has_back_rate THEN
        INSERT INTO nomination_types (type_name, display_name, price, back_rate, priority) VALUES
            ('main_nomination', '本指名', 3000, 50.00, 1),
            ('in_store_nomination', '場内指名', 2000, 30.00, 2),
            ('dohan', '同伴', 5000, 60.00, 3),
            ('after', 'アフター', 0, 40.00, 4),
            ('help', 'ヘルプ', 0, 10.00, 5)
        ON CONFLICT (type_name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            price = EXCLUDED.price,
            back_rate = EXCLUDED.back_rate,
            priority = EXCLUDED.priority;
    END IF;
END $$;

-- 4. 既存のguest_cast_assignmentsからデータを移行
-- 注: guest_cast_assignmentsは複数ゲスト個別の紐付けだったが、
-- visit_cast_assignmentsは来店（会計）単位での紐付けに変更
INSERT INTO visit_cast_assignments (
    visit_id,
    cast_id,
    nomination_type_id,
    assigned_at,
    ended_at,
    is_primary,
    notes,
    created_by,
    created_at
)
SELECT DISTINCT ON (vg.visit_id, gca.cast_id, gca.assignment_type)
    vg.visit_id,
    gca.cast_id,
    nt.id as nomination_type_id,
    gca.start_time as assigned_at,
    gca.end_time as ended_at,
    gca.is_primary_assignment as is_primary,
    gca.notes,
    gca.created_by,
    gca.created_at
FROM guest_cast_assignments gca
JOIN visit_guests vg ON vg.id = gca.visit_guest_id
JOIN nomination_types nt ON 
    CASE gca.assignment_type
        WHEN 'shimei' THEN 'main_nomination'
        WHEN 'dohan' THEN 'dohan'
        WHEN 'after' THEN 'after'
        WHEN 'help' THEN 'help'
        ELSE 'in_store_nomination'
    END = nt.type_name
WHERE NOT EXISTS (
    SELECT 1 FROM visit_cast_assignments vca
    WHERE vca.visit_id = vg.visit_id
    AND vca.cast_id = gca.cast_id
    AND vca.nomination_type_id = nt.id
)
ORDER BY vg.visit_id, gca.cast_id, gca.assignment_type, gca.created_at;

-- 5. Row Level Security (RLS) の設定
ALTER TABLE nomination_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_cast_assignments ENABLE ROW LEVEL SECURITY;

-- nomination_typesのRLSポリシー
CREATE POLICY "nomination_types_select_policy" ON nomination_types
    FOR SELECT USING (true);

CREATE POLICY "nomination_types_insert_policy" ON nomination_types
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "nomination_types_update_policy" ON nomination_types
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "nomination_types_delete_policy" ON nomination_types
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- visit_cast_assignmentsのRLSポリシー
CREATE POLICY "visit_cast_assignments_select_policy" ON visit_cast_assignments
    FOR SELECT USING (true);

CREATE POLICY "visit_cast_assignments_insert_policy" ON visit_cast_assignments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "visit_cast_assignments_update_policy" ON visit_cast_assignments
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "visit_cast_assignments_delete_policy" ON visit_cast_assignments
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- 6. トリガーの作成（updated_atの自動更新）
CREATE TRIGGER update_nomination_types_updated_at BEFORE UPDATE ON nomination_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visit_cast_assignments_updated_at BEFORE UPDATE ON visit_cast_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 関数の作成：指名料の自動計算
CREATE OR REPLACE FUNCTION calculate_nomination_fees(p_visit_id UUID)
RETURNS TABLE (
    total_nomination_fee INTEGER,
    details JSONB
) AS $$
DECLARE
    v_total_fee INTEGER := 0;
    v_details JSONB := '[]'::JSONB;
    v_assignment RECORD;
BEGIN
    -- 各指名の料金を計算
    FOR v_assignment IN
        SELECT 
            vca.id,
            vca.cast_id,
            cp.stage_name as cast_name,
            nt.display_name as nomination_type,
            nt.price as fee
        FROM visit_cast_assignments vca
        JOIN nomination_types nt ON nt.id = vca.nomination_type_id
        JOIN casts_profile cp ON cp.id = vca.cast_id
        WHERE vca.visit_id = p_visit_id
        AND nt.is_active = true
    LOOP
        v_total_fee := v_total_fee + v_assignment.fee;
        v_details := v_details || jsonb_build_object(
            'cast_id', v_assignment.cast_id,
            'cast_name', v_assignment.cast_name,
            'nomination_type', v_assignment.nomination_type,
            'fee', v_assignment.fee
        );
    END LOOP;
    
    RETURN QUERY SELECT v_total_fee, v_details;
END;
$$ LANGUAGE plpgsql;

-- 8. 関数の作成：キャストの指名バック計算
CREATE OR REPLACE FUNCTION calculate_cast_nomination_back(
    p_cast_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_back_amount DECIMAL(10, 2),
    nomination_count INTEGER,
    details JSONB
) AS $$
DECLARE
    v_total_back DECIMAL(10, 2) := 0;
    v_count INTEGER := 0;
    v_details JSONB := '[]'::JSONB;
    v_assignment RECORD;
BEGIN
    -- 期間内の指名とバック金額を計算
    FOR v_assignment IN
        SELECT 
            vca.id,
            vca.visit_id,
            v.check_in_at as visit_date,
            nt.display_name as nomination_type,
            nt.price as nomination_fee,
            nt.back_rate,
            (nt.price * nt.back_rate / 100) as back_amount
        FROM visit_cast_assignments vca
        JOIN visits v ON v.id = vca.visit_id
        JOIN nomination_types nt ON nt.id = vca.nomination_type_id
        WHERE vca.cast_id = p_cast_id
        AND v.check_in_at::date >= p_start_date
        AND v.check_in_at::date <= p_end_date
        AND v.status = 'completed'
        AND nt.is_active = true
    LOOP
        v_total_back := v_total_back + v_assignment.back_amount;
        v_count := v_count + 1;
        v_details := v_details || jsonb_build_object(
            'visit_id', v_assignment.visit_id,
            'visit_date', v_assignment.visit_date,
            'nomination_type', v_assignment.nomination_type,
            'nomination_fee', v_assignment.nomination_fee,
            'back_rate', v_assignment.back_rate,
            'back_amount', v_assignment.back_amount
        );
    END LOOP;
    
    RETURN QUERY SELECT v_total_back, v_count, v_details;
END;
$$ LANGUAGE plpgsql;

-- 9. ビューの作成：来店ごとのキャスト割り当て状況
CREATE OR REPLACE VIEW visit_cast_summary AS
SELECT 
    v.id as visit_id,
    v.check_in_at as visit_date,
    v.table_id,
    v.status,
    COUNT(DISTINCT vca.cast_id) as assigned_cast_count,
    STRING_AGG(DISTINCT cp.stage_name || '(' || nt.display_name || ')', ', ') as cast_assignments,
    SUM(nt.price) as total_nomination_fee,
    JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'cast_id', vca.cast_id,
            'cast_name', cp.stage_name,
            'nomination_type', nt.display_name,
            'fee', nt.price,
            'is_primary', vca.is_primary
        ) ORDER BY vca.is_primary DESC, nt.priority
    ) as assignment_details
FROM visits v
LEFT JOIN visit_cast_assignments vca ON vca.visit_id = v.id
LEFT JOIN casts_profile cp ON cp.id = vca.cast_id
LEFT JOIN nomination_types nt ON nt.id = vca.nomination_type_id
GROUP BY v.id, v.check_in_at, v.table_id, v.status;

-- 10. 権限の付与
GRANT ALL ON nomination_types TO authenticated;
GRANT ALL ON visit_cast_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_nomination_fees(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_cast_nomination_back(UUID, DATE, DATE) TO authenticated;
GRANT SELECT ON visit_cast_summary TO authenticated;

-- =====================================================
-- 注意事項:
-- 1. このマイグレーションは既存のguest_cast_assignmentsからデータを移行します
-- 2. guest_cast_assignmentsテーブルは当面残し、完全移行後に削除予定
-- 3. order_itemsのcast_id列は既に削除済み（20250809_remove_cast_from_order_items.sql）
-- =====================================================