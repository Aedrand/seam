import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../../src/db/database.js";
import { initializeBootstrapToken, register } from "../../src/core/auth.js";
import { SeamHandlers } from "../../src/mcp/handlers.js";

describe("end-to-end workflow", () => {
  let db: ReturnType<typeof createDatabase>;
  let handlers: SeamHandlers;
  let andrewId: string;
  let sarahId: string;

  beforeEach(() => {
    db = createDatabase(":memory:");

    const { token } = initializeBootstrapToken(db);
    register(db, token, "andrew");
    register(db, token, "sarah");

    andrewId = (
      db.prepare("SELECT id FROM users WHERE display_name = 'andrew'").get() as {
        id: string;
      }
    ).id;
    sarahId = (
      db.prepare("SELECT id FROM users WHERE display_name = 'sarah'").get() as {
        id: string;
      }
    ).id;

    handlers = new SeamHandlers(db);
  });

  it("two agents collaborate on shared context", () => {
    // Andrew creates a workspace
    handlers.handleToolCall(andrewId, "andrew-session", "create_workspace", {
      name: "dashboard",
    });

    // Andrew writes design philosophy
    const writeResult = handlers.handleToolCall(
      andrewId,
      "andrew-session",
      "write_section",
      {
        name: "design-philosophy",
        content: "Dense, scan-optimized dashboard for financial analysts.",
        description:
          "Overall aesthetic direction. Read before visual decisions.",
      }
    );
    expect(writeResult.isError).toBeFalsy();

    // Sarah joins the same workspace
    handlers.handleToolCall(sarahId, "sarah-session", "join_workspace", {
      name: "dashboard",
    });

    // Sarah reads the index and sees Andrew's section
    const indexResult = handlers.handleToolCall(
      sarahId,
      "sarah-session",
      "get_index",
      {}
    );
    expect(indexResult.content[0].text).toContain("design-philosophy");
    expect(indexResult.content[0].text).toContain("andrew");

    // Sarah reads the section
    const readResult = handlers.handleToolCall(
      sarahId,
      "sarah-session",
      "read_section",
      { name: "design-philosophy" }
    );
    const readData = JSON.parse(readResult.content[0].text);
    expect(readData.content).toContain("financial analysts");
    expect(readData.version).toBe(1);

    // Sarah adds her own section
    handlers.handleToolCall(sarahId, "sarah-session", "write_section", {
      name: "component-conventions",
      content: "Vue 3 composables with TypeScript.",
      description: "Component patterns. Read before creating components.",
    });

    // Andrew's index now shows both sections
    const updatedIndex = handlers.handleToolCall(
      andrewId,
      "andrew-session",
      "get_index",
      {}
    );
    expect(updatedIndex.content[0].text).toContain("design-philosophy");
    expect(updatedIndex.content[0].text).toContain("component-conventions");
  });

  it("version conflict prevents silent overwrites", () => {
    handlers.handleToolCall(andrewId, "andrew-session", "create_workspace", {
      name: "dashboard",
    });
    handlers.handleToolCall(sarahId, "sarah-session", "join_workspace", {
      name: "dashboard",
    });

    // Andrew writes a section
    handlers.handleToolCall(andrewId, "andrew-session", "write_section", {
      name: "status",
      content: "Andrew's status.",
      description: "Current status.",
    });

    // Sarah reads it (version 1)
    handlers.handleToolCall(sarahId, "sarah-session", "read_section", {
      name: "status",
    });

    // Andrew updates it to version 2
    handlers.handleToolCall(andrewId, "andrew-session", "write_section", {
      name: "status",
      content: "Andrew's updated status.",
      description: "Current status.",
      expected_version: 1,
    });

    // Sarah tries to update based on version 1 — should fail
    const conflictResult = handlers.handleToolCall(
      sarahId,
      "sarah-session",
      "write_section",
      {
        name: "status",
        content: "Sarah's status.",
        description: "Current status.",
        expected_version: 1,
      }
    );

    expect(conflictResult.isError).toBe(true);
    const errorData = JSON.parse(conflictResult.content[0].text);
    expect(errorData.error).toBe("version_conflict");
    expect(errorData.current_version).toBe(2);
    expect(errorData.your_version).toBe(1);

    // Sarah re-reads and successfully updates
    const reread = handlers.handleToolCall(
      sarahId,
      "sarah-session",
      "read_section",
      { name: "status" }
    );
    const rereadData = JSON.parse(reread.content[0].text);

    const retryResult = handlers.handleToolCall(
      sarahId,
      "sarah-session",
      "write_section",
      {
        name: "status",
        content: "Merged: Andrew's update + Sarah's changes.",
        description: "Current status.",
        expected_version: rereadData.version,
      }
    );
    expect(retryResult.isError).toBeFalsy();
  });

  it("workspace isolation", () => {
    handlers.handleToolCall(andrewId, "andrew-session", "create_workspace", {
      name: "project-a",
    });
    handlers.handleToolCall(andrewId, "andrew-session", "write_section", {
      name: "secret",
      content: "Project A secrets.",
      description: "Secret stuff.",
    });

    handlers.handleToolCall(sarahId, "sarah-session", "create_workspace", {
      name: "project-b",
    });

    // Sarah can't see Project A's sections
    const sarahIndex = handlers.handleToolCall(
      sarahId,
      "sarah-session",
      "get_index",
      {}
    );
    expect(sarahIndex.content[0].text).toContain("No sections yet.");
    expect(sarahIndex.content[0].text).not.toContain("secret");
  });
});
