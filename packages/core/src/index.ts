import { z } from "zod";

// Core types for agent identity and responses
export const AgentIdentitySchema = z.object({
  chainId: z.number(),
  agentId: z.string(),
  registry: z.string(),
  owner: z.string(),
});

export const SignedResponseSchema = z.object({
  chainId: z.number(),
  agentId: z.string(),
  timestamp: z.number(),
  result: z.any(),
  signature: z.string(),
});

export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;
export type SignedResponse = z.infer<typeof SignedResponseSchema>;

// A2A request/response types
export const A2ARequestSchema = z.object({
  method: z.string(),
  params: z.any().optional(),
  chainId: z.number(),
  agentId: z.string(),
  timestamp: z.number().optional(),
  signature: z.string().optional(),
});

export type A2ARequest = z.infer<typeof A2ARequestSchema>;

// MCP message types (will be extended with @modelcontextprotocol/sdk)
export const MCPMessageSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.any().optional(),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional(),
  }).optional(),
});

export type MCPMessage = z.infer<typeof MCPMessageSchema>;

// Agent card types
export const AgentCardSchema = z.object({
  type: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  chainIdentity: AgentIdentitySchema,
  publicKeys: z.object({
    signing: z.string(),
  }),
  endpoints: z.object({
    rpc: z.string(),
    mcp: z.string(),
  }),
  links: z.object({
    identities: z.array(AgentIdentitySchema).optional(),
  }).optional(),
  updated: z.string(),
});

export type AgentCard = z.infer<typeof AgentCardSchema>;

// Utility functions
export function createTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function validateTimestamp(timestamp: number, maxAgeSeconds: number = 300): boolean {
  const now = createTimestamp();
  return Math.abs(now - timestamp) <= maxAgeSeconds;
}
