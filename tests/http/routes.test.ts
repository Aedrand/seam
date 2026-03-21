import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createDatabase } from "../../src/db/database.js";
import { initializeBootstrapToken } from "../../src/core/auth.js";
import { createRegistrationRouter } from "../../src/http/routes.js";

describe("POST /register", () => {
  let app: express.Express;
  let db: ReturnType<typeof createDatabase>;
  let bootstrapToken: string;

  beforeEach(() => {
    db = createDatabase(":memory:");
    bootstrapToken = initializeBootstrapToken(db).token;

    app = express();
    app.use(express.json());
    app.use(createRegistrationRouter(db));
  });

  it("registers a new user", async () => {
    const res = await request(app)
      .post("/register")
      .send({ bootstrap_token: bootstrapToken, display_name: "andrew" });

    expect(res.status).toBe(200);
    expect(res.body.api_key).toMatch(/^sk_andrew_/);
  });

  it("rejects invalid bootstrap token", async () => {
    const res = await request(app)
      .post("/register")
      .send({ bootstrap_token: "wrong", display_name: "andrew" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_bootstrap_token");
  });

  it("rejects duplicate display name", async () => {
    await request(app)
      .post("/register")
      .send({ bootstrap_token: bootstrapToken, display_name: "andrew" });

    const res = await request(app)
      .post("/register")
      .send({ bootstrap_token: bootstrapToken, display_name: "andrew" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("display_name_taken");
  });
});
