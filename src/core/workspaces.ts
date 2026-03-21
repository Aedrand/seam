import type Database from "better-sqlite3";
import crypto from "node:crypto";
import { SeamError, validateName } from "./errors.js";

export function createWorkspace(
  db: Database.Database,
  userId: string,
  name: string
): { name: string; workspaceId: string } {
  if (!validateName(name)) {
    throw new SeamError("invalid_name", "Name must be lowercase alphanumeric with hyphens only.");
  }

  const existing = db
    .prepare("SELECT id FROM workspaces WHERE name = ?")
    .get(name);

  if (existing) {
    throw new SeamError("workspace_exists", "A workspace with that name already exists.");
  }

  const workspaceId = crypto.randomUUID();
  const now = new Date().toISOString();

  const createAndJoin = db.transaction(() => {
    db.prepare("INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)").run(
      workspaceId, name, now
    );
    db.prepare("INSERT INTO workspace_members (user_id, workspace_id, joined_at) VALUES (?, ?, ?)").run(
      userId, workspaceId, now
    );
  });

  createAndJoin();
  return { name, workspaceId };
}

export function joinWorkspace(
  db: Database.Database,
  userId: string,
  name: string
): { workspaceId: string } {
  const workspace = db
    .prepare("SELECT id FROM workspaces WHERE name = ?")
    .get(name) as { id: string } | undefined;

  if (!workspace) {
    throw new SeamError("workspace_not_found", "No workspace found with that name.");
  }

  const alreadyMember = db
    .prepare(
      "SELECT 1 FROM workspace_members WHERE user_id = ? AND workspace_id = ?"
    )
    .get(userId, workspace.id);

  if (!alreadyMember) {
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO workspace_members (user_id, workspace_id, joined_at) VALUES (?, ?, ?)"
    ).run(userId, workspace.id, now);
  }

  return { workspaceId: workspace.id };
}

export interface WorkspaceInfo {
  name: string;
  joined: boolean;
}

export function listWorkspaces(
  db: Database.Database,
  userId: string
): WorkspaceInfo[] {
  const rows = db
    .prepare(
      `SELECT w.name, CASE WHEN wm.user_id IS NOT NULL THEN 1 ELSE 0 END AS joined
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
       ORDER BY w.name`
    )
    .all(userId) as { name: string; joined: number }[];

  return rows.map((r) => ({ name: r.name, joined: r.joined === 1 }));
}

export function getWorkspaceIdForMember(
  db: Database.Database,
  userId: string,
  workspaceName: string
): string {
  const workspace = db
    .prepare("SELECT id FROM workspaces WHERE name = ?")
    .get(workspaceName) as { id: string } | undefined;

  if (!workspace) {
    throw new SeamError("workspace_not_found", "No workspace found with that name.");
  }

  const membership = db
    .prepare(
      "SELECT 1 FROM workspace_members WHERE user_id = ? AND workspace_id = ?"
    )
    .get(userId, workspace.id);

  if (!membership) {
    throw new SeamError("not_member", "You are not a member of that workspace.");
  }

  return workspace.id;
}
