import express from "express";
import { createDatabase } from "./db/database.js";
import { initializeBootstrapToken } from "./core/auth.js";
import { createRegistrationRouter } from "./http/routes.js";
import { createMcpRequestHandler } from "./mcp/server.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = parseInt(process.env.SEAM_PORT ?? "3000", 10);
const DB_PATH = process.env.SEAM_DB_PATH ?? "./seam.db";

// Initialize database
const db = createDatabase(DB_PATH);

// Initialize bootstrap token
const { token: bootstrapToken, isNew } = initializeBootstrapToken(db);

if (isNew) {
  // Write bootstrap token to ~/.seam/bootstrap-token for convenience
  const seamDir = path.join(os.homedir(), ".seam");
  if (!fs.existsSync(seamDir)) {
    fs.mkdirSync(seamDir, { recursive: true });
  }
  fs.writeFileSync(path.join(seamDir, "bootstrap-token"), bootstrapToken, {
    mode: 0o600,
  });

  console.log("====================================");
  console.log(`Bootstrap token: ${bootstrapToken}`);
  console.log("Share this with your team to register.");
  console.log("====================================");
}

// Create Express app
const app = express();
app.use(express.json());

// Mount registration route
app.use(createRegistrationRouter(db));

// Mount MCP handler (POST for tool calls, GET for SSE streaming, DELETE for session termination)
const { handler: mcpHandler } = createMcpRequestHandler(db);
app.all("/mcp", (req, res) => {
  mcpHandler(req, res);
});

// Start server
app.listen(PORT, () => {
  console.log(`Seam server listening on port ${PORT}`);
});
