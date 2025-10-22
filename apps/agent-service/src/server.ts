import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { CHAINS } from "@foc-mcp/chain-config";
import { wellKnownRoutes } from "./routes/wellKnown.js";
import { a2aRoutes } from "./routes/a2a.js";
import { mcpRoutes } from "./routes/mcp.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Register WebSocket support
await fastify.register(websocket);

// Register routes
await fastify.register(wellKnownRoutes);
await fastify.register(a2aRoutes);
await fastify.register(mcpRoutes);

// Health check endpoint
fastify.get("/health", async (request, reply) => {
  return {
    status: "healthy",
    timestamp: Date.now(),
    supportedChains: Object.keys(CHAINS),
  };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3000");
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    console.log(`🚀 FOC Storage Agent running on http://${host}:${port}`);
    console.log(`📋 Supported chains: ${Object.keys(CHAINS).join(", ")}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
