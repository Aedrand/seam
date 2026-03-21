import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Request, Response } from "express";
import type Database from "better-sqlite3";
import { validateApiKey } from "../core/auth.js";
import { TOOL_DEFINITIONS } from "./tools.js";
import { SeamHandlers } from "./handlers.js";

export function createMcpRequestHandler(db: Database.Database): {
  handler: (req: Request, res: Response) => Promise<void>;
} {
  const seamHandlers = new SeamHandlers(db);
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sessionLastActive = new Map<string, number>();

  // Clean up sessions idle for more than 30 minutes
  const SESSION_TTL_MS = 30 * 60 * 1000;
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [sid, lastActive] of sessionLastActive) {
      if (now - lastActive > SESSION_TTL_MS) {
        const transport = transports.get(sid);
        if (transport) {
          transport.close?.();
          transports.delete(sid);
        }
        sessionLastActive.delete(sid);
      }
    }
  }, 5 * 60 * 1000); // Sweep every 5 minutes
  cleanupInterval.unref(); // Don't prevent process exit

  // Map tool name to Zod shape for McpServer.tool() registration
  const zodSchemas: Record<string, Record<string, z.ZodTypeAny>> = {
    get_index: {},
    read_section: {
      name: z.string().describe("Section name from the index"),
    },
    write_section: {
      name: z.string().describe("Section name (lowercase alphanumeric with hyphens, e.g. 'design-philosophy')"),
      content: z.string().describe("Markdown prose content"),
      description: z.string().describe(
        "What appears in the index. Should explain both what is in the section and when future agents should read it."
      ),
      expected_version: z.number().int().optional().describe(
        "Required for updates \u2014 the version number you last read. Omit for new sections."
      ),
    },
    delete_section: {
      name: z.string().describe("Section name"),
      expected_version: z.number().int().describe("Version number you last read"),
    },
    create_workspace: {
      name: z.string().describe("Workspace name (lowercase alphanumeric with hyphens, e.g. 'dashboard-redesign')"),
    },
    join_workspace: {
      name: z.string().describe("Workspace name"),
    },
    list_workspaces: {},
    set_workspace: {
      name: z.string().describe("Workspace name"),
    },
  };

  async function handler(req: Request, res: Response): Promise<void> {
    // Auth: extract Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "unauthorized",
        message: "Missing or invalid Authorization header.",
      });
      return;
    }
    const apiKey = authHeader.slice(7);
    const user = validateApiKey(db, apiKey);
    if (!user) {
      res.status(401).json({
        error: "unauthorized",
        message: "Invalid API key.",
      });
      return;
    }

    // Handle DELETE requests for session termination
    if (req.method === "DELETE") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res);
        return;
      }
      res.status(404).json({ error: "session_not_found" });
      return;
    }

    // Existing session? Auth already validated above — forward to transport.
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      sessionLastActive.set(sessionId, Date.now());
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // For GET requests without a valid session, reject
    if (req.method === "GET") {
      if (sessionId) {
        res.status(404).json({ error: "session_not_found" });
      } else {
        res.status(400).json({ error: "missing_session_id" });
      }
      return;
    }

    // New session via POST — create McpServer + transport
    const server = new McpServer({ name: "seam", version: "1.0.0" });

    // Register all tools with Zod schemas
    for (const tool of TOOL_DEFINITIONS) {
      const schema = zodSchemas[tool.name];
      if (schema && Object.keys(schema).length > 0) {
        server.tool(
          tool.name,
          tool.description,
          schema,
          async (args: Record<string, unknown>): Promise<CallToolResult> => {
            const currentSessionId = transport.sessionId ?? "";
            return seamHandlers.handleToolCall(user.id, currentSessionId, tool.name, args) as CallToolResult;
          }
        );
      } else {
        server.tool(
          tool.name,
          tool.description,
          async (): Promise<CallToolResult> => {
            const currentSessionId = transport.sessionId ?? "";
            return seamHandlers.handleToolCall(user.id, currentSessionId, tool.name, {}) as CallToolResult;
          }
        );
      }
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (newSessionId: string) => {
        transports.set(newSessionId, transport);
        sessionLastActive.set(newSessionId, Date.now());
        const workspaceParam = req.query.workspace as string | undefined;
        if (workspaceParam) {
          seamHandlers.setDefaultWorkspace(newSessionId, user.id, workspaceParam);
        }
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        transports.delete(sid);
        sessionLastActive.delete(sid);
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  return { handler };
}
