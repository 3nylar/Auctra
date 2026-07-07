"use client";

import { TopBar } from "@/components/auction/TopBar";
import { AuctionCard } from "@/components/auction/AuctionCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CONTRACTS } from "@/lib/contracts/config";
import { fmtEth } from "@/lib/format";
import { useContractAction } from "@/lib/hooks/useContractAction";
import { useMyActivity } from "@/lib/hooks/useMyActivity";
import { useItemName } from "@/lib/hooks/useAuctionUser";
import Link from "next/link";
import { Loader2, Wallet } from "lucide-react";

export default function DashboardPage() {
  const { listings, activeBids, withdrawable, isLoading, refetch } = useMyActivity();

  return (
    <>
      <TopBar />
      <main className="flex-1 bg-canvas">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight mb-8">My activity</h1>

          {withdrawable.length > 0 && (
            <section className="mb-12">
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <Wallet size={18} className="text-gold" /> Available to withdraw
              </h2>
              <div className="space-y-3">
                {withdrawable.map(({ auction, amount }) => (
                  <WithdrawRow key={auction.id} auctionId={auction.id} tokenId={auction.tokenId} amount={amount} onWithdrawn={refetch} />
                ))}
              </div>
            </section>
          )}

          <section className="mb-12">
            <h2 className="font-display text-xl font-semibold mb-4">My active bids</h2>
            {!isLoading && activeBids.length === 0 ? (
              <EmptyState message="You're not currently the highest bidder on anything." ctaHref="/auctions" ctaLabel="Browse auctions" />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeBids.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-4">My listings</h2>
            {!isLoading && listings.length === 0 ? (
              <EmptyState message="You haven't listed anything yet." ctaHref="/create" ctaLabel="List an item" />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function WithdrawRow({
  auctionId,
  tokenId,
  amount,
  onWithdrawn,
}: {
  auctionId: number;
  tokenId: bigint;
  amount: bigint;
  onWithdrawn: () => void;
}) {
  const itemName = useItemName(tokenId);
  const withdrawAction = useContractAction();

  async function handleWithdraw() {
    await withdrawAction.execute({
      address: CONTRACTS.auctionHouse.address,
      abi: CONTRACTS.auctionHouse.abi,
      functionName: "withdraw",
      args: [BigInt(auctionId)],
    });
    onWithdrawn();
  }

  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div>
        <Link href={`/auctions/${auctionId}`} className="font-medium hover:text-gold transition-colors">
          {itemName || `Lot #${auctionId}`}
        </Link>
        <p className="text-sm text-ink-faint font-mono-num mt-0.5">{fmtEth(amount)} ETH</p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleWithdraw}
        disabled={withdrawAction.status === "pending" || withdrawAction.status === "confirming"}
      >
        {(withdrawAction.status === "pending" || withdrawAction.status === "confirming") && (
          <Loader2 size={14} className="animate-spin" />
        )}
        Withdraw
      </Button>
    </Card>
  );
}

function EmptyState({ message, ctaHref, ctaLabel }: { message: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-10 text-center">
      <p className="text-ink-soft mb-4">{message}</p>
      <Link href={ctaHref}>
        <Button variant="secondary" size="sm">
          {ctaLabel}
        </Button>
      </Link>
    </div>
  );
}
