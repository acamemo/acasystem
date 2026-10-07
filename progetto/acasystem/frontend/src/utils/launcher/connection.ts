/** Connection shown in the status bar, from the Home Assistant context flags. */
import type { EntityMap } from '@/@types/ha';

export type ConnectionPhase = 'connected' | 'connecting' | 'reconnecting' | 'error';

export interface ConnectionSummary {
  phase: ConnectionPhase;
  label: string;
}

export interface ConnectionFlags {
  connected: boolean;
  entitiesLoaded: boolean;
  haUnavailableVisible: boolean;
  oauthExpired: boolean;
}

export function connectionSummary({
  connected,
  entitiesLoaded,
  haUnavailableVisible,
  oauthExpired,
}: ConnectionFlags): ConnectionSummary {
  if (oauthExpired) return { phase: 'error', label: 'Sessione scaduta' };
  if (connected) return { phase: 'connected', label: 'Collegato' };
  if (haUnavailableVisible) return { phase: 'error', label: 'Non raggiungibile' };
  if (!entitiesLoaded) return { phase: 'connecting', label: 'Connessione…' };
  return { phase: 'reconnecting', label: 'Riconnessione in corso' };
}

/** Updates waiting in Home Assistant (as the legacy settings button counted them). */
export function pendingUpdateCount(entities: EntityMap): number {
  return Object.values(entities).filter(
    (entity) =>
      entity.entity_id.startsWith('update.') &&
      entity.state === 'on' &&
      !entity.attributes?.skipped_version
  ).length;
}
