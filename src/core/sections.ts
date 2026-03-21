import type Database from "better-sqlite3";
import crypto from "node:crypto";
import { SeamError, validateName } from "./errors.js";

interface WriteSectionInput {
  name: string;
  content: string;
  description: string;
  expected_version?: number;
}

interface ReadSectionResult {
  content: string;
  version: number;
  index: string;
}

interface WriteSectionResult {
  version: number;
}

export function getIndex(
  db: Database.Database,
  workspaceId: string,
  workspaceName: string
): string {
  const sections = db
    .prepare(
      `SELECT s.name, s.description, s.version, s.updated_at, u.display_name
       FROM sections s
       JOIN users u ON s.author_id = u.id
       WHERE s.workspace_id = ?
       ORDER BY s.name`
    )
    .all(workspaceId) as {
    name: string;
    description: string;
    version: number;
    updated_at: string;
    display_name: string;
  }[];

  let index = `## Shared Context \u2014 ${workspaceName}\n`;

  if (sections.length === 0) {
    index += "\nNo sections yet.";
    return index;
  }

  for (const section of sections) {
    const date = section.updated_at.split("T")[0];
    index += `\n### ${section.name} (v${section.version})\n`;
    index += `${section.description}\n`;
    index += `*${section.display_name}, ${date}*\n`;
  }

  return index;
}

export function readSection(
  db: Database.Database,
  workspaceId: string,
  workspaceName: string,
  name: string
): ReadSectionResult {
  const section = db
    .prepare(
      "SELECT content, version FROM sections WHERE workspace_id = ? AND name = ?"
    )
    .get(workspaceId, name) as { content: string; version: number } | undefined;

  if (!section) {
    throw new SeamError("section_not_found", "No section found with that name in the current workspace.");
  }

  return {
    content: section.content,
    version: section.version,
    index: getIndex(db, workspaceId, workspaceName),
  };
}

export function writeSection(
  db: Database.Database,
  workspaceId: string,
  userId: string,
  input: WriteSectionInput
): WriteSectionResult {
  if (!validateName(input.name)) {
    throw new SeamError("invalid_name", "Name must be lowercase alphanumeric with hyphens only.");
  }

  const existing = db
    .prepare(
      "SELECT id, version FROM sections WHERE workspace_id = ? AND name = ?"
    )
    .get(workspaceId, input.name) as
    | { id: string; version: number }
    | undefined;

  const now = new Date().toISOString();

  if (existing) {
    // Update
    if (input.expected_version === undefined) {
      throw new SeamError("section_exists", "A section with that name already exists. To update it, include expected_version.");
    }

    const newVersion = existing.version + 1;
    const result = db.prepare(
      `UPDATE sections
       SET content = ?, description = ?, version = ?, author_id = ?, updated_at = ?
       WHERE id = ? AND version = ?`
    ).run(input.content, input.description, newVersion, userId, now, existing.id, input.expected_version);

    if (result.changes === 0) {
      // Re-read to get the current version for the error response
      const current = db.prepare("SELECT version FROM sections WHERE id = ?").get(existing.id) as { version: number };
      throw new SeamError("version_conflict", "Section has been updated since you last read it. Re-read and try again.", {
        current_version: current.version,
        your_version: input.expected_version,
      });
    }

    return { version: newVersion };
  } else {
    // Create
    if (input.expected_version !== undefined) {
      throw new SeamError("section_not_found", "No section found with that name in the current workspace.");
    }

    db.prepare(
      `INSERT INTO sections (id, workspace_id, name, content, description, version, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      workspaceId,
      input.name,
      input.content,
      input.description,
      userId,
      now,
      now
    );

    return { version: 1 };
  }
}

export function deleteSection(
  db: Database.Database,
  workspaceId: string,
  name: string,
  expectedVersion: number
): void {
  const existing = db
    .prepare(
      "SELECT id, version FROM sections WHERE workspace_id = ? AND name = ?"
    )
    .get(workspaceId, name) as
    | { id: string; version: number }
    | undefined;

  if (!existing) {
    throw new SeamError("section_not_found", "No section found with that name in the current workspace.");
  }

  const result = db.prepare("DELETE FROM sections WHERE id = ? AND version = ?").run(existing.id, expectedVersion);

  if (result.changes === 0) {
    const current = db.prepare("SELECT version FROM sections WHERE id = ?").get(existing.id) as { version: number };
    throw new SeamError("version_conflict", "Section has been updated since you last read it. Re-read and try again.", {
      current_version: current.version,
      your_version: expectedVersion,
    });
  }
}
