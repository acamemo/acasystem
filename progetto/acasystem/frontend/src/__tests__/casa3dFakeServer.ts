/**
 * A stand-in for the Casa 3D routes of the backend (`/api/casa3d`), for the tests of the house
 * screen and of the launcher page: one plan with a revision, compare-and-swap on the save (409 with
 * the server's revision), a counter of restore points and the list of the requests made. The real
 * `createCasa3dPlanApi` runs on top of it, so the tests go through the same translation the app uses.
 */
import example from '@/casa3d/casa-esempio.json';
import { createCasa3dPlanApi, type Casa3dPlanApi, type PlanRequest } from '@/casa3d/planApi';

export interface FakeCasaServer {
  /** The plan the server holds; null until one is saved (revision 0). */
  building: Record<string, unknown> | null;
  revision: number;
  /** Restore points taken so far (`POST /history`). */
  snapshots: number;
  /** `METHOD path` of every request, in order. */
  requests: string[];
  /** Answer every request with this status (a server that is down), until set back to null. */
  failWith: number | null;
  /** Hook called before a save is judged (to let another device save first). */
  beforeSave: (() => void) | null;
}

export function createFakeServer(
  initial: { building?: Record<string, unknown> | null; revision?: number } = {}
): FakeCasaServer {
  return {
    building: initial.building ?? null,
    revision: initial.revision ?? (initial.building ? 1 : 0),
    snapshots: 0,
    requests: [],
    failWith: null,
    beforeSave: null,
  };
}

const emptyPlan = () => ({ version: 1, floors: [] });

/** The example house of the T6 test, as a plan from the server. */
export function exampleHouse(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(example)) as Record<string, unknown>;
}

/** A house somebody drew: other ids than the example's. */
export function drawnHouse(): Record<string, unknown> {
  return {
    version: 1,
    floors: [
      {
        id: 'piano_1',
        name: 'Piano terra',
        rooms: [
          {
            id: 'sala',
            name: 'Sala',
            points: [
              [0, 0],
              [4, 0],
              [4, 3],
              [0, 3],
            ],
          },
          {
            id: 'studio',
            name: 'Studio',
            points: [
              [4, 0],
              [7, 0],
              [7, 3],
              [4, 3],
            ],
          },
        ],
      },
      {
        id: 'piano_2',
        name: 'Primo piano',
        rooms: [
          {
            id: 'camera',
            name: 'Camera',
            points: [
              [0, 0],
              [4, 0],
              [4, 3],
              [0, 3],
            ],
          },
        ],
      },
    ],
  };
}

const json = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  headers: { get: () => null },
});

export function fakeRequest(server: FakeCasaServer): PlanRequest {
  return (path, init) => {
    server.requests.push(`${init.method} ${path}`);
    if (server.failWith !== null) return Promise.resolve(json(server.failWith, { error: 'down' }));
    if (init.method === 'GET' && path === '/building') {
      return Promise.resolve(
        json(200, { building: server.building ?? emptyPlan(), revision: server.revision })
      );
    }
    if (init.method === 'GET' && path === '/building/revision') {
      return Promise.resolve(json(200, { revision: server.revision }));
    }
    if (init.method === 'PUT' && path === '/building') {
      server.beforeSave?.();
      const body = JSON.parse(String(init.body)) as {
        building: Record<string, unknown>;
        base_revision: number;
      };
      if (body.base_revision !== server.revision) {
        return Promise.resolve(
          json(409, { error: 'Revision conflict', revision: server.revision })
        );
      }
      server.building = body.building;
      server.revision += 1;
      return Promise.resolve(json(200, { revision: server.revision }));
    }
    if (init.method === 'POST' && path === '/history') {
      if (server.building) server.snapshots += 1;
      return Promise.resolve(json(200, {}));
    }
    return Promise.resolve(json(404, { error: 'not found' }));
  };
}

/** The real plan API on top of the fake server. */
export function fakeApi(server: FakeCasaServer, pollMs = 30_000): Casa3dPlanApi {
  return createCasa3dPlanApi({ request: fakeRequest(server), pollMs, isVisible: () => true });
}
