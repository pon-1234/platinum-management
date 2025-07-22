# AI Collaboration Policy: Platinum Management System

## Ⅰ. Code Generation Philosophy (Your Core Directives)

### 0. TDD First (Red-Green-Refactor)
This is your primary development cycle. Follow these three rules religiously.
1. **Red** – Write a minimal failing test first.
2. **Green** – Write the simplest code to make the test pass.
3. **Refactor** – Eliminate duplication and improve design. Keep the tests green.
> ⚠️ You are **forbidden** to write implementation code before you have a failing test (Red).

### 1. Documentation First
For every major class or module you create or edit, you **MUST** add a JSDoc-style comment block at the top with the following information:

```typescript
/**
 * @design_doc   (URL to the design document)
 * @related_to   (Related class names with a brief note on their purpose)
 * @known_issues (URL to a ticket summarizing known bugs or limitations)
 */
```

### 2. Absolute Prohibitions (Things You Must Never Do)
Your primary goal is to solve problems correctly. The following are forbidden:

- **DO NOT** relax conditions (e.g., weakening TypeScript types from `string` to `any`, changing `===` to `==`) just to fix a test or type error. Address the root cause.
- **DO NOT** skip tests (`describe.skip`, `it.skip`) or use improper mocks to bypass failures.
- **DO NOT** hardcode outputs or responses that should be dynamic. Use constants or configuration.
- **DO NOT** ignore or suppress error messages (e.g., using `// @ts-ignore` or empty `catch {}` blocks).
- **DO NOT** implement temporary fixes or leave `TODO` comments for core issues.
- **DO NOT** ignore test coverage blindly. If a piece of code is genuinely untestable, you **MUST** add a `/** @no-test-required reason: [Your justification here] */` annotation above it.

---

## Ⅱ. Workflow and Quality Gates (Your Responsibilities)

### 1. TDD Cycle & Automated Checks
- **Red Phase:** When you write a test, confirm it fails.
- **Green/Refactor Phase:** When you write code, ensure tests pass.
- **Completion:** Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before considering any task complete.

### 2. Completion Conditions (Finalization Tasks)
After all checks pass, your final responsibility is to:
- **Update Documentation:** Review all changes and update all relevant documentation (e.g., `README.md`, API docs, etc.) accordingly.

---

## Ⅲ. Project-Specific Guidelines

### 1. TypeScript Strict Mode
- The project uses TypeScript with strict mode enabled
- **NEVER** use `any` type - find the proper type or create interfaces
- All functions must have explicit return types
- All parameters must be properly typed

### 2. Component Structure
- Use functional components with TypeScript
- Place components in appropriate directories:
  - `src/components/` - Reusable UI components
  - `src/app/` - Page components (Next.js App Router)
  - `src/lib/` - Utility functions and helpers

### 3. Supabase Integration
- Use the Supabase client from `src/lib/supabase/client.ts` for client-side operations
- Use the Supabase client from `src/lib/supabase/server.ts` for server-side operations
- Always handle authentication errors gracefully
- Implement proper Row Level Security (RLS) policies

### 4. Testing Requirements
- Write tests for all business logic
- Use Vitest for unit tests
- Use Playwright for E2E tests
- Maintain minimum 80% test coverage
- Test file naming: `*.test.ts` or `*.test.tsx`

### 5. Code Style
- Follow Prettier configuration for formatting
- Follow ESLint rules for code quality
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility

---

## Ⅳ. Development Commands

You should be familiar with these commands:
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run Vitest tests
- `pnpm test:coverage` - Run tests with coverage
- `pnpm playwright` - Run E2E tests

---

## Ⅴ. Git Commit Messages

Follow conventional commit format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or modifications
- `chore:` - Build process or auxiliary tool changes

Example: `feat: add customer registration form`

---

## Ⅵ. Gemini Delegation Policy

### When to Use Gemini
Following the development guide philosophy:
- **Red/Green Phases:** **Do not use Gemini.** Focus on the fast TDD cycle.
- **Refactor Phase:** You may delegate to Gemini for:
  - Complex refactoring analysis
  - Researching new APIs or best practices
  - Getting objective code review feedback
  - Large codebase analysis

### Gemini Commands (Future Implementation)
When Gemini CLI is available, use these delegation patterns:
```bash
# For code analysis
gemini-analyze "Analyze this service layer for potential improvements"

# For research
gemini-search "Latest Next.js 14 performance optimization techniques"

# For refactoring guidance
gemini "Review this component for accessibility and performance issues"
```

### Collaboration Flow
1. **Claude (TDD Focus):** Write tests, implement features, maintain TDD cycle
2. **Gemini (Analysis):** Provide research, analysis, and optimization suggestions
3. **Code Hooks:** Ensure quality gates and process enforcement

**Note:** Summarize Gemini's findings. Do not paste raw output directly into code.