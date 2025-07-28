const fs = require("fs");

async function runSQL() {
  const token = "sbp_000b53e3912f234aac96bdbbfab07d0cb2574e15";
  const projectRef = "nzfsmqpnmnzfxkgfkgbu";

  const sql = fs.readFileSync("fix-login-auth.sql", "utf8");

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
}

runSQL().catch(console.error);
