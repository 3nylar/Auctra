"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { EducationTip } from "@/components/ui/EducationTip";
import { CONTRACTS } from "@/lib/contracts/config";
import { fmtEth, toWei } from "@/lib/format";
import { useContractAction } from "@/lib/hooks/useContractAction";
import { useIsPast } from "@/lib/hooks/useCountdown";
import type { AuctionData } from "@/lib/hooks/useAuctions";
import { Loader2, Gavel } from "lucide-react";

export function BidPanel({
  auction,
  onBidPlaced,
}: {
  auction: AuctionData;
  onBidPlaced: () => void;
}) {
  const { isConnected, address } = useAccount();
  const [amountStr, setAmountStr] = useState("");
  const bidAction = useContractAction();

  const isPastEndTime = useIsPast(auction.endTime);
  const hasEnded = auction.ended || isPastEndTime;
  const isSeller = address?.toLowerCase() === auction.seller.toLowerCase();
  const isHighestBidder = address?.toLowerCase() === auction.highestBidder.toLowerCase();

  const minNextBid = auction.highestBid > 0n ? auction.highestBid + auction.minIncrement : auction.startingPrice;
  const amountWei = toWei(amountStr);
  const bidTooLow = amountWei > 0n && amountWei < minNextBid;

  async function handleBid() {
    if (!address || amountWei === 0n) return;
    await bidAction.execute({
      address: CONTRACTS.auctionHouse.address,
      abi: CONTRACTS.auctionHouse.abi,
      functionName: "bid",
      args: [BigInt(auction.id)],
      value: amountWei,
    });
    setAmountStr("");
    onBidPlaced();
  }

  if (hasEnded || auction.cancelled) {
    return null;
  }

  if (isSeller) {
    return (
      <div className="rounded-xl border border-line bg-canvas-alt p-4 text-sm text-ink-soft text-center">
        You listed this item — you can&apos;t bid on your own auction.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isHighestBidder && (
        <div className="rounded-xl bg-success-soft text-success text-sm p-3 text-center font-medium">
          You&apos;re currently the highest bidder
        </div>
      )}
      <div className="rounded-xl border border-line p-4">
        <div className="flex items-center justify-between text-xs text-ink-faint mb-2">
          <span className="flex items-center gap-1">
            Your bid
            <EducationTip label="Minimum bid">
              Must be at least {fmtEth(minNextBid)} ETH — the current
              highest bid plus this auction&apos;s minimum increment (or
              the starting price, if no one has bid yet).
            </EducationTip>
          </span>
          <button
            type="button"
            className="hover:text-gold transition-colors"
            onClick={() => setAmountStr(fmtEth(minNextBid, 6))}
          >
            Min: {fmtEth(minNextBid)} ETH
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="flex-1 bg-transparent text-2xl font-mono-num outline-none min-w-0"
          />
          <span className="text-sm text-ink-faint flex-shrink-0">ETH</span>
        </div>
      </div>

      {bidTooLow && (
        <p className="text-xs text-danger">Your bid must be at least {fmtEth(minNextBid)} ETH.</p>
      )}

      {!isConnected ? (
        <Button size="lg" className="w-full" disabled>
          Connect your wallet to bid
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full"
          onClick={handleBid}
          disabled={
            amountWei === 0n ||
            bidTooLow ||
            bidAction.status === "pending" ||
            bidAction.status === "confirming"
          }
        >
          {(bidAction.status === "pending" || bidAction.status === "confirming") && (
            <Loader2 size={16} className="animate-spin" />
          )}
          {!(bidAction.status === "pending" || bidAction.status === "confirming") && (
            <Gavel size={16} />
          )}
          Place bid
        </Button>
      )}
      {bidAction.error && <p className="text-xs text-danger">{bidAction.error}</p>}
    </div>
  );
}
