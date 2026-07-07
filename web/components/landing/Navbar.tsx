import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Gavel } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-canvas/85 border-b border-line-soft">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold text-lg">
          <span className="w-8 h-8 rounded-lg gradient-primary-btn flex items-center justify-center text-[#141420]">
            <Gavel size={16} strokeWidth={2.4} />
          </span>
          Auctra
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-soft">
          <Link href="/auctions" className="hover:text-ink transition-colors">
            Browse auctions
          </Link>
          <a href="#how-it-works" className="hover:text-ink transition-colors">
            How it works
          </a>
          <a href="#faq" className="hover:text-ink transition-colors">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="primary" size="sm">
              Start bidding
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
