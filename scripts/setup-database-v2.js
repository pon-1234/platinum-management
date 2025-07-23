#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });

// Validate required environment variables
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error("❌ Missing required environment variables!");
  console.error("Please ensure your .env.local file contains:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  console.error(
    "\nCopy .env.local.example to .env.local and fill in the values."
  );
  process.exit(1);
}

// Supabase connection using environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTablesExist() {
  console.log("🔍 Checking existing tables...");
  try {
    // Try to query the staffs table
    const { data, error } = await supabase
      .from("staffs")
      .select("count")
      .limit(1);

    if (error && error.code === "PGRST116") {
      console.log("📊 No tables found, need to run migrations manually");
      return false;
    }

    console.log("✅ Tables already exist!");
    return true;
  } catch (err) {
    console.log("📊 No tables found, need to run migrations manually");
    return false;
  }
}

async function insertDemoData() {
  console.log("\n📄 Inserting demo data...\n");

  try {
    // Insert demo staffs
    console.log("👥 Inserting demo staff...");
    const { error: staffError } = await supabase.from("staffs").upsert([
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
    ]);

    if (staffError) console.log("Staff insert error:", staffError);
    else console.log("✅ Staff data inserted");

    // Insert demo customers
    console.log("👥 Inserting demo customers...");
    const { error: customerError } = await supabase.from("customers").upsert([
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
    ]);

    if (customerError) console.log("Customer insert error:", customerError);
    else console.log("✅ Customer data inserted");

    // Insert demo tables
    console.log("🪑 Inserting demo tables...");
    const { error: tableError } = await supabase.from("tables").upsert([
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
    ]);

    if (tableError) console.log("Table insert error:", tableError);
    else console.log("✅ Table data inserted");

    console.log("\n🎉 Demo data insertion completed!");
  } catch (error) {
    console.error("❌ Error inserting demo data:", error);
  }
}

async function main() {
  console.log("🚀 Starting database setup...\n");

  const tablesExist = await checkTablesExist();

  if (tablesExist) {
    console.log("✅ Tables already exist!");
    await insertDemoData();
  } else {
    console.log("\n⚠️  Tables do not exist yet.");
    console.log("Please run the migrations manually in Supabase Dashboard:");
    console.log("\n1. Go to Supabase Dashboard > SQL Editor");
    console.log("2. Copy and paste the content of supabase/all_migrations.sql");
    console.log("3. Click Run");
    console.log("4. Then run this script again");
    console.log("\nOr copy the content from:");
    console.log("- supabase/migrations/20240101000000_create_staff_tables.sql");
    console.log(
      "- supabase/migrations/20240102000000_create_customer_tables.sql"
    );
    console.log("- (and so on...)");
  }

  console.log(
    "\n📋 Demo login credentials (create these in Supabase Dashboard):"
  );
  console.log("Admin: admin@platinum-demo.com / DemoAdmin123!");
  console.log("Manager: manager@platinum-demo.com / DemoManager123!");
  console.log("Hall: hall@platinum-demo.com / DemoHall123!");
  console.log("Cashier: cashier@platinum-demo.com / DemoCashier123!");
  console.log("Cast: cast@platinum-demo.com / DemoCast123!");
}

main().catch(console.error);
