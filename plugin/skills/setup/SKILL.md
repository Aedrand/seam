---
name: seam-setup
description: Set up Seam MCP server connection. Use when the user says "set up seam", "connect to seam", "configure seam", or needs help connecting to a Seam server.
---

# Seam Setup

Help the user connect to a Seam MCP server.

## What you need from the user

1. **Server URL** — e.g., `https://seam-production-xyz.up.railway.app`
2. **Bootstrap token** — if they need to register (they get this from whoever deployed the server)

## Steps

### If the user already has an API key:

Run this command for them (ask for their server URL and API key):

```bash
claude mcp add seam --transport http -H "Authorization: Bearer <their-api-key>" -s user seam <server-url>/mcp
```

### If the user needs to register:

1. Ask for the server URL and bootstrap token
2. Register them:

```bash
curl -s -X POST <server-url>/register \
  -H "Content-Type: application/json" \
  -d '{"bootstrap_token": "<token>", "display_name": "<their-name>"}'
```

3. Take the API key from the response and add the MCP server:

```bash
claude mcp add seam --transport http -H "Authorization: Bearer <api-key>" -s user seam <server-url>/mcp
```

### After setup

Tell the user to restart their Claude Code session. The Seam plugin hooks will automatically call `get_index` on startup and prompt writing back context at the end of sessions.
