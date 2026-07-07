"use client";

import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CONTRACTS } from "@/lib/contracts/config";
import { fmtEth } from "@/lib/format";
import { useContractAction } from "@/lib/hooks/useContractAction";
import { usePendingWithdrawal } from "@/lib/hooks/useAuctionUser";
import { useIsPast } from "@/lib/hooks/useCountdown";
import type { AuctionData } from "@/lib/hooks/useAuctions";
import { Loader2, PartyPopper, Undo2, XCircle } from "lucide-react";

export function ClaimWithdrawPanel({
  auction,
  onChanged,
}: {
  auction: AuctionData;
  onChanged: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { amount: pendingAmount, refetch: refetchPending } = usePendingWithdrawal(auction.id);
  const endAction = useContractAction();
  const claimAction = useContractAction();
  const withdrawAction = useContractAction();
  const cancelAction = useContractAction();

  const isPastEndTime = useIsPast(auction.endTime);
  const hasEnded = auction.ended || isPastEndTime;
  const isSeller = address?.toLowerCase() === auction.seller.toLowerCase();
  const isWinner =
    address?.toLowerCase() === auction.highestBidder.toLowerCase() && auction.highestBid > 0n;
  const hasBids = auction.highestBid > 0n;

  async function handleEndAuction() {
    await endAction.execute({
      address: CONTRACTS.auctionHouse.address,
      abi: CONTRACTS.auctionHouse.abi,
      functionName: "endAuction",
      args: [BigInt(auction.id)],
    });
    onChanged();
  }

  async function handleClaim() {
    await claimAction.execute({
      address: CONTRACTS.auctionHouse.address,
      abi: CONTRACTS.auctionHouse.abi,
      functionName: "claimItem",
      args: [BigInt(auction.id)],
    });
    onChanged();
  }

  async function handleWithdraw() {
    await withdrawAction.execute({
      address: CONTRACTS.auctionHouse.address,
      abi: CONTRACTS.auctionHouse.abi,
      functionName: "withdraw",
      args: [BigInt(auction.id)],
    });
    refetchPending();
    onChanged();
  }

  async function handleCancel() {
    await cancelAction.execute({
      address: CONTRACTS.auctionHouse.address,
      abi: CONTRACTS.auctionHouse.abi,
      functionName: "cancelAuction",
      args: [BigInt(auction.id)],
    });
    onChanged();
  }

  if (!isConnected) return null;

  const showCancelOption = isSeller && !hasBids && !hasEnded && !auction.cancelled;
  const showEndOption = hasEnded && !auction.ended && !auction.cancelled;
  const showClaimOption =
    (auction.ended || auction.cancelled) &&
    !auction.itemClaimed &&
    ((isWinner) || (isSeller && !hasBids));
  const showWithdrawOption = pendingAmount > 0n;

  if (!showCancelOption && !showEndOption && !showClaimOption && !showWithdrawOption) {
    return null;
  }

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-display font-semibold">Your actions</h3>

      {showEndOption && (
        <div>
          <p className="text-sm text-ink-soft mb-3">
            The countdown has run out. Anyone can finalize this auction to
            release the item and funds.
          </p>
          <Button
            className="w-full"
            variant="secondary"
            onClick={handleEndAuction}
            disabled={endAction.status === "pending" || endAction.status === "confirming"}
          >
            {(endAction.status === "pending" || endAction.status === "confirming") && (
              <Loader2 size={16} className="animate-spin" />
            )}
            Finalize auction
          </Button>
        </div>
      )}

      {showClaimOption && (
        <div>
          <p className="text-sm text-ink-soft mb-3 flex items-center gap-1.5">
            <PartyPopper size={15} className="text-gold" />
            {isWinner ? "You won this auction! Claim your item." : "No bids were placed — reclaim your item."}
          </p>
          <Button
            className="w-full"
            onClick={handleClaim}
            disabled={claimAction.status === "pending" || claimAction.status === "confirming"}
          >
            {(claimAction.status === "pending" || claimAction.status === "confirming") && (
              <Loader2 size={16} className="animate-spin" />
            )}
            Claim item
          </Button>
        </div>
      )}

      {showWithdrawOption && (
        <div>
          <p className="text-sm text-ink-soft mb-3 flex items-center gap-1.5">
            <Undo2 size={15} className="text-gold" />
            You have {fmtEth(pendingAmount)} ETH available to withdraw.
          </p>
          <Button
            className="w-full"
            variant="secondary"
            onClick={handleWithdraw}
            disabled={withdrawAction.status === "pending" || withdrawAction.status === "confirming"}
          >
            {(withdrawAction.status === "pending" || withdrawAction.status === "confirming") && (
              <Loader2 size={16} className="animate-spin" />
            )}
            Withdraw {fmtEth(pendingAmount)} ETH
          </Button>
        </div>
      )}

      {showCancelOption && (
        <div>
          <p className="text-sm text-ink-soft mb-3 flex items-center gap-1.5">
            <XCircle size={15} className="text-ink-faint" />
            No bids yet — you can still cancel this listing.
          </p>
          <Button
            className="w-full"
            variant="ghost"
            onClick={handleCancel}
            disabled={cancelAction.status === "pending" || cancelAction.status === "confirming"}
          >
            {(cancelAction.status === "pending" || cancelAction.status === "confirming") && (
              <Loader2 size={16} className="animate-spin" />
            )}
            Cancel listing
          </Button>
        </div>
      )}

      {(endAction.error || claimAction.error || withdrawAction.error || cancelAction.error) && (
        <p className="text-xs text-danger">
          {endAction.error || claimAction.error || withdrawAction.error || cancelAction.error}
        </p>
      )}
    </Card>
  );
}
