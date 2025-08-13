# Codebase Structure

## Root Directory

- Configuration files: `package.json`, `tsconfig.json`, `.eslintrc.json`, `.prettierrc`
- Environment examples: `.env.example`, `.env.local.example`
- Next.js config: `next.config.ts`, `tailwind.config.ts`
- Testing configs: `vitest.config.ts`, `playwright.config.ts`
- Docker support: `Dockerfile`, `.dockerignore`

## `/src` - Source Code

### `/src/app` - Next.js App Router

- `layout.tsx` - Root layout
- `page.tsx` - Home page
- `/auth` - Authentication pages
- `/(protected)` - Protected routes requiring auth
- `/api` - API routes
- `/actions` - Server actions

### `/src/types` - TypeScript Definitions

- `database.types.ts` - Supabase generated types
- `auth.types.ts` - Authentication types
- `staff.types.ts` - Staff management
- `customer.types.ts` - Customer types
- `billing.types.ts` - Billing and orders
- `reservation.types.ts` - Reservations
- `attendance.types.ts` - Attendance tracking
- `inventory.types.ts` - Inventory management
- `bottle-keep.types.ts` - Bottle keeping
- `compliance.types.ts` - Compliance reporting
- `qr-code.types.ts` - QR code system
- `cast.types.ts` - Cast management
- `report.types.ts` - Reporting types

### Other Directories

- `/src/components` - React components
- `/src/lib` - Core utilities, Supabase client
- `/src/services` - Business logic layer
- `/src/hooks` - Custom React hooks
- `/src/stores` - Zustand state management
- `/src/utils` - Helper functions

## `/supabase` - Database

- `V1_init_schema.sql` - Complete database schema
- `/migrations/archive/` - Historical migrations (not for use)

## `/docs` - Documentation

- `development_guide.md` - TDD and AI-driven development guide
- `SYSTEM_DESIGN.md` - System architecture
- Various setup and optimization guides

## Other Directories

- `/.husky` - Git hooks configuration
- `/bin` - Binary/script files
- `/patches` - Package patches
- `/.serena` - Serena MCP configuration
- `/.claude` - Claude Code settings
