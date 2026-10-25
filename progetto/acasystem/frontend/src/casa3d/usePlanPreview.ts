/**
 * The plan for the still picture of the launcher page (ADR-0014, R1): read from the server when the
 * page is on screen (and once when it is next to it), and again each time it comes back on screen,
 * for instance after the house was closed. A read-only look: nothing is saved, nothing is
 * subscribed to. A slow answer never overwrites a newer one.
 */
import { useEffect, useRef, useState } from 'react';
import { floorsOf, hasHouse, previewRoomsOf, type PlanRoom } from './planModel';
import { createElementPlanApi } from './planRequest';

export type PlanPreviewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'plan'; rooms: PlanRoom[] };

export function usePlanPreview(visible: boolean, near: boolean): PlanPreviewState {
  const [state, setState] = useState<PlanPreviewState>({ status: 'loading' });
  const fetched = useRef(false);
  const latest = useRef(0);

  useEffect(() => {
    // On screen: every time. Next to it: only to have something to show when it arrives.
    if (!visible && !(near && !fetched.current)) return undefined;
    fetched.current = true;
    const id = (latest.current += 1);
    let cancelled = false;
    createElementPlanApi()
      .call<{ building?: unknown }>({ type: 'casa3d/building/get' })
      .then(
        (body) => {
          if (cancelled || id !== latest.current) return;
          const floors = floorsOf(body.building);
          setState(
            hasHouse(floors)
              ? { status: 'plan', rooms: previewRoomsOf(floors) }
              : { status: 'empty' }
          );
        },
        () => {
          if (!cancelled && id === latest.current) setState({ status: 'error' });
        }
      );
    return () => {
      cancelled = true;
    };
  }, [visible, near]);

  return state;
}
