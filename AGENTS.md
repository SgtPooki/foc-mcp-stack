# AGENTS.md
## FOC-Storage Agent (single agent, multi-chain identity)

This document explains the architecture, purpose, and workflow of the **FOC-Storage Agent** - our single agent implementation that provides Filecoin/IPFS storage services across multiple chains.

---

## 🧠 What is the FOC-Storage Agent?

The **FOC-Storage Agent** is an **autonomous off-chain service** that:
- owns **multiple on-chain identities** (one ERC-8004 NFT per supported chain)
- exposes network interfaces: **MCP** (Machine Communication Protocol) and **A2A** (Agent-to-Agent HTTP)
- performs Filecoin/IPFS operations: pinning, indexing, verification, and storage management
- signs and publishes verifiable results back to clients or chains

The agent is **not a smart contract** — it's a *single server* that uses multiple blockchains for **identity and trust** while providing unified storage services.

---

## 🪪 ERC-8004 Overview

**ERC-8004** defines a standard for *on-chain agent identity and discovery*.

| Component | Description |
|------------|--------------|
| **Identity Registry** | ERC-721-like contract that mints an `agentId` NFT representing an agent’s identity. |
| **Token URI** | Points to a `registration.json` file describing endpoints, supported protocols, and metadata. |
| **Agent Card** | Off-chain document (served from `/.well-known/agent-card.json`) that describes the agent’s capabilities and endpoints in machine-readable form. |
| **Reputation / Validation Registries** | Optional ERC-8004 extensions for storing attestations and reputation data. |

The on-chain layer provides **proof of existence and authenticity**, while the off-chain layer provides **actual functionality**.

---

## 🏗️ FOC-Storage Agent Architecture

```
+---------------------------------------------+
|            FOC MCP Stack (this repo)        |
+---------------------------------------------+
| Apps:                                       |
|  • agent-service   → A2A + MCP endpoints    |
| Packages:                                   |
|  • @foc-mcp/core   → signing, message utils |
|  • @foc-mcp/chain-config → registry addrs   |
|  • future: @foc-mcp/agent-registry, cards   |
+---------------------------------------------+
       │
       ▼
 ┌────────────┐  ┌────────────┐  ┌────────────┐
 │ Identity   │  │ Identity   │  │ Identity   │
 │ Registry   │  │ Registry   │  │ Registry   │
 │ (Base)     │  │ (Sepolia)  │  │ (Mainnet)  │
 └────────────┘  └────────────┘  └────────────┘
       │               │               │
       └───────────────┼───────────────┘
                       ▼
 ┌────────────────────────────┐
 │ registration.json          │  (same tokenURI for all chains)
 │ → declares endpoints       │
 │ → links agent-card.json    │
 └────────────────────────────┘
                       │
                       ▼
 ┌────────────────────────────┐
 │ agent-card.json            │  (per-chain variants)
 │ → A2A + MCP URLs           │
 │ → public keys, chain info  │
 │ → cross-chain links        │
 └────────────────────────────┘
                       │
                       ▼
 ┌────────────────────────────┐
 │ Single MCP / A2A server    │  (Fastify app)
 │ → chain-aware routing      │
 │ → Filecoin/IPFS operations │
 │ → signs responses          │
 └────────────────────────────┘
```

---

## 📁 Repository layout & conventions

```
foc-mcp-stack/
├─ apps/
│  └─ agent-service/          # Single server: /.well-known + /a2a + /mcp
│     ├─ src/
│     │  ├─ server.ts         # Fastify bootstrap (HTTP + WS)
│     │  ├─ routes/
│     │  │  ├─ wellKnown.ts   # GET /.well-known/agent-card*.json
│     │  │  ├─ a2a.ts         # POST /a2a — A2A RPC methods
│     │  │  └─ mcp.ts         # WS /mcp — MCP message loop
│     │  ├─ handlers/         # Business logic grouped by domain
│     │  │  ├─ pin.ts         # pin.add / pin.status
│     │  │  ├─ index.ts       # index.run / index.status
│     │  │  └─ verify.ts      # verify.proof
│     │  ├─ middleware/       # auth, rate-limit, schema guards
│     │  ├─ schemas/          # zod schemas for requests/responses
│     │  ├─ signing/          # reply signing / verification
│     │  └─ utils/            # helpers (CID, time, errors)
│     ├─ .env.example
│     └─ tsconfig.json
│
├─ packages/
│  ├─ chain-config/           # Chain IDs, registry addrs, env wiring
│  │  └─ src/index.ts
│  ├─ foc-core/               # Shared types, hashing, signing utils
│  │  └─ src/index.ts
│  └─ (future)
│     ├─ agent-registry/      # viem client & CLI helpers for ERC-8004
│     └─ agent-cards/         # card template + builder (zod/JSON-Schema)
│
├─ deployments/
│  ├─ cards/                  # Built agent-card files to serve
│  │  ├─ agent-card.json              # primary chain
│  │  ├─ agent-card-sepolia.json
│  │  └─ agent-card-base-sepolia.json
│  └─ registration/           # tokenURI payload(s) by env/chain
│     ├─ sepolia/registration.json
│     └─ base-sepolia/registration.json
│
├─ scripts/
│  ├─ build-cards.ts          # emit per-chain cards from one template
│  └─ register-agent.ts       # mint/metadata ops on ERC-8004 registry
│
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md / AGENTS.md
```

**Naming:**

* Handlers use `domain.action` (e.g., `pin.add`), one file per domain.
* Request schemas live in `schemas/` and are imported by routes.
* Anything chain/env-specific flows through `@foc-mcp/chain-config`.

---

## 🧭 How to add a new chain (single agent, multi-chain)

1. **Add config** in `packages/chain-config/src/index.ts`:

```ts
export const CHAINS = {
  ...,
  baseSepolia: { id: 84532, name: "Base Sepolia", registry: "0x..." }
} as const;
```

2. **Build a card** (same template; swap `{ chainId, registry, agentId }`):

```bash
pnpm tsx scripts/build-cards.ts --chain base-sepolia --agentId 1 \
  --registry 0xREG --out deployments/cards/agent-card-base-sepolia.json
```

3. **Register on-chain** (writes tokenURI + optional metadata):

```bash
pnpm tsx scripts/register-agent.ts \
  --chain base-sepolia \
  --tokenURI ipfs://bafy...registration.json
```

4. **Serve the card** from the server (or static host):

* Either add a route alias (e.g., `/.well-known/agent-card-base-sepolia.json`)
* Or sync `deployments/cards/*` to your site and link from the primary card.

---

## 🛠️ How to add a new A2A/MCP method

1. **Schema** in `apps/agent-service/src/schemas/<domain>.ts`:

```ts
import { z } from "zod";
export const PinAddReq = z.object({ cid: z.string(), options: z.any().optional() });
export type PinAddReq = z.infer<typeof PinAddReq>;
```

2. **Handler** in `apps/agent-service/src/handlers/pin.ts`:

```ts
export async function pinAdd(req: PinAddReq) {
  // do work; return plain data
  return { ok: true, cid: req.cid };
}
```

3. **Wire up A2A** in `routes/a2a.ts`:

```ts
const Methods = {
  "pin.add": async (params) => pinAdd(PinAddReq.parse(params)),
  // ...
};
```

4. **Wire up MCP** in `routes/mcp.ts` similarly (same handlers).

All replies go through a single signer:

```ts
// signing/index.ts
export function signReply({ chainId, agentId, result }) { /* … */ }
```

---

## 🔐 Signing & binding (response shape)

Every response MUST bind to the on-chain identity + time window:

```json
{
  "chainId": 84532,
  "agentId": "1",
  "timestamp": 1720000000000,
  "result": { "ok": true, "data": "..." },
  "signature": "0x<secp256k1-signature>"
}
```

* Sign over `{ chainId, agentId, timestamp, result }` (domain-separated).
* Reject requests with stale timestamps or invalid signatures (if caller-signed).

---

## 🧪 Local dev

```bash
pnpm install
pnpm dev
# GET http://localhost:3000/.well-known/agent-card.json
# POST http://localhost:3000/a2a { "method":"echo", "params":{...}, "chainId":84532, "agentId":"1" }
# WS  ws://localhost:3000/mcp
```

Set `.env` in `apps/agent-service`:

```
PORT=3000
PUBLIC_URL=http://localhost:3000
SIGNER_PK=0x<hex>            # agent reply key (dev only)
RPC_sepolia=...
RPC_base-sepolia=...
```

---

## 🚦 Operational notes

* **One server now;** easy future split (gateway vs worker) by moving `handlers/` to a package.
* **Observability:** tag logs and metrics with `{ chainId, agentId, method }`.
* **Backpressure & limits:** rate-limit `/a2a` per IP + per `chainId`; cap WS fanout in MCP.

---

## 🌐 Multi-Chain Strategy

We operate **one agent implementation** (the FOC-Storage Agent) that provides:
- **A2A** (HTTP) and **MCP** (WebSocket) endpoints
- Filecoin/IPFS pinning, indexing, and verification workflows
- Signed responses for integrity and non-repudiation

### On-chain identity (ERC-8004)
We register the **same tokenURI** on each chain we support. Each registration mints a chain-local `agentId`, but all of them point to the *same* off-chain server.

### Off-chain descriptors
- **registration.json** (tokenURI): canonical descriptor with endpoint links.
- **agent-card.json**: per-chain card that includes `{ chainId, registry, agentId }` and our `publicKeys.signing`.

### Endpoints
- `GET /.well-known/agent-card.json` → primary chain card (aliases for other chains optional)
- `POST /a2a` → request/response operations (pin, status, index, verify)
- `WS /mcp` → long-lived/streaming operations

### Request binding
Every request and response is bound to `{ chainId, agentId, timestamp }` and signed by the agent.

---

## 📡 Communication Modes

| Protocol | Transport | Purpose |
|-----------|------------|----------|
| **A2A** | HTTP/HTTPS | Simple request/response calls between agents. Uses signed JSON payloads. |
| **MCP** | WebSocket (or HTTP long-poll) | Streaming or persistent communication. Used for live indexing, job dispatch, etc. |

The same Fastify server hosts both endpoints.

---

## 🔏 Trust & Signatures

Each agent publishes a `publicKeys.signing` field in its `agent-card.json`.
Responses from the agent include:
```json
{
  "chainId": 84532,
  "agentId": "1",
  "timestamp": 1720000000000,
  "result": { "ok": true },
  "signature": "0x..."
}
```

Clients verify that signature using the declared public key or the on-chain owner of `agentId`.

---

## ⚙️ Typical Flow

1) Client fetches registry on chain X → gets tokenURI → fetches `registration.json`.
2) Follows link to `/.well-known/agent-card.json` (or `-<chain>.json`).
3) Calls `/a2a` or `/mcp` with `{ chainId, agentId }`.
4) Server executes and returns a **signed** result.

### Deployment Lifecycle
1. **Author the registration JSON** → defines endpoints and metadata.
2. **Mint the ERC-8004 identity** → call `register(tokenURI, metadata)` on each target chain.
3. **Deploy the MCP/A2A server** → the actual agent logic.
4. **Serve the Agent Card** at `/.well-known/agent-card.json`.
5. **Cross-link** all chain identities in the card or metadata.
6. **Respond to requests** with signed data payloads.

---

## 🧩 A2A Method Surface (suggested, single agent)

* `pin.add { cid, options }`
* `pin.status { cid }`
* `index.run { datasetId | rootCid }`
* `index.status { jobId }`
* `verify.proof { cid | pieceCid }`
* `agent.info {}` (version, supported chains, limits)

Every reply: `{ chainId, agentId, timestamp, result, signature }`.

## 🔧 Environment & Routing (single agent)

* `CHAINS=base-sepolia,sepolia`
* `RPC_base-sepolia=...`
* `RPC_sepolia=...`
* `SIGNER_PK=0x...` (agent reply key)
* `PUBLIC_URL=https://your.site`

At request time:

```ts
routeByChain(chainId) {
  switch (chainId) {
    case 84532: return clients.baseSepolia;
    case 11155111: return clients.sepolia;
    default: throw new Error("unsupported_chain");
  }
}
```

## 📄 Single agent-card template (use for all chains; just swap three fields)

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#agent-card-v1",
  "name": "foc-storage-agent",
  "version": "0.3.0",
  "description": "FOC single agent providing Filecoin/IPFS pinning, indexing, and verification via A2A/MCP.",
  "chainIdentity": {
    "chainId": 84532,
    "registry": "0xREGISTRY_ADDR",
    "agentId": "1",
    "owner": "0xOWNER_ADDR"
  },
  "publicKeys": {
    "signing": "0x04YOUR_UNCOMPRESSED_SECP256K1_PUBKEY"
  },
  "endpoints": {
    "rpc": "https://your.site/a2a",
    "mcp": "wss://your.site/mcp"
  },
  "links": {
    "identities": [
      { "chainId": 11155111, "registry": "0x...", "agentId": "3" },
      { "chainId": 1, "registry": "0x...", "agentId": "420" }
    ]
  },
  "updated": "2025-10-22T00:00:00Z"
}
```

---

## 🚀 Roadmap (single agent)

- [ ] CLI to register the agent on new chains
- [ ] Card builder: emit per-chain cards from one template
- [ ] Reputation/Validation integration (optional)
- [ ] Observability (per-chain metrics & rate limits)

---

## 🧾 References

* [ERC-8004: On-Chain Agent Identity and Discovery](https://eips.ethereum.org/EIPS/eip-8004)
* [Machine Communication Protocol (MCP)](https://specs.agentprotocol.org/mcp/)
* [Filecoin Project](https://filecoin.io)
* [IPFS / libp2p](https://libp2p.io)

---

### Maintainer

**Russell Dempsey** (@sgtpooki) — Filecoin / IPFS ecosystem developer
© 2025 — MIT License
