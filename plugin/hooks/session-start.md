You have a Seam MCP server connected for shared project context. Before responding to the user's first message, do the following:

IMPORTANT: The Seam tools may be deferred. If you cannot call them directly, use ToolSearch to fetch their schemas first (search for "seam").

1. Figure out your current repo by running `git remote get-url origin` (if in a git repo).
2. If you got a repo URL, call `mcp__seam__resolve_repo` with it. This will auto-activate the linked workspace if one exists.
3. If no link was found, call `mcp__seam__list_workspaces` to see what's available. Join or create a workspace as appropriate, then suggest linking it with `mcp__seam__link_repo` so future sessions auto-activate.
4. Once a workspace is active, call `mcp__seam__get_index` to see what shared context is available.
5. Read the section descriptions in the index to decide which sections are relevant to your current task.
6. Read those relevant sections with `mcp__seam__read_section` before starting work.

Do all of this before responding to the user's first message.
