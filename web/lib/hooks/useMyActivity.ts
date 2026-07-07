"use client";

import { useAccount, useReadContracts } from "wagmi";
import { CONTRACTS } from "@/lib/contracts/config";
import { useAuctionList, type AuctionData } from "./useAuctions";

export interface MyActivity {
  listings: AuctionData[];
  activeBids: AuctionData[];
  withdrawable: { auction: AuctionData; amount: bigint }[];
  isLoading: boolean;
  refetch: () => void;
}

/// Since there's no off-chain indexer in this project, "my activity" is
/// derived by combining the full auction list (already fetched for the
/// browse page) with a batched `pendingWithdrawals` read across every
/// auction for the connected address. This is efficient enough at the
/// scale of a demo/testnet deployment; a production-scale version would
/// move this to the off-chain indexer described in the project's PRD.
export function useMyActivity(): MyActivity {
  const { address } = useAccount();
  const { auctions, isLoading: listLoading, refetch: refetchList } = useAuctionList();

  const { data: withdrawalsData, refetch: refetchWithdrawals } = useReadContracts({
    contracts: auctions.map((a) => ({
      ...CONTRACTS.auctionHouse,
      functionName: "pendingWithdrawals",
      args: [BigInt(a.id), address ?? "0x0"],
    })),
    query: { enabled: Boolean(address) && auctions.length > 0 },
  });

  if (!address) {
    return {
      listings: [],
      activeBids: [],
      withdrawable: [],
      isLoading: listLoading,
      refetch: refetchList,
    };
  }

  const listings = auctions.filter((a) => a.seller.toLowerCase() === address.toLowerCase());
  const activeBids = auctions.filter(
    (a) => a.highestBid > 0n && a.highestBidder.toLowerCase() === address.toLowerCase()
  );

  const withdrawable = auctions
    .map((auction, i) => ({
      auction,
      amount: (withdrawalsData?.[i]?.result as bigint | undefined) ?? 0n,
    }))
    .filter((entry) => entry.amount > 0n);

  return {
    listings,
    activeBids,
    withdrawable,
    isLoading: listLoading,
    refetch: () => {
      refetchList();
      refetchWithdrawals();
    },
  };
}
