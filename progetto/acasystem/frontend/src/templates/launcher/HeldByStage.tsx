import type { ReactNode } from 'react';
import { useHeld, useStaged, type Stage } from '@/hooks/launcher/useStagedScene';

interface HeldByStageProps<T> {
  /** The stage of the scene (useStagedScene). */
  stage: Stage;
  /** What the host has now: the bar or the indicator shows it once the wait has ended. */
  value: T;
  /** Draws what hangs on the scene from the value it shows. */
  children: (shown: T) => ReactNode;
}

/**
 * What hangs on a staged scene (a bar, the indicator) keeps the look it had in the wait, and takes
 * the new one in the frame the scene starts (REP-20261023-006, D-M25). It follows the end of the
 * wait on its own: the launcher is not rendered again for it (0.9.28, measurement of 2026-10-23).
 */
export function HeldByStage<T>({ stage, value, children }: HeldByStageProps<T>) {
  const hold = useStaged(stage);
  const shown = useHeld(value, hold);
  return <>{children(shown)}</>;
}
