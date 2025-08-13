# Gemini CLI Integration Setup Guide

## Overview

This document explains how to set up Gemini CLI integration for the TDD-driven development workflow as described in `development_guide.md`.

## Current Status

❌ **Gemini CLI not yet installed** - Installation blocked by npm issues in current environment

## Setup Steps (To be completed)

### 1. Install Gemini CLI

```bash
# Option 1: Official Google package
npm install -g @google/gemini-cli

# Option 2: MCP server integration
npm install gemini-cli-mcp-node
```

### 2. Configure API Key

```bash
# Set up Google AI API key
export GOOGLE_AI_API_KEY="your-api-key-here"

# Or create .env.local entry
echo "GOOGLE_AI_API_KEY=your-api-key-here" >> .env.local
```

### 3. Test Installation

```bash
# Verify gemini command works
gemini --version

# Test basic functionality
gemini "Hello, can you help with code analysis?"
```

## Integration with Development Workflow

### Role Distribution (As per development_guide.md)

- **Gemini:** Research, analysis, large codebase review
- **Claude:** TDD implementation, feature development
- **Code Hooks:** Quality assurance, process enforcement

### Usage Patterns

#### ✅ When to Use Gemini

- **Refactor Phase:** Complex refactoring analysis
- **Research:** Latest API documentation, best practices
- **Code Review:** Objective analysis of code quality
- **Architecture:** Large-scale system design decisions

#### ❌ When NOT to Use Gemini

- **Red Phase:** Writing failing tests (Claude focus)
- **Green Phase:** Making tests pass (Claude focus)
- **Simple fixes:** Basic bug fixes and minor changes

### Command Examples (Future)

```bash
# Code analysis
gemini-analyze "Review this service layer for potential improvements"

# Research
gemini-search "Next.js 14 performance optimization patterns"

# Refactoring guidance
gemini "Suggest improvements for this React component structure"
```

## Current Configuration

### Claude Code Hooks (Already Configured)

- ✅ TDD workflow hooks in `.claude/settings.local.json`
- ✅ Gemini command permissions added
- ✅ Red-Green-Refactor automation
- ✅ Stop hooks for CI pipeline

### Collaboration Policy (Already Configured)

- ✅ Gemini delegation rules in `.claude/claude.md`
- ✅ TDD-first philosophy maintained
- ✅ Quality gates defined

## Next Steps

1. **Resolve npm issues** in development environment
2. **Install Gemini CLI** using working package manager
3. **Configure API credentials** for Google AI
4. **Test integration** with sample commands
5. **Update this document** with working examples

## Benefits Once Implemented

- **Faster research:** Gemini handles information gathering
- **Better refactoring:** Expert analysis for complex changes
- **Quality assurance:** Objective code review feedback
- **Productivity:** Claude focuses on TDD, Gemini on analysis

## References

- `development_guide.md` - Original TDD + Gemini workflow
- `.claude/settings.local.json` - Hook configurations
- `.claude/claude.md` - Collaboration policies
