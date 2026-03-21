import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../../src/db/database.js";
import { initializeBootstrapToken, register } from "../../src/core/auth.js";
import {
  createWorkspace,
  joinWorkspace,
  listWorkspaces,
  linkProject,
  unlinkProject,
  resolveProject,
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
      expect(workspaces).toContainEqual({ name: "my-project", joined: true });
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
      expect(workspaces).toContainEqual({ name: "my-project", joined: true });
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
      expect(workspaces).toEqual([{ name: "my-project", joined: true }]);
    });
  });

  describe("listWorkspaces", () => {
    it("returns empty list for user with no workspaces", () => {
      const workspaces = listWorkspaces(db, userId);
      expect(workspaces).toEqual([]);
    });

    it("returns all workspaces with joined status", () => {
      createWorkspace(db, userId, "project-a");
      createWorkspace(db, userId, "project-b");
      const workspaces = listWorkspaces(db, userId);
      expect(workspaces).toContainEqual({ name: "project-a", joined: true });
      expect(workspaces).toContainEqual({ name: "project-b", joined: true });
    });

    it("shows unjoined workspaces", () => {
      createWorkspace(db, userId, "my-project");

      // Register a second user
      const { token } = initializeBootstrapToken(db);
      register(db, token, "bob");
      const bob = db
        .prepare("SELECT id FROM users WHERE display_name = 'bob'")
        .get() as { id: string };

      // Bob sees my-project but hasn't joined
      const workspaces = listWorkspaces(db, bob.id);
      expect(workspaces).toContainEqual({ name: "my-project", joined: false });
    });
  });

  describe("project linking", () => {
    it("links a repo to a workspace and resolves it", () => {
      createWorkspace(db, userId, "my-project");
      linkProject(db, userId, "/Users/sarah/projects/dashboard", "my-project");

      const resolved = resolveProject(db, userId, "/Users/sarah/projects/dashboard");
      expect(resolved).toBe("my-project");
    });

    it("returns null for unlinked repo", () => {
      const resolved = resolveProject(db, userId, "/Users/sarah/projects/unknown");
      expect(resolved).toBeNull();
    });

    it("overwrites existing link", () => {
      createWorkspace(db, userId, "project-a");
      createWorkspace(db, userId, "project-b");
      linkProject(db, userId, "/Users/sarah/projects/dashboard", "project-a");
      linkProject(db, userId, "/Users/sarah/projects/dashboard", "project-b");

      const resolved = resolveProject(db, userId, "/Users/sarah/projects/dashboard");
      expect(resolved).toBe("project-b");
    });

    it("unlinks a repo", () => {
      createWorkspace(db, userId, "my-project");
      linkProject(db, userId, "/Users/sarah/projects/dashboard", "my-project");
      unlinkProject(db, userId, "/Users/sarah/projects/dashboard");

      const resolved = resolveProject(db, userId, "/Users/sarah/projects/dashboard");
      expect(resolved).toBeNull();
    });

    it("fails to unlink a repo that isn't linked", () => {
      expect(() => unlinkProject(db, userId, "/Users/sarah/projects/unknown")).toThrow(
        "No project link found"
      );
    });

    it("fails to link to a workspace you haven't joined", () => {
      createWorkspace(db, userId, "my-project");

      const { token } = initializeBootstrapToken(db);
      register(db, token, "eve");
      const eve = db
        .prepare("SELECT id FROM users WHERE display_name = 'eve'")
        .get() as { id: string };

      expect(() => linkProject(db, eve.id, "/Users/sarah/projects/dashboard", "my-project")).toThrow(
        "not a member"
      );
    });
  });
});
