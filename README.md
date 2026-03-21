# Seam

A lightweight, open-source MCP server that gives AI agents shared project context over a network.

AI agents lose context between sessions and can't share it across machines. When two people's agents work on the same project, each starts cold -- re-reading files, re-building mental models, unaware of decisions the other has already made. Seam gives agents a shared place to read and write project-level understanding. An agent starts up, pulls shared context, and immediately knows how to approach the work. During its session, it writes back what it's learned for the next agent. A remote, collaborative CLAUDE.md.

## Quick Start

### Path A: Connect to an existing server

A teammate has already deployed Seam. They give you the server URL and bootstrap token.

**1. Register:**

```bash
curl -X POST https://your-server.example.com/register \
  -H "Content-Type: application/json" \
  -d '{"bootstrap_token": "boot_...", "display_name": "your-name"}'
```

You'll receive an API key: `sk_your-name_...`

**2. Add to Claude Code:**

```bash
claude mcp add seam --transport url \
  --url "https://your-server.example.com/mcp" \
  --header "Authorization: Bearer sk_your-name_..."
```

**3. Start a session.** The agent discovers Seam's tools automatically. No further configuration needed.

### Path B: Deploy your own server

**Run locally:**

```bash
git clone https://github.com/Aedrand/seam.git
cd seam
npm install
npm run dev
```

On first startup, the server prints a bootstrap token:

```
====================================
Bootstrap token: boot_a7f3...
Share this with your team to register.
====================================
```

Share this with your team. Register and add to Claude Code the same way as Path A, using `http://localhost:3000` as the server URL.

**Deploy to Railway (production):**

Prerequisites: [Railway](https://railway.com) account and [Railway CLI](https://docs.railway.com/reference/cli-api) installed.

```bash
railway login
railway init
railway link
railway service <service-name>
railway volume add --mount-path /data
railway up
railway domain
```

Set the database path to the persistent volume and port if needed:

```bash
railway variables set SEAM_DB_PATH=/data/seam.db
railway variables set PORT=3000
```

Get the bootstrap token from the deploy logs:

```bash
railway logs
```

Register and add to Claude Code using the domain Railway assigned.

## How It Works

Seam stores shared context as an **index** plus **sections**.

The **index** is a small pointer file loaded on startup. It lists every section of shared context with a description, author, timestamp, and version number. The descriptions tell agents what each section contains and when they should read it.

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

### current-status (v5)
Who's working on what, what's done, what's in progress, what's
blocked. Read this on startup to understand where things stand
and avoid duplicating work.
*sarah, 2026-03-20*
```

The index is small enough to always fit in context. The actual content lives in separate **sections** -- freeform prose written by agents, for agents. Sections cover things like design philosophy, architectural decisions, constraints, current status, and the "why" behind patterns. Agents read only the sections relevant to their current task.

The index refreshes automatically -- every `read_section` call returns the current index alongside the section content. Agents stay up to date as a side effect of doing their normal work.

## MCP Tools

### Context Tools

**`get_index()`** -- Call this at the start of every session to see what shared project context is available for your workspace. Returns section names, descriptions, authors, timestamps, and version numbers. Use the descriptions to decide which sections are relevant to your current task -- you don't need to read them all.

**`read_section(name)`** -- Read the full content of a shared context section. Also returns a fresh copy of the index so you stay current on what's available. Only read sections relevant to your current task.

**`write_section(name, content, description, expected_version?)`** -- Create or update a section of shared project context. For new sections, omit expected_version. For updates, include the version number you last read -- if someone else has updated it since, the write will fail and you should re-read before trying again. Write context that would help the next agent working on this project: design decisions, conventions, status, constraints -- the understanding that isn't in the code. Each section should cover one topic and stay concise.

**`delete_section(name, expected_version)`** -- Remove a section of shared context that is no longer relevant. Requires the version number you last read to prevent deleting a section that has been updated since you read it.

### Workspace Tools

**`create_workspace(name)`** -- Create a new shared context workspace and automatically join it. Use workspaces to separate context by project.

**`join_workspace(name)`** -- Join an existing workspace to access its shared context. Sets this as your active workspace.

**`list_workspaces()`** -- List all workspaces you have joined.

**`set_workspace(name)`** -- Switch your active workspace. All subsequent context operations will use this workspace. You must have already joined the workspace.

## Workspaces

All context is scoped to a workspace. Agents in one workspace can't see another workspace's sections or index.

- Any registered user can create workspaces. No admin, no ownership.
- Any registered user can join any workspace by name. No invite required.
- One identity works across all workspaces on the server. Register once, join as many workspaces as needed.
- The agent operates in one workspace at a time. Switching projects means changing the workspace in the MCP config, or having separate MCP server entries per project.

You can set a default workspace in the MCP URL:

```
https://your-server.example.com/mcp?workspace=dashboard-redesign
```

## API

### `POST /register`

Register a new user with the bootstrap token. This is the only REST endpoint -- everything else goes through MCP.

**Request:**

```json
{
  "bootstrap_token": "boot_...",
  "display_name": "andrew"
}
```

**Response:**

```json
{
  "api_key": "sk_andrew_..."
}
```

Display names are unique and immutable. The API key is your permanent credential.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `SEAM_PORT` | `3000` | Server port (alias) |
| `SEAM_DB_PATH` | `./seam.db` | Path to the SQLite database file |

### CLI Commands

Regenerate the bootstrap token (existing registrations and API keys remain valid):

```bash
npm run cli -- regenerate-token
```

## Development

```bash
npm run dev        # Start development server (tsx)
npm test           # Run tests (vitest)
npm run build      # Build for production (tsup)
```

## License

MIT
