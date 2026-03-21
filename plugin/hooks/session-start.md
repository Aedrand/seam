You have a Seam MCP server connected for shared project context. At the start of this session:

1. Figure out your current repo by running `git remote get-url origin` (if in a git repo).
2. If you got a repo URL, call `resolve_repo` with it. This will auto-activate the linked workspace if one exists.
3. If no link was found, call `list_workspaces` to see what's available. Join or create a workspace as appropriate, then suggest linking it with `link_repo` so future sessions auto-activate.
4. Once a workspace is active, call `get_index` to see what shared context is available.
5. Read the section descriptions in the index to decide which sections are relevant to your current task.
6. Read those relevant sections with `read_section` before starting work.

Do this before responding to the user's first message.
