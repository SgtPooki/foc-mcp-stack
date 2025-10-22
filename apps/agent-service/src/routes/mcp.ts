import { FastifyInstance } from "fastify";
import { MCPMessage, SignedResponse, createTimestamp } from "../../../../packages/core/dist/index.js";
import { getChainConfig } from "@foc-mcp/chain-config";
import { signReply } from "../signing/index.js";

export async function mcpRoutes(fastify: FastifyInstance) {
  fastify.register(async function (fastify) {
    fastify.get("/mcp", { websocket: true }, (connection, req) => {
      fastify.log.info("MCP WebSocket connection established");

      connection.on("message", (message: any) => {
        try {
          const mcpMessage: MCPMessage = JSON.parse(message.toString());
          fastify.log.info({ mcpMessage }, "Received MCP message");

          // Handle different MCP message types
          if (mcpMessage.method) {
            handleMCPRequest(mcpMessage, connection);
          } else if (mcpMessage.result || mcpMessage.error) {
            handleMCPResponse(mcpMessage, connection);
          } else {
            // Invalid message format
            connection.send(JSON.stringify({
              jsonrpc: "2.0",
              id: mcpMessage.id,
              error: {
                code: -32600,
                message: "Invalid Request",
              },
            }));
          }
        } catch (error) {
          fastify.log.error({ error }, "Error parsing MCP message");
          connection.send(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: "Parse error",
            },
          }));
        }
      });

      connection.on("close", () => {
        fastify.log.info("MCP WebSocket connection closed");
      });

      connection.on("error", (error: any) => {
        fastify.log.error({ error }, "MCP WebSocket error");
      });
    });
  });
}

async function handleMCPRequest(message: MCPMessage, connection: any) {
  try {
    let result: any;

    switch (message.method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            resources: {},
            tools: {},
            prompts: {},
          },
          serverInfo: {
            name: "foc-storage-agent",
            version: "0.1.0",
          },
        };
        break;

      case "tools/list":
        result = {
          tools: [
            {
              name: "pin_add",
              description: "Add a CID to the agent's pinning service",
              inputSchema: {
                type: "object",
                properties: {
                  cid: { type: "string", description: "The CID to pin" },
                  options: { type: "object", description: "Pinning options" },
                },
                required: ["cid"],
              },
            },
            {
              name: "pin_status",
              description: "Get the status of a pinned CID",
              inputSchema: {
                type: "object",
                properties: {
                  cid: { type: "string", description: "The CID to check" },
                },
                required: ["cid"],
              },
            },
          ],
        };
        break;

      case "tools/call":
        const { name, arguments: args } = message.params as any;
        switch (name) {
          case "pin_add":
            result = { ok: true, message: "Pin add not implemented yet", cid: args.cid };
            break;
          case "pin_status":
            result = { ok: true, message: "Pin status not implemented yet", cid: args.cid };
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        break;

      default:
        throw new Error(`Unknown method: ${message.method}`);
    }

    // Send response
    connection.send(JSON.stringify({
      jsonrpc: "2.0",
      id: message.id,
      result,
    }));
  } catch (error) {
    // Send error response
    connection.send(JSON.stringify({
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: -32601,
        message: error instanceof Error ? error.message : "Unknown error",
      },
    }));
  }
}

async function handleMCPResponse(message: MCPMessage, connection: any) {
  // Handle responses from client (if needed)
  console.log("Received MCP response:", message);
}
