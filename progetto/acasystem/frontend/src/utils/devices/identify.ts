/**
 * «Fai lampeggiare» (F4): how a device already in Home Assistant can show which one it is. Pure:
 * it looks at the entities of the device and says which service to call, if any. It is a normal
 * action of the person through the live connection (like pressing a button in a widget); the
 * device facade of the server is not involved.
 *
 * - a `button` with the device class `identify` is pressed (the integration makes the device
 *   blink or beep);
 * - otherwise a `light` that supports flashing is asked to flash once (`flash: 'short'`).
 */
import type { EntityMap } from '@/@types/ha';

/** What the button says and what it answers; shared by the list of the details and the add flow. */
export const IDENTIFY_TEXTS = {
  label: 'Fai lampeggiare',
  sent: 'Comando inviato: guarda il dispositivo.',
  failed: 'Non sono riuscito a farlo lampeggiare. Riprova.',
} as const;

export interface IdentifyAction {
  /** The entity the call is aimed at. */
  entityId: string;
  domain: 'button' | 'light';
  service: 'press' | 'turn_on';
  data: Record<string, unknown>;
}

/** `LightEntityFeature.FLASH` of Home Assistant. */
const LIGHT_FLASH = 8;

const domainOf = (entityId: string): string => entityId.split('.')[0] ?? '';

const usable = (state: string | undefined): boolean => state !== undefined && state !== 'unavailable';

export function identifyActionFor(
  entityIds: readonly string[],
  entities: EntityMap
): IdentifyAction | null {
  for (const entityId of entityIds) {
    const entity = entities[entityId];
    if (
      domainOf(entityId) === 'button' &&
      usable(entity?.state) &&
      entity?.attributes?.device_class === 'identify'
    ) {
      return { entityId, domain: 'button', service: 'press', data: { entity_id: entityId } };
    }
  }
  for (const entityId of entityIds) {
    const entity = entities[entityId];
    const features: unknown = entity?.attributes?.supported_features;
    if (
      domainOf(entityId) === 'light' &&
      usable(entity?.state) &&
      typeof features === 'number' &&
      (features & LIGHT_FLASH) !== 0
    ) {
      return {
        entityId,
        domain: 'light',
        service: 'turn_on',
        data: { entity_id: entityId, flash: 'short' },
      };
    }
  }
  return null;
}
