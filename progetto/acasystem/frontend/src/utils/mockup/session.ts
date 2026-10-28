/**
 * One visit to the demo mode (`#/mockup`, REP-20261028-005): the simulated Home Assistant (store,
 * connection, backend facade) and the three redirections that make the real app run on it - the
 * data source (`api/demoSource.ts`), the backend override (`api/backendClient.ts`) and the
 * in-memory storage seeded with the pages. `openMockupSession` sets all of it up before the app
 * mounts; `close()` takes it all down and puts the real storage back, so a visit leaves nothing
 * behind. The app itself - providers, routes, launcher, Sistema - is the real one.
 */
import { Auth, type Connection } from 'home-assistant-js-websocket';
import { setBackendOverride } from '@/api/backendClient';
import { setDemoSource } from '@/api/demoSource';
import { getHassUrl } from '@/api/haUrl';
import { APPEARANCE_KEY } from '@/utils/appearance';
import { createMockBackend } from './backendFacade';
import { createMockDeviceFacade, type MockDeviceFacade } from './deviceFacade';
import { installFetchGuard } from './fetchGuard';
import { createMockHaStore, type MockHaStore, type MockHaStoreOptions } from './haStore';
import { demoImageFor, mapTileUrl } from './images';
import { createMockConnection } from './mockConnection';
import { installMemoryStorage } from './memoryStorage';
import { buildMockupSeed, type MockupSeed } from './seed';

export interface MockupSession {
  store: MockHaStore;
  conn: Connection;
  facade: MockDeviceFacade;
  seed: MockupSeed;
  close: () => void;
}

/** The appearance of this device (read only), so the demo's settings show what the screen shows. */
function deviceAppearance(): Record<string, string> {
  try {
    const stored = globalThis.localStorage?.getItem(APPEARANCE_KEY);
    return stored ? { [APPEARANCE_KEY]: stored } : {};
  } catch {
    return {};
  }
}

/** A placeholder sign-in: it stands for the stored one and is never sent anywhere. */
const demoAuth = () =>
  new Auth({
    hassUrl: getHassUrl(),
    clientId: null,
    access_token: 'demo',
    refresh_token: 'demo',
    expires_in: 315_360_000,
    expires: Date.now() + 315_360_000_000,
  });

export function openMockupSession(options: MockHaStoreOptions = {}): MockupSession {
  const seed = buildMockupSeed();
  const restoreLocal = installMemoryStorage('localStorage', {
    ...deviceAppearance(),
    ...seed.storage,
  });
  let restoreSession: () => void;
  try {
    restoreSession = installMemoryStorage('sessionStorage');
  } catch (error) {
    restoreLocal();
    throw error;
  }
  const clock = options.now ? { now: options.now } : {};
  const store = createMockHaStore(options);
  const conn = createMockConnection(store, clock);
  const facade = createMockBackend(createMockDeviceFacade(store, clock), clock);
  const handle = (request: Parameters<MockDeviceFacade['handle']>[0]) => facade.handle(request);
  setBackendOverride(handle);
  const restoreFetch = installFetchGuard(handle);
  setDemoSource({
    auth: demoAuth(),
    conn,
    imageUrl: (path) =>
      demoImageFor(path, (entityId) => {
        const name: unknown = store.getEntities()[entityId]?.attributes.friendly_name;
        return typeof name === 'string' ? name : undefined;
      }),
    mapTileUrl: mapTileUrl(),
  });
  return {
    store,
    conn,
    facade,
    seed,
    close() {
      setDemoSource(null);
      setBackendOverride(null);
      restoreFetch();
      store.dispose();
      restoreSession();
      restoreLocal();
    },
  };
}
