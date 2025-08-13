# Code Style and Conventions

## TypeScript Configuration

- **Strict mode enabled** (`"strict": true` in tsconfig.json)
- Target: ES2017
- Module resolution: bundler
- Path alias: `@/*` maps to `./src/*`
- JSX preserve mode for Next.js

## ESLint Rules

- Extends: `next/core-web-vitals`, `next/typescript`
- **No explicit `any` types** (`@typescript-eslint/no-explicit-any`: "error")
- **No unused variables** (`@typescript-eslint/no-unused-vars`: "error")
- Enforces strict typing and clean code

## Prettier Configuration

- Semi-colons: always (`"semi": true`)
- Quotes: double quotes (`"singleQuote": false`)
- Trailing commas: ES5 style (`"trailingComma": "es5"`)
- Print width: 80 characters
- Tab width: 2 spaces

## File Organization

- `/src/app` - Next.js App Router pages and layouts
- `/src/components` - Reusable React components
- `/src/types` - TypeScript type definitions
- `/src/lib` - Core utilities and Supabase client
- `/src/services` - Business logic and API services
- `/src/hooks` - Custom React hooks
- `/src/stores` - State management (Zustand)
- `/src/utils` - Helper functions

## Naming Conventions

- Components: PascalCase (e.g., `CustomerList.tsx`)
- Files: kebab-case for non-components (e.g., `auth.types.ts`)
- Types/Interfaces: PascalCase with descriptive names
- Database types follow Supabase conventions

## Testing Approach

- Test files: `*.test.ts(x)` or `*.spec.ts(x)`
- Unit tests with Vitest
- E2E tests with Playwright
- Aim for high coverage (80%+ target)
