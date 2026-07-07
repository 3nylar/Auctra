const faqs = [
  {
    q: "Is this real money?",
    a: "No. Auctra runs on Sepolia, a public Ethereum test network. The ETH used to bid is free testnet ETH with no real-world value — you can get some from a public faucet in seconds.",
  },
  {
    q: "What happens to my bid if I get outbid?",
    a: "It becomes immediately withdrawable from your account. You don't need to wait for the seller or the auction to end — refunds are handled by the contract the instant you're outbid.",
  },
  {
    q: "Can the seller cancel after I've bid?",
    a: "No. Once the first bid is placed, the listing is locked in — the seller can no longer cancel it. Before any bids, they can still withdraw their listing.",
  },
  {
    q: "What stops someone from sniping the auction in the last second?",
    a: "Any bid placed within the final few minutes automatically extends the deadline, giving everyone else a fair chance to respond. This repeats (within a bounded limit) for as long as genuine last-minute competition continues.",
  },
  {
    q: "Do I need to know how crypto wallets work?",
    a: "No. You can sign in with just an email address to browse and try things out. Connecting a wallet like MetaMask is only needed when you're ready to actually bid or list an item, since those are on-chain actions.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
      <h2 className="font-display text-3xl font-semibold tracking-tight mb-10 text-center">
        Common questions
      </h2>
      <div className="space-y-6">
        {faqs.map((item) => (
          <div key={item.q} className="border-b border-line-soft pb-6">
            <h3 className="font-display font-semibold">{item.q}</h3>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
