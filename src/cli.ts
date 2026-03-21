import { createDatabase } from "./db/database.js";
import { regenerateBootstrapToken } from "./core/auth.js";

const command = process.argv[2];
const DB_PATH = process.env.SEAM_DB_PATH ?? "./seam.db";

if (command === "regenerate-token") {
  const db = createDatabase(DB_PATH);
  const newToken = regenerateBootstrapToken(db);
  console.log("====================================");
  console.log(`New bootstrap token: ${newToken}`);
  console.log("Previous token is now invalid.");
  console.log("Existing registrations are unaffected.");
  console.log("====================================");
  db.close();
} else {
  console.log("Usage: seam <command>");
  console.log("");
  console.log("Commands:");
  console.log("  regenerate-token  Generate a new bootstrap token");
}
