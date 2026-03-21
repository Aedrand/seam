import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../../src/db/database.js";
import { initializeBootstrapToken, register } from "../../src/core/auth.js";
import { SeamHandlers } from "../../src/mcp/handlers.js";

describe("MCP handlers", () => {
  let db: ReturnType<typeof createDatabase>;
  let handlers: SeamHandlers;
  let userId: string;

  beforeEach(() => {
    db = createDatabase(":memory:");

    const { token } = initializeBootstrapToken(db);
    register(db, token, "andrew");
    const user = db
      .prepare("SELECT id FROM users WHERE display_name = 'andrew'")
      .get() as { id: string };
    userId = user.id;

    handlers = new SeamHandlers(db);
  });

  describe("create_workspace + set_workspace", () => {
    it("creates and sets active workspace", () => {
      const result = handlers.handleToolCall(userId, "session-1", "create_workspace", {
        name: "my-project",
      });
      expect(result.isError).toBeFalsy();

      const indexResult = handlers.handleToolCall(userId, "session-1", "get_index", {});
      expect(indexResult.content[0].text).toContain("my-project");
    });
  });

  describe("context tools require active workspace", () => {
    it("get_index fails without active workspace", () => {
      const result = handlers.handleToolCall(userId, "session-1", "get_index", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("no_active_workspace");
    });
  });

  describe("full workflow", () => {
    beforeEach(() => {
      handlers.handleToolCall(userId, "session-1", "create_workspace", {
        name: "my-project",
      });
    });

    it("write, read, update, delete lifecycle", () => {
      // Write
      const writeResult = handlers.handleToolCall(userId, "session-1", "write_section", {
        name: "design-philosophy",
        content: "Dense dashboards.",
        description: "Aesthetic direction.",
      });
      expect(writeResult.isError).toBeFalsy();
      const writeData = JSON.parse(writeResult.content[0].text);
      expect(writeData.version).toBe(1);
      expect(writeData.index).toContain("design-philosophy");

      // Read
      const readResult = handlers.handleToolCall(userId, "session-1", "read_section", {
        name: "design-philosophy",
      });
      expect(readResult.isError).toBeFalsy();
      const readData = JSON.parse(readResult.content[0].text);
      expect(readData.content).toBe("Dense dashboards.");
      expect(readData.version).toBe(1);
      expect(readData.index).toContain("design-philosophy");

      // Update
      const updateResult = handlers.handleToolCall(userId, "session-1", "write_section", {
        name: "design-philosophy",
        content: "Dense dashboards v2.",
        description: "Updated aesthetic direction.",
        expected_version: 1,
      });
      expect(updateResult.isError).toBeFalsy();
      const updateData = JSON.parse(updateResult.content[0].text);
      expect(updateData.version).toBe(2);

      // Delete
      const deleteResult = handlers.handleToolCall(userId, "session-1", "delete_section", {
        name: "design-philosophy",
        expected_version: 2,
      });
      expect(deleteResult.isError).toBeFalsy();
      const deleteData = JSON.parse(deleteResult.content[0].text);
      expect(deleteData.index).toContain("No sections yet.");
    });

    it("version conflict returns current and expected versions", () => {
      handlers.handleToolCall(userId, "session-1", "write_section", {
        name: "status",
        content: "V1.",
        description: "Status.",
      });

      const result = handlers.handleToolCall(userId, "session-1", "write_section", {
        name: "status",
        content: "V2.",
        description: "Status.",
        expected_version: 5,
      });

      expect(result.isError).toBe(true);
      const errorData = JSON.parse(result.content[0].text);
      expect(errorData.error).toBe("version_conflict");
      expect(errorData.current_version).toBe(1);
      expect(errorData.your_version).toBe(5);
    });
  });

  describe("session isolation", () => {
    it("different sessions have independent active workspaces", () => {
      handlers.handleToolCall(userId, "session-1", "create_workspace", {
        name: "project-a",
      });
      handlers.handleToolCall(userId, "session-2", "create_workspace", {
        name: "project-b",
      });

      const indexA = handlers.handleToolCall(userId, "session-1", "get_index", {});
      expect(indexA.content[0].text).toContain("project-a");

      const indexB = handlers.handleToolCall(userId, "session-2", "get_index", {});
      expect(indexB.content[0].text).toContain("project-b");
    });
  });

  describe("list_workspaces", () => {
    it("lists joined workspaces", () => {
      handlers.handleToolCall(userId, "session-1", "create_workspace", {
        name: "project-a",
      });
      handlers.handleToolCall(userId, "session-1", "create_workspace", {
        name: "project-b",
      });

      const result = handlers.handleToolCall(userId, "session-1", "list_workspaces", {});
      expect(result.content[0].text).toContain("project-a");
      expect(result.content[0].text).toContain("project-b");
    });
  });
});
