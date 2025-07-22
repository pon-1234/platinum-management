-- 在庫変動履歴テーブル
CREATE TABLE inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  reason VARCHAR(100),
  reference_id UUID, -- 注文ID等の参照
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX idx_inventory_movements_product_date ON inventory_movements(product_id, created_at);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);

-- RLS設定: admin/manager のみアクセス可能
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_policy" ON inventory_movements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs 
      WHERE staffs.user_id = auth.uid() 
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- 商品テーブル拡張
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_info JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 100;

-- 在庫検索用インデックス
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity, low_stock_threshold);