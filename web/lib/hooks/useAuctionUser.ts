"use client";

import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts/config";

/// The connected user's withdrawable ETH balance for a specific auction --
/// either a refund from being outbid, or seller proceeds after the auction
/// ended.
export function usePendingWithdrawal(auctionId: number | undefined) {
  const { address } = useAccount();
  const enabled = auctionId !== undefined && Boolean(address) && CONTRACTS.auctionHouse.address.length > 0;

  const { data, refetch } = useReadContract({
    ...CONTRACTS.auctionHouse,
    functionName: "pendingWithdrawals",
    args: enabled ? [BigInt(auctionId), address] : undefined,
    query: { enabled, refetchInterval: 10_000 },
  });

  return { amount: (data as bigint | undefined) ?? 0n, refetch };
}

/// Display name for an auctioned NFT item, read from MockCollectible's
/// custom `nameOf` view function.
export function useItemName(tokenId: bigint | undefined) {
  const { data } = useReadContract({
    ...CONTRACTS.nft,
    functionName: "nameOf",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined && CONTRACTS.nft.address.length > 0 },
  });
  return (data as string | undefined) ?? "";
}

/// The connected user's owned NFT token IDs from the demo collectible
/// contract, used on the "create auction" screen to let them pick an item
/// they actually own (or mint a new one).
export function useOwnedItems() {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    ...CONTRACTS.nft,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && CONTRACTS.nft.address.length > 0 },
  });

  const { data: nextTokenId } = useReadContract({
    ...CONTRACTS.nft,
    functionName: "nextTokenId",
    query: { enabled: CONTRACTS.nft.address.length > 0 },
  });

  return {
    ownedCount: Number((balance as bigint | undefined) ?? 0n),
    totalMinted: Number((nextTokenId as bigint | undefined) ?? 0n),
  };
}
