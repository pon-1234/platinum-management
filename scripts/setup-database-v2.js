#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// Supabase connection from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const postgresUrl = process.env.POSTGRES_URL_NON_POOLING;

// Validate environment variables
function validateEnvironment() {
  const missing = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!postgresUrl) missing.push("POSTGRES_URL_NON_POOLING");

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

async function checkPsqlAvailable() {
  try {
    await execAsync("which psql");
    return true;
  } catch {
    return false;
  }
}

async function setupDatabaseV2() {
  console.log("🚀 Starting database setup V2 (using psql)...\n");

  // Check if psql is available
  const psqlAvailable = await checkPsqlAvailable();
  if (!psqlAvailable) {
    console.error("❌ psql is not installed or not in PATH");
    console.error("Please install PostgreSQL client tools and try again");
    process.exit(1);
  }

  // Run the V1 schema file
  console.log("📄 Executing V1_init_schema.sql...");
  try {
    const command = `psql "${postgresUrl}" -f supabase/V1_init_schema.sql`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes("NOTICE")) {
      console.error("❌ Error:", stderr);
    } else {
      console.log("✅ Schema created successfully!");
      if (stdout) console.log(stdout);
    }
  } catch (error) {
    console.error("❌ Failed to execute schema file:", error);
    process.exit(1);
  }

  // Verify tables were created
  console.log("\n🔍 Verifying tables...");
  const { data: tables, error } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");

  if (error) {
    console.error("❌ Error checking tables:", error);
  } else {
    console.log(`✅ Found ${tables?.length || 0} tables in database`);
  }

  console.log("\n✨ Database setup completed!");
  console.log("\n📋 Next steps:");
  console.log("1. Run 'npm run db:insert-demo' to add demo data");
  console.log("2. Create authentication users in Supabase Dashboard");
  console.log("3. Test your application!");
}

setupDatabaseV2();