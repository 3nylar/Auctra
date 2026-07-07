import Link from "next/link";
import { Gavel } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-line-soft">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-faint">
        <div className="flex items-center gap-2 font-display font-semibold text-ink">
          <span className="w-6 h-6 rounded-md gradient-primary-btn flex items-center justify-center text-[#141420]">
            <Gavel size={12} strokeWidth={2.4} />
          </span>
          Auctra
        </div>
        <p className="text-center">
          Runs on a public test network. No real funds or assets are ever
          involved.
        </p>
        <div className="flex items-center gap-5">
          <Link href="/auctions" className="hover:text-ink transition-colors">
            Browse auctions
          </Link>
          <Link href="/login" className="hover:text-ink transition-colors">
            Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}
