# Auctra — Live On-Chain English Auctions

A trust-minimized auction house on Ethereum: outbid participants are
refunded automatically, last-second sniping is defeated by an automatic
time extension, and nobody — including the deployer — can cancel a live
auction or change its rules once bidding starts.

```
contracts/   Solidity smart contracts (Hardhat) — AuctionHouse + demo NFT
web/         Next.js frontend — landing page, auth, browse/bid/list/dashboard
```

---

## 1. What's actually implemented

**Contracts** (`contracts/contracts/`)
- `AuctionHouse.sol` — a single contract managing many auctions by ID (cheaper to deploy than one contract per auction, and much easier to index). `createAuction`, `bid`, `withdraw`, `endAuction`, `claimItem`, `cancelAuction`. Pull-payment refunds, checks-effects-interactions, `ReentrancyGuard`, anti-snipe time extension with a hard cap on total extensions, custom-error revert reasons.
- `MockCollectible.sol` — a free, publicly mintable ERC-721 so trying the app never requires sourcing a real NFT.
- **23 passing tests** (`contracts/test/AuctionHouse.test.js`), including a simulated refund-griefing attack (a bidder contract that reverts on receiving ETH) and a simulated reentrancy attack against `withdraw()` — both confirmed blocked without affecting other users.

**Frontend** (`web/`)
- Landing page with a live-feeling animated auction-card preview, "how it works," feature grid, FAQ — a deliberately distinct dark, gold-accented, serif-display "auction house" aesthetic (vs. a typical light SaaS dashboard).
- Authentication via Auth.js (NextAuth v5): wallet (Sign-In With Ethereum) as the primary path, email magic link as a fallback.
- **Browse** (`/auctions`) — public, no sign-in required, live + ended auctions.
- **Auction detail** (`/auctions/[id]`) — live countdown, current highest bid, live bid history feed, bid panel with minimum-bid guidance, an "outbid" banner, and claim/withdraw/cancel actions depending on your role and the auction's state.
- **List an item** (`/create`, sign-in required) — a guided three-transaction flow: mint a demo item, approve the auction house, list it.
- **Dashboard** (`/dashboard`, sign-in required) — your active listings, your active winning bids, and every withdrawable balance across all auctions, with one-click withdraw.
- Every number is read directly from the deployed contract — nothing is faked client-side.

---

## 2. Prerequisites

Same as the companion Liquidity Pool Simulator project:
- Node.js 20+, npm
- A Sepolia RPC URL (Alchemy/Infura recommended over the public default)
- A wallet with a little Sepolia ETH for deployment gas
- A WalletConnect Cloud project ID (free)
- SMTP credentials for email magic links
- **A real Postgres database** — see the note below; this project defaults to requiring one from the start.

---

## 3. Deploy the contracts

```bash
cd contracts
npm install
cp .env.example .env   # fill in SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY
npm test                # 23 tests should pass
npm run deploy:sepolia  # deploys MockCollectible + AuctionHouse, seeds one sample auction
```

The deploy script prints the two addresses you need and writes them to
`web/lib/contracts/deployments/sepolia.json` automatically.

> **Sandbox build note:** exactly as with the Liquidity Pool Simulator, this
> project was developed in a network-sandboxed environment where
> `binaries.soliditylang.org` (solc's binary download source) was
> unreachable. A fallback (`npm run compile:offline`, using the pure-JS
> `solc` npm package) was used instead, and all 23 tests pass against it.
> In your own environment, plain `npm run compile` / `npm test` will work
> normally.

---

## 4. Configure and run the frontend locally

```bash
cd web
npm install
cp .env.example .env.local   # fill in contract addresses from step 3, plus auth config
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### About the database — read this before you deploy

**This project defaults `prisma/schema.prisma` to Postgres, not SQLite,
and `DATABASE_URL` has no default value.** That's a deliberate choice made
after debugging exactly this failure mode in the companion project: SQLite
writes to a local file, and serverless hosts (Vercel and similar) give each
request an ephemeral, largely read-only filesystem. A nonce or session
written by one request may simply not exist by the time the next request
looks for it, causing sign-in to fail unpredictably in production while
appearing to work fine in local testing.

Use a real Postgres instance from the very start — free tiers on
[Neon](https://neon.tech), Vercel Postgres, or Supabase all take under 5
minutes to set up and work identically for local development too.

---

## 5. Deploying to production

Same pattern as the companion project: contracts on Sepolia (step 3) +
frontend on Vercel.

1. Push this repo to GitHub, import `web/` as a Vercel project (root directory = `web`).
2. Add every variable from `web/.env.example` in Vercel's environment settings, using real values — especially a real Postgres `DATABASE_URL`.
3. Deploy. `npm run build` already runs `prisma generate` first (see `package.json`).
4. Your auction house is now live at a public URL.

---

## 6. Security notes

- **Pull-payment refunds** are the single most important design decision in this contract: outbid bidders' funds are *credited*, never pushed, so a malicious or broken bidder contract can only ever block its own withdrawal — never anyone else's, and never the auction itself.
- Checks-effects-interactions is followed in every value- or NFT-moving function, with `ReentrancyGuard` as defense-in-depth.
- Anti-snipe extensions are capped (`MAX_EXTENSIONS = 50`) to bound worst-case auction duration against a "bid forever in the last second" grief.
- No privileged admin override exists once bidding starts — not even for the contract deployer.
- **This contract has not been professionally audited.** It's built for a public test network with demo NFTs. Do not deploy it to mainnet or adapt it to hold real value without a proper audit.
- Front-running (someone seeing your bid in the mempool and outbidding you by the smallest possible margin before it lands) is an inherent property of public blockchains, not something this contract tries to fully solve — the minimum-increment mechanism limits how cheaply that can be done.

---

## 7. Known simplifications (documented, not accidental)

- **No off-chain indexer/subgraph.** The browse page and dashboard derive their view by batching `getAuction`/`pendingWithdrawals` reads across every auction ID directly from the contract. This is simple and correct at demo/testnet scale; a larger deployment would move to the indexed, cached architecture described in the project's PRD.
- **"My activity" bid history is a live snapshot, not a full historical ledger** — it shows your *current* winning bids and withdrawable balances, derived from present contract state, not a complete timeline of every bid you've ever placed.
- **Listing an item is a three-transaction flow** (mint → approve → list) rather than a single signature, since minting a demo item and escrowing it are genuinely separate on-chain actions. This is called out explicitly in the UI while it's happening.

---

## 8. Project structure

```
contracts/
  contracts/AuctionHouse.sol
  contracts/MockCollectible.sol
  contracts/test/MaliciousBidder.sol     (test-only attack simulation contract)
  test/AuctionHouse.test.js
  scripts/deploy.js
  scripts/syncAbi.js
  build.js                               (offline solc-js fallback compiler)

web/
  app/
    page.tsx                             landing page
    login/page.tsx                        sign-in (wallet + email)
    auctions/page.tsx                     browse (public)
    auctions/[id]/page.tsx                auction detail / live bidding (public)
    create/page.tsx                       list an item (sign-in required)
    dashboard/page.tsx                    my activity (sign-in required)
    api/auth/[...nextauth]/               Auth.js route handler
    api/auth/siwe-nonce/                  SIWE nonce issuance endpoint
  components/
    landing/                              hero, how-it-works, features, FAQ
    auth/                                 wallet + email sign-in components
    auction/                              cards, bid panel, countdown, claim/withdraw
    ui/                                   shared Button/Card/Badge/Tooltip primitives
  lib/
    contracts/                            ABIs + addresses
    hooks/                                auction list/detail, bid history, countdown, my activity
    auth.ts, prisma.ts, wagmi.ts
  prisma/schema.prisma
  proxy.ts                                protects /create and /dashboard behind sign-in
```
