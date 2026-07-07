"use client";

import { useCallback, useEffect, useState } from "react";
import { useReadContract, useReadContracts, useWatchContractEvent, usePublicClient } from "wagmi";
import { CONTRACTS } from "@/lib/contracts/config";

export interface AuctionData {
  id: number;
  seller: string;
  nft: string;
  tokenId: bigint;
  startingPrice: bigint;
  minIncrement: bigint;
  endTime: number;
  extensionWindow: number;
  extensionDuration: number;
  highestBidder: string;
  highestBid: bigint;
  ended: boolean;
  cancelled: boolean;
  itemClaimed: boolean;
}

// The contract returns the Auction struct as a tuple; wagmi/viem give us it
// back as a named object matching the ABI's struct field names since the
// ABI declares component names. This helper normalizes it into a plain,
// friendly shape (and adds the id, which isn't part of the on-chain struct).
function normalizeAuction(id: number, raw: unknown): AuctionData {
  const a = raw as {
    seller: string;
    nft: string;
    tokenId: bigint;
    startingPrice: bigint;
    minIncrement: bigint;
    endTime: bigint | number;
    extensionWindow: bigint | number;
    extensionDuration: bigint | number;
    highestBidder: string;
    highestBid: bigint;
    ended: boolean;
    cancelled: boolean;
    itemClaimed: boolean;
  };
  return {
    id,
    seller: a.seller,
    nft: a.nft,
    tokenId: a.tokenId,
    startingPrice: a.startingPrice,
    minIncrement: a.minIncrement,
    endTime: Number(a.endTime),
    extensionWindow: Number(a.extensionWindow),
    extensionDuration: Number(a.extensionDuration),
    highestBidder: a.highestBidder,
    highestBid: a.highestBid,
    ended: a.ended,
    cancelled: a.cancelled,
    itemClaimed: a.itemClaimed,
  };
}

/// Reads a single auction's live state, kept fresh by watching every event
/// type that can change it (new bids, extensions, ending, cancellation,
/// claims).
export function useAuction(auctionId: number | undefined) {
  const enabled = auctionId !== undefined && CONTRACTS.auctionHouse.address.length > 0;

  const { data, isLoading, refetch } = useReadContract({
    ...CONTRACTS.auctionHouse,
    functionName: "getAuction",
    args: enabled ? [BigInt(auctionId)] : undefined,
    query: { enabled, refetchInterval: 15_000 },
  });

  const refetchNow = useCallback(() => {
    refetch();
  }, [refetch]);

  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "BidPlaced",
    onLogs: refetchNow,
    enabled,
  });
  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "AuctionExtended",
    onLogs: refetchNow,
    enabled,
  });
  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "AuctionEnded",
    onLogs: refetchNow,
    enabled,
  });
  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "AuctionCancelled",
    onLogs: refetchNow,
    enabled,
  });
  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "ItemClaimed",
    onLogs: refetchNow,
    enabled,
  });

  const auction = data && auctionId !== undefined ? normalizeAuction(auctionId, data) : undefined;

  return { auction, isLoading, refetch: refetchNow };
}

/// Reads the full list of auctions (by reading `auctionCount` then batching
/// a `getAuction` call for every ID) and keeps it live by refetching on any
/// AuctionCreated / BidPlaced / AuctionEnded event.
export function useAuctionList() {
  const { data: countData, refetch: refetchCount } = useReadContract({
    ...CONTRACTS.auctionHouse,
    functionName: "auctionCount",
    query: { enabled: CONTRACTS.auctionHouse.address.length > 0, refetchInterval: 20_000 },
  });

  const count = Number((countData as bigint | undefined) ?? 0n);
  const ids = Array.from({ length: count }, (_, i) => i);

  const { data, isLoading, refetch } = useReadContracts({
    contracts: ids.map((id) => ({
      ...CONTRACTS.auctionHouse,
      functionName: "getAuction",
      args: [BigInt(id)],
    })),
    query: { enabled: count > 0 },
  });

  const refetchAll = useCallback(() => {
    refetchCount();
    refetch();
  }, [refetchCount, refetch]);

  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "AuctionCreated",
    onLogs: refetchAll,
    enabled: CONTRACTS.auctionHouse.address.length > 0,
  });
  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "BidPlaced",
    onLogs: refetchAll,
    enabled: CONTRACTS.auctionHouse.address.length > 0,
  });
  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "AuctionEnded",
    onLogs: refetchAll,
    enabled: CONTRACTS.auctionHouse.address.length > 0,
  });
  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "AuctionCancelled",
    onLogs: refetchAll,
    enabled: CONTRACTS.auctionHouse.address.length > 0,
  });

  const auctions: AuctionData[] = (data ?? [])
    .map((result, i) => (result.status === "success" ? normalizeAuction(ids[i], result.result) : null))
    .filter((a): a is AuctionData => a !== null);

  return { auctions, isLoading, refetch: refetchAll };
}

export interface BidHistoryEntry {
  bidder: string;
  amount: bigint;
  timestamp: number;
  txHash: string;
}

/// Live + backfilled bid history for a single auction's detail page.
export function useBidHistory(auctionId: number | undefined) {
  const [history, setHistory] = useState<BidHistoryEntry[]>([]);
  const publicClient = usePublicClient();
  const enabled = auctionId !== undefined && CONTRACTS.auctionHouse.address.length > 0;

  useEffect(() => {
    if (!enabled || !publicClient) return;
    let cancelled = false;

    (async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock > 50_000n ? latestBlock - 50_000n : 0n;
        const logs = await publicClient.getContractEvents({
          address: CONTRACTS.auctionHouse.address,
          abi: CONTRACTS.auctionHouse.abi,
          eventName: "BidPlaced",
          fromBlock,
          toBlock: latestBlock,
        });
        if (cancelled) return;
        const filtered = logs
          .map((log) => {
            const typedLog = log as unknown as {
              args: { auctionId?: bigint; bidder?: string; amount?: bigint };
              transactionHash: string;
            };
            return typedLog;
          })
          .filter((log) => Number(log.args.auctionId ?? -1) === auctionId)
          .map((log) => ({
            bidder: log.args.bidder ?? "",
            amount: log.args.amount ?? 0n,
            timestamp: Date.now(),
            txHash: log.transactionHash,
          }));
        setHistory(filtered.reverse());
      } catch {
        // Best-effort backfill only.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, auctionId, enabled]);

  useWatchContractEvent({
    ...CONTRACTS.auctionHouse,
    eventName: "BidPlaced",
    enabled,
    onLogs: (logs) => {
      for (const log of logs) {
        const typedLog = log as unknown as {
          args: { auctionId?: bigint; bidder?: string; amount?: bigint };
          transactionHash: string;
        };
        if (Number(typedLog.args.auctionId ?? -1) !== auctionId) continue;
        setHistory((prev) => [
          {
            bidder: typedLog.args.bidder ?? "",
            amount: typedLog.args.amount ?? 0n,
            timestamp: Date.now(),
            txHash: typedLog.transactionHash,
          },
          ...prev,
        ]);
      }
    },
  });

  return history;
}
