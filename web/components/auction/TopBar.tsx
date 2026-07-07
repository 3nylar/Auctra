"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Gavel, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { activeChain } from "@/lib/wagmi";
import { clsx } from "clsx";

const NAV_LINKS = [
  { href: "/auctions", label: "Browse" },
  { href: "/create", label: "List an item" },
  { href: "/dashboard", label: "My activity" },
];

export function TopBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="border-b border-line-soft bg-surface">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-display font-semibold">
            <span className="w-8 h-8 rounded-lg gradient-primary-btn flex items-center justify-center text-[#141420]">
              <Gavel size={16} strokeWidth={2.4} />
            </span>
            <span className="hidden sm:inline">Auctra</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "transition-colors",
                  pathname?.startsWith(link.href)
                    ? "text-gold font-medium"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Badge tone="neutral" className="hidden sm:inline-flex">
            {activeChain.name}
          </Badge>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          {session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-ink-faint hover:text-danger transition-colors p-2 rounded-lg hover:bg-canvas-alt"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
