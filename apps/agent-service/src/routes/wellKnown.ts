import { FastifyInstance } from "fastify";
import { readFileSync } from "fs";
import { join } from "path";
import { AgentCard } from "../../../../packages/core/dist/index.js";

export async function wellKnownRoutes(fastify: FastifyInstance) {
  // Primary agent card endpoint
  fastify.get("/.well-known/agent-card.json", async (request, reply) => {
    try {
      const cardPath = join(process.cwd(), "../../deployments/cards/agent-card.json");
      const cardData = readFileSync(cardPath, "utf-8");
      const card: AgentCard = JSON.parse(cardData);

      reply.type("application/json");
      return card;
    } catch (error) {
      fastify.log.error({ error }, "Failed to load agent card");
      reply.code(500);
      return { error: "Failed to load agent card" };
    }
  });

  // Chain-specific agent card endpoints
  fastify.get("/.well-known/agent-card-:chain.json", async (request, reply) => {
    const { chain } = request.params as { chain: string };

    try {
      const cardPath = join(process.cwd(), `../../deployments/cards/agent-card-${chain}.json`);
      const cardData = readFileSync(cardPath, "utf-8");
      const card: AgentCard = JSON.parse(cardData);

      reply.type("application/json");
      return card;
    } catch (error) {
      fastify.log.error({ error, chain }, `Failed to load agent card for chain ${chain}`);
      reply.code(404);
      return { error: `Agent card not found for chain: ${chain}` };
    }
  });
}
