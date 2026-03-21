import type Database from "better-sqlite3";
import crypto from "node:crypto";
import { SeamError, validateName } from "./errors.js";

export interface User {
  id: string;
  display_name: string;
  api_key: string;
  created_at: string;
}

function generateToken(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(24).toString("hex")}`;
}

export function initializeBootstrapToken(
  db: Database.Database
): { token: string; isNew: boolean } {
  const existing = db
    .prepare("SELECT value FROM server_config WHERE key = 'bootstrap_token'")
    .get() as { value: string } | undefined;

  if (existing) {
    return { token: existing.value, isNew: false };
  }

  const token = generateToken("boot");
  db.prepare("INSERT INTO server_config (key, value) VALUES (?, ?)").run(
    "bootstrap_token",
    token
  );
  return { token, isNew: true };
}

export function regenerateBootstrapToken(db: Database.Database): string {
  const token = generateToken("boot");
  const result = db.prepare("UPDATE server_config SET value = ? WHERE key = 'bootstrap_token'").run(
    token
  );
  if (result.changes === 0) {
    throw new SeamError("no_bootstrap_token", "No bootstrap token exists. Start the server first to initialize one.");
  }
  return token;
}

export function register(
  db: Database.Database,
  bootstrapToken: string,
  displayName: string
): { api_key: string } {
  if (!validateName(displayName)) {
    throw new SeamError("invalid_name", "Display name must be lowercase alphanumeric with hyphens only.");
  }

  const stored = db
    .prepare("SELECT value FROM server_config WHERE key = 'bootstrap_token'")
    .get() as { value: string } | undefined;

  if (
    !stored ||
    stored.value.length !== bootstrapToken.length ||
    !crypto.timingSafeEqual(Buffer.from(stored.value), Buffer.from(bootstrapToken))
  ) {
    throw new SeamError("invalid_bootstrap_token", "The bootstrap token is invalid.");
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE display_name = ?")
    .get(displayName);

  if (existing) {
    throw new SeamError("display_name_taken", "That display name is already registered.");
  }

  const apiKey = generateToken(`sk_${displayName}`);
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO users (id, display_name, api_key, created_at) VALUES (?, ?, ?, ?)"
  ).run(crypto.randomUUID(), displayName, apiKey, now);

  return { api_key: apiKey };
}

export function validateApiKey(
  db: Database.Database,
  apiKey: string
): User | null {
  const user = db
    .prepare("SELECT id, display_name, api_key, created_at FROM users WHERE api_key = ?")
    .get(apiKey) as User | undefined;

  return user ?? null;
}
