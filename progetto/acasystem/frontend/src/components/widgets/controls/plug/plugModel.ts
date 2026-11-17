import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { isProductDeviceBinding, type ProductDeviceBinding } from '@/utils/devices/productBinding';
import type { OperationalInput, OperationalProfile } from '../../adaptive/operationalProfile';

/** Old device metadata never follows an explicit re-association to another entity. */
export function plugBinding(settings: CardSettings, entityId: string): ProductDeviceBinding | null {
  const binding = settings.productDevice;
  return isProductDeviceBinding(binding) &&
    binding.family === 'plug' &&
    binding.primaryEntityId === entityId &&
    (!settings.bindingEntityId || settings.bindingEntityId === entityId) &&
    binding.channelEntityIds.every((id) => id.startsWith('switch.'))
    ? binding
    : null;
}

export function plugOutputs(settings: CardSettings, entityId: string): string[] {
  const binding = plugBinding(settings, entityId);
  return binding
    ? binding.channelEntityIds.filter((id) => !binding.technicalEntityIds?.includes(id))
    : entityId.startsWith('switch.')
      ? [entityId]
      : [];
}

export const outputAvailable = (entities: EntityMap, id: string) =>
  ['on', 'off'].includes(entities[id]?.state ?? '');

export function plugSummary(ids: readonly string[], entities: EntityMap) {
  return {
    active: ids.filter((id) => entities[id]?.state === 'on').length,
    unavailable: ids.filter((id) => !outputAvailable(entities, id)).length,
    total: ids.length,
  };
}

/** Names remain HA names; duplicate labels are qualified with their exact entity identifier. */
export function plugEntityLabel(id: string, ids: readonly string[], entities: EntityMap): string {
  const name = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === name)
    .length > 1
    ? `${name} (${id})`
    : name;
}

/** A multichannel Home has readings only; neither preferences nor extensions can add commands. */
export function plugOperationalProfile(input: OperationalInput): OperationalProfile {
  const ids = plugOutputs(input.settings, input.entityId);
  const summary = plugSummary(ids, input.entities);
  const single = ids.length === 1 ? ids[0] : undefined;
  const canSwitch = Boolean(
    single &&
    outputAvailable(input.entities, single) &&
    Object.hasOwn(input.services?.switch ?? {}, 'turn_on') &&
    Object.hasOwn(input.services?.switch ?? {}, 'turn_off')
  );
  return {
    capabilities: single
      ? [
          {
            id: 'power',
            label: 'Accensione uscita',
            icon: 'power',
            kind: 'toggle',
            initial: input.entities[single]?.state === 'on',
            frequent: true,
            on: 'Acceso',
            off: 'Spento',
          },
        ]
      : [
          {
            id: 'outputs',
            label: 'Uscite',
            icon: 'power',
            kind: 'reading',
            frequent: true,
            initial: `${summary.active} di ${summary.total} attive${summary.unavailable ? ` · ${summary.unavailable} non disponibili` : ''}`,
          },
        ],
    values: single
      ? { power: input.entities[single]?.state === 'on' }
      : { outputs: summary.active },
    targets: single ? { power: single } : {},
    historyHours: 24,
    unavailable: canSwitch || !single ? [] : ['Accensione uscita: controllo non disponibile'],
    execute: (id, value) =>
      canSwitch && single && id === 'power' && typeof value === 'boolean'
        ? {
            calls: [
              {
                domain: 'switch',
                service: value ? 'turn_on' : 'turn_off',
                data: { entity_id: single },
              },
            ],
          }
        : null,
  };
}
