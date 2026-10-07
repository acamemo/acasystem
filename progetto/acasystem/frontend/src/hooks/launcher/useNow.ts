import { useEffect, useState } from 'react';

/**
 * Current time, refreshed on the boundary of each interval (second or minute), so a clock
 * changes exactly when the digits do.
 */
export function useNow(intervalMs = 1000, enabled = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return undefined;
    setNow(new Date());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const delay = intervalMs - (Date.now() % intervalMs) + 5;
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs, enabled]);
  return now;
}
