/** Sliding-window counter per key, in memory: for per-user limits that need their own message. */

export interface SlidingWindowResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface SlidingWindowLimiter {
  take(key: string): SlidingWindowResult;
}

export const createSlidingWindowLimiter = (
  max: number,
  windowMs: number,
  now: () => number = Date.now
): SlidingWindowLimiter => {
  const hits = new Map<string, number[]>();

  return {
    take(key) {
      const current = now();
      const recent = (hits.get(key) ?? []).filter((at) => current - at < windowMs);

      if (recent.length >= max) {
        hits.set(key, recent);
        const oldest = recent[0] ?? current;
        return {
          allowed: false,
          retryAfterSeconds: Math.max(Math.ceil((oldest + windowMs - current) / 1000), 1),
        };
      }

      recent.push(current);
      hits.set(key, recent);
      // Keys are user ids: a handful. Drop stale histories so the map cannot grow.
      if (hits.size > 500) {
        for (const [otherKey, times] of hits) {
          if (times.every((at) => current - at >= windowMs)) hits.delete(otherKey);
        }
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
};
