#!/usr/bin/env node

/**
 * Security Audit Script for Platinum Management System
 *
 * This script scans the codebase for potential security vulnerabilities,
 * including hardcoded credentials, exposed secrets, and other security issues.
 */

const fs = require("fs");
const path = require("path");

// Security patterns to detect
const SECURITY_PATTERNS = {
  // Database credentials
  hardcodedPasswords: [
    /password\s*[:=]\s*["'][^"'\s]{8,}["']/gi,
    /pwd\s*[:=]\s*["'][^"'\s]{4,}["']/gi,
    /PGPASSWORD\s*[:=]\s*["'][^"'\s]{4,}["']/gi,
  ],

  // API keys and tokens
  apiKeys: [
    /api[_-]?key\s*[:=]\s*["'][^"'\s]{20,}["']/gi,
    /secret[_-]?key\s*[:=]\s*["'][^"'\s]{20,}["']/gi,
    /access[_-]?token\s*[:=]\s*["'][^"'\s]{20,}["']/gi,
    /service[_-]?role[_-]?key\s*[:=]\s*["'][^"'\s]{20,}["']/gi,
  ],

  // JWT tokens
  jwtTokens: [
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    /jwt\s*[:=]\s*["']eyJ[^"']*["']/gi,
  ],

  // Supabase specific
  supabaseKeys: [
    /supabase.*key\s*[:=]\s*["'][^"'\s]{40,}["']/gi,
    /anon.*key\s*[:=]\s*["'][^"'\s]{40,}["']/gi,
  ],

  // Database URLs with credentials
  databaseUrls: [
    /postgresql:\/\/[^:\s]+:[^@\s]+@[^\/\s]+/gi,
    /postgres:\/\/[^:\s]+:[^@\s]+@[^\/\s]+/gi,
    /mysql:\/\/[^:\s]+:[^@\s]+@[^\/\s]+/gi,
  ],

  // Private keys
  privateKeys: [
    /-----BEGIN [A-Z\s]+ PRIVATE KEY-----/gi,
    /-----BEGIN RSA PRIVATE KEY-----/gi,
    /-----BEGIN EC PRIVATE KEY-----/gi,
  ],

  // Common suspicious patterns
  suspicious: [
    /admin.*password\s*[:=]\s*["'][^"'\s]+["']/gi,
    /root.*password\s*[:=]\s*["'][^"'\s]+["']/gi,
    /secret\s*[:=]\s*["'][^"'\s]{10,}["']/gi,
  ],
};

// Files and directories to ignore
const IGNORE_PATTERNS = [
  "node_modules/**",
  ".next/**",
  ".git/**",
  "coverage/**",
  "dist/**",
  "build/**",
  "**/*.log",
  "scripts/security-audit.js", // Don't scan this script itself
  ".env.local.example", // This file is supposed to have placeholder values
];

// File extensions to scan
const SCAN_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".env",
  ".config",
];

class SecurityAuditor {
  constructor() {
    this.findings = [];
    this.totalFilesScanned = 0;
    this.startTime = Date.now();
  }

  async scan() {
    console.log("🔍 Starting security audit...\n");

    try {
      const files = await this.getFilesToScan();
      console.log(`📁 Scanning ${files.length} files...\n`);

      for (const file of files) {
        await this.scanFile(file);
      }

      this.generateReport();
    } catch (error) {
      console.error("❌ Security audit failed:", error);
      process.exit(1);
    }
  }

  async getFilesToScan() {
    const files = [];
    this.walkDirectory(".", files);
    return files.filter((file) => {
      const ext = path.extname(file);
      return SCAN_EXTENSIONS.includes(ext) && !this.shouldIgnore(file);
    });
  }

  walkDirectory(dir, files) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!this.shouldIgnore(fullPath)) {
            this.walkDirectory(fullPath, files);
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  shouldIgnore(filePath) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    return IGNORE_PATTERNS.some((pattern) => {
      const regex = new RegExp(
        pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")
      );
      return regex.test(normalizedPath);
    });
  }

  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      this.totalFilesScanned++;

      // Skip binary-like files
      if (this.isBinaryContent(content)) {
        return;
      }

      const lines = content.split("\n");

      for (const [category, patterns] of Object.entries(SECURITY_PATTERNS)) {
        for (const pattern of patterns) {
          const matches = content.match(pattern);
          if (matches) {
            for (const match of matches) {
              const lineNumber = this.findLineNumber(lines, match);
              this.addFinding({
                file: filePath,
                line: lineNumber,
                category,
                pattern: pattern.toString(),
                match: this.sanitizeMatch(match),
                severity: this.getSeverity(category),
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not scan ${filePath}: ${error.message}`);
    }
  }

  isBinaryContent(content) {
    // Simple check for binary content
    const nonPrintableChars = content.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g);
    return nonPrintableChars && nonPrintableChars.length > content.length * 0.3;
  }

  findLineNumber(lines, match) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match)) {
        return i + 1;
      }
    }
    return 1;
  }

  sanitizeMatch(match) {
    // Partially mask sensitive data for reporting
    if (match.length > 20) {
      return (
        match.substring(0, 10) +
        "***[REDACTED]***" +
        match.substring(match.length - 5)
      );
    }
    return match.substring(0, 8) + "***";
  }

  getSeverity(category) {
    const severityMap = {
      hardcodedPasswords: "CRITICAL",
      apiKeys: "CRITICAL",
      jwtTokens: "HIGH",
      supabaseKeys: "CRITICAL",
      databaseUrls: "CRITICAL",
      privateKeys: "CRITICAL",
      suspicious: "MEDIUM",
    };
    return severityMap[category] || "LOW";
  }

  addFinding(finding) {
    this.findings.push(finding);
  }

  generateReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    console.log("=".repeat(80));
    console.log("🛡️  SECURITY AUDIT REPORT");
    console.log("=".repeat(80));
    console.log(`📊 Scanned: ${this.totalFilesScanned} files in ${duration}s`);
    console.log(
      `🔍 Findings: ${this.findings.length} potential security issues\n`
    );

    if (this.findings.length === 0) {
      console.log("✅ No security issues detected!");
      console.log(
        "\n🎉 Your codebase appears to be clean of hardcoded credentials."
      );
      return;
    }

    // Group findings by severity
    const bySeverity = this.groupBySeverity();

    for (const severity of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
      const findings = bySeverity[severity] || [];
      if (findings.length > 0) {
        this.printSeveritySection(severity, findings);
      }
    }

    this.printSummaryAndRecommendations();
  }

  groupBySeverity() {
    return this.findings.reduce((groups, finding) => {
      const severity = finding.severity;
      if (!groups[severity]) groups[severity] = [];
      groups[severity].push(finding);
      return groups;
    }, {});
  }

  printSeveritySection(severity, findings) {
    const icon = {
      CRITICAL: "🚨",
      HIGH: "⚠️",
      MEDIUM: "🔶",
      LOW: "ℹ️",
    }[severity];

    console.log(`${icon} ${severity} SEVERITY (${findings.length} issues)`);
    console.log("-".repeat(50));

    findings.forEach((finding, index) => {
      console.log(`${index + 1}. ${finding.file}:${finding.line}`);
      console.log(`   Category: ${finding.category}`);
      console.log(`   Match: ${finding.match}`);
      console.log("");
    });
  }

  printSummaryAndRecommendations() {
    const critical = this.findings.filter(
      (f) => f.severity === "CRITICAL"
    ).length;
    const high = this.findings.filter((f) => f.severity === "HIGH").length;

    console.log("📋 RECOMMENDATIONS");
    console.log("-".repeat(50));

    if (critical > 0 || high > 0) {
      console.log("🚨 IMMEDIATE ACTION REQUIRED:");
      console.log("1. Remove all hardcoded credentials from your codebase");
      console.log(
        "2. Use environment variables for all sensitive configuration"
      );
      console.log("3. Rotate any exposed credentials immediately");
      console.log(
        "4. Review your .gitignore to prevent future credential commits"
      );
      console.log("");
    }

    console.log("✅ SECURITY BEST PRACTICES:");
    console.log(
      "• Store sensitive data in .env.local (never commit this file)"
    );
    console.log(
      "• Use the environment validation utilities in src/lib/utils/env-validation.ts"
    );
    console.log("• Run this security audit regularly (add to CI/CD pipeline)");
    console.log("• Review code changes for potential credential exposure");
    console.log("");

    console.log("💡 TO FIX ISSUES:");
    console.log("• Move hardcoded values to environment variables");
    console.log("• Update .env.local.example with new variable names");
    console.log(
      "• Use the environment validation utilities for proper error handling"
    );
    console.log("");

    if (critical > 0) {
      console.log("⚠️  WARNING: Critical security issues detected!");
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.scan().catch((error) => {
    console.error("❌ Security audit failed:", error);
    process.exit(1);
  });
}

module.exports = { SecurityAuditor };
