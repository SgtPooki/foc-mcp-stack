export const CHAINS = {
  baseSepolia: {
    id: 84532,
    name: "Base Sepolia",
    registry: "0x7177a6867296406881E20d6647232314736Dd09A",
  },
  sepolia: {
    id: 11155111,
    name: "Sepolia",
    registry: "0x7177a6867296406881E20d6647232314736Dd09A",
  },
  base: {
    id: 8453,
    name: "Base",
    registry: "0x7177a6867296406881E20d6647232314736Dd09A",
  },
  mainnet: {
    id: 1,
    name: "Ethereum Mainnet",
    registry: "0x7177a6867296406881E20d6647232314736Dd09A",
  },
} as const;

export type ChainId = keyof typeof CHAINS;
export type ChainConfig = typeof CHAINS[ChainId];

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find(chain => chain.id === chainId);
}

export function getChainConfigByKey(chainKey: ChainId): ChainConfig {
  return CHAINS[chainKey];
}
