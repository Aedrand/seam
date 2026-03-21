import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../../src/db/database.js";
import { initializeBootstrapToken, register } from "../../src/core/auth.js";
import { createWorkspace } from "../../src/core/workspaces.js";
import {
  getIndex,
  readSection,
  writeSection,
  deleteSection,
} from "../../src/core/sections.js";

describe("sections", () => {
  let db: ReturnType<typeof createDatabase>;
  let userId: string;
  let workspaceId: string;

  beforeEach(() => {
    db = createDatabase(":memory:");

    const { token } = initializeBootstrapToken(db);
    register(db, token, "andrew");
    const user = db
      .prepare("SELECT id FROM users WHERE display_name = 'andrew'")
      .get() as { id: string };
    userId = user.id;

    const result = createWorkspace(db, userId, "my-project");
    workspaceId = result.workspaceId;
  });

  describe("getIndex", () => {
    it("returns empty index for new workspace", () => {
      const index = getIndex(db, workspaceId, "my-project");
      expect(index).toContain("## Shared Context \u2014 my-project");
      expect(index).toContain("No sections yet.");
    });

    it("includes sections in the index", () => {
      writeSection(db, workspaceId, userId, {
        name: "design-philosophy",
        content: "Dense dashboard for analysts.",
        description: "Overall aesthetic direction. Read before visual decisions.",
      });

      const index = getIndex(db, workspaceId, "my-project");
      expect(index).toContain("### design-philosophy (v1)");
      expect(index).toContain("Overall aesthetic direction.");
      expect(index).toContain("*andrew,");
    });
  });

  describe("writeSection", () => {
    it("creates a new section at version 1", () => {
      const result = writeSection(db, workspaceId, userId, {
        name: "design-philosophy",
        content: "Dense dashboard for analysts.",
        description: "Aesthetic direction.",
      });

      expect(result.version).toBe(1);
    });

    it("fails to create a section that already exists", () => {
      writeSection(db, workspaceId, userId, {
        name: "design-philosophy",
        content: "Content.",
        description: "Desc.",
      });

      expect(() =>
        writeSection(db, workspaceId, userId, {
          name: "design-philosophy",
          content: "New content.",
          description: "New desc.",
        })
      ).toThrow("already exists");
    });

    it("updates a section with correct expected_version", () => {
      writeSection(db, workspaceId, userId, {
        name: "design-philosophy",
        content: "V1 content.",
        description: "Desc.",
      });

      const result = writeSection(db, workspaceId, userId, {
        name: "design-philosophy",
        content: "V2 content.",
        description: "Updated desc.",
        expected_version: 1,
      });

      expect(result.version).toBe(2);
    });

    it("fails to update with wrong expected_version", () => {
      writeSection(db, workspaceId, userId, {
        name: "design-philosophy",
        content: "Content.",
        description: "Desc.",
      });

      expect(() =>
        writeSection(db, workspaceId, userId, {
          name: "design-philosophy",
          content: "New.",
          description: "New.",
          expected_version: 5,
        })
      ).toThrow("Re-read and try again");
    });

    it("fails with invalid name", () => {
      expect(() =>
        writeSection(db, workspaceId, userId, {
          name: "Bad Name",
          content: "Content.",
          description: "Desc.",
        })
      ).toThrow("lowercase alphanumeric");
    });
  });

  describe("readSection", () => {
    it("reads section content and version", () => {
      writeSection(db, workspaceId, userId, {
        name: "design-philosophy",
        content: "Dense dashboard for analysts.",
        description: "Desc.",
      });

      const result = readSection(db, workspaceId, "my-project", "design-philosophy");
      expect(result.content).toBe("Dense dashboard for analysts.");
      expect(result.version).toBe(1);
      expect(result.index).toContain("### design-philosophy (v1)");
    });

    it("fails for nonexistent section", () => {
      expect(() =>
        readSection(db, workspaceId, "my-project", "nonexistent")
      ).toThrow("No section found");
    });
  });

  describe("deleteSection", () => {
    it("deletes a section with correct version", () => {
      writeSection(db, workspaceId, userId, {
        name: "design-philosophy",
        content: "Content.",
        description: "Desc.",
      });

      deleteSection(db, workspaceId, "design-philosophy", 1);

      const index = getIndex(db, workspaceId, "my-project");
      expect(index).toContain("No sections yet.");
    });

    it("fails with wrong version", () => {
      writeSection(db, workspaceId, userId, {
        name: "design-philosophy",
        content: "Content.",
        description: "Desc.",
      });

      expect(() =>
        deleteSection(db, workspaceId, "design-philosophy", 5)
      ).toThrow("Re-read and try again");
    });

    it("fails for nonexistent section", () => {
      expect(() =>
        deleteSection(db, workspaceId, "nonexistent", 1)
      ).toThrow("No section found");
    });
  });
});
