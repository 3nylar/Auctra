"use client";

import { useEffect, useState } from "react";

/// Purity-safe "has this timestamp passed?" check. Isolates the impure
/// Date.now() read inside an effect (ticking every second) rather than
/// calling it directly during render, which React's compiler now flags.
/// Starts as `false` and corrects itself within the same tick after mount,
/// which is an acceptable tradeoff for a countdown-adjacent display value.
/// The clock-tick effect below is exactly the documented use case for
/// setState-in-effect (syncing from an external clock, not from props or
/// state), so its lint rule is disabled at each call site.
export function useIsPast(unixSeconds: number | undefined): boolean {
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    if (!unixSeconds) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPast(false);
      return;
    }
    const check = () => setIsPast(Date.now() / 1000 >= unixSeconds);
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [unixSeconds]);

  return isPast;
}

/// A single ticking "current time" value, for components that need to
/// filter/group a list of items by whether their deadline has passed.
/// Calling this once at the top of a list page and comparing against it is
/// purity-safe and avoids calling a hook per list item in a loop.
export function useNowSeconds(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export interface Countdown {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isEnded: boolean;
  isUrgent: boolean; // under 5 minutes
  isCritical: boolean; // under 1 minute
}

/// Ticks once per second toward a given unix-seconds deadline. Purely a
/// display concern -- the contract's own `block.timestamp` check is always
/// the actual source of truth for whether an auction has really ended.
export function useCountdown(endTimeSeconds: number | undefined): Countdown {
  const [now, setNow] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSeconds = now === 0 || !endTimeSeconds ? 0 : Math.max(0, endTimeSeconds - now);

  return {
    totalSeconds,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: Math.floor(totalSeconds % 60),
    isEnded: totalSeconds <= 0,
    isUrgent: totalSeconds > 0 && totalSeconds <= 300,
    isCritical: totalSeconds > 0 && totalSeconds <= 60,
  };
}
