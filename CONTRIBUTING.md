# Contributing to Seam

Thanks for your interest. Seam is a hobby project so keep expectations accordingly — but PRs and ideas are welcome.

## Getting Started

```bash
git clone https://github.com/Aedrand/seam.git
cd seam
npm install
npm test        # Make sure everything passes
npm run dev     # Start the server locally
```

## Making Changes

1. Fork the repo and create a branch from `main`
2. Write tests for new functionality
3. Make sure `npm test` passes
4. Keep changes focused — one feature or fix per PR

## Architecture

Two-layer design — understand this before diving in:

- **`src/core/`** — Pure business logic. No knowledge of MCP or HTTP. This is where section CRUD, workspace management, auth, and validation live.
- **`src/mcp/`** — MCP transport layer. Thin wrappers that call core functions and format responses.
- **`src/http/`** — REST endpoints (just registration).
- **`src/db/`** — SQLite schema and connection.

Core never imports from transport. If you're adding a feature, start with the core function, then add the MCP handler.

## Tests

Tests live in `tests/` mirroring the `src/` structure. We use vitest.

```bash
npm test              # Run all tests
npx vitest run tests/core/sections.test.ts  # Run one file
```

Write tests first when possible. The existing tests show the patterns.

## What Makes a Good PR

- Fixes a real problem or adds something clearly useful
- Includes tests
- Doesn't break existing tests
- Keeps the codebase simple — Seam's value is being lightweight

## Questions?

Open a Discussion for general questions, or an Issue for bugs and feature requests.
