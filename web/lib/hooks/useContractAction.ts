"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import type { Abi } from "viem";

export type ActionStatus = "idle" | "pending" | "confirming" | "success" | "error";

/// Wraps the common wagmi write -> wait-for-confirmation -> surface-errors
/// flow used by every state-changing action in the simulator (approve,
/// swap, add/remove liquidity, faucet claims). Centralizing this keeps
/// every panel's error handling and status UI consistent.
export function useContractAction() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const execute = useCallback(
    async (params: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
      value?: bigint;
    }) => {
      setStatus("pending");
      setError(null);
      try {
        const hash = await writeContractAsync(params);
        setTxHash(hash);
        setStatus("confirming");
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        setStatus("success");
        return hash;
      } catch (err) {
        setStatus("error");
        setError(humanizeError(err));
        throw err;
      }
    },
    [writeContractAsync, publicClient]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(undefined);
  }, []);

  return { execute, status, error, txHash, reset };
}

function humanizeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("User rejected") || message.includes("User denied")) {
    return "Transaction was cancelled.";
  }
  if (message.includes("BidTooLow")) {
    return "Someone else's bid landed first, or your amount is below the minimum. Refresh and try again.";
  }
  if (message.includes("AuctionAlreadyEnded")) {
    return "This auction has already ended.";
  }
  if (message.includes("NothingToWithdraw")) {
    return "There's nothing available to withdraw for this auction.";
  }
  if (message.includes("NotHighestBidder")) {
    return "Only the winning bidder can claim this item.";
  }
  if (message.includes("AuctionHasBids")) {
    return "This listing can no longer be cancelled — a bid has already been placed.";
  }
  if (message.includes("InsufficientOutputAmount")) {
    return "The price moved more than your slippage tolerance allows. Try again.";
  }
  if (message.includes("InsufficientLiquidity")) {
    return "The pool doesn't have enough liquidity for this action.";
  }
  if (message.includes("insufficient funds")) {
    return "Insufficient balance to cover this transaction plus gas.";
  }
  // Fall back to a short, non-technical message rather than a raw revert dump.
  return "Something went wrong sending that transaction. Please try again.";
}

// Re-export for convenience in components that only need the wait hook.
export { useWaitForTransactionReceipt };
