import { Card } from "@/components/ui/Card";
import { fmtEth } from "@/lib/format";
import type { BidHistoryEntry } from "@/lib/hooks/useAuctions";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function BidHistoryFeed({ history }: { history: BidHistoryEntry[] }) {
  return (
    <Card className="p-6">
      <h3 className="font-display font-semibold mb-4">Bid history</h3>
      {history.length === 0 ? (
        <p className="text-sm text-ink-faint text-center py-8">
          No bids yet — be the first.
        </p>
      ) : (
        <ul className="space-y-3 max-h-80 overflow-y-auto">
          {history.map((entry, i) => (
            <li
              key={entry.txHash + i}
              className="flex items-center justify-between text-sm animate-[fadein_0.3s_ease]"
            >
              <span className="font-mono-num text-ink-soft">{truncateAddress(entry.bidder)}</span>
              <span className="font-mono-num font-medium text-gold">{fmtEth(entry.amount)} ETH</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
