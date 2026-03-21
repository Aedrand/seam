You have a Seam MCP server connected for shared project context. Before responding to the user's first message, follow these steps in order. Do not run steps in parallel — each step depends on the previous one.

IMPORTANT: The Seam tools may be deferred. If you cannot call them directly, use ToolSearch to fetch their schemas first (search for "seam").

Step 1: Identify your current working directory.
  Your working directory path is your project identifier for Seam.

Step 2: Try to auto-activate a workspace for this project.
  Call mcp__seam__resolve_project with your working directory path.
  If a workspace was activated, skip to Step 4.
  If no link was found, continue to Step 3.

Step 3: Find or create a workspace.
  Call mcp__seam__list_workspaces to see what's available.
  If there are workspaces you've joined, call mcp__seam__set_workspace to activate one.
  If there are workspaces you haven't joined, suggest joining one.
  If no workspaces exist, ask the user if they'd like to create one.
  Once a workspace is active, suggest linking it to this directory with mcp__seam__link_project so future sessions auto-activate.

Step 4: Load shared context.
  Call mcp__seam__get_index to see what shared context is available.
  Read the section descriptions and pull any sections relevant to the user's likely task with mcp__seam__read_section.

Complete all steps before responding to the user.
