/**
 * Widget types of the add-widget sheet: the legacy «add card» types of Tunet with their entity
 * filters, kept as they were so that new cards get the same ids and cardSettings. Labels and
 * sizes come from the widget registry when a definition matches the type; the icon of each type
 * is a kit icon of the Icon primitive, distinct for every type.
 */
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import type { WidgetDefinition } from '@/@types/launcher';
import type { IconName } from '@/components/primitives';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { isToggleEntity } from '@/utils/formatting';
import { isSonosMediaEntity } from '@/utils/mediaEntityClassification';

/** How the second step of the sheet collects what the new widget needs. */
export type AddWidgetFlow =
  'entities' | 'calendar' | 'weather' | 'tv' | 'cost' | 'nordpool' | 'simple' | 'spacer' | 'room';

export interface AddWidgetType {
  /** Legacy addCardType, passed to useAddCard. */
  type: string;
  label: string;
  /** Kit icon of the tile: one per type, so that every tile is recognisable. */
  icon: IconName;
  flow: AddWidgetFlow;
  /** Card id and settings like the ones the type creates: used to find its definition. */
  sample: { id: string; settings: CardSettings };
  hint?: string;
  /** Text of the plural item, for «Aggiungi 3 …». */
  unit?: [singular: string, plural: string];
}

export const ADD_WIDGET_TYPES: readonly AddWidgetType[] = [
  {
    type: 'sensor',
    label: 'Sensori e comandi',
    icon: 'activity',
    flow: 'entities',
    sample: { id: 'entity_card_esempio', settings: { type: 'sensor', entityId: 'sensor.esempio' } },
    hint: 'Sensori, interruttori, scenari, script, luci, clima e pulsanti.',
  },
  {
    type: 'light',
    label: 'Luci',
    icon: 'light',
    flow: 'entities',
    sample: { id: 'light.esempio', settings: {} },
  },
  {
    type: 'lock',
    label: 'Serrature',
    icon: 'lock',
    flow: 'entities',
    sample: { id: 'lock_card_esempio', settings: { lockId: 'lock.esempio' } },
  },
  {
    type: 'vacuum',
    label: 'Aspirapolvere',
    icon: 'vacuum',
    flow: 'entities',
    sample: { id: 'vacuum.esempio', settings: {} },
  },
  {
    type: 'mower',
    label: 'Tagliaerba',
    icon: 'mower',
    flow: 'entities',
    sample: { id: 'lawn_mower.esempio', settings: {} },
  },
  {
    type: 'fan',
    label: 'Ventilatori',
    icon: 'fan',
    flow: 'entities',
    sample: { id: 'fan.esempio', settings: {} },
  },
  {
    type: 'camera',
    label: 'Videocamere (beta)',
    icon: 'camera',
    flow: 'entities',
    sample: { id: 'camera_card_esempio', settings: { cameraId: 'camera.esempio' } },
  },
  {
    type: 'climate',
    label: 'Clima',
    icon: 'thermostat',
    flow: 'entities',
    sample: { id: 'climate_card_esempio', settings: { climateId: 'climate.esempio' } },
  },
  {
    type: 'cover',
    label: 'Tapparelle',
    icon: 'blinds',
    flow: 'entities',
    sample: { id: 'cover_card_esempio', settings: { coverId: 'cover.esempio' } },
  },
  {
    type: 'alarm',
    label: 'Allarme',
    icon: 'shield',
    flow: 'entities',
    sample: { id: 'alarm_card_esempio', settings: { alarmId: 'alarm_control_panel.esempio' } },
  },
  {
    type: 'car',
    label: 'Auto',
    icon: 'car',
    flow: 'simple',
    sample: { id: 'car_card_esempio', settings: { type: 'car', size: 'large' } },
    hint: 'Aggiunge il widget dell’auto: le entità si associano poi nelle impostazioni del widget.',
  },
  {
    type: 'androidtv',
    label: 'Android TV',
    icon: 'tv',
    flow: 'tv',
    sample: { id: 'androidtv_card_esempio', settings: { mediaPlayerId: 'media_player.esempio' } },
  },
  {
    type: 'appletv',
    label: 'Apple TV',
    icon: 'play',
    flow: 'tv',
    sample: { id: 'appletv_card_esempio', settings: { mediaPlayerId: 'media_player.esempio' } },
  },
  {
    type: 'cost',
    label: 'Costi',
    icon: 'wallet',
    flow: 'cost',
    sample: {
      id: 'cost_card_esempio',
      settings: { todayId: 'sensor.oggi', monthId: 'sensor.mese' },
    },
    hint: 'Scegli un sensore per il costo di oggi e uno per il mese.',
  },
  {
    type: 'media',
    label: 'Multimedia',
    icon: 'music',
    flow: 'entities',
    sample: { id: 'media_group_esempio', settings: { mediaIds: ['media_player.esempio'] } },
    unit: ['lettore', 'lettori'],
  },
  {
    type: 'sonos',
    label: 'Sonos',
    icon: 'speaker',
    flow: 'entities',
    sample: { id: 'sonos_group_esempio', settings: { mediaIds: ['media_player.esempio'] } },
    unit: ['lettore', 'lettori'],
  },
  {
    type: 'weather',
    label: 'Meteo',
    icon: 'weather',
    flow: 'weather',
    sample: { id: 'weather_temp_esempio', settings: { weatherId: 'weather.esempio' } },
  },
  {
    type: 'calendar',
    label: 'Calendario',
    icon: 'calendar',
    flow: 'calendar',
    sample: { id: 'calendar_card_esempio', settings: { calendars: ['calendar.esempio'] } },
  },
  {
    type: 'todo',
    label: 'Attività',
    icon: 'task',
    flow: 'simple',
    sample: { id: 'todo_card_esempio', settings: { size: 'large' } },
    hint: 'Aggiunge un elenco di attività: la lista si sceglie poi nelle impostazioni del widget.',
  },
  {
    type: 'nordpool',
    label: 'Nordpool',
    icon: 'energy',
    flow: 'nordpool',
    sample: { id: 'nordpool_card_esempio', settings: { nordpoolId: 'sensor.nordpool_esempio' } },
  },
  {
    type: 'room',
    label: 'Stanze',
    icon: 'room',
    flow: 'room',
    sample: { id: 'room_card_esempio', settings: { areaId: 'esempio' } },
    hint: 'Ogni stanza nasce da un’area di Home Assistant con le sue entità.',
  },
  {
    type: 'cover_clock',
    label: 'Orologio',
    icon: 'clock',
    flow: 'simple',
    sample: { id: 'cover_clock_esempio', settings: {} },
    hint: 'L’orologio della copertina, con le lancette e l’ora.',
  },
  {
    type: 'cover_calendar',
    label: 'Data',
    icon: 'text',
    flow: 'simple',
    sample: { id: 'cover_calendar_esempio', settings: {} },
    hint: 'Il giorno della settimana e il numero del giorno, come in copertina.',
  },
  {
    type: 'cover_weather',
    label: 'Meteo di casa',
    icon: 'sun',
    flow: 'simple',
    sample: { id: 'cover_weather_esempio', settings: {} },
    hint: 'Il meteo della posizione di casa, come in copertina.',
  },
  {
    type: 'spacer',
    label: 'Separatore',
    icon: 'minus',
    flow: 'spacer',
    sample: { id: 'spacer_card_esempio', settings: { variant: 'divider' } },
    hint: 'Uno spazio vuoto o una linea per dividere i widget.',
  },
];

/** Definition of the registry that renders the cards of this type, if any. */
export function definitionForType(type: AddWidgetType): WidgetDefinition | undefined {
  return findWidgetDefinition(type.sample.id, type.sample.settings);
}

export interface TypeVisual {
  label: string;
  /** Kit icon of the type (registry icons are not used: several definitions share one). */
  icon: IconName;
}

/**
 * Label and icon of each type. The label is the one of the registry definition when it serves
 * that type only, the legacy one when one definition serves several types (Multimedia and Sonos
 * are both player groups); the icon is always the kit icon of the type, so every tile stays
 * distinct.
 */
export function typeVisuals(): Map<string, TypeVisual> {
  const definitions = ADD_WIDGET_TYPES.map((type) => definitionForType(type));
  const uses = new Map<WidgetDefinition, number>();
  definitions.forEach((definition) => {
    if (definition) uses.set(definition, (uses.get(definition) ?? 0) + 1);
  });
  return new Map(
    ADD_WIDGET_TYPES.map((type, index) => {
      const definition = definitions[index];
      const own = definition && uses.get(definition) === 1 ? definition : undefined;
      return [type.type, { label: own?.label ?? type.label, icon: type.icon }];
    })
  );
}

const SENSOR_DOMAINS = [
  'sensor.',
  'script.',
  'scene.',
  'input_number.',
  'input_boolean.',
  'binary_sensor.',
  'switch.',
  'light.',
  'climate.',
  'button.',
  'input_button.',
  'automation.',
  'select.',
  'input_select.',
];

/**
 * Entities offered for a type, with the legacy filters: some types hide entities already on
 * the page because their card id is the entity id.
 */
export function candidateEntityIds(
  type: string,
  entities: EntityMap,
  onPage: ReadonlySet<string>
): string[] {
  return Object.keys(entities).filter((id) => {
    switch (type) {
      case 'lock':
        return id.startsWith('lock.') && !onPage.has(id);
      case 'vacuum':
        return id.startsWith('vacuum.') && !onPage.has(id);
      case 'mower':
        return id.startsWith('lawn_mower.') && !onPage.has(id);
      case 'fan':
        return id.startsWith('fan.') && !onPage.has(id);
      case 'camera':
        return id.startsWith('camera.');
      case 'cover':
        return id.startsWith('cover.');
      case 'climate':
        return id.startsWith('climate.');
      case 'alarm':
        return id.startsWith('alarm_control_panel.');
      case 'cost':
        return id.startsWith('sensor.') || id.startsWith('input_number.');
      case 'media':
        return id.startsWith('media_player.');
      case 'sonos':
        return id.startsWith('media_player.') && isSonosMediaEntity(entities[id]);
      case 'sensor':
        return SENSOR_DOMAINS.some((domain) => id.startsWith(domain));
      case 'toggle':
        return isToggleEntity(id) && !onPage.has(id);
      case 'entity':
        return !id.startsWith('person.') && !id.startsWith('update.') && !onPage.has(id);
      case 'calendar':
        return id.startsWith('calendar.');
      case 'weather':
        return id.startsWith('weather.');
      case 'nordpool':
        return id.startsWith('sensor.') && id.toLowerCase().includes('nordpool');
      case 'tv':
        return id.startsWith('media_player.');
      case 'remote':
        return id.startsWith('remote.');
      default:
        return id.startsWith('light.') && !onPage.has(id);
    }
  });
}

/** Temperature sensors offered next to a weather entity (legacy filter). */
export function temperatureSensorIds(entities: EntityMap): string[] {
  return Object.keys(entities).filter((id) => {
    if (!id.startsWith('sensor.')) return false;
    const deviceClass: unknown = entities[id]?.attributes?.device_class;
    const lower = id.toLowerCase();
    return deviceClass === 'temperature' || lower.includes('temperature') || lower.includes('temp');
  });
}

/*
 * Categories of the tray (REP-20261007-035), as the widget picker of Android groups widgets:
 * here by what they are for in the home rather than by app.
 */
export const WIDGET_CATEGORIES = [
  { id: 'comandi', label: 'Luci e comandi', types: ['light', 'sensor', 'fan', 'cover', 'room'] },
  { id: 'clima', label: 'Clima e meteo', types: ['climate', 'weather', 'cover_weather'] },
  { id: 'sicurezza', label: 'Sicurezza', types: ['lock', 'alarm', 'camera'] },
  { id: 'multimedia', label: 'Multimedia', types: ['media', 'sonos', 'androidtv', 'appletv'] },
  {
    id: 'casa',
    label: 'Casa e info',
    types: ['cover_clock', 'cover_calendar', 'calendar', 'todo', 'car', 'vacuum', 'mower'],
  },
  { id: 'energia', label: 'Energia', types: ['cost', 'nordpool'] },
  { id: 'utilita', label: 'Utilità', types: ['spacer'] },
] as const;

export type WidgetCategoryId = (typeof WIDGET_CATEGORIES)[number]['id'];

/** Category of a type of the catalog; «Utilità» for a type no category lists. */
export function categoryOf(type: string): WidgetCategoryId {
  const found = WIDGET_CATEGORIES.find((category) =>
    (category.types as readonly string[]).includes(type)
  );
  return found?.id ?? 'utilita';
}
