import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../../src/db/database.js";
import { initializeBootstrapToken, register } from "../../src/core/auth.js";
import {
  createWorkspace,
  joinWorkspace,
  listWorkspaces,
} from "../../src/core/workspaces.js";

describe("workspaces", () => {
  let db: ReturnType<typeof createDatabase>;
  let userId: string;

  beforeEach(() => {
    db = createDatabase(":memory:");

    const { token } = initializeBootstrapToken(db);
    register(db, token, "andrew");
    const user = db
      .prepare("SELECT id FROM users WHERE display_name = 'andrew'")
      .get() as { id: string };
    userId = user.id;
  });

  describe("createWorkspace", () => {
    it("creates a workspace and returns its id", () => {
      const result = createWorkspace(db, userId, "my-project");
      expect(result.name).toBe("my-project");
      expect(result.workspaceId).toBeDefined();
    });

    it("automatically joins the creator", () => {
      createWorkspace(db, userId, "my-project");
      const workspaces = listWorkspaces(db, userId);
      expect(workspaces).toContain("my-project");
    });

    it("fails if workspace already exists", () => {
      createWorkspace(db, userId, "my-project");
      expect(() => createWorkspace(db, userId, "my-project")).toThrow(
        "already exists"
      );
    });

    it("fails with invalid name", () => {
      expect(() => createWorkspace(db, userId, "My Project")).toThrow(
        "lowercase alphanumeric"
      );
    });
  });

  describe("joinWorkspace", () => {
    it("joins an existing workspace", () => {
      createWorkspace(db, userId, "my-project");

      // Register a second user
      const { token } = initializeBootstrapToken(db);
      register(db, token, "sarah");
      const sarah = db
        .prepare("SELECT id FROM users WHERE display_name = 'sarah'")
        .get() as { id: string };

      joinWorkspace(db, sarah.id, "my-project");
      const workspaces = listWorkspaces(db, sarah.id);
      expect(workspaces).toContain("my-project");
    });

    it("fails if workspace does not exist", () => {
      expect(() => joinWorkspace(db, userId, "nonexistent")).toThrow(
        "No workspace found"
      );
    });

    it("silently succeeds if already a member", () => {
      createWorkspace(db, userId, "my-project");
      // Should not throw
      joinWorkspace(db, userId, "my-project");
      const workspaces = listWorkspaces(db, userId);
      expect(workspaces).toEqual(["my-project"]);
    });
  });

  describe("listWorkspaces", () => {
    it("returns empty list for user with no workspaces", () => {
      const workspaces = listWorkspaces(db, userId);
      expect(workspaces).toEqual([]);
    });

    it("returns all joined workspaces", () => {
      createWorkspace(db, userId, "project-a");
      createWorkspace(db, userId, "project-b");
      const workspaces = listWorkspaces(db, userId);
      expect(workspaces).toContain("project-a");
      expect(workspaces).toContain("project-b");
    });
  });
});
