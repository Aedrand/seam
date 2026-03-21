import { Router } from "express";
import type Database from "better-sqlite3";
import { register } from "../core/auth.js";
import { SeamError } from "../core/errors.js";

const ERROR_HTTP_STATUS: Record<string, number> = {
  invalid_bootstrap_token: 401,
  invalid_name: 400,
  display_name_taken: 409,
};

export function createRegistrationRouter(db: Database.Database): Router {
  const router = Router();

  router.post("/register", (req, res) => {
    const { bootstrap_token, display_name } = req.body;

    if (!bootstrap_token || !display_name) {
      res.status(400).json({
        error: "missing_fields",
        message: "Both bootstrap_token and display_name are required.",
      });
      return;
    }

    try {
      const result = register(db, bootstrap_token, display_name);
      res.json(result);
    } catch (err) {
      if (err instanceof SeamError) {
        const status = ERROR_HTTP_STATUS[err.code] ?? 500;
        res.status(status).json({ error: err.code, message: err.message });
      } else {
        res.status(500).json({ error: "internal", message: "An unexpected error occurred." });
      }
    }
  });

  return router;
}
