/**
 * The plan of the house as the server keeps it (ADR-0014, R1; ISSUE-103): the house screen owns the
 * one plan API of its session (planApi.ts holds the revision of the document in memory, so it is
 * never shared), reads the plan once, looks at the revision while the screen is open and reads
 * again when another device changed it. Nothing is saved from here but «Ricomincia», which puts an
 * empty house in place of the example the T6 test left on the bench. The 3D view never saves: it is
 * given this plan as the host's own (read-only) one.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isRecord } from '@/validators/guards';
import { emptyBuilding } from './emptyBuilding';
import { isLeftoverExample } from './leftoverExample';
import { floorsOf, hasHouse, type PlanFloor } from './planModel';
import { Casa3dPlanError, type Casa3dPlanApi } from './planApi';
import { createElementPlanApi } from './planRequest';

export type Casa3dPlanState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      building: Record<string, unknown>;
      revision: number;
      floors: PlanFloor[];
      /** At least one room was drawn. */
      hasHouse: boolean;
      /** The example house of the T6 test: «Ricomincia» is offered. */
      isExample: boolean;
    };

/** How «Ricomincia» ended: done, the plan had changed meanwhile (read again), or it failed. */
export type RestartResult = { ok: true } | { ok: false; conflict: boolean; message: string };

export interface Casa3dPlan {
  state: Casa3dPlanState;
  /** Reads the plan again (after an error, or on request). */
  reload: () => void;
  /** Replaces the example house with an empty one. */
  restart: () => Promise<RestartResult>;
  /** «Ricomincia» is running. */
  restarting: boolean;
}

/** What the plan API answers to a read and to a save. */
interface PlanAnswer {
  building?: unknown;
  revision?: unknown;
}

const READ_FAILED = 'Non riesco a leggere la casa dal server.';
const WRITE_FAILED = 'Non sono riuscito a sostituire la casa. Riprova.';

function readyFrom(building: unknown, revision: unknown): Casa3dPlanState {
  if (!isRecord(building) || typeof revision !== 'number') {
    return { status: 'error', message: READ_FAILED };
  }
  const floors = floorsOf(building);
  return {
    status: 'ready',
    building,
    revision,
    floors,
    hasHouse: hasHouse(floors),
    isExample: isLeftoverExample(building),
  };
}

const messageOf = (error: unknown, fallback = READ_FAILED): string =>
  error instanceof Casa3dPlanError && error.message ? error.message : fallback;

export function useCasa3dPlan(createApi: () => Casa3dPlanApi = createElementPlanApi): Casa3dPlan {
  // One API for the life of the screen: it holds the revision of the document read here.
  const apiRef = useRef<Casa3dPlanApi | null>(null);
  apiRef.current ??= createApi();
  const [state, setState] = useState<Casa3dPlanState>({ status: 'loading' });
  const [restarting, setRestarting] = useState(false);
  const alive = useRef(true);
  // The latest read wins: a slow answer never overwrites a newer one.
  const readId = useRef(0);

  const read = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const id = (readId.current += 1);
    try {
      const body = await api.call<PlanAnswer>({
        type: 'casa3d/building/get',
      });
      if (alive.current && id === readId.current) setState(readyFrom(body.building, body.revision));
    } catch (error) {
      if (alive.current && id === readId.current) {
        setState({ status: 'error', message: messageOf(error) });
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void read();
    return () => {
      alive.current = false;
    };
  }, [read]);

  // While the screen is open its revision is looked at (every 30 s); another device's save is read again.
  const revision = state.status === 'ready' ? state.revision : null;
  useEffect(() => {
    const api = apiRef.current;
    if (!api || revision === null) return undefined;
    let unsubscribe: (() => Promise<void>) | null = null;
    let cancelled = false;
    void api
      .subscribe<{ revision: number }>(
        (message) => {
          if (message.revision !== revision) void read();
        },
        { type: 'casa3d/building/subscribe' }
      )
      .then((stop) => {
        if (cancelled) void stop();
        else unsubscribe = stop;
      });
    return () => {
      cancelled = true;
      if (unsubscribe) void unsubscribe();
    };
  }, [revision, read]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    void read();
  }, [read]);

  const restart = useCallback(async (): Promise<RestartResult> => {
    const api = apiRef.current;
    if (!api) return { ok: false, conflict: false, message: WRITE_FAILED };
    setRestarting(true);
    try {
      // The house that goes away stays among the restore points, whatever the time since the last one.
      await api.call({ type: 'casa3d/history/snapshot' });
      const saved = await api.call<PlanAnswer>({
        type: 'casa3d/building/save',
        building: emptyBuilding(),
      });
      if (alive.current) setState(readyFrom(emptyBuilding(), saved.revision));
      return { ok: true };
    } catch (error) {
      const conflict = error instanceof Casa3dPlanError && error.code === 'revision_conflict';
      // Someone changed the plan meanwhile: what is on the server is shown again, nothing is overwritten.
      if (conflict) void read();
      return { ok: false, conflict, message: messageOf(error, WRITE_FAILED) };
    } finally {
      if (alive.current) setRestarting(false);
    }
  }, [read]);

  return useMemo(
    () => ({ state, reload, restart, restarting }),
    [state, reload, restart, restarting]
  );
}
