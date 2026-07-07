import type { Abi } from "viem";
import auctionHouseAbiJson from "./abi/AuctionHouse.json";
import nftAbiJson from "./abi/MockCollectible.json";

const auctionHouseAbi = auctionHouseAbiJson as unknown as Abi;
const nftAbi = nftAbiJson as unknown as Abi;

export const CONTRACTS = {
  auctionHouse: {
    address: (process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS || "") as `0x${string}`,
    abi: auctionHouseAbi,
  },
  nft: {
    address: (process.env.NEXT_PUBLIC_NFT_ADDRESS || "") as `0x${string}`,
    abi: nftAbi,
  },
} as const;

export function isContractConfigured() {
  return Boolean(CONTRACTS.auctionHouse.address && CONTRACTS.nft.address);
}
