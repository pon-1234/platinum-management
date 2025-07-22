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

async function checkTables() {
  console.log("🔍 Checking database tables...\n");

  try {
    // Check if tables exist
    const tableQueries = [
      { name: "staffs", description: "Staff management" },
      { name: "customers", description: "Customer records" },
      { name: "tables", description: "Table management" },
      { name: "visits", description: "Visit history" },
      { name: "reservations", description: "Reservations" },
      { name: "inventory_products", description: "Inventory products" },
      { name: "order_items", description: "Order items" },
      { name: "bottle_keeps", description: "Bottle keep records" },
      { name: "attendance_records", description: "Attendance records" },
      { name: "casts_profile", description: "Cast profiles" },
      { name: "cast_performances", description: "Cast performance" },
    ];

    console.log("📋 Checking tables:");
    for (const table of tableQueries) {
      const { data, error } = await supabase
        .from(table.name)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`❌ ${table.name}: Error - ${error.message}`);
      } else {
        console.log(`✅ ${table.name}: Found (${table.description})`);
      }
    }

    console.log("\n✅ Table check completed!");
  } catch (error) {
    console.error("❌ Error checking tables:", error);
  }
}

checkTables();