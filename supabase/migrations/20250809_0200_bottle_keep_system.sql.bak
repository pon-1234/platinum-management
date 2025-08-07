-- ボトルキープ管理システムのテーブル作成

-- ボトルキープテーブル
CREATE TABLE bottle_keeps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    bottle_number VARCHAR(20) UNIQUE NOT NULL,
    opened_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    remaining_percentage DECIMAL(3,2) DEFAULT 1.00 CHECK (remaining_percentage >= 0 AND remaining_percentage <= 1),
    storage_location VARCHAR(100),
    table_number VARCHAR(20),
    host_staff_id UUID REFERENCES staffs(id),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired', 'removed')),
    tags TEXT[],
    last_served_date DATE,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ボトル使用履歴テーブル
CREATE TABLE bottle_keep_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bottle_keep_id UUID NOT NULL REFERENCES bottle_keeps(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('serve', 'refill', 'move', 'status_change', 'note')),
    served_amount DECIMAL(3,2),
    remaining_before DECIMAL(3,2),
    remaining_after DECIMAL(3,2),
    staff_id UUID NOT NULL REFERENCES staffs(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ボトル移動履歴テーブル
CREATE TABLE bottle_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bottle_keep_id UUID NOT NULL REFERENCES bottle_keeps(id) ON DELETE CASCADE,
    from_location VARCHAR(100),
    to_location VARCHAR(100) NOT NULL,
    moved_by UUID NOT NULL REFERENCES staffs(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックスの作成
CREATE INDEX idx_bottle_keeps_customer ON bottle_keeps(customer_id, status);
CREATE INDEX idx_bottle_keeps_status ON bottle_keeps(status) WHERE status = 'active';
CREATE INDEX idx_bottle_keeps_expiry ON bottle_keeps(expiry_date) WHERE status = 'active';
CREATE INDEX idx_bottle_keeps_number ON bottle_keeps(bottle_number);
CREATE INDEX idx_bottle_keeps_storage ON bottle_keeps(storage_location) WHERE status = 'active';
CREATE INDEX idx_bottle_keep_histories_bottle ON bottle_keep_histories(bottle_keep_id, created_at DESC);
CREATE INDEX idx_bottle_keep_histories_visit ON bottle_keep_histories(visit_id);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_bottle_keeps_updated_at BEFORE UPDATE ON bottle_keeps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシーの設定
ALTER TABLE bottle_keeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_keep_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_movements ENABLE ROW LEVEL SECURITY;

-- スタッフは全てのボトルキープ情報を閲覧可能
CREATE POLICY "Staff can view all bottle keeps" ON bottle_keeps
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM staffs)
    );

-- マネージャー以上がボトルキープを管理可能
CREATE POLICY "Manager can manage bottle keeps" ON bottle_keeps
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM staffs 
            WHERE role IN ('admin', 'manager')
        )
    );

-- ホールスタッフはボトルの状態更新可能（残量更新など）
CREATE POLICY "Hall staff can update bottle status" ON bottle_keeps
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM staffs 
            WHERE role IN ('admin', 'manager', 'hall')
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM staffs 
            WHERE role IN ('admin', 'manager', 'hall')
        )
    );

-- 履歴テーブルのポリシー
CREATE POLICY "Staff can view bottle histories" ON bottle_keep_histories
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM staffs)
    );

CREATE POLICY "Staff can insert bottle histories" ON bottle_keep_histories
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM staffs)
    );

CREATE POLICY "Staff can view bottle movements" ON bottle_movements
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM staffs)
    );

CREATE POLICY "Staff can insert bottle movements" ON bottle_movements
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM staffs)
    );

-- ボトル番号生成関数
CREATE OR REPLACE FUNCTION generate_bottle_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- 形式: BK-YYYYMMDD-XXXX
        new_number := 'BK-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- 既存チェック
        IF NOT EXISTS (SELECT 1 FROM bottle_keeps WHERE bottle_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique bottle number';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 期限切れボトル自動更新関数
CREATE OR REPLACE FUNCTION update_expired_bottles()
RETURNS void AS $$
BEGIN
    UPDATE bottle_keeps
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'active'
        AND expiry_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 定期実行用のcronジョブ設定（pg_cron拡張が必要）
-- SELECT cron.schedule('update-expired-bottles', '0 0 * * *', 'SELECT update_expired_bottles();');