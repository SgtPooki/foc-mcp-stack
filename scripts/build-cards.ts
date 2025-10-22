#!/usr/bin/env tsx

import { writeFileSync } from "fs";
import { join } from "path";
import { CHAINS } from "@foc-mcp/chain-config";
import { AgentCard } from "@foc-mcp/core";

interface BuildCardOptions {
  chain: string;
  agentId: string;
  registry: string;
  owner: string;
  publicKey: string;
  publicUrl: string;
  out: string;
}

function buildAgentCard(options: BuildCardOptions): AgentCard {
  const chainConfig = Object.values(CHAINS).find(c => c.name.toLowerCase().replace(/\s+/g, '-') === options.chain);
  if (!chainConfig) {
    throw new Error(`Unknown chain: ${options.chain}`);
  }

  const card: AgentCard = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#agent-card-v1",
    name: "foc-storage-agent",
    version: "0.1.0",
    description: "FOC single agent providing Filecoin/IPFS pinning, indexing, and verification via A2A/MCP.",
    chainIdentity: {
      chainId: chainConfig.id,
      registry: options.registry,
      agentId: options.agentId,
      owner: options.owner,
    },
    publicKeys: {
      signing: options.publicKey,
    },
    endpoints: {
      rpc: `${options.publicUrl}/a2a`,
      mcp: `${options.publicUrl.replace('http', 'ws')}/mcp`,
    },
    links: {
      identities: [], // Will be populated with other chain identities
    },
    updated: new Date().toISOString(),
  };

  return card;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: Partial<BuildCardOptions> = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace('--', '');
  const value = args[i + 1];
  if (key && value) {
    (options as any)[key] = value;
  }
}

// Validate required options
const required = ['chain', 'agentId', 'registry', 'owner', 'publicKey', 'publicUrl', 'out'];
for (const field of required) {
  if (!options[field as keyof BuildCardOptions]) {
    console.error(`Missing required option: --${field}`);
    process.exit(1);
  }
}

try {
  const card = buildAgentCard(options as BuildCardOptions);
  const outputPath = join(process.cwd(), options.out!);

  writeFileSync(outputPath, JSON.stringify(card, null, 2));
  console.log(`✅ Agent card built: ${outputPath}`);
  console.log(`   Chain: ${options.chain} (${card.chainIdentity.chainId})`);
  console.log(`   Agent ID: ${options.agentId}`);
} catch (error) {
  console.error("❌ Failed to build agent card:", error);
  process.exit(1);
}
