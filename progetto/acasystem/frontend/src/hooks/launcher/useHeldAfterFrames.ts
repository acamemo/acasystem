import { useEffect, useState } from 'react';
import { afterNextFrame } from '@/utils/launcher/afterFrame';

/**
 * True while `active` is, and for two frames after it ends. Becomes true in the same render that
 * `active` does, and false later, in a task of its own: what the end of a drag session changed in
 * the commit that ends it (the `inert` of the gear and of the bar, the lock of the pager) was part
 * of the 79-130 ms frame after `stop()` (G4 tracing of 2026-10-25, W-B and W-L); none of it is seen,
 * and a press or a swipe two frames after the drop is the only thing that has to wait.
 */
export function useHeldAfterFrames(active: boolean): boolean {
  const [held, setHeld] = useState(active);
  if (active && !held) setHeld(true);
  useEffect(() => {
    if (active || !held) return undefined;
    return afterNextFrame(() => setHeld(false));
  }, [active, held]);
  return active || held;
}
