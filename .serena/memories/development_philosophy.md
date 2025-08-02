# Development Philosophy and Guidelines

## TDD-Driven Development with AI Assistance
Based on the development_guide.md, this project follows a strict TDD approach with AI assistance:

### Core Philosophy
**"Gemini collects, Claude crafts, TDD steers, and Hooks guarantees."**
- Use Gemini for research and analysis
- Use Claude for TDD implementation
- Let Code Hooks enforce quality automatically

### TDD Cycle (Red-Green-Refactor)
1. **Red**: Write a failing test first
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Improve code quality while keeping tests green

### Code Hooks Integration
The project uses Claude Code Hooks for automatic quality enforcement:
- Auto-run tests on test file changes
- Auto-format and lint on file saves
- Enforce full CI pipeline on task completion
- Target 100% test coverage

### Key Principles
1. **No `any` types** - TypeScript strict mode enforced
2. **No skipped tests** - All tests must run and pass
3. **Test-first approach** - Never write implementation before tests
4. **Automated quality** - Let hooks handle mechanical checks
5. **Clean commits** - Prettier formats on commit via lint-staged

### Database Development
- Use Supabase with Row Level Security (RLS)
- Schema defined in `V1_init_schema.sql`
- Test database operations thoroughly
- Consider RLS policies in all queries

### Security Considerations
- Never commit secrets or API keys
- Use environment variables for sensitive data
- Implement proper authentication checks
- Follow least-privilege principles