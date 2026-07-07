"use client";

import { useEffect, useState } from "react";
import { Gavel } from "lucide-react";

/// The signature visual on the landing page: a live-feeling preview of the
/// actual auction detail screen -- a ticking countdown, a rising bid, and
/// an occasional "extended" pulse -- so visitors see exactly what using
/// the product feels like before they even sign in. Illustrative only; no
/// real contract data here.
export function AuctionPreviewVisual() {
  const [bid, setBid] = useState(1.42);
  const [seconds, setSeconds] = useState(247);
  const [extended, setExtended] = useState(false);
  const [bidCount, setBidCount] = useState(14);

  useEffect(() => {
    const tick = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setExtended(true);
          setBid((b) => Math.round((b + 0.05 + Math.random() * 0.08) * 100) / 100);
          setBidCount((c) => c + 1);
          setTimeout(() => setExtended(false), 1800);
          return 300;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const urgent = seconds <= 300;

  return (
    <div className="relative w-full max-w-sm mx-auto" aria-hidden="true">
      <div className="rounded-2xl border border-line bg-surface shadow-lifted overflow-hidden">
        <div className="aspect-[4/3] bg-gradient-to-br from-[#2a2333] to-[#1a1c28] flex items-center justify-center relative">
          <Gavel size={40} className="text-gold/40" strokeWidth={1.5} />
          {extended && (
            <span className="absolute top-3 right-3 bg-amber-soft text-amber text-[11px] font-medium px-2.5 py-1 rounded-full animate-pulse">
              Extended!
            </span>
          )}
        </div>
        <div className="p-5">
          <p className="text-xs text-ink-faint mb-1 font-mono-num">Lot #014</p>
          <h3 className="font-display text-lg font-semibold mb-3">Vintage Synth #1</h3>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-ink-faint mb-0.5">Current bid</p>
              <p className="font-mono-num text-2xl font-semibold text-gold transition-all">
                {bid.toFixed(2)} ETH
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-faint mb-0.5">Ends in</p>
              <p
                className={`font-mono-num text-lg font-semibold ${
                  urgent ? "text-danger" : "text-ink"
                }`}
              >
                {String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-ink-faint border-t border-line pt-3">
            <span>{bidCount} bids</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-ink-faint font-mono-num">
        illustrative preview — not a real auction
      </p>
    </div>
  );
}
