# Seam

A lightweight, open-source MCP server that gives AI agents shared project context over a network. A remote, collaborative CLAUDE.md.

## Motivation

AI agents lose context between sessions and can't share it across machines. When two people's agents work on the same project, each starts cold — re-reading files, re-building mental models, unaware of decisions the other has already made.

The information agents need most isn't in the code. It's the stuff that isn't written down anywhere: design philosophy, why a pattern was chosen, what's been tried and rejected, who's responsible for what, what's coming next. This is the context that makes an agent effective from the first minute instead of the first hour.

Seam gives agents a shared place to read and write this project-level understanding. An agent starts up, pulls shared context, and immediately knows how to approach the work. During its session, it writes back what it's learned for the next agent.

## Values

**Lightweight.** A single server, a few MCP tools, a SQLite database. No embeddings, no knowledge graphs, no semantic search, no LLM on the server. If it can't be understood in 10 minutes, it's too complex.

**Readable.** Context is stored as structured data but delivered to agents as markdown — the format they parse most naturally. Humans can read it too.

**Peer-to-peer.** Any agent can read and write. No hierarchy, no ownership, no admin role. The shared context belongs to the project, not to any individual.

**Open.** MIT licensed. The simplest possible foundation for agents to stay in sync.

## How It Works

### The Index

A small pointer file that's always loaded on startup. Lists every section of shared context with a description, author, timestamp, and version number. The descriptions tell agents both what's in each section and when they should read it.

```markdown
## Shared Context

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

The index is small enough to always fit in context. The actual content lives in separate sections that get pulled on demand.

### Sections

Individual pieces of shared context. Freeform prose — not key-value pairs, not structured data. Written by agents, for agents, about the high-level understanding that isn't in the code.

Sections cover things like:
- Design philosophy and principles
- Who's responsible for what
- What's been tried and rejected (and why)
- Constraints that aren't obvious from the codebase
- The "why" behind architectural patterns
- Current status and next steps

Agents read only the sections relevant to their current task. Working on the frontend? Read "design-philosophy" and "component-conventions." Skip "api-architecture."

### Staying Current

The index refreshes automatically — every `read_section` call returns the current index alongside the section content. Agents stay up to date as a side effect of doing their normal work.

For agents that go long stretches without reading, `get_index()` is available for an explicit refresh.

## MCP Tools

Tool descriptions are the only configuration needed. Installing the MCP server is the only setup step — the agent learns how to use shared context by reading the tool descriptions, not from CLAUDE.md entries or user instructions. Each description encodes when and why to use that tool.

### `get_index()`
Returns the current index with all section names, descriptions, authors, timestamps, and version numbers. Always small, always safe to call. The tool description tells the agent to call this on startup to see what shared context is available.

### `read_section(name)`
Returns the full content of a section plus its current version number. Also returns a fresh copy of the index so the agent stays current on what sections exist.

Fails if the section name doesn't exist in the index.

### `write_section(name, content, description, expected_version?)`
Creates or updates a section AND its index entry atomically. One operation, both always in sync.

For existing sections, `expected_version` is required. If the section has been modified since the agent last read it, the write fails and the agent must re-read before updating. Prevents silent overwrites of another agent's work.

For new sections, `expected_version` is omitted. The section is created at version 1.

The `description` parameter is what appears in the index — it should explain both what's in the section and when future agents should read it.

Each section should cover one topic and fit comfortably in an agent's context window. If a section is growing unwieldy, split it into focused pieces rather than letting it become a catch-all.

### `delete_section(name, expected_version)`
Removes a section AND its index entry atomically. Version check prevents deleting a section that's been updated since last read.

## Architecture

```
Agent A (Machine 1)  ──── MCP ────┐
                                   ├──→  Context Sync Server (SQLite)
Agent B (Machine 2)  ──── MCP ────┘
```

A lightweight HTTP server backed by SQLite, exposed as an MCP server. Agents connect through their standard MCP configuration. The server runs anywhere both agents can reach.

All writes are serialized through the server. Two agents writing different sections don't conflict. Two agents writing the same section are protected by version checking — if the version has changed since the agent last read, the write fails. The agent re-reads the current version, writes an update that accounts for both its own changes and the other agent's, and tries again.

## Registration

On first startup, the server generates a bootstrap token printed to the console. Share it with your team like a Wi-Fi password. Anyone with the token can register by providing a display name and receiving an API key.

One identity per person, persistent across sessions. The display name is immutable and used for attribution on all writes.

MCP config for an agent:

```json
{
  "api_key": "sk_andrew_...",
  "workspace": "dashboard-redesign"
}
```

## Workspaces

All context is scoped to a workspace. Agents in one workspace can't see another workspace's sections or index.

- **Any registered user can create workspaces.** No admin, no ownership. Matches the peer model.
- **Any registered user can join any workspace by name.** No invite required.
- **One identity works across all workspaces on the server.** Register once, join as many workspaces as needed.
- **The agent operates in one workspace at a time.** Switching projects means changing the workspace in the MCP config, or having separate MCP server entries per project.

## Security

**API keys** control access to the server. Every request must include a valid key. Keys are provisioned during registration and passed to agents through their MCP configuration.

**Workspace scoping** ensures isolation. A valid API key only grants access to workspaces the user has joined. Knowing the server URL and having a key doesn't give access to other teams' workspaces.

**TLS** for all network traffic. The server only accepts HTTPS connections in production. API keys over plain HTTP are credentials in cleartext.

## What This Is Not

This is not a memory system. It doesn't store an agent's conversation history or help it remember across its own sessions. It stores shared project context that any agent can contribute to and benefit from.

This is not a messaging or coordination platform. Agents don't talk to each other through this. They read and write shared context. Communication happens through other channels.

This is not a database of every decision. The code itself captures most decisions. This captures the high-level understanding that isn't in the code — the why, the philosophy, the status, the constraints.
