#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

// Supabase connection
const supabaseUrl = "https://pdomeeyvatachcothudq.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkb21lZXl2YXRhY2hjb3RodWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5MzI3MiwiZXhwIjoyMDY4NjY5MjcyfQ.HhYDbfwZeSUmKmkftQZ492LKdTTHP_ORwmqnEyxZVNA";

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
