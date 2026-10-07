/**
 * Fixture runtime for widget tests and the development previews (no Home Assistant needed).
 * Real data comes from the launcher's WidgetRuntimeProvider.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityMap } from '@/@types/ha';
import type { WidgetRuntime } from '@/@types/launcher';
import { it as italian } from '@/utils/i18n';

const dictionary = italian as Record<string, string>;

/** Italian translation with the key as fallback, like the app. */
export const fixtureTranslate = (key: string): string => dictionary[key] ?? key;

/** Builds an HA entity with sensible defaults for tests and previews. */
export function fixtureEntity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {}
): HassEntity {
  const now = '2026-10-06T08:00:00.000Z';
  return {
    entity_id: entityId,
    state,
    attributes: {
      friendly_name: entityId.split('.')[1]?.replace(/_/g, ' ') ?? entityId,
      ...attributes,
    },
    last_changed: now,
    last_updated: now,
    context: { id: `ctx-${entityId}`, parent_id: null, user_id: null },
  };
}

export function fixtureEntities(list: HassEntity[]): EntityMap {
  return Object.fromEntries(list.map((entity) => [entity.entity_id, entity]));
}

/** A complete WidgetRuntime; override any field (e.g. callService with vi.fn()). */
export function createFixtureRuntime(overrides: Partial<WidgetRuntime> = {}): WidgetRuntime {
  return {
    entities: {},
    entitiesLoaded: true,
    conn: null,
    callService: async () => undefined,
    t: fixtureTranslate,
    language: 'it',
    cardSettings: {},
    saveCardSetting: () => undefined,
    customNames: {},
    customIcons: {},
    getEntityImageUrl: (path) => (path ? `http://ha.local${path}` : null),
    openDetails: () => undefined,
    editMode: false,
    haConfig: {
      unit_system: {
        temperature: '°C',
        length: 'km',
        mass: 'kg',
        volume: 'L',
        pressure: 'hPa',
        wind_speed: 'km/h',
        accumulated_precipitation: 'mm',
      },
      currency: 'EUR',
      time_zone: 'Europe/Rome',
      language: 'it',
    },
    ...overrides,
  };
}
