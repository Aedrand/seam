import Database from "better-sqlite3";

export function createDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS server_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL UNIQUE,
      api_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      user_id TEXT NOT NULL REFERENCES users(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      joined_at TEXT NOT NULL,
      PRIMARY KEY (user_id, workspace_id)
    );

    CREATE TABLE IF NOT EXISTS repo_links (
      user_id TEXT NOT NULL REFERENCES users(id),
      repo_identifier TEXT NOT NULL,
      workspace_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, repo_identifier)
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      description TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      author_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (workspace_id, name)
    );
  `);

  return db;
}
