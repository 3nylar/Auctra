import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CountdownDisplay } from "./CountdownDisplay";
import { ItemThumbnail } from "./ItemThumbnail";
import { useItemName } from "@/lib/hooks/useAuctionUser";
import { useIsPast } from "@/lib/hooks/useCountdown";
import { fmtEth } from "@/lib/format";
import type { AuctionData } from "@/lib/hooks/useAuctions";

export function AuctionCard({ auction }: { auction: AuctionData }) {
  const itemName = useItemName(auction.tokenId);
  const isPastEndTime = useIsPast(auction.endTime);
  const hasEnded = auction.ended || isPastEndTime;
  const hasBids = auction.highestBid > 0n;

  return (
    <Link href={`/auctions/${auction.id}`}>
      <Card className="overflow-hidden hover:border-gold/40 transition-colors group h-full flex flex-col">
        <ItemThumbnail tokenId={auction.tokenId} />
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-ink-faint font-mono-num">Lot #{auction.id}</p>
            {auction.cancelled ? (
              <Badge tone="neutral">Cancelled</Badge>
            ) : hasEnded ? (
              <Badge tone="neutral">Ended</Badge>
            ) : (
              <Badge tone="success">Live</Badge>
            )}
          </div>
          <h3 className="font-display font-semibold text-lg mb-3 group-hover:text-gold transition-colors">
            {itemName || "Loading..."}
          </h3>
          <div className="flex items-end justify-between mt-auto">
            <div>
              <p className="text-xs text-ink-faint mb-0.5">{hasBids ? "Current bid" : "Starting price"}</p>
              <p className="font-mono-num text-lg font-semibold text-gold">
                {fmtEth(hasBids ? auction.highestBid : auction.startingPrice)} ETH
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-faint mb-0.5">{hasEnded ? "" : "Ends in"}</p>
              <CountdownDisplay endTime={auction.endTime} ended={auction.ended || auction.cancelled} size="sm" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
