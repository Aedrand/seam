# Discoverability Checklist

How to make Seam findable by both agents and humans. Ordered by impact.

---

## GitHub Repo

- [ ] **Repo name contains keywords.** Agents search by keyword — `seam` alone won't surface. Consider `seam-mcp` or `seam-context` as the repo name.
- [ ] **About description is keyword-rich, under 120 chars.** Example: "Lightweight MCP server for sharing project context between AI agents across machines"
- [ ] **Topics/tags (6-20).** Mix purpose, tech, and domain: `mcp`, `mcp-server`, `model-context-protocol`, `ai-agents`, `shared-context`, `claude-code`, `agent-collaboration`, `context-sharing`, `sqlite`, `typescript`, `developer-tools`, `multi-agent`
- [ ] **First 200 words of README are the pitch.** Agents extract from the top first. The value prop must be above badges, install instructions, and table of contents.
- [ ] **README title is descriptive.** "Seam" alone is opaque. Consider: "# Seam — Shared Context for AI Agents" so the H1 works as a search result title.
- [ ] **Stars and activity.** Share the repo, write about it, keep committing. Agents weight recent activity and community signals.

## Files to Add

- [ ] **`AGENTS.md`** — Industry standard (AAIF/Linux Foundation). Coding agents actively look for this in project roots. Describe what Seam is, how to set it up, how to contribute. Different from README — this is written for agents, not humans.
- [ ] **`llms.txt`** — AI-friendly index in the repo root. Markdown format: H1 with project name, blockquote summary, then a list of links to docs/pages with descriptions. 844K+ sites use this standard.
- [ ] **`llms-full.txt`** — Complete documentation concatenated into one markdown file. For single-shot ingestion into a context window.

## npm Package

- [ ] **Package name:** `seam-mcp` (the `<name>-mcp` pattern is used by ~40% of MCP servers)
- [ ] **Keywords in package.json:** `mcp`, `model-context-protocol`, `ai`, `claude`, `llm`, `shared-context`, `agent-collaboration`, `context-sync`, `multi-agent`
- [ ] **`mcpName` field in package.json** to bridge npm to the MCP Registry
- [ ] **Description is a complete sentence.** npm search shows the first ~80 chars. "Lightweight MCP server for sharing project context between AI agents" works.

## Registry and Directory Listings

| Channel | How to submit | Notes |
|---------|---------------|-------|
| **MCP Registry** | `mcp-publisher` CLI after npm publish | The primary channel. Agents query its REST API directly. |
| **awesome-mcp-servers** | PR to punkpeye/awesome-mcp-servers | 83.7K stars. Auto-syncs to Glama.ai (19.7K servers). Follow CONTRIBUTING.md. |
| **PulseMCP** | Submit via pulsemcp.com | 11.8K servers indexed. |
| **Smithery** | Publish via Smithery CLI | ~7.3K servers. |
| **LobeHub** | Submit via marketplace | 10K+ tools listed. |
| **Cline Marketplace** | GitHub issue with logo + repo link | Reviewed in ~2 days. |

Note: The `modelcontextprotocol/servers` repo (81.7K stars) is being deprecated as a listing. Don't target it.

## Content and Presence

- [ ] **Blog post / dev.to article** announcing Seam. Explain the problem, the approach, why it's different. This creates training data presence — the single biggest factor in whether agents "already know" about a tool.
- [ ] **HackerNews Show HN post.** Even modest traction creates citations in AI training data.
- [ ] **Mention in relevant GitHub issues.** Issues #14467 (org-wide CLAUDE.md) and #28300 (multi-agent across machines) on anthropics/claude-code are directly relevant. A comment linking Seam as a community solution is appropriate.

## If We Deploy a Docs Site

- [ ] **Server-side rendered.** AI crawlers don't execute JavaScript.
- [ ] **Schema.org JSON-LD** on every page. `SoftwareApplication` + `FAQPage` types. Pages with structured data get significantly more AI citations.
- [ ] **`/llms.txt` at the site root** — the web version of the repo file
- [ ] **`/.well-known/mcp/server-card.json`** — proposed MCP standard for advertising server capabilities before connection. Forward-looking but cheap to add.
- [ ] **Sitemap with accurate `lastmod` dates.** Freshness matters — content older than 14 days without updates declines in AI citation frequency.
- [ ] **Allow AI crawlers in robots.txt.** GPTBot, ClaudeBot, PerplexityBot, Google-Extended.

## What Doesn't Help (Much)

- **AGENTS.md for discoverability** — it guides agents already inside the codebase, not agents searching for tools. Still worth having for quality perception.
- **Backlinks and traditional SEO** — weak correlation with AI citations. Recency and structure matter more.
- **The modelcontextprotocol/servers repo** — being deprecated as a listing directory.
