#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

// Supabase connection
const supabaseUrl = "https://pdomeeyvatachcothudq.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkb21lZXl2YXRhY2hjb3RodWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5MzI3MiwiZXhwIjoyMDY4NjY5MjcyfQ.HhYDbfwZeSUmKmkftQZ492LKdTTHP_ORwmqnEyxZVNA";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log("🔍 Checking database tables...\n");

  try {
    // Try to get schema information using service role
    const { data, error } = await supabase.rpc("get_table_list");

    if (error) {
      console.log("❌ Error getting table list:", error);
      console.log("\n📝 Trying alternative method...");

      // Try direct table query
      const { data: staffData, error: staffError } = await supabase
        .from("staffs")
        .select("count")
        .limit(1);

      if (staffError) {
        console.log("❌ staffs table does not exist:", staffError.message);
        console.log(
          "\n🔧 You need to run migrations manually in Supabase Dashboard:"
        );
        console.log("1. Go to Supabase Dashboard > SQL Editor");
        console.log("2. Create a new query");
        console.log("3. Copy and paste the following SQL:");
        console.log("\n--- COPY THIS SQL TO SUPABASE ---");
        console.log(generateCreateTablesSQL());
        console.log("--- END SQL ---\n");
        console.log('4. Click "Run" to execute');
        console.log("5. Then run the demo data insertion");
      } else {
        console.log("✅ staffs table exists");
      }
    } else {
      console.log("✅ Tables found:", data);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    console.log("\n🔧 Manual setup required - see instructions above");
  }
}

function generateCreateTablesSQL() {
  return `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create staffs table
CREATE TABLE IF NOT EXISTS staffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'hall', 'cashier', 'cast')),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT UNIQUE,
  line_id TEXT,
  birthday DATE,
  address TEXT,
  occupation TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  is_vip BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  current_status TEXT DEFAULT 'available' CHECK (current_status IN ('available', 'occupied', 'reserved', 'cleaning')),
  current_visit_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create inventory_products table
CREATE TABLE IF NOT EXISTS inventory_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  supplier_info JSONB DEFAULT '{}',
  reorder_point INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staffs_user_id ON staffs(user_id);
CREATE INDEX IF NOT EXISTS idx_staffs_role ON staffs(role);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(current_status);

-- Insert demo data
INSERT INTO staffs (id, full_name, role, hire_date, is_active) VALUES
  ('01234567-89ab-cdef-0123-456789abcdef', '田中 太郎', 'admin', '2024-01-01', true),
  ('12345678-9abc-def0-1234-56789abcdef0', '佐藤 花子', 'manager', '2024-01-15', true),
  ('23456789-abcd-ef01-2345-6789abcdef01', '鈴木 一郎', 'hall', '2024-02-01', true),
  ('34567890-bcde-f012-3456-789abcdef012', '高橋 美咲', 'cashier', '2024-02-15', true),
  ('45678901-cdef-0123-4567-89abcdef0123', '山田 愛', 'cast', '2024-03-01', true),
  ('56789012-def0-1234-5678-9abcdef01234', '中村 麗奈', 'cast', '2024-03-15', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, name, phone_number, email, line_id, birthday, address, occupation, notes, status) VALUES
  ('a1234567-89ab-cdef-0123-456789abcdef', '山田 太郎', '090-1234-5678', 'yamada@example.com', 'yamada_line', '1985-05-15', '東京都渋谷区', '会社員', 'VIPお客様', 'active'),
  ('b2345678-9abc-def0-1234-56789abcdef0', '田中 次郎', '090-2345-6789', 'tanaka@example.com', 'tanaka_line', '1990-08-20', '東京都新宿区', 'エンジニア', '常連客', 'active'),
  ('c3456789-abcd-ef01-2345-6789abcdef01', '佐藤 三郎', '090-3456-7890', 'sato@example.com', 'sato_line', '1988-12-10', '東京都港区', '営業', '', 'active'),
  ('d4567890-bcde-f012-3456-789abcdef012', '鈴木 四郎', '090-4567-8901', 'suzuki@example.com', null, '1992-03-25', '東京都品川区', '医師', '', 'active'),
  ('e5678901-cdef-0123-4567-89abcdef0123', '高橋 五郎', '090-5678-9012', 'takahashi@example.com', 'takahashi_line', '1987-07-30', '東京都目黒区', '弁護士', '', 'inactive')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tables (id, table_name, capacity, location, is_vip, is_active, current_status) VALUES
  (1, 'テーブル1', 4, 'フロア1-A', false, true, 'available'),
  (2, 'テーブル2', 6, 'フロア1-B', false, true, 'available'),
  (3, 'VIPルーム1', 8, 'VIPフロア', true, true, 'available'),
  (4, 'VIPルーム2', 10, 'VIPフロア', true, true, 'available'),
  (5, 'カウンター1', 2, 'カウンター', false, true, 'available'),
  (6, 'カウンター2', 2, 'カウンター', false, true, 'available')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_products (id, name, category, price, cost, stock_quantity, low_stock_threshold, supplier_info, reorder_point, max_stock) VALUES
  (1, 'ビール（プレミアム）', 'アルコール', 800, 300, 100, 20, '{"supplier": "酒類卸A", "contact": "03-1234-5678"}', 30, 200),
  (2, 'ワイン（赤）', 'アルコール', 1200, 600, 50, 10, '{"supplier": "ワイン商事", "contact": "03-2345-6789"}', 15, 100),
  (3, 'ウイスキー（プレミアム）', 'アルコール', 1500, 800, 30, 5, '{"supplier": "洋酒専門店", "contact": "03-3456-7890"}', 10, 50),
  (4, 'ソフトドリンク', 'ノンアルコール', 500, 150, 200, 50, '{"supplier": "飲料卸B", "contact": "03-5678-9012"}', 80, 400)
ON CONFLICT (id) DO NOTHING;`;
}

checkTables();
