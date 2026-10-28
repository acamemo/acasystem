/**
 * Source of data of the demo mode (`#/mockup`, REP-20261028-005): the one place where the real
 * app learns that Home Assistant, the images and the map come from the browser instead of the
 * network. It is set before the app mounts, only by the demo, and it is empty in the normal app.
 * The pages, the providers and the widgets do not know about it: only the lowest layers read it
 * (credentials, connection, entity pictures, map tiles). The backend and the storage are
 * redirected the same way, by `setBackendOverride` and by the in-memory storage of the demo.
 */
import type { Auth, Connection } from 'home-assistant-js-websocket';

export interface DemoSource {
  /** Stands for the stored sign-in: a placeholder that is never sent anywhere. */
  auth: Auth;
  /** The simulated Home Assistant connection, in place of the WebSocket. */
  conn: Connection;
  /** The picture a path of Home Assistant stands for (drawn locally), or null. */
  imageUrl: (path: string) => string | null;
  /** Tile of the map of the Sistema page, in place of the OpenStreetMap ones. */
  mapTileUrl: string;
}

let source: DemoSource | null = null;

export function setDemoSource(next: DemoSource | null): void {
  source = next;
}

export const getDemoSource = (): DemoSource | null => source;
