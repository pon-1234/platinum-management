const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Supabase接続情報
const supabaseUrl = "https://pdomeeyvatachcothudq.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkb21lZXl2YXRhY2hjb3RodWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5MzI3MiwiZXhwIjoyMDY4NjY5MjcyfQ.HhYDbfwZeSUmKmkftQZ492LKdTTHP_ORwmqnEyxZVNA";

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSql() {
  const sql = fs.readFileSync("scripts/quick-fix-rls.sql", "utf8");

  try {
    // SQLを個別のステートメントに分割
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { data, error } = await supabase.rpc("exec_sql", {
          sql_query: statement + ";",
        });

        if (error) {
          console.error("Error:", error);
        } else {
          console.log("Success");
        }
      }
    }
  } catch (error) {
    console.error("Failed to execute SQL:", error);
  }
}

executeSql();
