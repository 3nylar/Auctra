"use client";

import { useState, ReactNode } from "react";
import { HelpCircle } from "lucide-react";

/// A small "?" affordance that reveals a plain-English explanation on
/// click/hover/focus. Used throughout the simulator to explain terms like
/// "impermanent loss" or "slippage" the moment someone encounters them,
/// rather than requiring a trip to external docs.
export function EducationTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`What does "${label}" mean?`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center text-ink-faint hover:text-primary transition-colors"
      >
        <HelpCircle size={14} strokeWidth={2} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl bg-canvas-alt border border-line text-ink text-xs leading-relaxed p-3 shadow-lifted"
        >
          <span className="block font-semibold mb-1 font-display text-gold">{label}</span>
          {children}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-line" />
        </span>
      )}
    </span>
  );
}
