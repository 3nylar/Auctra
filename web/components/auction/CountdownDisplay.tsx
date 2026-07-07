"use client";

import { useCountdown } from "@/lib/hooks/useCountdown";
import { clsx } from "clsx";

export function CountdownDisplay({
  endTime,
  ended,
  size = "md",
}: {
  endTime: number;
  ended: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const countdown = useCountdown(endTime);
  const isOver = ended || countdown.isEnded;

  const sizeClasses = { sm: "text-sm", md: "text-lg", lg: "text-3xl" };

  if (isOver) {
    return <span className={clsx("font-mono-num font-semibold text-ink-faint", sizeClasses[size])}>Ended</span>;
  }

  const parts: string[] = [];
  if (countdown.days > 0) parts.push(`${countdown.days}d`);
  if (countdown.days > 0 || countdown.hours > 0) parts.push(`${countdown.hours}h`);
  parts.push(`${String(countdown.minutes).padStart(2, "0")}m`);
  parts.push(`${String(countdown.seconds).padStart(2, "0")}s`);

  return (
    <span
      className={clsx(
        "font-mono-num font-semibold transition-colors",
        sizeClasses[size],
        countdown.isCritical ? "text-danger animate-pulse" : countdown.isUrgent ? "text-amber" : "text-ink"
      )}
    >
      {parts.join(" ")}
    </span>
  );
}
