import {
  DISCOVERY_SOURCES,
  HANDLER_NAMES,
  familyOfHandler,
  isAddableHandler,
} from '../../config/deviceFamilies.ts';
import type { DeviceFamily } from '../../config/deviceFamilies.ts';
import { DEVICE_ERROR_DEFINITIONS } from './deviceErrors.ts';
import type { HaProgressFlow } from './haAdapter.ts';

/**
 * The devices that Home Assistant found on the network and has not been told about yet
 * (ADR-0024). They are flows in progress with a discovery as origin; a person can take one
 * over (`aggiungi`) or say "Non mi interessa" (`ignora`). Nothing here scans the network:
 * Home Assistant does, Acasystem only reads what it found.
 */

export interface DiscoveredDeviceDto {
  flowId: string;
  handler: string;
  source: string;
  name: string;
  model: string | null;
  family: DeviceFamily | null;
  /** False when Acasystem cannot carry the flow to the end for a customer. */
  addable: boolean;
  /** Why not, in Italian; only when `addable` is false. */
  reason?: string;
}

export const OTHER_PERSON_REASON = 'Aggiunta già in corso da un altro utente.';

/** True for an origin that HA uses when it discovers a device (never `user`, `reauth`...). */
export const isDiscoverySource = (source: string): boolean => DISCOVERY_SOURCES.includes(source);

/**
 * Why the flow cannot be added from Acasystem, or null when it can. Since F4 only the handler
 * decides (a system integration of HA); the steps are drawn from what HA sends, and a step that
 * Acasystem cannot draw answers "Richiede l'installatore" when the person taps «Aggiungi».
 */
export const whyNotAddable = (flow: Pick<HaProgressFlow, 'handler' | 'stepId'>): string | null =>
  isAddableHandler(flow.handler) ? null : DEVICE_ERROR_DEFINITIONS.REQUIRES_INSTALLER.message;

export const toDiscoveredDto = (
  flow: HaProgressFlow,
  takenByOther: boolean
): DiscoveredDeviceDto => {
  const reason = whyNotAddable(flow) ?? (takenByOther ? OTHER_PERSON_REASON : null);
  return {
    flowId: flow.flowId,
    handler: flow.handler,
    source: flow.source,
    name: flow.name ?? HANDLER_NAMES[flow.handler] ?? 'Dispositivo trovato in rete',
    model: flow.model,
    family: familyOfHandler(flow.handler),
    addable: reason === null,
    ...(reason ? { reason } : {}),
  };
};

/** The discoveries among the flows in progress, in a stable order (family, then name). */
export const pickDiscovered = (flows: readonly HaProgressFlow[]): HaProgressFlow[] =>
  flows
    .filter((flow) => isDiscoverySource(flow.source) && isAddableHandler(flow.handler))
    .sort((a, b) => a.handler.localeCompare(b.handler) || a.flowId.localeCompare(b.flowId));
