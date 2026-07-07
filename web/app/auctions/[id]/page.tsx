"use client";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/auction/TopBar";
import { CountdownDisplay } from "@/components/auction/CountdownDisplay";
import { BidPanel } from "@/components/auction/BidPanel";
import { BidHistoryFeed } from "@/components/auction/BidHistoryFeed";
import { ClaimWithdrawPanel } from "@/components/auction/ClaimWithdrawPanel";
import { ItemThumbnail } from "@/components/auction/ItemThumbnail";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EducationTip } from "@/components/ui/EducationTip";
import { useAuction, useBidHistory } from "@/lib/hooks/useAuctions";
import { useItemName } from "@/lib/hooks/useAuctionUser";
import { useIsPast } from "@/lib/hooks/useCountdown";
import { fmtEth } from "@/lib/format";
import { isContractConfigured } from "@/lib/contracts/config";
import { AlertTriangle, ArrowLeft, ShieldAlert } from "lucide-react";

export default function AuctionDetailPage() {
  const params = useParams();
  const auctionId = Number(params.id);
  const { address } = useAccount();

  const { auction, refetch } = useAuction(Number.isFinite(auctionId) ? auctionId : undefined);
  const history = useBidHistory(Number.isFinite(auctionId) ? auctionId : undefined);
  const itemName = useItemName(auction?.tokenId);
  const isPastEndTime = useIsPast(auction?.endTime);

  // Track whether the connected user was ever the highest bidder and has
  // since been outbid, to show a one-time "you've been outbid" banner.
  const [wasHighestBidder, setWasHighestBidder] = useState(false);
  useEffect(() => {
    if (!auction || !address) return;
    if (auction.highestBidder.toLowerCase() === address.toLowerCase()) {
      // This tracks a one-time transition (has this address ever led the
      // bidding?) that can only be observed by watching auction state
      // change over time; there's no external subscription API to use
      // useSyncExternalStore with here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWasHighestBidder(true);
    }
  }, [auction, address]);

  if (!isContractConfigured()) {
    return <MissingConfigNotice />;
  }

  if (!auction) {
    return (
      <>
        <TopBar />
        <main className="flex-1 flex items-center justify-center py-24">
          <p className="text-ink-faint">Loading auction...</p>
        </main>
      </>
    );
  }

  const hasEnded = auction.ended || isPastEndTime;
  const hasBids = auction.highestBid > 0n;
  const currentlyOutbid =
    wasHighestBidder &&
    address &&
    auction.highestBidder.toLowerCase() !== address.toLowerCase() &&
    !hasEnded;

  return (
    <>
      <TopBar />
      <main className="flex-1 bg-canvas">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink transition-colors mb-6"
          >
            <ArrowLeft size={14} /> Back to auctions
          </Link>

          {currentlyOutbid && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-danger-soft text-danger text-sm p-4">
              <ShieldAlert size={16} className="flex-shrink-0" />
              You&apos;ve been outbid. Your funds are available to withdraw
              below, or you can bid again.
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <Card className="overflow-hidden">
                <ItemThumbnail tokenId={auction.tokenId} className="aspect-[16/10]" />
              </Card>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-ink-faint font-mono-num">Lot #{auction.id}</p>
                  {auction.cancelled ? (
                    <Badge tone="neutral">Cancelled</Badge>
                  ) : hasEnded ? (
                    <Badge tone="neutral">Ended</Badge>
                  ) : (
                    <Badge tone="success">Live</Badge>
                  )}
                </div>
                <h1 className="font-display text-3xl font-semibold tracking-tight">
                  {itemName || "Loading..."}
                </h1>
                <p className="mt-2 text-sm text-ink-faint font-mono-num">
                  Listed by {auction.seller.slice(0, 6)}...{auction.seller.slice(-4)}
                </p>
              </div>

              <BidHistoryFeed history={history} />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-xs text-ink-faint mb-1 flex items-center gap-1">
                      {hasBids ? "Current highest bid" : "Starting price"}
                      <EducationTip label="How bidding works">
                        Every bid must beat the current highest by at least
                        this auction&apos;s minimum increment. Outbid
                        participants can withdraw their funds immediately.
                      </EducationTip>
                    </p>
                    <p className="font-mono-num text-3xl font-semibold text-gold">
                      {fmtEth(hasBids ? auction.highestBid : auction.startingPrice)} ETH
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-faint mb-1">Time left</p>
                    <CountdownDisplay endTime={auction.endTime} ended={auction.ended || auction.cancelled} size="md" />
                  </div>
                </div>

                <BidPanel auction={auction} onBidPlaced={refetch} />
              </Card>

              <ClaimWithdrawPanel auction={auction} onChanged={refetch} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function MissingConfigNotice() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-soft text-amber flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={26} />
        </div>
        <h1 className="font-display text-xl font-semibold">Contracts not configured</h1>
        <p className="mt-3 text-sm text-ink-soft leading-relaxed">
          Set the contract addresses in your environment (see the project
          README).
        </p>
      </div>
    </main>
  );
}
