# Seam — Agent Guide

Seam is a lightweight MCP server for sharing project context between AI agents. If you're an agent reading this, here's what you need to know.

## What Seam Does

Seam gives agents a shared place to read and write project-level understanding — design decisions, conventions, current status, constraints, and the "why" behind patterns. Context is stored as markdown sections with version checking to prevent conflicts.

## How to Connect

You need an MCP server entry pointing to a Seam instance. Your human sets this up with `claude mcp add`. Once connected, you'll have access to 11 tools.

## Tools

### On Startup
- `get_index()` — See what shared context exists. Call this first.
- `resolve_project(project_path)` — Auto-activate a workspace linked to your working directory.

### Reading Context
- `read_section(name)` — Read a section's content. Also returns a fresh index.

### Writing Context
- `write_section(name, content, description, expected_version?)` — Create or update a section. Always confirm with the user before writing. Section names must be lowercase alphanumeric with hyphens.

### Managing Sections
- `delete_section(name, expected_version)` — Remove a section. Version check required.

### Workspaces
- `create_workspace(name)` — Create and join a workspace.
- `join_workspace(name)` — Join an existing workspace.
- `list_workspaces()` — See all workspaces and your membership status.
- `set_workspace(name)` — Switch active workspace.

### Project Linking
- `link_project(project_path, workspace)` — Link a directory to a workspace for auto-activation.
- `unlink_project(project_path)` — Remove a link.

## Guidelines

- Call `get_index()` before writing to avoid creating sections that overlap with existing ones.
- Never write to Seam silently — tell the user what you're writing and why.
- Keep sections focused on one topic. Write the "why", not the "what" — the code captures what was built, Seam captures why.
- Use version numbers when updating. If you get a version conflict, re-read and incorporate the other agent's changes.

## Contributing to This Project

- TypeScript, Express, SQLite via better-sqlite3
- Tests: `npm test` (vitest)
- Build: `npm run build` (tsup)
- Two-layer architecture: core logic in `src/core/`, transport adapters in `src/mcp/` and `src/http/`. Core never imports from transport.
