import { Wallet, Gavel, RefreshCw } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Wallet,
    title: "Sign in and get a demo item",
    description:
      "Connect a wallet or sign in with email, then mint yourself a free demo collectible if you want to try listing something.",
  },
  {
    number: "02",
    icon: Gavel,
    title: "Bid, or list an item of your own",
    description:
      "Place a bid that beats the current highest, or list an item and watch the offers roll in. Every bid is enforced on-chain.",
  },
  {
    number: "03",
    icon: RefreshCw,
    title: "Get refunded or get paid, automatically",
    description:
      "Outbid? Your funds are available to withdraw the instant someone tops you. Won? Claim your item the moment the clock runs out.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
      <div className="max-w-xl mb-14">
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          Three steps, no auctioneer required
        </h2>
        <p className="mt-3 text-ink-soft leading-relaxed">
          The rules are enforced by a smart contract, not a company. Nobody
          — including us — can quietly change them mid-auction.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step) => (
          <div key={step.number} className="relative">
            <span className="font-display text-5xl font-semibold text-gold-soft select-none">
              {step.number}
            </span>
            <div className="mt-3 w-10 h-10 rounded-xl bg-gold-soft text-gold flex items-center justify-center">
              <step.icon size={18} strokeWidth={2.2} />
            </div>
            <h3 className="mt-4 font-display font-semibold text-lg">{step.title}</h3>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
