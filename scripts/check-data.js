#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
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
