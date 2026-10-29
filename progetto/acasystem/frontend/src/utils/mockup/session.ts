/**
 * One visit to the demo mode (`#/mockup`, REP-20261028-005): the simulated Home Assistant (store,
 * connection, backend facade) and the three redirections that make the real app run on it - the
 * data source (`api/demoSource.ts`), the backend override (`api/backendClient.ts`) and the
 * in-memory storage seeded with the pages. `openMockupSession` sets all of it up before the app
 * mounts; `close()` takes it all down and puts the real storage back, so a visit leaves nothing
 * behind. The app itself - providers, routes, launcher, Sistema - is the real one.
 *
 * Two demo-only marks live in the real tab storage, next to the flag of `mockupRoutes`, because
 * they must outlive the reload that switching the scenario makes: the scenario itself and «the
 * discovery screen was shown». `leaveDemo` removes both.
 */
import { Auth, type Connection } from 'home-assistant-js-websocket';
import { setBackendOverride } from '@/api/backendClient';
import { setDemoSource } from '@/api/demoSource';
import { getHassUrl } from '@/api/haUrl';
import { DISCOVERY_SEEN_KEY } from '@/hooks/launcher/useDiscoveryScreen';
import { APPEARANCE_KEY } from '@/utils/appearance';
import { createMockBackend } from './backendFacade';
import { createMockDeviceFacade, type MockDeviceFacade } from './deviceFacade';
import { installFetchGuard } from './fetchGuard';
import { createMockHaStore, type MockHaStore, type MockHaStoreOptions } from './haStore';
import { isMockScenario, type MockScenario } from './mockData';
import { demoImageFor, mapTileUrl } from './images';
import { createMockConnection } from './mockConnection';
import { installMemoryStorage } from './memoryStorage';
import { buildMockupSeed, type MockupSeed } from './seed';

/** Marks of the demo in the tab storage; `leaveDemo` removes them. */
export const SCENARIO_KEY = 'aca_demo_scenario';
export const DISCOVERY_MARK_KEY = 'aca_demo_discovery_shown';

/**
 * The real tab storage while the demo has put an in-memory one in its place; null otherwise
 * (then `window.sessionStorage` is the real one).
 */
let tabStorage: Storage | null = null;

function tab(): Storage | null {
  try {
    return tabStorage ?? window.sessionStorage;
  } catch {
    return null;
  }
}

export function tabGet(key: string): string | null {
  try {
    return tab()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function tabSet(key: string, value: string | null): void {
  try {
    if (value === null) tab()?.removeItem(key);
    else tab()?.setItem(key, value);
  } catch {
    // Without tab storage the mark is lost at the reload; the demo still works.
  }
}

/** The scenario the tab chose; the normal house when none was chosen. */
export function storedScenario(): MockScenario {
  const stored = tabGet(SCENARIO_KEY);
  return isMockScenario(stored) ? stored : 'normal';
}

export interface MockupSession {
  scenario: MockScenario;
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
  const scenario = options.scenario ?? storedScenario();
  const seed = buildMockupSeed(scenario);
  // «Dispositivi trovati» opens by itself once per tab visit: the first read of its flag says
  // «not seen» and marks it, and a reload (the scenario switch) starts with it already seen.
  const discoveryShown = tabGet(DISCOVERY_MARK_KEY) === '1';
  const realTab = tab();
  const restoreLocal = installMemoryStorage(
    'localStorage',
    {
      ...deviceAppearance(),
      ...seed.storage,
      ...(discoveryShown ? { [DISCOVERY_SEEN_KEY]: '1' } : {}),
    },
    discoveryShown
      ? undefined
      : { key: DISCOVERY_SEEN_KEY, onRead: () => tabSet(DISCOVERY_MARK_KEY, '1') }
  );
  let restoreSession: () => void;
  try {
    restoreSession = installMemoryStorage('sessionStorage');
  } catch (error) {
    restoreLocal();
    throw error;
  }
  tabStorage = realTab;
  const clock = options.now ? { now: options.now } : {};
  const store = createMockHaStore({ ...options, scenario });
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
    scenario,
    store,
    conn,
    facade,
    seed,
    close() {
      tabStorage = null;
      setDemoSource(null);
      setBackendOverride(null);
      restoreFetch();
      store.dispose();
      restoreSession();
      restoreLocal();
    },
  };
}
