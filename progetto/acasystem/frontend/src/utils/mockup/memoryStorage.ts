/**
 * Storage of the demo mode (`#/mockup`, REP-20261028-005): while the demo is open, the
 * `localStorage` and the `sessionStorage` of the page are in-memory ones, so the layout, the
 * settings and the flags of the demo (`tunet_*`, `aca_discovery_seen`, the entity snapshot...)
 * never reach the keys of the real app. They are installed before the app mounts, so no provider
 * reads the real ones; the real storage is put back when the demo is left, and the demo's own is
 * dropped.
 */

/**
 * A key whose first read is answered as it is and then marked as set: the value written is
 * `'1'` and `onRead` runs once. The demo uses it for a flag the app reads when a screen opens.
 */
export interface FirstRead {
  key: string;
  onRead: () => void;
}

/** A `Storage` kept in memory. */
export function createMemoryStorage(
  initial: Record<string, string> = {},
  firstRead?: FirstRead
): Storage {
  const data = new Map<string, string>(Object.entries(initial));
  let pending = firstRead !== undefined;
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => {
      const name = String(key);
      const value = data.get(name) ?? null;
      if (pending && firstRead && name === firstRead.key) {
        pending = false;
        if (value === null) data.set(name, '1');
        firstRead.onRead();
      }
      return value;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => {
      data.delete(String(key));
    },
    setItem: (key: string, value: string) => {
      data.set(String(key), String(value));
    },
  };
}

/**
 * Replaces `window.localStorage` or `window.sessionStorage` with an in-memory storage seeded
 * with `initial`; returns the function that puts the real one back. Nothing is written to the
 * real storage in between. When the browser refuses to redefine the property, the demo cannot be
 * isolated: it throws, and the app does not open rather than write to the keys of the real app.
 */
export function installMemoryStorage(
  name: 'localStorage' | 'sessionStorage',
  initial: Record<string, string> = {},
  firstRead?: FirstRead
): () => void {
  const target = globalThis as unknown as Window;
  const original = Object.getOwnPropertyDescriptor(target, name);
  const memory = createMemoryStorage(initial, firstRead);
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    get: () => memory,
  });
  return () => {
    if (original) Object.defineProperty(target, name, original);
    else delete (target as unknown as Record<string, unknown>)[name];
  };
}
