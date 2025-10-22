import { FastifyInstance } from "fastify";
import { A2ARequestSchema, SignedResponse, createTimestamp } from "../../../../packages/core/dist/index.js";
import { getChainConfig } from "@foc-mcp/chain-config";
import { signReply } from "../signing/index.js";

export async function a2aRoutes(fastify: FastifyInstance) {
  fastify.post("/a2a", async (request, reply) => {
    try {
      // Parse and validate request
      const rawRequest = request.body as any;
      const a2aRequest = A2ARequestSchema.parse(rawRequest);

      // Validate chain support
      const chainConfig = getChainConfig(a2aRequest.chainId);
      if (!chainConfig) {
        reply.code(400);
        return { error: "Unsupported chain", chainId: a2aRequest.chainId };
      }

      // Route to appropriate handler based on method
      let result: any;
      switch (a2aRequest.method) {
        case "echo":
          result = { message: "Hello from FOC Storage Agent", params: a2aRequest.params };
          break;
        case "agent.info":
          result = {
            name: "foc-storage-agent",
            version: "0.1.0",
            supportedChains: Object.keys(getChainConfig),
            capabilities: ["pin", "index", "verify"],
          };
          break;
        case "pin.add":
          result = { ok: true, message: "Pin add not implemented yet", cid: a2aRequest.params?.cid };
          break;
        case "pin.status":
          result = { ok: true, message: "Pin status not implemented yet", cid: a2aRequest.params?.cid };
          break;
        case "index.run":
          result = { ok: true, message: "Index run not implemented yet", jobId: "job_" + Date.now() };
          break;
        case "index.status":
          result = { ok: true, message: "Index status not implemented yet", jobId: a2aRequest.params?.jobId };
          break;
        case "verify.proof":
          result = { ok: true, message: "Verify proof not implemented yet", cid: a2aRequest.params?.cid };
          break;
        default:
          reply.code(400);
          return { error: "Unknown method", method: a2aRequest.method };
      }

      // Create signed response
      const signedResponse: SignedResponse = {
        chainId: a2aRequest.chainId,
        agentId: a2aRequest.agentId,
        timestamp: createTimestamp(),
        result,
        signature: "", // TODO: Implement actual signing
      };

      // Sign the response
      signedResponse.signature = signReply(signedResponse);

      reply.type("application/json");
      return signedResponse;
    } catch (error) {
      fastify.log.error({ error }, "A2A request error");
      reply.code(500);
      return { error: "Internal server error" };
    }
  });
}
