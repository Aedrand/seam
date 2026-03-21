export const TOOL_DEFINITIONS = [
  {
    name: "get_index",
    description:
      "Call this at the start of every session to see what shared project context is available for your workspace. Returns section names, descriptions, authors, timestamps, and version numbers. Use the descriptions to decide which sections are relevant to your current task \u2014 you don't need to read them all.",
  },
  {
    name: "read_section",
    description:
      "Read the full content of a shared context section. Also returns a fresh copy of the index so you stay current on what's available. Only read sections relevant to your current task.",
  },
  {
    name: "write_section",
    description:
      "Create or update a section of shared project context. IMPORTANT: This updates shared context that other team members' agents will read. Before writing, ALWAYS propose what you plan to write and get explicit approval from the user \u2014 a brief summary and 'Want me to write this to Seam?' is enough. Only skip confirmation if the user explicitly says 'write to Seam' or 'update Seam'. Always call get_index first to check what already exists \u2014 avoid creating sections that overlap with existing ones. Section names must be lowercase alphanumeric with hyphens (e.g., 'design-philosophy', 'current-status'). For new sections, omit expected_version. For updates, include the version number you last read \u2014 if someone else has updated it since, the write will fail and you should re-read before trying again. Write context that would help the next agent working on this project: design decisions, conventions, status, constraints \u2014 the understanding that isn't in the code. Each section should cover one topic and stay concise.",
  },
  {
    name: "delete_section",
    description:
      "Remove a section of shared context that is no longer relevant. Requires the version number you last read to prevent deleting a section that has been updated since you read it.",
  },
  {
    name: "create_workspace",
    description:
      "Create a new shared context workspace and automatically join it. Workspace names must be lowercase alphanumeric with hyphens (e.g., 'dashboard-redesign'). Use workspaces to separate context by project.",
  },
  {
    name: "join_workspace",
    description:
      "Join an existing workspace to access its shared context. Sets this as your active workspace.",
  },
  {
    name: "list_workspaces",
    description: "List all workspaces on this server and whether you have joined each one. Use this to discover available workspaces.",
  },
  {
    name: "set_workspace",
    description:
      "Switch your active workspace. All subsequent context operations will use this workspace. You must have already joined the workspace.",
  },
  {
    name: "link_project",
    description:
      "Link a project directory to a workspace so the workspace is automatically activated when you work in that directory. Use the absolute path of your working directory as the identifier (e.g., '/Users/sarah/projects/dashboard'). You must be a member of the workspace.",
  },
  {
    name: "unlink_project",
    description:
      "Remove a project-to-workspace link.",
  },
  {
    name: "resolve_project",
    description:
      "Look up which workspace is linked to this project directory and automatically set it as active. Call this on startup with your current working directory path. If no link exists, returns a message suggesting you link one.",
  },
];
