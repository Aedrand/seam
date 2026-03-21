export const TOOL_DEFINITIONS = [
  {
    name: "get_index",
    description:
      "Call this at the start of every session to see what shared project context is available for your workspace. Returns section names, descriptions, authors, timestamps, and version numbers. Use the descriptions to decide which sections are relevant to your current task \u2014 you don't need to read them all.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "read_section",
    description:
      "Read the full content of a shared context section. Also returns a fresh copy of the index so you stay current on what's available. Only read sections relevant to your current task.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Section name from the index" },
      },
      required: ["name"],
    },
  },
  {
    name: "write_section",
    description:
      "Create or update a section of shared project context. For new sections, omit expected_version. For updates, include the version number you last read \u2014 if someone else has updated it since, the write will fail and you should re-read before trying again. Write context that would help the next agent working on this project: design decisions, conventions, status, constraints \u2014 the understanding that isn't in the code. Each section should cover one topic and stay concise.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Section name" },
        content: { type: "string", description: "Markdown prose content" },
        description: {
          type: "string",
          description:
            "What appears in the index. Should explain both what is in the section and when future agents should read it.",
        },
        expected_version: {
          type: "integer",
          description:
            "Required for updates \u2014 the version number you last read. Omit for new sections.",
        },
      },
      required: ["name", "content", "description"],
    },
  },
  {
    name: "delete_section",
    description:
      "Remove a section of shared context that is no longer relevant. Requires the version number you last read to prevent deleting a section that has been updated since you read it.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Section name" },
        expected_version: {
          type: "integer",
          description: "Version number you last read",
        },
      },
      required: ["name", "expected_version"],
    },
  },
  {
    name: "create_workspace",
    description:
      "Create a new shared context workspace and automatically join it. Use workspaces to separate context by project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Workspace name (lowercase, hyphens, alphanumeric)" },
      },
      required: ["name"],
    },
  },
  {
    name: "join_workspace",
    description:
      "Join an existing workspace to access its shared context. Sets this as your active workspace.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Workspace name" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_workspaces",
    description: "List all workspaces you have joined.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "set_workspace",
    description:
      "Switch your active workspace. All subsequent context operations will use this workspace. You must have already joined the workspace.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Workspace name" },
      },
      required: ["name"],
    },
  },
];
