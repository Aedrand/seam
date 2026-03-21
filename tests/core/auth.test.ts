import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../../src/db/database.js";
import {
  initializeBootstrapToken,
  register,
  validateApiKey,
  regenerateBootstrapToken,
} from "../../src/core/auth.js";

describe("auth", () => {
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    db = createDatabase(":memory:");
  });

  describe("initializeBootstrapToken", () => {
    it("generates a token on first call", () => {
      const { token, isNew } = initializeBootstrapToken(db);
      expect(token).toMatch(/^boot_/);
      expect(isNew).toBe(true);
    });

    it("returns the same token on subsequent calls", () => {
      const result1 = initializeBootstrapToken(db);
      const result2 = initializeBootstrapToken(db);
      expect(result1.token).toBe(result2.token);
      expect(result2.isNew).toBe(false);
    });
  });

  describe("register", () => {
    let bootstrapToken: string;

    beforeEach(() => {
      bootstrapToken = initializeBootstrapToken(db).token;
    });

    it("registers a user with valid bootstrap token", () => {
      const result = register(db, bootstrapToken, "andrew");
      expect(result.api_key).toMatch(/^sk_andrew_/);
    });

    it("fails with invalid bootstrap token", () => {
      expect(() => register(db, "wrong_token", "andrew")).toThrow(
        "bootstrap token is invalid"
      );
    });

    it("fails with duplicate display name", () => {
      register(db, bootstrapToken, "andrew");
      expect(() => register(db, bootstrapToken, "andrew")).toThrow(
        "already registered"
      );
    });

    it("fails with invalid display name", () => {
      expect(() => register(db, bootstrapToken, "John Doe")).toThrow(
        "lowercase alphanumeric"
      );
      expect(() => register(db, bootstrapToken, "UPPERCASE")).toThrow(
        "lowercase alphanumeric"
      );
    });
  });

  describe("validateApiKey", () => {
    it("returns user for valid key", () => {
      const { token: bootstrapToken } = initializeBootstrapToken(db);
      const { api_key } = register(db, bootstrapToken, "andrew");

      const user = validateApiKey(db, api_key);
      expect(user).not.toBeNull();
      expect(user!.display_name).toBe("andrew");
    });

    it("returns null for invalid key", () => {
      const user = validateApiKey(db, "sk_fake_key");
      expect(user).toBeNull();
    });
  });

  describe("regenerateBootstrapToken", () => {
    it("generates a new token", () => {
      const { token: token1 } = initializeBootstrapToken(db);
      const token2 = regenerateBootstrapToken(db);
      expect(token2).toMatch(/^boot_/);
      expect(token2).not.toBe(token1);
    });

    it("invalidates the old token", () => {
      const { token: token1 } = initializeBootstrapToken(db);
      regenerateBootstrapToken(db);
      expect(() => register(db, token1, "andrew")).toThrow(
        "bootstrap token is invalid"
      );
    });
  });
});
