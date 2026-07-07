import { Card } from "@/components/ui/Card";
import { RefreshCw, TimerReset, ShieldCheck, Gavel, Bell, Eye } from "lucide-react";

const features = [
  {
    icon: RefreshCw,
    title: "Automatic refunds",
    description: "Outbid the moment someone tops you? Your ETH is withdrawable immediately — no waiting on a seller.",
  },
  {
    icon: TimerReset,
    title: "Anti-sniping, built in",
    description: "A bid in the final minutes extends the clock automatically, so late snipers can't shut out real competition.",
  },
  {
    icon: ShieldCheck,
    title: "No admin override",
    description: "Once bidding starts, nobody — not even us — can cancel the auction or change the rules.",
  },
  {
    icon: Gavel,
    title: "List anything, in minutes",
    description: "Mint a demo item or bring your own ERC-721, set your terms, and your listing is live.",
  },
  {
    icon: Bell,
    title: "Instant outbid alerts",
    description: "Watch the live bid feed update in real time and know immediately when you've been outbid.",
  },
  {
    icon: Eye,
    title: "Fully verifiable",
    description: "Every bid, refund, and settlement is a public on-chain event you — or anyone — can independently check.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-surface border-y border-line-soft">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-xl mb-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Built on rules, not reputation
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Everything that matters in a fair auction is enforced by the
            contract itself.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gold-soft text-gold">
                <f.icon size={18} strokeWidth={2.2} />
              </div>
              <h3 className="font-display font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">{f.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
