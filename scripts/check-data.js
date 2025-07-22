#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

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

async function checkData() {
  console.log("📊 Checking database data...\n");

  try {
    // Check staffs
    const { data: staffs, error: staffError } = await supabase
      .from("staffs")
      .select("*");

    console.log(`👥 Staff records: ${staffs?.length || 0}`);
    if (staffs?.length > 0) {
      staffs.forEach((staff) => {
        console.log(`  - ${staff.full_name} (${staff.role})`);
      });
    }

    // Check customers
    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("*");

    console.log(`\n👤 Customer records: ${customers?.length || 0}`);
    if (customers?.length > 0) {
      customers.forEach((customer) => {
        console.log(`  - ${customer.name} (${customer.status})`);
      });
    }

    // Check tables
    const { data: tables, error: tableError } = await supabase
      .from("tables")
      .select("*");

    console.log(`\n🪑 Table records: ${tables?.length || 0}`);
    if (tables?.length > 0) {
      tables.forEach((table) => {
        console.log(`  - ${table.table_name} (${table.current_status})`);
      });
    }

    console.log("\n✅ Database check completed!");
  } catch (error) {
    console.error("❌ Error checking data:", error);
  }
}

checkData();