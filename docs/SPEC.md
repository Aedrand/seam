# Seam — MVP Specification

Implementation spec for the Seam MVP. Covers everything needed to build the system described in VISION.md.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **HTTP framework:** Express
- **MCP SDK:** `@modelcontextprotocol/sdk` (Streamable HTTP transport)
- **Database:** `better-sqlite3` (synchronous SQLite driver)
- **Build:** `tsup` for bundling, `tsx` for development
- **Test:** `vitest`
- **No ORM.** Raw SQL with `better-sqlite3` — the schema is small enough that an ORM adds complexity without value.

## Architecture

Two-layer design separating business logic from transport:

- **Core layer** (`src/core/`) — Pure business logic. No knowledge of MCP or HTTP. Functions like `getIndex(workspaceId)`, `writeSection(...)`. Testable in isolation.
- **Transport layer** (`src/mcp/`, `src/http/`) — Thin adapters that handle MCP tool calls and HTTP requests by calling into core functions.

Core never imports from transport. Transport is a thin wrapper around core.

### Deployment

Network-first. The server speaks HTTP and is designed to run behind a reverse proxy (Caddy, nginx, Cloudflare) that handles TLS. The server itself does not manage certificates.

```
Internet (HTTPS) → Reverse proxy (terminates TLS) → Seam server (HTTP)
```

### Single-Instance Server

Seam runs as a single Node.js process. SQLite is single-writer — multiple server instances behind a load balancer are not supported. Scale vertically, not horizontally. This is sufficient for the target audience of small teams (2-10 agents).

### Express + MCP Integration

Express serves as the single HTTP server. The MCP SDK's Streamable HTTP transport is mounted as Express middleware at `/mcp`. The REST registration endpoint is a standard Express route at `/register`. One process, one port, two concerns.

## Project Structure

```
seam/
├── src/
│   ├── core/
│   │   ├── auth.ts          # Registration, API key validation, bootstrap token
│   │   ├── sections.ts      # CRUD, version checking, index generation
│   │   └── workspaces.ts    # Create, join, list, session state
│   ├── db/
│   │   ├── schema.ts        # Table creation, migrations
│   │   └── connection.ts    # SQLite setup and configuration
│   ├── mcp/
│   │   ├── server.ts        # MCP server setup and transport
│   │   ├── tools.ts         # Tool definitions and descriptions
│   │   └── handlers.ts      # Tool handlers (thin wrappers around core)
│   ├── http/
│   │   └── routes.ts        # REST endpoints (registration)
│   └── index.ts             # Entry point, wires everything together
├── tests/
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Database Schema

```sql
-- Server configuration (bootstrap token, etc.)
CREATE TABLE server_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Registered users
CREATE TABLE users (
    id TEXT PRIMARY KEY,        -- UUID
    display_name TEXT NOT NULL UNIQUE,
    api_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL     -- ISO 8601
);

-- Workspaces
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,        -- UUID
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

-- Workspace membership
CREATE TABLE workspace_members (
    user_id TEXT NOT NULL REFERENCES users(id),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    joined_at TEXT NOT NULL,
    PRIMARY KEY (user_id, workspace_id)
);

-- Sections (shared context)
CREATE TABLE sections (
    id TEXT PRIMARY KEY,        -- UUID
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    author_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (workspace_id, name)
);
```

Design notes:
- **Text for IDs** — UUIDs as text. Simple, no auto-increment conflicts.
- **Text for timestamps** — ISO 8601 strings. SQLite has no native datetime; ISO strings sort correctly and are human-readable.
- **`UNIQUE (workspace_id, name)`** — Section names unique per workspace, enforced at the database level.
- **Current state only** — No version history. Old content is overwritten on update.
- **Hard deletes** — Deleted sections are removed from the database.

## REST API

One endpoint, outside of MCP. Registration must happen before an agent has MCP credentials.

### `POST /register`

```
Request:  { "bootstrap_token": "boot_...", "display_name": "andrew" }
Response: { "api_key": "sk_andrew_..." }
```

- Validates bootstrap token against stored value
- Fails if display name is already taken
- Returns a new API key

**Key formats:**
- Bootstrap token: `boot_{random}`
- API key: `sk_{display_name}_{random}`

The prefixes make keys human-identifiable in configs. Not a security feature, just ergonomics.

## MCP Tools

Eight tools total. Descriptions are behavioral — they encode *when* and *why* to use each tool, not just what it does. This is the primary mechanism for teaching agents how to use Seam.

### Context Tools

#### `get_index()`

**Description:** *"Call this at the start of every session to see what shared project context is available for your workspace. Returns section names, descriptions, authors, timestamps, and version numbers. Use the descriptions to decide which sections are relevant to your current task — you don't need to read them all."*

**Parameters:** None

**Returns:** Markdown-formatted index (see Index Format below).

---

#### `read_section(name)`

**Description:** *"Read the full content of a shared context section. Also returns a fresh copy of the index so you stay current on what's available. Only read sections relevant to your current task."*

**Parameters:**
- `name` (string, required) — Section name from the index

**Returns:** JSON with `content`, `version`, and `index` fields. The `content` is the section's markdown prose. The `index` is the full markdown-formatted index (see Index Format). Fails with `section_not_found` if section doesn't exist.

**Response shape:**
```json
{
  "content": "Dense, scan-optimized dashboard for...",
  "version": 2,
  "index": "## Shared Context — dashboard-redesign\n\n### design-philosophy (v2)\n..."
}
```

---

#### `write_section(name, content, description, expected_version?)`

**Description:** *"Create or update a section of shared project context. For new sections, omit expected_version. For updates, include the version number you last read — if someone else has updated it since, the write will fail and you should re-read before trying again. Write context that would help the next agent working on this project: design decisions, conventions, status, constraints — the understanding that isn't in the code. Each section should cover one topic and stay concise."*

**Parameters:**
- `name` (string, required) — Section name
- `content` (string, required) — Markdown prose
- `description` (string, required) — What appears in the index. Should explain both what's in the section and when future agents should read it.
- `expected_version` (integer, optional) — Required for updates, omit for new sections

**Returns:** JSON with `version` and `index` fields. Returns the fresh index so the agent stays current after writes. Fails on version mismatch.

**Response shape:**
```json
{
  "version": 3,
  "index": "## Shared Context — dashboard-redesign\n\n..."
}
```

**Behavior:**
- If `expected_version` is omitted and the section doesn't exist → create at version 1
- If `expected_version` is omitted and the section exists → fail (`section_exists`)
- If `expected_version` is provided and matches → update, increment version
- If `expected_version` is provided and doesn't match → fail (`version_conflict`)

---

#### `delete_section(name, expected_version)`

**Description:** *"Remove a section of shared context that is no longer relevant. Requires the version number you last read to prevent deleting a section that's been updated since you read it."*

**Parameters:**
- `name` (string, required) — Section name
- `expected_version` (integer, required) — Version number the agent last read

**Returns:** JSON with `index` field (fresh index reflecting the deletion). Fails with `section_not_found` if section doesn't exist, `version_conflict` if version doesn't match.

**Response shape:**
```json
{
  "index": "## Shared Context — dashboard-redesign\n\n..."
}
```

### Workspace Tools

#### `create_workspace(name)`

**Description:** *"Create a new shared context workspace and automatically join it. Use workspaces to separate context by project."*

**Parameters:**
- `name` (string, required) — Workspace name

**Returns:** Confirmation. Automatically sets this as the active workspace. Fails if name already exists.

---

#### `join_workspace(name)`

**Description:** *"Join an existing workspace to access its shared context. Sets this as your active workspace."*

**Parameters:**
- `name` (string, required) — Workspace name

**Returns:** Confirmation. Sets this as the active workspace. Fails if workspace doesn't exist. If the user has already joined, silently succeeds and sets the active workspace (acts like `set_workspace`).

---

#### `list_workspaces()`

**Description:** *"List all workspaces you've joined."*

**Parameters:** None

**Returns:** List of workspace names.

---

#### `set_workspace(name)`

**Description:** *"Switch your active workspace. All subsequent context operations will use this workspace. You must have already joined the workspace."*

**Parameters:**
- `name` (string, required) — Workspace name

**Returns:** Confirmation. Fails if not a member.

## Authentication & Session State

### Auth Model

- Every MCP connection authenticates via API key in the `Authorization` header
- The server validates the key on every call and identifies the user
- No tokens, no sessions, no expiry — the API key is the credential for the life of the connection

### MCP Configuration

```json
{
  "mcpServers": {
    "seam": {
      "url": "https://seam.example.com/mcp",
      "headers": {
        "Authorization": "Bearer sk_andrew_..."
      }
    }
  }
}
```

With a default workspace (via query parameter):

```json
{
  "mcpServers": {
    "seam": {
      "url": "https://seam.example.com/mcp?workspace=dashboard-redesign",
      "headers": {
        "Authorization": "Bearer sk_andrew_..."
      }
    }
  }
}
```

### Session State

- **Active workspace** is stored in memory on the server, keyed to the MCP session ID (the `Mcp-Session-Id` header that Streamable HTTP transport uses to correlate requests)
- On new session with no default workspace, no workspace is active
- `create_workspace()` and `join_workspace()` both auto-set the active workspace
- Any context tool called without an active workspace returns `no_active_workspace`

**Default workspace from config:** The MCP config can include a workspace name as a query parameter on the URL:

```json
{
  "mcpServers": {
    "seam": {
      "url": "https://seam.example.com/mcp?workspace=dashboard-redesign",
      "headers": {
        "Authorization": "Bearer sk_andrew_..."
      }
    }
  }
}
```

When present, the server auto-sets the active workspace on session initialization if the user is a member.

**Server restart:** Session state is in-memory only. If the server restarts, all active workspace state is lost. Agents will receive `no_active_workspace` on their next call and must call `set_workspace()` (or `join_workspace()`) to recover. The default workspace query parameter mitigates this — agents with it configured will auto-recover on the next MCP session.

## Error Handling

Consistent error format across all MCP tool responses:

```json
{
  "error": "error_code",
  "message": "Human-readable explanation for the agent"
}
```

### Error Codes

| Code | When | HTTP Equiv |
|------|------|-----------|
| `unauthorized` | Invalid or missing API key | 401 |
| `no_active_workspace` | Context tool called without setting a workspace | 400 |
| `not_member` | Operating in a workspace you haven't joined | 403 |
| `workspace_exists` | Creating a workspace that already exists | 409 |
| `workspace_not_found` | Joining/setting a workspace that doesn't exist | 404 |
| `section_not_found` | Reading/deleting a section that doesn't exist | 404 |
| `section_exists` | Creating a section that already exists | 409 |
| `version_conflict` | `expected_version` doesn't match current version | 409 |
| `display_name_taken` | Registering with a name already in use | 409 |
| `invalid_bootstrap_token` | Wrong bootstrap token on registration | 401 |
| `invalid_name` | Section or workspace name doesn't match `[a-z0-9][a-z0-9-]*` | 400 |

### Version Conflict Response

Version conflicts include extra context for recovery:

```json
{
  "error": "version_conflict",
  "message": "Section has been updated since you last read it. Re-read and try again.",
  "current_version": 3,
  "your_version": 2
}
```

All error messages are written for agents — clear enough that an LLM can understand and act on them without human interpretation.

## Index Format

The index is markdown, returned by `get_index()` and alongside every `read_section()` response.

```markdown
## Shared Context — dashboard-redesign

### design-philosophy (v2)
Dense, scan-optimized dashboard for financial analysts. Covers
the overall aesthetic direction, target users, design principles,
and tradeoffs we've explicitly chosen (density over whitespace,
speed over beauty). Read this before making any visual or layout
decisions.
*andrew, 2026-03-18*

### component-conventions (v1)
Vue 3 component patterns and naming. Covers composable structure,
prop naming, event patterns, Tailwind usage conventions, and file
organization. Read this before creating new components or
refactoring existing ones.
*sarah, 2026-03-19*
```

**Name validation:** Section and workspace names must be lowercase alphanumeric with hyphens only (`/^[a-z0-9][a-z0-9-]*$/`). This ensures names are valid markdown heading identifiers and URL-safe. Invalid names return a clear error.

**Author rendering:** The index shows display names (e.g., `*andrew*`), not user IDs. The server joins against the users table when generating the index.

Design decisions:
- **Markdown, not JSON** — agents parse markdown naturally, token-efficient
- **Workspace name in the header** — reinforces which workspace the agent is in
- **Version in the heading** — visible without reading the section
- **Description is the body** — drives retrieval decisions, gets the most space
- **Author + date as footer** — useful for recency, secondary to description
- **Empty workspace:** `## Shared Context — {name}\n\nNo sections yet.`

## Bootstrap & Server Startup

### First-Time Startup

1. Server starts, checks `server_config` for a bootstrap token
2. No token → generates one, stores it, prints to stdout:
   ```
   ====================================
   Bootstrap token: boot_a7f3...
   Share this with your team to register.
   ====================================
   ```
3. Also writes to `~/.seam/bootstrap-token` (convenience for the server operator — the token still needs to be shared with the team manually)
4. Server begins accepting connections

### Subsequent Startups

Token exists, server starts normally, no output.

### Token Regeneration

CLI command: `seam regenerate-token`
- Invalidates the old token, generates a new one, prints it
- Existing registrations and API keys remain valid

### Configuration

Environment variables only, no config file:

```
SEAM_PORT=3000          # default: 3000
SEAM_DB_PATH=./seam.db  # default: ./seam.db
```
