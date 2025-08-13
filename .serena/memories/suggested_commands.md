# Suggested Commands for Development

## Core Development Commands

- `pnpm dev` - Start development server at http://localhost:3000
- `pnpm build` - Create production build
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint checks
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run unit tests with Vitest
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm playwright` - Run e2e tests with Playwright

## Database Commands

- `pnpm db:check-tables` - Check database tables
- `pnpm db:check-data` - Check database data
- `pnpm db:insert-demo` - Insert demo data
- `pnpm db:setup-v2` - Setup database v2
- `pnpm security:audit` - Run security audit

## macOS System Commands

- `pbcopy` - Copy to clipboard (e.g., `cat file | pbcopy`)
- `open` - Open files/URLs (e.g., `open http://localhost:3000`)
- Standard Unix commands work: `ls`, `cd`, `grep`, `find`, `git`

## Git Workflow

- Pre-commit hooks run automatically via Husky
- Commits trigger: `npx lint-staged` (runs Prettier on staged files)
- Use conventional commit messages

## Environment Setup

- Copy `.env.local.example` to `.env.local`
- Generate QR secret: `openssl rand -base64 32`
- Set Supabase credentials in `.env.local`
