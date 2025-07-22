#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Supabase connection from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
function validateEnvironment() {
  const missing = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((var_name) => console.error(`  - ${var_name}`));
    console.error("\n💡 Please set these in your .env.local file");
    console.error("📋 For more details, see DATABASE_SETUP.md");
    process.exit(1);
  }
}

validateEnvironment();

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
    console.error("Error checking tables:", error);
    return false;
  }

  const tables = data?.map((t) => t.table_name) || [];
  return tables.length > 0;
}

async function setupDatabase() {
  console.log("🚀 Starting database setup...\n");

  // Check if tables already exist
  const tablesExist = await checkTablesExist();
  if (tablesExist) {
    console.log("⚠️  Tables already exist in the database.");
    console.log("To reset, drop all tables first or use a fresh database.\n");
    return;
  }

  // Read and execute migration files
  const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  console.log(`📁 Found ${migrationFiles.length} migration files\n`);

  let successCount = 0;
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf8");
    const success = await runSQL(sql, file);
    if (success) successCount++;
  }

  console.log(`\n✨ Setup completed! ${successCount}/${migrationFiles.length} migrations successful.`);
  
  if (successCount === migrationFiles.length) {
    console.log("\n📋 Next steps:");
    console.log("1. Run 'npm run db:insert-demo' to add demo data");
    console.log("2. Create authentication users in Supabase Dashboard");
    console.log("3. Link auth users to staff records");
  }
}

setupDatabase();