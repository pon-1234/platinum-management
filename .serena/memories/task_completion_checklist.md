# Task Completion Checklist

## Required Checks Before Completing Any Task

1. **Run Linting**
   - Execute: `pnpm lint`
   - Fix any ESLint errors or warnings
   - No `any` types allowed
   - No unused variables

2. **Run Type Checking**
   - Execute: `pnpm typecheck`
   - Ensure all TypeScript errors are resolved
   - Maintain strict typing

3. **Run Tests**
   - Execute: `pnpm test`
   - All tests must pass
   - No skipped tests allowed
   - Add tests for new functionality

4. **Check Build**
   - Execute: `pnpm build`
   - Ensure production build succeeds
   - No build errors or warnings

5. **Format Code**
   - Prettier runs automatically on commit via lint-staged
   - Can manually run: `prettier --write .`

## Additional Checks for Feature Development

- Update relevant type definitions in `/src/types`
- Add appropriate error handling
- Consider adding e2e tests with Playwright
- Update documentation if needed
- Check for security implications
- Verify Supabase RLS policies if database-related

## TDD Approach (from development_guide.md)

- Follow Red-Green-Refactor cycle
- Write failing test first
- Implement minimal code to pass
- Refactor for quality
- Maintain test coverage
