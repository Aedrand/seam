# Landscape Analysis

Research conducted March 2026 on existing tools for sharing context between AI agents.

## The Gap

No existing tool is a lightweight, network-native, multi-writer shared context server delivered as markdown via MCP. The space has lots of heavyweight memory systems and lots of file-sync tools, but nothing in between.

The closest attempts either frame the problem as "agent memory" (storing everything an agent has ever seen) or "agent coordination" (orchestrating task execution). Seam frames it as "shared project understanding" — the high-level context that isn't in the code. That's a simpler question with a simpler answer.

## Closest Existing Tools

### Hivemind
**What:** Closed-source hosted MCP server. Append-only event log where agents publish decisions, completions, blockers. Semantic search via OpenAI embeddings.
**Stars:** Private repo | **Age:** 5 weeks | **License:** MIT (npm), source private

Closest to Seam's vision but fundamentally different architecture. Event logs are great for "what happened" but awkward for "what is true right now." Design philosophy isn't an event — it's a fact that evolves. Cloud-dependent for multi-machine (Convex backend). Solo developer, declining npm downloads after launch spike. No way to self-host, audit, or fork.

### Forgetful
**What:** Open-source MCP memory server. 56 tools, Zettelkasten-style atomic memories, PostgreSQL for production, proper auth, task coordination with optimistic locking.
**Stars:** 201 | **Age:** 5 months | **License:** MIT

Architecturally ready for multi-agent shared context — deploy on a VPS, point multiple agents at it. But it's a memory system: semantic search, embeddings, cross-encoder reranking. Heavyweight for "here's our design philosophy." No concept of structured sections or an index — you'd be searching through flat memory entries.

### Squad
**What:** Multi-agent orchestration for GitHub Copilot. Stores architectural decisions in `decisions.md`. Agents read it before starting work.
**Stars:** 1,031 | **Age:** 6 weeks | **License:** MIT

Validates the core pattern — a versioned markdown file of decisions that all agents read. But it's a full orchestration framework (coordinator agent, routing, task delegation) tied to GitHub Copilot. The `decisions.md` idea is right; the surrounding framework is the wrong scope for what Seam does.

### claude-brain
**What:** Claude Code plugin. Syncs CLAUDE.md, memory, skills across machines via Git with LLM-powered semantic merge.
**Stars:** 28 | **Age:** 17 days | **License:** MIT

Interesting approach to the sync problem — two-stage merge (deterministic for structured data, LLM for unstructured). But it's personal multi-machine sync, not team collaboration. The merge-on-pull model doesn't work for real-time multi-agent writes. 3-day development burst, no activity since.

### Agent Hub MCP
**What:** MCP server for agent registration, messaging, and task coordination.
**Stars:** 27 | **Age:** 7 months | **License:** MIT

Message bus with task tracking, not shared context. Single-machine only despite having HTTP transport (CORS locked to localhost). No auth. Effectively abandoned — no updates in 6+ months.

## Convention Sync Tools (Different Problem, Worth Knowing)

### rulesync
**What:** CLI that generates CLAUDE.md, .cursorrules, AGENTS.md, etc. from a single source. Syncs rules across 25+ AI coding tools.
**Stars:** 918 | **Age:** Mature (v7.21) | **License:** MIT | **Downloads:** 161K/week

The clear winner for static convention sync. Different problem than Seam (static files generated at build time vs. live context written during work) but worth ensuring compatibility. Seam's sections could complement rulesync's generated rules — rulesync handles "how we write code," Seam handles "what we're building and why."

### ai-rules-sync
**What:** Symlink-based sync from shared Git repos to project directories.
**Stars:** 19 | **Age:** Early (v0.8.1) | **License:** Unlicense

Git-native team sharing via symlinks. Elegant for instant propagation but fragile (Windows, tarballs). The multi-repo mixing feature is interesting — company standards + community collections + personal preferences.

### block/ai-rules
**What:** Rust CLI from Block/Square. Generates agent config files from local markdown rules.
**Stars:** 81 | **Age:** 4 months (v1.5.1) | **License:** Apache 2.0

Simplest of the three. Four commands, zero runtime dependencies. No remote features. Backed by Block, which lends credibility.

## Interesting Patterns (Not Direct Competitors)

### Kli — Event-Sourced CRDTs
**What:** Common Lisp MCP server using event sourcing + CRDTs for agent coordination.
**Stars:** 11 | **Age:** 5 weeks | **License:** MIT

Treats multi-agent coordination as a distributed systems problem. Each field gets the CRDT type matching its access pattern (G-Sets for append-only observations, LWW-Registers for status, OR-Sets for edges). Append-only JSONL event log — state is always reconstructable by replaying events.

**What we can learn:** Event sourcing as an audit trail. CRDT selection by access pattern is a transferable design principle. Stigmergic coordination (agents leave traces, others discover them) scales better than message-passing.

### SBP — Stigmergic Blackboard Protocol
**What:** Agents deposit "digital pheromones" with intensity that decays over time. Other agents react when environmental conditions are met.
**Stars:** 3 | **Age:** 6 weeks | **License:** MIT

**What we can learn:** The decay model is the novel contribution. Graduated confidence beats binary validity — a signal at intensity 0.9 naturally outranks one at 0.3. Reinforcement resets the decay clock — frequently validated context stays strong, abandoned context fades. Compute-on-read (never store current intensity, always derive it from initial value + time + decay model) eliminates stale-state bugs. Evaporation thresholds prevent noise accumulation.

Directly applicable to Seam's deferred staleness enhancement. Instead of a binary "stale after 30 days" flag, sections could carry a decay model that naturally reduces confidence over time, refreshed when an agent reads and confirms the content is still accurate.

### Squad — decisions.md Pattern
The `decisions.md` pattern (append-only, all agents read before working, human-readable, git-tracked) validates Seam's section-based approach. The key difference: Squad's decisions are written by a coordinator agent, Seam's sections are written by any peer agent.

### Forgetful — Optimistic Locking
Task claiming with a `version` field — identical to Seam's version checking for section writes. Validates that optimistic concurrency is the right conflict model for this scale.

## Official Claude Code Requests

Two open feature requests confirm demand for what Seam addresses:

- **[#14467](https://github.com/anthropics/claude-code/issues/14467)** — Organization-wide shared CLAUDE.md via GitHub org (26 upvotes, no Anthropic response)
- **[#29072](https://github.com/anthropics/claude-code/issues/29072)** — Support URL imports in CLAUDE.md (no Anthropic response)

Neither is implemented. If Anthropic builds native URL imports for CLAUDE.md, that would cover part of Seam's use case for static context but not the multi-writer, versioned, workspace-scoped live context that Seam provides.

## Summary

| Tool | Shared context? | Multi-machine? | Lightweight? | Open source? | Live writes? |
|------|----------------|----------------|-------------|-------------|-------------|
| **Seam** | Yes (sections) | Yes (HTTP/MCP) | Yes | Yes (MIT) | Yes (versioned) |
| Hivemind | Events, not context | Cloud only | No (embeddings) | No (private) | Yes |
| Forgetful | Memory entries | VPS deployment | No (56 tools, RAG) | Yes (MIT) | Yes |
| Squad | decisions.md | Git only | No (full framework) | Yes (MIT) | Git commits |
| claude-brain | CLAUDE.md sync | Git only | Yes | Yes (MIT) | Git push |
| rulesync | Static rules | Git fetch | Yes | Yes (MIT) | No (generate) |
