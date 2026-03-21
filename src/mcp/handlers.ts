import type Database from "better-sqlite3";
import { getIndex, readSection, writeSection, deleteSection } from "../core/sections.js";
import {
  createWorkspace,
  joinWorkspace,
  listWorkspaces,
  getWorkspaceIdForMember,
  linkProject,
  unlinkProject,
  resolveProject,
} from "../core/workspaces.js";
import { SeamError } from "../core/errors.js";

interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export class SeamHandlers {
  private db: Database.Database;
  private activeSessions: Map<string, { workspaceName: string; workspaceId: string }> = new Map();

  constructor(db: Database.Database) {
    this.db = db;
  }

  setDefaultWorkspace(sessionId: string, userId: string, workspaceName: string): void {
    try {
      const workspaceId = getWorkspaceIdForMember(this.db, userId, workspaceName);
      this.activeSessions.set(sessionId, { workspaceName, workspaceId });
    } catch {
      // Silently ignore — workspace may not exist or user may not be a member
    }
  }

  handleToolCall(
    userId: string,
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>
  ): ToolResult {
    try {
      switch (toolName) {
        case "get_index":
          return this.handleGetIndex(sessionId);
        case "read_section":
          return this.handleReadSection(sessionId, args.name as string);
        case "write_section":
          return this.handleWriteSection(userId, sessionId, args);
        case "delete_section":
          return this.handleDeleteSection(
            sessionId,
            args.name as string,
            args.expected_version as number
          );
        case "create_workspace":
          return this.handleCreateWorkspace(userId, sessionId, args.name as string);
        case "join_workspace":
          return this.handleJoinWorkspace(userId, sessionId, args.name as string);
        case "list_workspaces":
          return this.handleListWorkspaces(userId);
        case "set_workspace":
          return this.handleSetWorkspace(userId, sessionId, args.name as string);
        case "link_project":
          return this.handleLinkProject(userId, args.project_path as string, args.workspace as string);
        case "unlink_project":
          return this.handleUnlinkProject(userId, args.project_path as string);
        case "resolve_project":
          return this.handleResolveProject(userId, sessionId, args.project_path as string);
        default:
          return this.errorResult(`Unknown tool: ${toolName}`);
      }
    } catch (err) {
      return this.handleError(err);
    }
  }

  private getActiveWorkspace(sessionId: string): { workspaceName: string; workspaceId: string } {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new SeamError("no_active_workspace", "No active workspace. Call set_workspace, join_workspace, or create_workspace first.");
    }
    return session;
  }

  private handleGetIndex(sessionId: string): ToolResult {
    const { workspaceId, workspaceName } = this.getActiveWorkspace(sessionId);
    const index = getIndex(this.db, workspaceId, workspaceName);
    return this.textResult(index);
  }

  private handleReadSection(sessionId: string, name: string): ToolResult {
    const { workspaceId, workspaceName } = this.getActiveWorkspace(sessionId);
    const result = readSection(this.db, workspaceId, workspaceName, name);
    return this.jsonResult(result);
  }

  private handleWriteSection(userId: string, sessionId: string, args: Record<string, unknown>): ToolResult {
    const { workspaceId, workspaceName } = this.getActiveWorkspace(sessionId);
    const result = writeSection(this.db, workspaceId, userId, {
      name: args.name as string,
      content: args.content as string,
      description: args.description as string,
      expected_version: args.expected_version as number | undefined,
    });
    const index = getIndex(this.db, workspaceId, workspaceName);
    return this.jsonResult({ version: result.version, index });
  }

  private handleDeleteSection(sessionId: string, name: string, expectedVersion: number): ToolResult {
    const { workspaceId, workspaceName } = this.getActiveWorkspace(sessionId);
    deleteSection(this.db, workspaceId, name, expectedVersion);
    const index = getIndex(this.db, workspaceId, workspaceName);
    return this.jsonResult({ index });
  }

  private handleCreateWorkspace(userId: string, sessionId: string, name: string): ToolResult {
    const { workspaceId } = createWorkspace(this.db, userId, name);
    this.activeSessions.set(sessionId, { workspaceName: name, workspaceId });
    return this.textResult(`Workspace "${name}" created and set as active.`);
  }

  private handleJoinWorkspace(userId: string, sessionId: string, name: string): ToolResult {
    const { workspaceId } = joinWorkspace(this.db, userId, name);
    this.activeSessions.set(sessionId, { workspaceName: name, workspaceId });
    return this.textResult(`Joined workspace "${name}" and set as active.`);
  }

  private handleListWorkspaces(userId: string): ToolResult {
    const workspaces = listWorkspaces(this.db, userId);
    if (workspaces.length === 0) {
      return this.textResult("No workspaces exist on this server yet. Create one with create_workspace.");
    }
    const lines = workspaces.map((w) =>
      w.joined ? `- ${w.name} (joined)` : `- ${w.name} (not joined)`
    );
    return this.textResult("Workspaces on this server:\n" + lines.join("\n"));
  }

  private handleSetWorkspace(userId: string, sessionId: string, name: string): ToolResult {
    const workspaceId = getWorkspaceIdForMember(this.db, userId, name);
    this.activeSessions.set(sessionId, { workspaceName: name, workspaceId });
    return this.textResult(`Active workspace set to "${name}".`);
  }

  private handleLinkProject(userId: string, projectPath: string, workspaceName: string): ToolResult {
    linkProject(this.db, userId, projectPath, workspaceName);
    return this.textResult(`Linked "${projectPath}" to workspace "${workspaceName}". Future sessions in this directory will auto-activate that workspace.`);
  }

  private handleUnlinkProject(userId: string, projectPath: string): ToolResult {
    unlinkProject(this.db, userId, projectPath);
    return this.textResult(`Unlinked "${projectPath}".`);
  }

  private handleResolveProject(userId: string, sessionId: string, projectPath: string): ToolResult {
    const workspaceName = resolveProject(this.db, userId, projectPath);
    if (!workspaceName) {
      return this.textResult(`No workspace linked to "${projectPath}". Use link_project to create a link, or set_workspace to choose one manually.`);
    }
    const workspaceId = getWorkspaceIdForMember(this.db, userId, workspaceName);
    this.activeSessions.set(sessionId, { workspaceName, workspaceId });
    return this.textResult(`Resolved "${projectPath}" to workspace "${workspaceName}" and set as active.`);
  }

  private textResult(text: string): ToolResult {
    return { content: [{ type: "text", text }] };
  }

  private jsonResult(data: unknown): ToolResult {
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }

  private errorResult(message: string): ToolResult {
    return { content: [{ type: "text", text: message }], isError: true };
  }

  private handleError(err: unknown): ToolResult {
    if (err instanceof SeamError) {
      const errorData: Record<string, unknown> = { error: err.code, message: err.message };
      if (err.data) Object.assign(errorData, err.data);
      return {
        content: [{ type: "text", text: JSON.stringify(errorData) }],
        isError: true,
      };
    }
    console.error("Unexpected error:", err);
    return this.errorResult("An unexpected error occurred.");
  }
}
