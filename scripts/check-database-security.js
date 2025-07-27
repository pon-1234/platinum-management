#!/usr/bin/env node

/**
 * Database Security Check Script
 *
 * This script checks for common database security issues:
 * - Tables without RLS enabled
 * - Functions without secure search_path
 * - Missing security policies
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nPlease ensure these are set in your .env.local file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLS() {
  console.log("\n🔍 Checking Row Level Security (RLS)...\n");

  try {
    // Get all tables in public schema
    const { data: tables, error } = await supabase.rpc(
      "get_tables_without_rls"
    );

    if (error) {
      // If function doesn't exist, use alternative query
      const { data: allTables, error: tablesError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_type", "BASE TABLE");

      if (tablesError) {
        console.error("❌ Failed to fetch tables:", tablesError.message);
        return;
      }

      // Check each table for RLS
      for (const table of allTables || []) {
        const { data: rlsStatus, error: rlsError } = await supabase
          .from("pg_tables")
          .select("rowsecurity")
          .eq("schemaname", "public")
          .eq("tablename", table.table_name)
          .single();

        if (!rlsError && rlsStatus && !rlsStatus.rowsecurity) {
          console.log(`⚠️  Table '${table.table_name}' has RLS disabled`);
        }
      }
    } else {
      // Use the result from custom function
      if (tables && tables.length > 0) {
        console.log("⚠️  Tables without RLS enabled:");
        tables.forEach((table) => {
          console.log(`   - ${table.table_name}`);
        });
      } else {
        console.log("✅ All tables have RLS enabled");
      }
    }
  } catch (err) {
    console.error("❌ Error checking RLS:", err.message);
  }
}

async function checkFunctions() {
  console.log("\n🔍 Checking Function Security...\n");

  try {
    // Check for functions without secure search_path
    const { data: functions, error } = await supabase.rpc(
      "get_functions_without_secure_searchpath"
    );

    if (error) {
      // Alternative approach
      const query = `
        SELECT 
          p.proname as function_name,
          pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
      `;

      console.log("⚠️  Unable to check function search_path automatically");
      console.log("   Please manually review functions for secure search_path");
    } else {
      if (functions && functions.length > 0) {
        console.log("⚠️  Functions without secure search_path:");
        functions.forEach((func) => {
          console.log(`   - ${func.function_name}`);
        });
      } else {
        console.log("✅ All functions have secure search_path");
      }
    }
  } catch (err) {
    console.error("❌ Error checking functions:", err.message);
  }
}

async function checkPolicies() {
  console.log("\n🔍 Checking Security Policies...\n");

  try {
    // Get all RLS-enabled tables
    const { data: tables, error } = await supabase
      .from("pg_tables")
      .select("tablename")
      .eq("schemaname", "public")
      .eq("rowsecurity", true);

    if (error) {
      console.error("❌ Failed to fetch RLS-enabled tables:", error.message);
      return;
    }

    // Check each table for policies
    for (const table of tables || []) {
      const { data: policies, error: policiesError } = await supabase
        .from("pg_policies")
        .select("policyname")
        .eq("schemaname", "public")
        .eq("tablename", table.tablename);

      if (!policiesError) {
        if (!policies || policies.length === 0) {
          console.log(
            `⚠️  Table '${table.tablename}' has RLS enabled but no policies defined`
          );
        }
      }
    }

    console.log("\n✅ Policy check complete");
  } catch (err) {
    console.error("❌ Error checking policies:", err.message);
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("🛡️  DATABASE SECURITY CHECK");
  console.log("=".repeat(60));

  await checkRLS();
  await checkFunctions();
  await checkPolicies();

  console.log("\n" + "=".repeat(60));
  console.log("📊 Security check complete!");
  console.log("=".repeat(60));

  console.log("\n💡 Recommendations:");
  console.log("   1. Enable RLS on all public tables");
  console.log("   2. Define appropriate policies for each table");
  console.log("   3. Set secure search_path for all functions");
  console.log("   4. Use SECURITY DEFINER carefully\n");
}

// Add helper RPC functions to the migration
const helperFunctions = `
-- Helper function to get tables without RLS
CREATE OR REPLACE FUNCTION get_tables_without_rls()
RETURNS TABLE(table_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT t.tablename::text
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.rowsecurity = false
  AND t.tablename NOT IN ('schema_migrations', 'supabase_migrations');
END;
$$;

-- Helper function to get functions without secure search_path
CREATE OR REPLACE FUNCTION get_functions_without_secure_searchpath()
RETURNS TABLE(function_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT p.proname::text
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND NOT pg_get_functiondef(p.oid) LIKE '%search_path%';
END;
$$;
`;

// Run the check
main().catch(console.error);
