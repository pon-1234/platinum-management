#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Supabase connection
const supabaseUrl = "https://pdomeeyvatachcothudq.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkb21lZXl2YXRhY2hjb3RodWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5MzI3MiwiZXhwIjoyMDY4NjY5MjcyfQ.HhYDbfwZeSUmKmkftQZ492LKdTTHP_ORwmqnEyxZVNA";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL(sql, description) {
  console.log(`📄 Running: ${description}`);
  try {
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });
    if (error) {
      console.error(`❌ Error in ${description}:`, error);
      return false;
    }
    console.log(`✅ Successfully completed: ${description}`);
    return true;
  } catch (err) {
    console.error(`❌ Exception in ${description}:`, err);
    return false;
  }
}

async function checkTablesExist() {
  console.log("🔍 Checking existing tables...");
  const { data, error } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");

  if (error) {
    console.log("📊 No existing tables found, proceeding with migrations...");
    return [];
  }

  const tableNames = data.map((row) => row.table_name);
  console.log("📊 Existing tables:", tableNames);
  return tableNames;
}

async function runMigrations() {
  console.log("🚀 Starting database setup...\n");

  // Check existing tables
  const existingTables = await checkTablesExist();

  if (existingTables.includes("staffs")) {
    console.log("✅ Tables already exist, skipping migrations...");
  } else {
    console.log("📦 Running migrations...\n");

    // Read and execute all migrations
    const migrationsDir = path.join(__dirname, "../supabase/migrations");
    const migrationFiles = [
      "20240101000000_create_staff_tables.sql",
      "20240102000000_create_customer_tables.sql",
      "20240103000000_update_cast_tables.sql",
      "20240104000000_create_reservation_tables.sql",
      "20240105000000_create_billing_tables.sql",
      "20240106000000_create_attendance_tables.sql",
      "20240107000000_create_inventory_tables.sql",
      "20240108000000_create_bottle_keep_tables.sql",
      "20240109000000_create_compliance_tables.sql",
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, "utf8");
        await runSQL(sql, `Migration: ${file}`);
      } else {
        console.log(`⚠️  Migration file not found: ${file}`);
      }
    }
  }

  console.log("\n📄 Inserting demo data...\n");

  // Read and execute demo data
  const demoDataPath = path.join(__dirname, "../supabase/demo_data.sql");
  if (fs.existsSync(demoDataPath)) {
    const demoSQL = fs.readFileSync(demoDataPath, "utf8");
    await runSQL(demoSQL, "Demo data insertion");
  } else {
    console.log("⚠️  Demo data file not found");
  }

  console.log("\n🎉 Database setup completed!");
  console.log("\n📋 Demo login credentials:");
  console.log("Admin: admin@platinum-demo.com / DemoAdmin123!");
  console.log("Manager: manager@platinum-demo.com / DemoManager123!");
  console.log("Hall: hall@platinum-demo.com / DemoHall123!");
  console.log("Cashier: cashier@platinum-demo.com / DemoCashier123!");
  console.log("Cast: cast@platinum-demo.com / DemoCast123!");
  console.log(
    "\nNote: You still need to create these users in Supabase Dashboard > Authentication > Users"
  );
}

// Alternative method using direct SQL execution
async function runMigrationsDirectSQL() {
  console.log("🚀 Running migrations with direct SQL...\n");

  // First, try to create the exec_sql function if it doesn't exist
  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'SQL executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;
`;

  await runSQL(createFunctionSQL, "Creating exec_sql function");

  // Now run migrations
  await runMigrations();
}

// Run the setup
runMigrationsDirectSQL().catch(console.error);
