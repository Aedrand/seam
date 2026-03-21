import { describe, it, expect } from "vitest";
import { createDatabase } from "../../src/db/database.js";

describe("database", () => {
  it("creates all tables", () => {
    const db = createDatabase(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("server_config");
    expect(tableNames).toContain("users");
    expect(tableNames).toContain("workspaces");
    expect(tableNames).toContain("workspace_members");
    expect(tableNames).toContain("sections");
    db.close();
  });

  it("schema creation is idempotent", () => {
    const db = createDatabase(":memory:");
    db.close();
  });
});
