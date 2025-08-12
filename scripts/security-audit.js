#!/usr/bin/env node
/*
 Simple security audit:
 - Fail if client components ("use client") reference SUPABASE_SERVICE_ROLE_KEY
 - Fail if any client component imports supabase-admin
 - Warn if any file imports supabase-admin outside server-only contexts (heuristic)
*/

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const SRC_DIR = path.join(projectRoot, "src");

/**
 * Recursively gather files with extensions to analyze
 */
function listFiles(dir, exts = new Set([".ts", ".tsx", ".js", ".jsx"])) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".next")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(full, exts));
    } else if (exts.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function readFileSafe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function isClientComponent(code) {
  // look at beginning of file after BOM/whitespace/comments
  const firstNonEmpty = code.split(/\r?\n/).find((l) => l.trim().length > 0);
  return firstNonEmpty && /['"]use client['"]/.test(firstNonEmpty.trim());
}

function run() {
  const files = fs.existsSync(SRC_DIR) ? listFiles(SRC_DIR) : [];
  const violations = [];
  const warnings = [];

  for (const file of files) {
    const code = readFileSafe(file);
    if (!code) continue;

    const client = isClientComponent(code);

    if (client) {
      if (code.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        violations.push(
          `${file}: Client component must not reference SUPABASE_SERVICE_ROLE_KEY`
        );
      }
      if (code.match(/from\s+['"][^'"]*supabase-admin['"]/)) {
        violations.push(
          `${file}: Client component must not import supabase-admin (server-only)`
        );
      }
    }

    // global heuristic: discourage importing supabase-admin in shared libs
    if (code.match(/from\s+['"][^'"]*supabase-admin['"]/)) {
      // Server files should include 'server' import path or be under app/api or services/server
      if (
        !/\bserver\b/.test(code) &&
        !file.includes("/api/") &&
        !file.includes(".server")
      ) {
        warnings.push(
          `${file}: Consider keeping supabase-admin imports to server-only modules`
        );
      }
    }
  }

  if (warnings.length) {
    console.warn("[security:audit] WARNINGS");
    for (const w of warnings) console.warn(" -", w);
  }

  if (violations.length) {
    console.error("[security:audit] VIOLATIONS");
    for (const v of violations) console.error(" -", v);
    process.exit(1);
  }

  console.log("[security:audit] OK");
}

run();
