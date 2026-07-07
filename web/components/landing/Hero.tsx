import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AuctionPreviewVisual } from "./AuctionPreviewVisual";
import { ShieldCheck, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-trust">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <Badge tone="gold" className="mb-6">
            <Sparkles size={13} /> Testnet · No real funds required
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] text-ink">
            Bid with confidence. The contract holds everyone honest.
          </h1>
          <p className="mt-5 text-lg text-ink-soft leading-relaxed max-w-lg">
            Outbid participants are refunded automatically. Last-second
            snipers get out-timed, not out-fought. Every rule is enforced by
            code you can read yourself, not by a platform you have to trust.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/auctions">
              <Button size="lg">Browse live auctions</Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="secondary">
                See how it works
              </Button>
            </a>
          </div>
          <div className="mt-10 flex items-center gap-2 text-sm text-ink-faint">
            <ShieldCheck size={16} className="text-success" />
            Runs on a public Ethereum test network — nothing of real value
            changes hands.
          </div>
        </div>

        <AuctionPreviewVisual />
      </div>
    </section>
  );
}
