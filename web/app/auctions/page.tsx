"use client";

import { TopBar } from "@/components/auction/TopBar";
import { AuctionCard } from "@/components/auction/AuctionCard";
import { Button } from "@/components/ui/Button";
import { useAuctionList } from "@/lib/hooks/useAuctions";
import { useNowSeconds } from "@/lib/hooks/useCountdown";
import { isContractConfigured } from "@/lib/contracts/config";
import Link from "next/link";
import { AlertTriangle, Gavel, Plus } from "lucide-react";

export default function AuctionsPage() {
  const { auctions, isLoading } = useAuctionList();
  const now = useNowSeconds();

  if (!isContractConfigured()) {
    return <MissingConfigNotice />;
  }

  const live = auctions.filter((a) => !a.ended && !a.cancelled && (now === 0 || now < a.endTime));
  const ended = auctions.filter((a) => a.ended || a.cancelled || (now !== 0 && now >= a.endTime));

  return (
    <>
      <TopBar />
      <main className="flex-1 bg-canvas">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">Live auctions</h1>
              <p className="text-ink-soft mt-1">
                {isLoading ? "Loading..." : `${live.length} live, ${ended.length} ended`}
              </p>
            </div>
            <Link href="/create">
              <Button>
                <Plus size={16} /> List an item
              </Button>
            </Link>
          </div>

          {!isLoading && auctions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line p-16 text-center">
              <Gavel size={32} className="mx-auto text-ink-faint mb-4" />
              <p className="text-ink-soft">No auctions yet. Be the first to list an item.</p>
            </div>
          )}

          {live.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
              {live.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          )}

          {ended.length > 0 && (
            <>
              <h2 className="font-display text-xl font-semibold mb-5 text-ink-soft">Ended</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {ended.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
              </div>
            </>
          )}
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
          Set{" "}
          <code className="font-mono-num text-xs bg-canvas-alt px-1.5 py-0.5 rounded">
            NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS
          </code>{" "}
          and{" "}
          <code className="font-mono-num text-xs bg-canvas-alt px-1.5 py-0.5 rounded">
            NEXT_PUBLIC_NFT_ADDRESS
          </code>{" "}
          in your environment after deploying the contracts (see the
          project README).
        </p>
      </div>
    </main>
  );
}
