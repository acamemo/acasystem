import { MOBILE_BREAKPOINT } from '@/utils/config/constants';

export const ENTITY_STALE_DISCONNECT_GRACE_MS = 15_000;
export const ENTITY_STALE_NO_UPDATE_MS = 60_000;
export const CONNECTION_WARNING_DELAY_MS = 5_000;
export const MOBILE_CONNECTION_WARNING_DELAY_MS = 15_000;

export const getConnectionWarningDelayMs = (viewportWidth: number): number =>
  viewportWidth < MOBILE_BREAKPOINT
    ? MOBILE_CONNECTION_WARNING_DELAY_MS
    : CONNECTION_WARNING_DELAY_MS;

export interface EntityStaleInput {
  entitiesLoaded: boolean;
  connected: boolean;
  disconnectedSince: number | null;
  lastEntityUpdateAt: number;
  now?: number;
}

export const isEntityDataStale = ({
  entitiesLoaded,
  connected,
  disconnectedSince,
  lastEntityUpdateAt,
  now = Date.now(),
}: EntityStaleInput): boolean => {
  if (!entitiesLoaded) return false;

  if (!connected) {
    if (!disconnectedSince) return false;
    return now - disconnectedSince >= ENTITY_STALE_DISCONNECT_GRACE_MS;
  }

  if (!lastEntityUpdateAt) return false;
  return now - lastEntityUpdateAt >= ENTITY_STALE_NO_UPDATE_MS;
};
