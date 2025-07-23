/**
 * Environment Variable Security Validation Utilities
 *
 * This module provides utilities to validate and ensure required environment variables
 * are properly configured, preventing security issues from missing credentials.
 */

export interface EnvValidationResult {
  isValid: boolean;
  missingVars: string[];
  errors: string[];
}

/**
 * Required environment variables for the application
 */
export const REQUIRED_ENV_VARS = {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: {
    required: true,
    description: "Supabase project URL",
    public: true,
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    required: true,
    description: "Supabase anonymous key",
    public: true,
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    description: "Supabase service role key (server-side only)",
    public: false,
  },
  // Database Configuration (optional but recommended)
  POSTGRES_URL_NON_POOLING: {
    required: false,
    description: "Direct PostgreSQL connection URL",
    public: false,
  },
  POSTGRES_PASSWORD: {
    required: false,
    description: "PostgreSQL database password",
    public: false,
  },
} as const;

/**
 * Validates that all required environment variables are present and properly configured
 */
export function validateEnvironmentVariables(): EnvValidationResult {
  const missingVars: string[] = [];
  const errors: string[] = [];

  Object.entries(REQUIRED_ENV_VARS).forEach(([varName, config]) => {
    const value = process.env[varName];

    if (config.required && (!value || value.trim() === "")) {
      missingVars.push(varName);
      errors.push(
        `Missing required environment variable: ${varName} (${config.description})`
      );
    }

    // Additional validation for specific variables
    if (value) {
      if (varName === "NEXT_PUBLIC_SUPABASE_URL" && !isValidUrl(value)) {
        errors.push(`Invalid URL format for ${varName}: ${value}`);
      }

      if (varName.includes("KEY") && value.length < 32) {
        errors.push(
          `${varName} appears to be too short (${value.length} characters) - possible invalid key`
        );
      }
    }
  });

  return {
    isValid: missingVars.length === 0 && errors.length === 0,
    missingVars,
    errors,
  };
}

/**
 * Validates environment variables and throws an error if validation fails
 * Use this in application initialization to ensure proper configuration
 */
export function requireValidEnvironment(): void {
  const validation = validateEnvironmentVariables();

  if (!validation.isValid) {
    const errorMessage = [
      "❌ Environment variable validation failed:",
      ...validation.errors,
      "",
      "💡 Please check your .env.local file and ensure all required variables are set.",
      "📋 Required variables:",
      ...Object.entries(REQUIRED_ENV_VARS)
        .filter(([, config]) => config.required)
        .map(([name, config]) => `  - ${name}: ${config.description}`),
    ].join("\n");

    throw new Error(errorMessage);
  }
}

/**
 * Returns a safe representation of environment variables for debugging
 * (masks sensitive values)
 */
export function getEnvironmentSummary(): Record<string, string> {
  const summary: Record<string, string> = {};

  Object.keys(REQUIRED_ENV_VARS).forEach((varName) => {
    const value = process.env[varName];
    const config = REQUIRED_ENV_VARS[varName as keyof typeof REQUIRED_ENV_VARS];

    if (value) {
      if (config.public) {
        summary[varName] = value;
      } else {
        // Mask sensitive values
        summary[varName] =
          `${value.substring(0, 8)}${"*".repeat(Math.max(0, value.length - 8))}`;
      }
    } else {
      summary[varName] = config.required
        ? "❌ MISSING (REQUIRED)"
        : "⚠️ Not set (optional)";
    }
  });

  return summary;
}

/**
 * Simple URL validation
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Node.js specific validation (for scripts and server-side code)
 */
export function validateNodeEnvironment(): EnvValidationResult {
  const validation = validateEnvironmentVariables();

  // Additional Node.js specific checks
  if (typeof window !== "undefined") {
    validation.errors.push(
      "validateNodeEnvironment() should only be called in Node.js environment"
    );
    validation.isValid = false;
  }

  return validation;
}

/**
 * Browser specific validation (for client-side code)
 */
export function validateBrowserEnvironment(): EnvValidationResult {
  const validation = validateEnvironmentVariables();

  // In browser, only public environment variables should be available
  const sensitiveVars = Object.entries(REQUIRED_ENV_VARS)
    .filter(([, config]) => !config.public)
    .map(([name]) => name)
    .filter((name) => process.env[name]);

  if (sensitiveVars.length > 0) {
    validation.errors.push(
      `Sensitive environment variables detected in browser: ${sensitiveVars.join(", ")}`
    );
    validation.isValid = false;
  }

  return validation;
}
