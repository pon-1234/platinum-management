#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

// Supabase connection
const supabaseUrl = "https://pdomeeyvatachcothudq.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkb21lZXl2YXRhY2hjb3RodWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5MzI3MiwiZXhwIjoyMDY4NjY5MjcyfQ.HhYDbfwZeSUmKmkftQZ492LKdTTHP_ORwmqnEyxZVNA";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertDemoData() {
  console.log("🚀 Inserting comprehensive demo data...\n");

  try {
    // Insert demo staffs
    console.log("👥 Inserting demo staff...");
    const { data: staffData, error: staffError } = await supabase
      .from("staffs")
      .insert([
        {
          id: "01234567-89ab-cdef-0123-456789abcdef",
          full_name: "田中 太郎",
          role: "admin",
          hire_date: "2024-01-01",
          is_active: true,
        },
        {
          id: "12345678-9abc-def0-1234-56789abcdef0",
          full_name: "佐藤 花子",
          role: "manager",
          hire_date: "2024-01-15",
          is_active: true,
        },
        {
          id: "23456789-abcd-ef01-2345-6789abcdef01",
          full_name: "鈴木 一郎",
          role: "hall",
          hire_date: "2024-02-01",
          is_active: true,
        },
        {
          id: "34567890-bcde-f012-3456-789abcdef012",
          full_name: "高橋 美咲",
          role: "cashier",
          hire_date: "2024-02-15",
          is_active: true,
        },
        {
          id: "45678901-cdef-0123-4567-89abcdef0123",
          full_name: "山田 愛",
          role: "cast",
          hire_date: "2024-03-01",
          is_active: true,
        },
        {
          id: "56789012-def0-1234-5678-9abcdef01234",
          full_name: "中村 麗奈",
          role: "cast",
          hire_date: "2024-03-15",
          is_active: true,
        },
      ])
      .select();

    if (staffError) {
      console.log("Staff insert error:", staffError);
    } else {
      console.log(`✅ Inserted ${staffData?.length || 0} staff records`);
    }

    // Insert demo customers
    console.log("\n👤 Inserting demo customers...");
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .insert([
        {
          id: "a1234567-89ab-cdef-0123-456789abcdef",
          name: "山田 太郎",
          phone_number: "090-1234-5678",
          email: "yamada@example.com",
          line_id: "yamada_line",
          birthday: "1985-05-15",
          address: "東京都渋谷区",
          occupation: "会社員",
          notes: "VIPお客様",
          status: "active",
        },
        {
          id: "b2345678-9abc-def0-1234-56789abcdef0",
          name: "田中 次郎",
          phone_number: "090-2345-6789",
          email: "tanaka@example.com",
          line_id: "tanaka_line",
          birthday: "1990-08-20",
          address: "東京都新宿区",
          occupation: "エンジニア",
          notes: "常連客",
          status: "active",
        },
        {
          id: "c3456789-abcd-ef01-2345-6789abcdef01",
          name: "佐藤 三郎",
          phone_number: "090-3456-7890",
          email: "sato@example.com",
          line_id: "sato_line",
          birthday: "1988-12-10",
          address: "東京都港区",
          occupation: "営業",
          notes: "",
          status: "active",
        },
        {
          id: "d4567890-bcde-f012-3456-789abcdef012",
          name: "鈴木 四郎",
          phone_number: "090-4567-8901",
          email: "suzuki@example.com",
          birthday: "1992-03-25",
          address: "東京都品川区",
          occupation: "医師",
          notes: "",
          status: "active",
        },
        {
          id: "e5678901-cdef-0123-4567-89abcdef0123",
          name: "高橋 五郎",
          phone_number: "090-5678-9012",
          email: "takahashi@example.com",
          line_id: "takahashi_line",
          birthday: "1987-07-30",
          address: "東京都目黒区",
          occupation: "弁護士",
          notes: "",
          status: "inactive",
        },
      ])
      .select();

    if (customerError) {
      console.log("Customer insert error:", customerError);
    } else {
      console.log(`✅ Inserted ${customerData?.length || 0} customer records`);
    }

    // Insert demo tables
    console.log("\n🪑 Inserting demo tables...");
    const { data: tableData, error: tableError } = await supabase
      .from("tables")
      .insert([
        {
          id: 1,
          table_name: "テーブル1",
          capacity: 4,
          location: "フロア1-A",
          is_vip: false,
          is_active: true,
          current_status: "available",
        },
        {
          id: 2,
          table_name: "テーブル2",
          capacity: 6,
          location: "フロア1-B",
          is_vip: false,
          is_active: true,
          current_status: "available",
        },
        {
          id: 3,
          table_name: "VIPルーム1",
          capacity: 8,
          location: "VIPフロア",
          is_vip: true,
          is_active: true,
          current_status: "available",
        },
        {
          id: 4,
          table_name: "VIPルーム2",
          capacity: 10,
          location: "VIPフロア",
          is_vip: true,
          is_active: true,
          current_status: "available",
        },
        {
          id: 5,
          table_name: "カウンター1",
          capacity: 2,
          location: "カウンター",
          is_vip: false,
          is_active: true,
          current_status: "available",
        },
        {
          id: 6,
          table_name: "カウンター2",
          capacity: 2,
          location: "カウンター",
          is_vip: false,
          is_active: true,
          current_status: "available",
        },
      ])
      .select();

    if (tableError) {
      console.log("Table insert error:", tableError);
    } else {
      console.log(`✅ Inserted ${tableData?.length || 0} table records`);
    }

    // Insert inventory products
    console.log("\n📦 Inserting inventory products...");
    const { data: productData, error: productError } = await supabase
      .from("inventory_products")
      .insert([
        {
          id: 1,
          name: "ビール（プレミアム）",
          category: "アルコール",
          price: 800,
          cost: 300,
          stock_quantity: 100,
          low_stock_threshold: 20,
          supplier_info: { supplier: "酒類卸A", contact: "03-1234-5678" },
          reorder_point: 30,
          max_stock: 200,
        },
        {
          id: 2,
          name: "ワイン（赤）",
          category: "アルコール",
          price: 1200,
          cost: 600,
          stock_quantity: 50,
          low_stock_threshold: 10,
          supplier_info: { supplier: "ワイン商事", contact: "03-2345-6789" },
          reorder_point: 15,
          max_stock: 100,
        },
        {
          id: 3,
          name: "ウイスキー（プレミアム）",
          category: "アルコール",
          price: 1500,
          cost: 800,
          stock_quantity: 30,
          low_stock_threshold: 5,
          supplier_info: { supplier: "洋酒専門店", contact: "03-3456-7890" },
          reorder_point: 10,
          max_stock: 50,
        },
        {
          id: 4,
          name: "ソフトドリンク",
          category: "ノンアルコール",
          price: 500,
          cost: 150,
          stock_quantity: 200,
          low_stock_threshold: 50,
          supplier_info: { supplier: "飲料卸B", contact: "03-5678-9012" },
          reorder_point: 80,
          max_stock: 400,
        },
      ])
      .select();

    if (productError) {
      console.log("Product insert error:", productError);
    } else {
      console.log(`✅ Inserted ${productData?.length || 0} product records`);
    }

    console.log("\n🎉 Demo data insertion completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Go to Supabase Dashboard > Authentication > Users");
    console.log("2. Create demo users with these credentials:");
    console.log("   - admin@platinum-demo.com / DemoAdmin123!");
    console.log("   - manager@platinum-demo.com / DemoManager123!");
    console.log("   - hall@platinum-demo.com / DemoHall123!");
    console.log("   - cashier@platinum-demo.com / DemoCashier123!");
    console.log("   - cast@platinum-demo.com / DemoCast123!");
    console.log("3. Link user IDs to staff records");
    console.log("4. Test login on your deployed app!");
  } catch (error) {
    console.error("❌ Error inserting demo data:", error);
  }
}

insertDemoData();
