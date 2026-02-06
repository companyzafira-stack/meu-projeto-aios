# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AIOS-FullStack** is an AI-Orchestrated System for Full Stack Development that combines agile methodology with AI-driven execution. The framework orchestrates 11 specialized agents (@dev, @qa, @architect, @pm, @po, @sm, @analyst, @devops, @data-engineer, @ux-design-expert, @aios-master) through document-driven workflows and detailed stories.

Core value proposition: Eliminates planning inconsistency and context loss through structured, role-based development and story-based implementation.

## Architecture Overview

### Directory Structure

```
.aios-core/
├── cli/                    # CLI interface (Commander.js)
├── core/                   # Runtime engine
│   ├── config/            # Lazy-loading config cache
│   ├── orchestration/      # Master orchestrator for multi-agent workflows
│   ├── execution/          # Build orchestration & execution
│   ├── quality-gates/      # Validation layers
│   ├── elicitation/        # Interactive workflow engine
│   ├── registry/           # Service discovery
│   └── session/            # Context detection & persistence
├── infrastructure/         # Tools, integrations, PM adapters (80+ scripts)
├── development/            # Agents, tasks, workflows, templates
│   ├── agents/            # 11 agent definitions (Markdown + YAML)
│   ├── tasks/             # 115+ task definitions
│   ├── workflows/         # 7+ multi-step workflows
│   ├── templates/         # Document templates
│   └── scripts/           # Support utilities
├── product/               # PM/PO static assets (52+ templates, 8 checklists)
├── data/                  # Framework knowledge bases
└── scripts/               # Installation, migration utilities

docs/
├── stories/               # Development stories (active development)
├── prd/                   # Product requirements (sharded by epic)
├── architecture/          # System architecture
└── framework/             # Coding standards, tech stack, source tree

.claude/
├── rules/                 # MCP governance and tool usage rules (IMPORTANT)
└── CLAUDE.md              # Agent-specific context and patterns

.aios/
├── project-status.yaml    # Auto-loaded git and story context
└── decision-logs-index.md # Architecture Decision Records (ADRs)
```

### Sub-Project Structure

**`.aios-core/` is a separate Node.js package** with its own:
- `package.json` (`@aios-fullstack/core` v4.31.0+)
- Build system: `npm run build` compiles the core module
- TypeScript: `npm run typecheck` validates types
- Tests: `npm run test` runs unit and integration tests in `tests/` subdirectory

When modifying `.aios-core/`, always run tests from the core directory to ensure the module builds correctly.

### How the Framework Works

**Three-Phase Development Model:**

1. **Planning Phase**: Agents collaborate to create detailed PRD and architecture specs (uses large context models)
2. **Story Creation Phase**: Scrum Master (@sm) creates hyperdetailed stories with complete implementation context
3. **Development Phase**: Dev agent (@dev) executes stories using story files as single source of truth

**Story-Driven Execution Flow:**
- Read story with acceptance criteria (YAML frontmatter in story file)
- Implement features exactly to spec
- Update "File List" section in story as you modify files
- Mark checkboxes as tasks complete: `[ ] → [x]`
- Commit with story reference: `feat: implement story [Story-ID]`
- Update story status to "In Review" when ready for QA

**Story File Structure Example:**
```yaml
---
story_id: STORY-123
status: In Progress
epic: Core Platform
priority: High
acceptance_criteria:
  - Implement user authentication
  - Add JWT token support
  - Create /auth endpoint
scope: Backend API
dependencies:
  - STORY-110
  - STORY-115
constraints:
  - Must use Node.js 18+
  - No external auth services
---

# [Story Title]

## Summary
[1-2 sentence description]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## File List
[Auto-maintained list of modified files]
```

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Node.js 18+ | Runtime |
| Commander.js | CLI framework |
| YAML (js-yaml) | Configuration format |
| Markdown | Documentation & agent/task definitions |
| Jest | Testing framework |
| ESLint | Code linting |
| TypeScript | Type checking |
| GitHub CLI (gh) | Git integration |
| ClickUp/GitHub/Jira | Project management adapters |

## Essential Commands

### Core Development Commands

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Type checking
npm run typecheck

# Linting
npm run lint

# Build the core module
npm run build
```

### AIOS CLI Commands

```bash
# Validate project manifest
npx aios manifest validate

# Regenerate install manifest
npx aios manifest regenerate

# Run quality gates
npx aios qa run

# Check QA status
npx aios qa status

# Search available workers
npx aios workers search

# Setup/manage MCP configuration
npx aios mcp setup
npx aios mcp link

# Migrate to new version
npx aios migrate --from=2.0 --to=2.1

# Generate documents (PRD, ADR, PMDR)
npx aios generate prd
npx aios generate adr
npx aios generate pmdr
```

## Development Workflow

### When Implementing a Story (@dev Agent)

1. **Load the Story Context**
   - Story file is in `docs/stories/` with complete acceptance criteria
   - YAML frontmatter contains scope, dependencies, constraints
   - File List section tracks all modified files

2. **Read Project Standards**
   - Reference `docs/framework/coding-standards.md` for code conventions
   - Check `docs/framework/tech-stack.md` for technology decisions
   - Review `docs/framework/source-tree.md` for file organization

3. **Implement the Feature**
   - Follow existing code patterns in the codebase
   - Write code that's self-documenting (avoid over-commenting)
   - Keep implementations focused and testable

4. **Test Your Work**
   - Create/update tests to verify acceptance criteria
   - Run `npm run test:unit` before marking complete
   - Verify `npm run typecheck` and `npm run lint` pass

5. **Update Story Tracking**
   - Update File List in story with all modified files
   - Mark task checkboxes complete as you finish them
   - Commit with: `feat: implement story [Story-ID] - [brief description]`
   - Update story status to "In Review"

### Quality Gate Process (@qa Agent)

Quality gates validate stories through:
- **Pre-commit layer**: Basic syntax, linting, types
- **PR automation**: Code review patterns, test adequacy, acceptance criteria
- **Human review**: Architecture alignment, security, performance

## Important Framework Patterns

### Agent System
- Agents are activated with `@agent-name` (e.g., `@dev`, `@qa`, `@architect`)
- Each agent is defined in `.aios-core/development/agents/` as Markdown with YAML frontmatter
- Agent commands use `*` prefix: `*help`, `*create-story`, `*task`, `*workflow`

### Task Execution
- Tasks are Markdown files in `.aios-core/development/tasks/` with YAML frontmatter
- Key properties:
  - `elicit: true/false` - Whether task requires user input
  - `mode: yolo|interactive|preflight` - Execution mode
  - `atomic_layer` - Complexity level
- Tasks contain pre-conditions, steps, and acceptance criteria

### Workflow System
- Multi-step orchestrations in `.aios-core/development/workflows/`
- Key workflows:
  - `story-development-cycle` - Standard SM → PO → Dev → QA flow
  - `greenfield-fullstack` - New project setup and execution
  - `brownfield-fullstack` - Existing project enhancement
  - `spec-pipeline` - Requirements → Architecture → Specs

## Configuration

### Core Configuration
- **`.aios-core/core-config.yaml`**: Framework settings
  - IDE selection (Claude Code, Cursor, Windsurf, Trae)
  - MCP server configuration
  - Document locations (PRD, architecture, stories)
  - Dev loading preferences

### Environment Setup
- **`.env`**: Environment variables (git credentials, API keys, etc.)
- **Agent config**: `agent-config-requirements.yaml` with performance targets
- **Tech stack**: `docs/framework/tech-stack.md` contains technology decisions

### MCP (Model Context Protocol)
- MCP governance is handled by @devops agent only
- Native Claude Code tools (Read, Write, Bash, Grep) are preferred over docker-gateway for local operations
- Configure MCPs in `.claude/mcp.json` or via `aios mcp setup`
- **CRITICAL**: Read `.claude/rules/mcp-usage.md` for strict MCP governance rules, tool selection priority, and docker-gateway usage constraints

## Decision Logging & Architecture Records

This project uses Architecture Decision Records (ADRs) for tracking important technical decisions:

- **Location**: `.aios/decision-logs-index.md` (index) and `.aios/*.md` (individual records)
- **Format**: ADR (Architecture Decision Record) style
- **Auto-logging**: Decision logging is enabled and configured to run asynchronously
- **When to log**: Document decisions about architecture, significant refactors, technology choices, and important constraints
- **Performance**: Configured with minimal overhead (max 50ms per decision)

Example command to generate decision records:
```bash
npx aios generate adr
```

When implementing stories that involve architectural decisions, ensure they're logged in the ADR format for future reference.

## Development Best Practices

### Code Quality
- Write self-documenting code with clear naming
- Keep functions focused and testable
- Don't add unnecessary comments or over-engineer
- Follow existing patterns in the codebase
- Validate only at system boundaries (user input, external APIs)

### Testing Requirements
- Tests are mandatory before marking stories complete
- Use Jest for all test files
- Test edge cases and error scenarios
- Run `npm test` incrementally during development

### Git & Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Always reference the story ID: `feat: implement story SC-123 [description]`
- Keep commits atomic and focused
- Use GitHub CLI (gh) for PR operations: `gh pr create`

### Error Handling
- Provide clear, actionable error messages
- Include error context in logs
- Handle edge cases in stories with acceptance criteria
- Recovery strategies documented in story failure scenarios

### Documentation
- Update relevant docs when changing functionality
- Keep README synchronized with actual behavior
- Add examples to documentation for complex features
- Document breaking changes prominently

## Claude Code Specific Guidelines

### Tool Usage
- Use `Read` for file operations, not `cat` or `head`
- Use `Edit` for modifications, not `sed` or `awk`
- Use `Bash` for actual system commands (git, npm, docker, etc.)
- Use `Grep` for content search, not `grep` or `rg`
- Use `Glob` for file discovery, not `find` or `ls`

### Performance
- Batch file reads/writes when processing multiple files
- Use parallel tool calls for independent operations
- Cache frequently accessed configuration during sessions

### Session Management
- Track story progress throughout the session
- Update checkboxes immediately after completing tasks
- Maintain context of current story being worked on
- Save important state before long-running operations

### When Working with Stories
- Always read the complete story file first
- Never propose changes without reading relevant files
- Understand acceptance criteria before implementing
- Update File List in story as you modify files
- Verify all quality gates pass before marking complete

## Helpful References

- **User Guide**: `.aios-core/user-guide.md` - Complete framework tutorial
- **Brownfield Guide**: `.aios-core/working-in-the-brownfield.md` - Working with existing code
- **Agent Definitions**: `.aios-core/development/agents/` - Agent personas and commands
- **Task Definitions**: `.aios-core/development/tasks/` - Available tasks and workflows
- **Workflow Examples**: `.aios-core/development/workflows/` - Multi-step workflow patterns
- **MCP Governance Rules**: `.claude/rules/mcp-usage.md` - Critical tool selection and MCP usage constraints
- **Agent Context**: `.claude/CLAUDE.md` - Agent-specific development patterns and commands
- **Decision Records**: `.aios/decision-logs-index.md` - Architecture decisions and design rationale

## Debugging & Troubleshooting

### Enable Debug Mode
```bash
export AIOS_DEBUG=true
```

### Check Project Status
```bash
# View current story and epic context
aios status
```

### Validate Configuration
```bash
# Ensure config is properly loaded
aios manifest validate

# Regenerate manifest if needed
aios manifest regenerate
```

### Test Framework
```bash
# Run specific test file
npm test -- path/to/test.spec.js

# Run with coverage
npm test -- --coverage
```

## Project Status Tracking

Project context is automatically loaded and maintained through `.aios/project-status.yaml`:

**Auto-loaded Components:**
- Current git branch
- Modified files (up to 5)
- Recent commits (up to 2)
- Active epic
- Active story

**What This Means for Claude Code:**
- Status loads automatically on agent activation (if configured)
- Helps maintain context across sessions about ongoing work
- Cache is refreshed every 60 seconds
- Reduces need to manually re-specify current story/epic
- Visible in greeting messages to provide immediate context

**Keeping Status Updated:**
- Git operations automatically update branch/commit tracking
- Story status changes are reflected when you update story YAML frontmatter
- Active story/epic is detected from current branch or explicit story updates
