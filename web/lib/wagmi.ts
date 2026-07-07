import { http } from "wagmi";
import { sepolia, hardhat, type Chain } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Auctra targets Sepolia (a public testnet) as its primary, publicly
// reachable deployment, with a local Hardhat node available for
// development. Every ETH value here is testnet ETH -- there is nothing to
// support mainnet for, since this is a demo/education-grade auction house.
const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const chains: readonly [Chain, ...Chain[]] =
  process.env.NEXT_PUBLIC_CHAIN_NAME === "localhost" ? [hardhat, sepolia] : [sepolia, hardhat];

export const wagmiConfig = getDefaultConfig({
  appName: "Auctra",
  projectId: walletConnectProjectId || "00000000000000000000000000000000",
  chains,
  transports: {
    [sepolia.id]: http(rpcUrl),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

export const activeChain = process.env.NEXT_PUBLIC_CHAIN_NAME === "localhost" ? hardhat : sepolia;
