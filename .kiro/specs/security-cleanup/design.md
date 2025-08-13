# Design Document

## Overview

This design addresses critical security vulnerabilities and technical debt in the platinum management system. The solution focuses on removing hardcoded credentials, consolidating conflicting documentation, and cleaning up redundant files to create a secure, maintainable codebase.

## Architecture

### Security Architecture

The security improvements follow a defense-in-depth approach:

1. **Environment Variable Management**: All sensitive credentials moved to environment variables
2. **File System Security**: Removal of hardcoded credentials from all files
3. **Version Control Security**: Guidance for cleaning Git history if needed
4. **Access Control**: Proper .gitignore configuration to prevent future credential exposure

### Documentation Architecture

The documentation will be consolidated into a clear hierarchy:

```
Root Level (Essential Only):
├── README.md (Primary setup guide)
├── DATABASE_SETUP.md (Authoritative database setup)
└── development_guide.md (Development practices)

docs/ Directory (Detailed Documentation):
├── SECURITY_MIGRATION.md (Security changes log)
└── MIGRATION_APPLIED.md (Historical migration notes)
```

## Components and Interfaces

### 1. Credential Management System

**Environment Variable Schema:**

```bash
# Database Connection
POSTGRES_URL_NON_POOLING=postgresql://user:password@host:port/database
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Script Configuration Interface:**

```javascript
// Updated script pattern
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

if (!config.supabaseUrl || !config.serviceKey) {
  throw new Error("Missing required environment variables");
}
```

### 2. Database Setup Consolidation

**Single Source of Truth:**

- `supabase/V1_init_schema.sql` as the authoritative schema
- `DATABASE_SETUP.md` as the single setup guide
- Removal of conflicting `MIGRATION_GUIDE.md`

**Setup Process Flow:**

```mermaid
graph TD
    A[Developer Setup] --> B[Copy .env.local.example]
    B --> C[Configure Environment Variables]
    C --> D[Run V1_init_schema.sql]
    D --> E[Verify Setup]
    E --> F[Ready for Development]
```

### 3. File Cleanup System

**Removal Strategy:**

1. **Archive Directory**: Complete removal of `supabase/migrations/archive/`
2. **Backup Files**: Deletion of `.backup` files
3. **Redundant Scripts**: Consolidation or removal of duplicate setup scripts
4. **Outdated Documentation**: Removal or relocation of obsolete docs

## Data Models

### Environment Configuration Model

```typescript
interface EnvironmentConfig {
  database: {
    url: string;
    serviceKey: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
  };
}
```

### Security Audit Model

```typescript
interface SecurityAuditResult {
  hardcodedCredentials: {
    file: string;
    line: number;
    type: "password" | "key" | "token";
    severity: "high" | "medium" | "low";
  }[];
  gitHistoryRisk: boolean;
  remediationSteps: string[];
}
```

## Error Handling

### Credential Validation

```javascript
function validateEnvironmentVariables() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}
```

### File Operation Error Handling

```javascript
function safeFileOperation(operation, filePath) {
  try {
    return operation(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`File not found (safe to ignore): ${filePath}`);
      return null;
    }
    throw error;
  }
}
```

## Testing Strategy

### Security Testing

1. **Credential Scan**: Automated scanning for hardcoded credentials
2. **Environment Variable Validation**: Testing script behavior with missing variables
3. **Git History Analysis**: Checking for sensitive data in commit history

### Functional Testing

1. **Database Setup**: Verify V1_init_schema.sql works correctly
2. **Script Functionality**: Test updated scripts with environment variables
3. **Documentation Accuracy**: Validate setup instructions work end-to-end

### Test Implementation

```javascript
// Example security test
describe("Security Compliance", () => {
  test("should not contain hardcoded credentials", () => {
    const sensitivePatterns = [
      /password\s*[:=]\s*["'][^"']+["']/i,
      /key\s*[:=]\s*["'][^"']+["']/i,
      /token\s*[:=]\s*["'][^"']+["']/i,
    ];

    // Scan all JavaScript/TypeScript files
    const files = glob.sync("**/*.{js,ts,json}", { ignore: "node_modules/**" });

    files.forEach((file) => {
      const content = fs.readFileSync(file, "utf8");
      sensitivePatterns.forEach((pattern) => {
        expect(content).not.toMatch(pattern);
      });
    });
  });
});
```

## Implementation Phases

### Phase 1: Critical Security Fixes (High Priority)

1. **Credential Removal**
   - Remove hardcoded credentials from all files
   - Update scripts to use environment variables
   - Verify .env.local is properly gitignored

2. **Documentation Consolidation**
   - Remove conflicting MIGRATION_GUIDE.md
   - Update DATABASE_SETUP.md as single source of truth
   - Create clear setup instructions

### Phase 2: File Cleanup (Medium Priority)

1. **Archive Removal**
   - Delete supabase/migrations/archive/ directory
   - Remove backup files (.backup extensions)
   - Clean up redundant scripts

2. **Documentation Organization**
   - Move technical documents to docs/ directory
   - Update references and links
   - Create documentation index

### Phase 3: Security Hardening (Ongoing)

1. **Git History Review**
   - Analyze commit history for sensitive data
   - Provide remediation guidance if needed
   - Implement pre-commit hooks for future prevention

2. **Process Improvement**
   - Create security guidelines for developers
   - Implement automated credential scanning
   - Establish regular security audits

## Security Considerations

### Immediate Risks

1. **Exposed Database Credentials**: High-severity risk requiring immediate remediation
2. **Service Keys in Version Control**: Critical security vulnerability
3. **Inconsistent Setup Procedures**: Risk of misconfiguration and security gaps

### Mitigation Strategies

1. **Environment Variable Enforcement**: All credentials must be externalized
2. **Git History Sanitization**: Guidance for removing sensitive data from history
3. **Access Control**: Proper file permissions and .gitignore configuration
4. **Developer Education**: Clear guidelines for secure development practices

### Long-term Security

1. **Automated Scanning**: Regular checks for hardcoded credentials
2. **Security Reviews**: Periodic audits of configuration and code
3. **Incident Response**: Procedures for handling security breaches
4. **Compliance Monitoring**: Ongoing verification of security standards

## Performance Considerations

### File System Operations

- Batch file operations where possible
- Use streaming for large file processing
- Implement progress indicators for long-running operations

### Database Operations

- Validate environment variables before database connections
- Use connection pooling for script operations
- Implement proper error handling and cleanup

## Monitoring and Maintenance

### Security Monitoring

1. **Credential Detection**: Automated scanning in CI/CD pipeline
2. **Environment Validation**: Regular checks of configuration
3. **Access Logging**: Monitor access to sensitive operations

### Maintenance Procedures

1. **Regular Audits**: Quarterly security reviews
2. **Documentation Updates**: Keep setup guides current
3. **Dependency Management**: Regular updates of security-related packages

This design provides a comprehensive approach to addressing the security vulnerabilities and technical debt while establishing sustainable practices for ongoing security and maintainability.
