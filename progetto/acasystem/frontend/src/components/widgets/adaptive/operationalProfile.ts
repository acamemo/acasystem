import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, ServiceData } from '@/@types/ha';
import type { Capability, SampleValue, SampleValues } from './widgetDesignModel';
import {
  haEntityToCapabilities,
  resolveHaService,
  getFeatures,
} from '@/utils/haEntityToCapabilities';
import { readCarSettings } from '../utilities/car/carData';
import { roomSummary } from '../utilities/room/roomData';
import {
  availableArmActions,
  alarmStateLabel,
  DISARM_ACTION,
  TRANSITION_STATES,
} from '../home/alarm/alarmModel';
import type { WidgetRuntime } from '@/@types/launcher';
import type { TimePoint } from '@/utils/sensorHistory';
import { DEVICE_SCOPE_NOTE } from '@/utils/launcher/deviceMemory';

export type ServiceCatalog = Record<string, Record<string, unknown>>;
export interface Operation {
  calls: { domain: string; service: string; data: ServiceData }[];
  setting?: { key: string; value: unknown };
  confirmation?: boolean;
  acknowledgementOnly?: boolean;
}
export interface HistorySource {
  entityId: string;
  attribute?: string;
  factor?: number;
  states?: Readonly<Record<string, number>>;
}
export interface OperationalProfile {
  capabilities: Capability[];
  values: SampleValues;
  targets: Record<string, string>;
  history?: HistorySource;
  series?: TimePoint[];
  seriesLabel?: string;
  historyHours: number;
  unavailable: string[];
  execute: (id: string, value: SampleValue, values: SampleValues) => Operation | null;
}
export interface OperationalInput {
  type: string;
  entityId: string;
  settings: CardSettings;
  entities: EntityMap;
  services: ServiceCatalog | null;
  haConfig?: WidgetRuntime['haConfig'];
  queue?: readonly { id: string; label: string }[];
  content?: readonly {
    id: string;
    label: string;
    type: string;
    playable?: boolean;
    expandable?: boolean;
  }[];
}

const text = (v: unknown) => (typeof v === 'string' ? v : '');
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const number = (v: unknown): number | null =>
  v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
const reading = (id: string, label: string, initial: string | number, unit = ''): Capability => ({
  id,
  label,
  initial,
  unit,
  kind: 'reading',
  icon: 'activity',
  frequent: true,
});
const action = (id: string, label: string, icon: Capability['icon'] = 'play'): Capability => ({
  id,
  label,
  kind: 'action',
  icon,
  frequent: false,
  message: 'Comando inviato',
});
const toggle = (
  id: string,
  label: string,
  initial: boolean,
  icon: Capability['icon'] = 'power'
): Capability => ({
  id,
  label,
  initial,
  icon,
  frequent: true,
  kind: 'toggle',
  on: 'Attivo',
  off: 'Inattivo',
});
const range = (
  id: string,
  label: string,
  initial: number,
  min = 0,
  max = 100,
  step = 1,
  unit = '%'
): Capability => ({
  id,
  label,
  initial,
  min,
  max,
  step,
  unit,
  icon: 'activity',
  frequent: true,
  kind: 'range',
});
const options = (id: string, label: string, initial: string, choices: string[]): Capability => ({
  id,
  label,
  initial,
  options: choices,
  icon: 'settings',
  frequent: false,
  kind: 'options',
});

/** A media group keeps the configured player selection, including legacy activeId. */
export function resolveOperationalEntityId(
  type: string,
  entityId: string,
  settings: CardSettings,
  entities: EntityMap
) {
  if (!['media', 'sonos'].includes(type)) return entityId;
  const ids = strings(settings.mediaIds);
  const active = text(settings.activeId);
  return ids.includes(active) && entities[active]
    ? active
    : (ids.find((id) => entities[id]?.state === 'playing') ??
        ids.find((id) => entities[id]) ??
        entityId);
}

/** Logical widgets may bind several HA entities. Only configured targets receive commands. */
export function operationalProfile(input: OperationalInput): OperationalProfile {
  const { type, settings, entities, services } = input;
  const entityId = resolveOperationalEntityId(type, input.entityId, settings, entities);
  const entity = entities[entityId];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);
  const capabilities: Capability[] = [];
  const values: SampleValues = {};
  const targets: Record<string, string> = {};
  const commands = new Map<
    string,
    (value: SampleValue, current: SampleValues) => Operation | null
  >();
  const unavailable: string[] = [];
  let history: HistorySource | undefined;
  let series: TimePoint[] | undefined;
  let seriesLabel: string | undefined;
  let historyHours = [6, 24, 168].includes(Number(settings.adaptiveHistoryHours))
    ? Number(settings.adaptiveHistoryHours)
    : 24;
  const has = (domain: string, service: string) =>
    Boolean(services?.[domain] && Object.hasOwn(services[domain], service));
  const service = (
    domain: string,
    name: string,
    target: string,
    data: ServiceData = {}
  ): Operation => ({ calls: [{ domain, service: name, data: { entity_id: target, ...data } }] });
  const add = (
    cap: Capability,
    target = entityId,
    command?: (value: SampleValue, current: SampleValues) => Operation | null
  ) => {
    if (capabilities.some((item) => item.id === cap.id)) return;
    if (cap.kind === 'range' && ![cap.initial, cap.min, cap.max, cap.step].every(Number.isFinite))
      return;
    capabilities.push(cap.id === 'control' ? { ...cap, frequent: true } : cap);
    if ('initial' in cap) values[cap.id] = cap.initial;
    targets[cap.id] = target;
    if (command) commands.set(cap.id, command);
  };
  const addService = (
    cap: Capability,
    domain: string,
    name: string,
    target = entityId,
    data: (value: SampleValue) => ServiceData = () => ({})
  ) => {
    if (!has(domain, name)) {
      unavailable.push(`${cap.label}: servizio non disponibile`);
      return;
    }
    add(cap, target, (value) => service(domain, name, target, data(value)));
  };
  const addReading = (id: string, label: string, target: string, attribute?: string) => {
    const source = entities[target];
    const raw = attribute ? source?.attributes[attribute] : source?.state;
    if (
      !source ||
      raw === undefined ||
      raw === null ||
      ['unknown', 'unavailable'].includes(source.state)
    )
      return;
    add(
      reading(
        id,
        label,
        number(raw) ?? String(raw),
        attribute ? '' : text(source.attributes.unit_of_measurement)
      ),
      target
    );
  };
  const bind = (id: string, label: string, target: string) => {
    const source = entities[target];
    if (!source) return;
    const domain = target.split('.')[0]!;
    const a = source.attributes;
    if (['switch', 'input_boolean', 'automation'].includes(domain)) {
      if (has(domain, 'turn_on') && has(domain, 'turn_off'))
        add(toggle(id, label, source.state === 'on'), target, (v) =>
          service(domain, v ? 'turn_on' : 'turn_off', target)
        );
    } else if (['number', 'input_number'].includes(domain) && number(source.state) !== null) {
      addService(
        range(
          id,
          label,
          Number(source.state),
          Number(a.min ?? 0),
          Number(a.max ?? 100),
          Number(a.step ?? 1),
          text(a.unit_of_measurement)
        ),
        domain,
        'set_value',
        target,
        (value) => ({ value: Number(value) })
      );
    } else if (['select', 'input_select'].includes(domain) && strings(a.options).length) {
      addService(
        options(id, label, source.state, strings(a.options)),
        domain,
        'select_option',
        target,
        (value) => ({ option: String(value) })
      );
    } else if (['button', 'input_button', 'script', 'scene'].includes(domain)) {
      addService(
        action(id, label),
        domain,
        domain.endsWith('button') ? 'press' : 'turn_on',
        target
      );
    } else addReading(id, label, target);
  };
  const extensionIds =
    settings.adaptiveBindings && typeof settings.adaptiveBindings === 'object'
      ? (settings.adaptiveBindings as Record<string, unknown>)
      : {};

  if (
    entity &&
    !['car', 'room', 'cost', 'nordpool', 'camera', 'alarm', 'todo', 'spacer'].includes(type)
  ) {
    const base = haEntityToCapabilities(entity, type === 'sensor' ? undefined : type).capabilities;
    for (const cap of base) {
      if (type === 'climate' && 'unit' in cap && ['target', 'temperature'].includes(cap.id))
        cap.unit = text(attrs.temperature_unit) || input.haConfig?.unit_system?.temperature || '°C';
      if (cap.kind === 'range') {
        const attributes: Record<string, string> = {
          brightness: 'brightness',
          volume: 'volume_level',
          speed: 'percentage',
          position: 'current_position',
          tilt: 'current_tilt_position',
          target: 'temperature',
          humidity: 'humidity',
        };
        const attr = attributes[cap.id];
        if (
          attr &&
          number(attrs[attr] ?? (cap.id === 'humidity' ? attrs.target_humidity : undefined)) ===
            null
        ) {
          unavailable.push(cap.label + ': valore attuale non disponibile');
          continue;
        }
      }
      if (
        cap.kind === 'toggle' &&
        cap.id === 'power' &&
        (!has(entityId.split('.')[0]!, 'turn_on') || !has(entityId.split('.')[0]!, 'turn_off'))
      )
        continue;
      if (cap.kind === 'reading') {
        // Unknown attributes are not represented by invented defaults.
        if (cap.id === 'temperature' && number(attrs.current_temperature) === null) continue;
        add(cap);
        continue;
      }
      const sample = 'initial' in cap ? cap.initial : true;
      const call = resolveHaService(entityId, cap.id, sample);
      if (!call || !has(call.domain, call.service)) continue;
      if (
        (type === 'vacuum' && cap.id === 'start' && !(features & 8192)) ||
        (type === 'mower' && cap.id === 'start' && !(features & 1))
      )
        continue;
      if (
        type === 'climate' &&
        cap.id === 'power' &&
        (!(features & 128) || !(features & 256) || !has('climate', 'turn_off'))
      )
        continue;
      if (cap.id === 'volume' && !(features & 4)) continue;
      if (cap.id === 'mute' && !(features & 8)) continue;
      if (cap.id === 'playing' && (!(features & 1) || !(features & 16384))) continue;
      if (
        type === 'fan' &&
        ((cap.id === 'speed' && !(features & 1)) || (cap.id === 'oscillation' && !(features & 2)))
      )
        continue;
      if (
        ['media', 'sonos', 'androidtv', 'appletv'].includes(type) &&
        cap.id === 'power' &&
        (!(features & 128) || !(features & 256))
      )
        continue;
      add(cap, entityId, (value) => {
        const next = resolveHaService(entityId, cap.id, value);
        return next && has(next.domain, next.service) ? { calls: [next] } : null;
      });
    }
  }

  if (type === 'light' && entity) {
    if (capabilities.some((cap) => cap.id === 'hue')) {
      add(
        range(
          'saturation',
          'Saturazione',
          Number(Array.isArray(attrs.hs_color) ? attrs.hs_color[1] : 100)
        )
      );
      commands.set('saturation', (value) =>
        service('light', 'turn_on', entityId, { hs_color: [Number(values.hue), Number(value)] })
      );
      commands.set('hue', (value, current) =>
        service('light', 'turn_on', entityId, {
          hs_color: [Number(value), Number(current.saturation ?? values.saturation)],
        })
      );
    }
    if (features & 32)
      add(
        range(
          'transition',
          `Durata transizione (${DEVICE_SCOPE_NOTE.toLowerCase()})`,
          Number(settings.lightTransition ?? 0),
          0,
          10,
          0.5,
          's'
        ),
        entityId,
        (value) => ({ calls: [], setting: { key: 'lightTransition', value: Number(value) } })
      );
    history = { entityId, attribute: 'brightness', factor: 100 / 255 };
  }
  if (type === 'climate' && entity) {
    for (const [id, attr, feature, svc] of [
      ['swing', 'swing_modes', 32, 'set_swing_mode'],
      ['horizontal', 'swing_horizontal_modes', 512, 'set_swing_horizontal_mode'],
    ] as const) {
      const choices = strings(attrs[attr]);
      if (features & feature && choices.length)
        addService(
          options(
            id,
            id === 'swing' ? 'Oscillazione verticale' : 'Oscillazione orizzontale',
            text(attrs[id === 'swing' ? 'swing_mode' : 'swing_horizontal_mode']),
            choices
          ),
          'climate',
          svc,
          entityId,
          (value) => ({ [id === 'swing' ? 'swing_mode' : 'swing_horizontal_mode']: value })
        );
    }
    if (features & 2)
      for (const id of ['target_low', 'target_high'] as const) {
        const attr = id === 'target_low' ? 'target_temp_low' : 'target_temp_high';
        if (number(attrs[attr]) !== null)
          addService(
            range(
              id,
              id === 'target_low' ? 'Temperatura minima' : 'Temperatura massima',
              Number(attrs[attr]),
              Number(attrs.min_temp ?? 7),
              Number(attrs.max_temp ?? 35),
              Number(attrs.target_temp_step ?? 0.5),
              text(attrs.temperature_unit) || '°C'
            ),
            'climate',
            'set_temperature',
            entityId,
            (value) => ({
              target_temp_low: id === 'target_low' ? value : attrs.target_temp_low,
              target_temp_high: id === 'target_high' ? value : attrs.target_temp_high,
            })
          );
      }
    history = { entityId, attribute: 'temperature' };
  }
  if (type === 'fan' && entity) {
    if (features & 4)
      addService(
        options('direction', 'Direzione', text(attrs.direction), ['forward', 'reverse']),
        'fan',
        'set_direction',
        entityId,
        (value) => ({ direction: value })
      );
    if (features & 8 && strings(attrs.preset_modes).length)
      addService(
        options('preset', 'Modalità', text(attrs.preset_mode), strings(attrs.preset_modes)),
        'fan',
        'set_preset_mode',
        entityId,
        (value) => ({ preset_mode: value })
      );
    history = { entityId, attribute: 'percentage' };
  }
  if (type === 'cover' && entity) {
    for (const [id, bit, svc, label] of [
      ['tilt_open', 16, 'open_cover_tilt', 'Apri lamelle'],
      ['tilt_close', 32, 'close_cover_tilt', 'Chiudi lamelle'],
      ['tilt_stop', 64, 'stop_cover_tilt', 'Ferma lamelle'],
    ] as const)
      if (features & bit) addService(action(id, label), 'cover', svc);
    history = { entityId, attribute: 'current_position' };
  }
  if (type === 'lock')
    history = { entityId, states: { locked: 1, unlocked: 0, open: 0, locking: 1, unlocking: 0 } };
  if (['media', 'sonos', 'androidtv', 'appletv'].includes(type) && entity) {
    if (!(features & 1) || !(features & 16384)) {
      if (features & 16384 && entity.state !== 'playing')
        addService(
          { ...action('play', 'Riproduci', 'play'), frequent: true },
          'media_player',
          'media_play'
        );
      if (features & 1 && entity.state === 'playing')
        addService(
          { ...action('pause', 'Pausa', 'pause'), frequent: true },
          'media_player',
          'media_pause'
        );
    }
    if (
      features & 2 &&
      number(attrs.media_duration) !== null &&
      number(attrs.media_position) !== null
    )
      addService(
        range(
          'seek',
          'Posizione nel brano',
          Number(attrs.media_position),
          0,
          Number(attrs.media_duration),
          1,
          's'
        ),
        'media_player',
        'media_seek',
        entityId,
        (value) => ({ seek_position: value })
      );
    if (features & 32768)
      addService(
        toggle('shuffle', 'Riproduzione casuale', Boolean(attrs.shuffle), 'music'),
        'media_player',
        'shuffle_set',
        entityId,
        (value) => ({ shuffle: value })
      );
    if (features & 262144)
      addService(
        options('repeat', 'Ripetizione', text(attrs.repeat), ['off', 'one', 'all']),
        'media_player',
        'repeat_set',
        entityId,
        (value) => ({ repeat: value })
      );
    if (features & 65536 && strings(attrs.sound_mode_list).length)
      addService(
        options('sound', 'Modalità audio', text(attrs.sound_mode), strings(attrs.sound_mode_list)),
        'media_player',
        'select_sound_mode',
        entityId,
        (value) => ({ sound_mode: value })
      );
    if (features & 8192)
      addService(
        action('clear_queue', 'Svuota la coda', 'trash'),
        'media_player',
        'clear_playlist'
      );
    const players = strings(settings.mediaIds).filter((id) => Boolean(entities[id]));
    if (players.length > 1)
      add(
        {
          ...options('player', 'Lettore attivo', entityId, players),
          frequent: true,
          labels: Object.fromEntries(
            players.map((id) => [id, text(entities[id]?.attributes.friendly_name) || id])
          ),
        } as Capability,
        entityId,
        (value) => ({ calls: [], setting: { key: 'activeId', value } })
      );
    const peers = strings(settings.mediaIds).filter(
      (id) => id !== entityId && Boolean(entities[id])
    );
    if (features & 524288 && peers.length) {
      addService(
        {
          ...options(
            'group',
            'Aggiungi al gruppo',
            peers.find((id) => strings(attrs.group_members).includes(id)) ?? '',
            peers
          ),
          labels: Object.fromEntries(
            peers.map((id) => [id, text(entities[id]?.attributes.friendly_name) || id])
          ),
        } as Capability,
        'media_player',
        'join',
        entityId,
        (value) => ({ group_members: peers.includes(String(value)) ? [String(value)] : [] })
      );
      addService(action('ungroup', 'Separa dal gruppo', 'speaker'), 'media_player', 'unjoin');
    }
    const playable = input.content?.filter((item) => item.playable !== false) ?? [];
    if (features & 512 && playable.length)
      addService(
        {
          ...options(
            'content',
            'Contenuti',
            text(attrs.media_content_id),
            playable.map((item) => item.id)
          ),
          labels: Object.fromEntries(playable.map((item) => [item.id, item.label])),
        } as Capability,
        'media_player',
        'play_media',
        entityId,
        (value) => {
          const item = input.content?.find((candidate) => candidate.id === value);
          return { media_content_id: value, media_content_type: item?.type ?? 'music' };
        }
      );
    const folders = input.content?.filter((item) => item.expandable) ?? [];
    if (folders.length)
      add(
        {
          ...options(
            'browse',
            'Apri cartella',
            '',
            folders.map((item) => item.id)
          ),
          labels: Object.fromEntries(folders.map((item) => [item.id, item.label])),
        } as Capability,
        entityId,
        (value) => ({
          calls: [],
          setting: {
            key: 'adaptiveMediaBrowse',
            value: { id: value, type: folders.find((item) => item.id === value)?.type },
          },
        })
      );
    if (settings.adaptiveMediaBrowse)
      add(action('browse_home', 'Torna alla libreria', 'home'), entityId, () => ({
        calls: [],
        setting: { key: 'adaptiveMediaBrowse', value: null },
      }));
    if (type === 'sonos') {
      if (has('sonos', 'set_sleep_timer')) {
        add(
          range(
            'sleep',
            `Durata timer (${DEVICE_SCOPE_NOTE.toLowerCase()})`,
            Number(settings.sonosSleepMinutes ?? 30),
            5,
            120,
            5,
            'min'
          ),
          entityId,
          (value) => ({ calls: [], setting: { key: 'sonosSleepMinutes', value: Number(value) } })
        );
        addService(
          action('start_sleep', 'Imposta timer', 'clock'),
          'sonos',
          'set_sleep_timer',
          entityId,
          () => ({ sleep_time: Number(settings.sonosSleepMinutes ?? 30) * 60 })
        );
      }
      addService(action('clear_sleep', 'Annulla timer', 'clock'), 'sonos', 'clear_sleep_timer');
      addService(
        action('snapshot', 'Salva riproduzione', 'music'),
        'sonos',
        'snapshot',
        entityId,
        () => ({ with_group: true })
      );
      addService(
        action('restore', 'Ripristina riproduzione', 'music'),
        'sonos',
        'restore',
        entityId,
        () => ({ with_group: true })
      );
      if (input.queue?.length)
        addService(
          {
            ...options(
              'queue',
              'Coda Sonos',
              String(attrs.queue_position ?? ''),
              input.queue.map((item) => item.id)
            ),
            labels: Object.fromEntries(input.queue.map((item) => [item.id, item.label])),
          } as Capability,
          'sonos',
          'play_queue',
          entityId,
          (value) => ({ queue_position: Number(value) })
        );
      if (input.queue?.length)
        addService(
          {
            ...options(
              'remove_queue',
              'Rimuovi dalla coda',
              '',
              input.queue.map((item) => item.id)
            ),
            labels: Object.fromEntries(input.queue.map((item) => [item.id, item.label])),
          } as Capability,
          'sonos',
          'remove_from_queue',
          entityId,
          (value) => ({ queue_position: Number(value) })
        );
      for (const target of strings(settings.sonosAlarmIds)) {
        bind('alarm:' + target, 'Sveglia Sonos', target);
        const alarm = entities[target]?.attributes;
        const alarmId = number(alarm?.alarm_id);
        if (alarmId === null || !has('sonos', 'update_alarm')) continue;
        if (number(alarm?.volume) !== null)
          addService(
            range('alarm_volume:' + target, 'Volume sveglia', Number(alarm?.volume) * 100),
            'sonos',
            'update_alarm',
            entityId,
            (value) => ({ alarm_id: alarmId, volume: Number(value) / 100 })
          );
        if (/^\d{2}:\d{2}/.test(text(alarm?.time)))
          addService(
            {
              kind: 'input',
              inputType: 'time',
              id: 'alarm_time:' + target,
              label: 'Ora sveglia',
              initial: text(alarm?.time).slice(0, 5),
              frequent: false,
              icon: 'clock',
            },
            'sonos',
            'update_alarm',
            entityId,
            (value) => ({ alarm_id: alarmId, time: value })
          );
        if (typeof alarm?.include_linked_zones === 'boolean')
          addService(
            toggle('alarm_group:' + target, 'Sveglia nel gruppo', alarm.include_linked_zones),
            'sonos',
            'update_alarm',
            entityId,
            (value) => ({ alarm_id: alarmId, include_linked_zones: value })
          );
      }
    }
    const remote = text(settings.remoteId);
    if (['androidtv', 'appletv'].includes(type) && entities[remote]) {
      const labels = ['Su', 'Giù', 'Sinistra', 'Destra', 'Conferma', 'Indietro', 'Home TV'];
      const keys =
        type === 'androidtv'
          ? ['DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT', 'DPAD_CENTER', 'BACK', 'HOME']
          : ['up', 'down', 'left', 'right', 'select', 'menu', 'home'];
      keys.forEach((command, index) =>
        addService(
          action('remote:' + command, labels[index]!),
          'remote',
          'send_command',
          remote,
          () => ({ command })
        )
      );
    }
    history = { entityId, attribute: 'volume_level', factor: 100 };
  }
  if (['vacuum', 'mower'].includes(type) && entity) {
    if (type === 'vacuum') {
      for (const [id, bit, svc, label] of [
        ['stop', 8, 'stop', 'Ferma pulizia'],
        ['locate', 512, 'locate', 'Trova il robot'],
        ['spot', 1024, 'clean_spot', 'Pulizia localizzata'],
      ] as const)
        if (features & bit) addService(action(id, label), 'vacuum', svc);
      if (features & 32 && strings(attrs.fan_speed_list).length)
        addService(
          options(
            'fan',
            'Potenza aspirazione',
            text(attrs.fan_speed),
            strings(attrs.fan_speed_list)
          ),
          'vacuum',
          'set_fan_speed',
          entityId,
          (value) => ({ fan_speed: value })
        );
      const area = text(extensionIds.area);
      if (entities[area]) {
        bind('area', 'Area da pulire', area);
        // An integration select is not an HA area id. The native details retain the
        // mapped-area flow and its cleaning_area_id contract from the HA registry.
      }
    }
    for (const [id, label] of [
      ['mop', 'Intensità lavaggio'],
      ['maintenance', 'Manutenzione'],
      ['zone', 'Zona di taglio'],
      ['height', 'Altezza di taglio'],
    ] as const) {
      const target = text(extensionIds[id]);
      if (target) bind(id, label, target);
    }
    if (number(attrs.battery_level) !== null) history = { entityId, attribute: 'battery_level' };
  }
  if (type === 'sensor' && entity) {
    if (
      [
        'switch',
        'input_boolean',
        'automation',
        'number',
        'input_number',
        'select',
        'input_select',
        'button',
        'input_button',
        'script',
        'scene',
      ].includes(entityId.split('.')[0]!)
    ) {
      capabilities.splice(0);
      for (const key of Object.keys(values)) delete values[key];
      bind('control', text(attrs.friendly_name) || 'Comando', entityId);
    }
    for (const [id, target] of Object.entries(extensionIds))
      if (text(target)) bind(id, id, text(target));
    history = {
      entityId,
      ...(entityId.startsWith('binary_sensor.') ? { states: { on: 1, off: 0 } } : {}),
    };
    if (entityId.startsWith('sensor.'))
      add(
        options(
          'period',
          'Periodo del grafico',
          historyHours === 168 ? '7 giorni' : historyHours + ' ore',
          ['6 ore', '24 ore', '7 giorni']
        ),
        entityId,
        (value) => ({
          calls: [],
          setting: {
            key: 'adaptiveHistoryHours',
            value: value === '7 giorni' ? 168 : value === '6 ore' ? 6 : 24,
          },
        })
      );
  }

  if (type === 'car') {
    const car = readCarSettings(settings);
    addReading('battery', 'Batteria auto', car.ids.batteryId ?? entityId);
    if (car.ids.rangeId) addReading('range', 'Autonomia residua', car.ids.rangeId);
    else if (attrs.range !== undefined || attrs.battery_range !== undefined)
      add(reading('range', 'Autonomia residua', Number(attrs.range ?? attrs.battery_range), 'km'));
    for (const [index, target] of car.chargeControlIds.entries())
      bind(index === 0 ? 'charging' : 'charging:' + target, 'Ricarica', target);
    for (const [id, label, key] of [
      ['limit', 'Limite di ricarica', 'chargeLimitNumberId'],
      ['limit_select', 'Limite di ricarica', 'chargeLimitSelectId'],
      ['ignition', 'Motore', 'ignitionSwitchId'],
      ['update', 'Aggiorna veicolo', 'updateButtonId'],
    ] as const) {
      const target = car.ids[key];
      if (target) bind(id, label, target);
    }
    for (const [capId, targetId] of [
      ['climate', car.ids.climateId],
      ['locked', car.ids.lockId],
    ] as const) {
      const target = targetId && entities[targetId];
      if (!target || !targetId) continue;
      for (const cap of haEntityToCapabilities(target).capabilities) {
        if (
          (capId === 'climate' && !['power', 'target'].includes(cap.id)) ||
          (capId === 'locked' && cap.id !== 'locked')
        )
          continue;
        const id = capId === 'climate' && cap.id === 'target' ? 'target' : capId;
        const value = 'initial' in cap ? cap.initial : true;
        const call = resolveHaService(targetId, cap.id, value);
        if (call && has(call.domain, call.service))
          add(
            {
              ...cap,
              id,
              ...('unit' in cap
                ? {
                    unit:
                      text(target.attributes.temperature_unit) ||
                      input.haConfig?.unit_system?.temperature ||
                      '°C',
                  }
                : {}),
            },
            targetId,
            (next) => {
              const resolved = resolveHaService(targetId, cap.id, next);
              return resolved ? { calls: [resolved] } : null;
            }
          );
      }
    }
    for (const id of [
      'range',
      'odometer',
      'fuelLevel',
      'chargingPower',
      'chargeRate',
      'timeToFull',
      'chargeEndTime',
    ] as const) {
      const target = text(settings[id + 'Id']);
      if (target) addReading(id, id, target);
    }
    history = { entityId: car.ids.batteryId ?? entityId };
  }
  if (type === 'cost' || type === 'nordpool') {
    const requestedPeriod = text(settings.adaptivePeriod);
    const period =
      type === 'cost'
        ? requestedPeriod === 'Mese' && entities[text(settings.monthId)]
          ? 'Mese'
          : 'Giorno'
        : requestedPeriod === 'Domani' &&
            entities[text(settings.nordpoolId) || entityId]?.attributes.tomorrow_valid
          ? 'Domani'
          : 'Oggi';
    const chosen =
      type === 'cost'
        ? text(settings[period === 'Mese' ? 'monthId' : 'todayId']) || entityId
        : text(settings.nordpoolId) || entityId;
    addReading(
      type === 'cost' ? 'today' : 'price',
      type === 'cost' ? 'Costi energetici' : 'Prezzo attuale',
      chosen
    );
    const choices =
      type === 'cost'
        ? ['Giorno', 'Mese'].filter(
            (p) => p === 'Giorno' || Boolean(entities[text(settings.monthId)])
          )
        : [
            'Oggi',
            ...(Array.isArray(entities[chosen]?.attributes.raw_tomorrow) &&
            entities[chosen]?.attributes.tomorrow_valid
              ? ['Domani']
              : []),
          ];
    if (choices.length > 1)
      add(options('period', 'Periodo', period, choices), chosen, (value) => ({
        calls: [],
        setting: { key: 'adaptivePeriod', value },
      }));
    if (type === 'cost') {
      if (text(settings.monthId)) addReading('month', 'Questo mese', text(settings.monthId));
      if (text(settings.consumptionId))
        addReading('consumption', 'Consumo', text(settings.consumptionId));
    }
    history = { entityId: chosen };
    if (type === 'cost') historyHours = period === 'Mese' ? 720 : 24;
    else {
      const raw = entities[chosen]?.attributes[period === 'Domani' ? 'raw_tomorrow' : 'raw_today'];
      series = Array.isArray(raw)
        ? raw.flatMap((row) => {
            if (!row || typeof row !== 'object') return [];
            const entry = row as Record<string, unknown>;
            const time = new Date(String(entry.start));
            const value = number(entry.value);
            return value !== null && Number.isFinite(time.getTime()) ? [{ time, value }] : [];
          })
        : [];
      seriesLabel = period === 'Domani' ? 'Prezzi di domani' : 'Prezzi di oggi';
      if (period === 'Domani' && !series.length) {
        const cap = capabilities.find((candidate) => candidate.id === 'price');
        if (cap?.kind === 'reading') {
          cap.label = 'Prezzo medio previsto';
          cap.initial = '—';
          values.price = '—';
        }
      }
      if (series.length) {
        add(
          reading(
            'minimum',
            'Prezzo minimo',
            Math.min(...series.map((point) => point.value)),
            text(attrs.unit_of_measurement)
          )
        );
        if (period === 'Domani') {
          const cap = capabilities.find((candidate) => candidate.id === 'price');
          if (cap?.kind === 'reading') {
            cap.label = 'Prezzo medio previsto';
            cap.initial = series.reduce((total, point) => total + point.value, 0) / series.length;
            values.price = cap.initial;
          }
        }
      }
    }
  }
  if (type === 'alarm' && entity) {
    add(reading('state', 'Stato allarme', alarmStateLabel(entity.state)));
    if (!TRANSITION_STATES.has(entity.state) && !['unknown', 'unavailable'].includes(entity.state))
      for (const candidate of [
        ...availableArmActions(entity),
        ...(entity.state !== 'disarmed' ? [DISARM_ACTION] : []),
      ]) {
        if (has('alarm_control_panel', candidate.service))
          add({
            ...action(
              candidate.key,
              candidate.label,
              candidate.key === 'disarm' ? 'unlock' : 'shield'
            ),
            frequent: true,
          });
      }
    history = {
      entityId,
      states: {
        disarmed: 0,
        armed_home: 1,
        armed_away: 1,
        armed_night: 1,
        armed_vacation: 1,
        armed_custom_bypass: 1,
        triggered: 2,
      },
    };
  }
  if (type === 'camera' && entity) {
    add(reading('view', 'Videocamera', text(attrs.friendly_name) || entityId));
    add(
      toggle('stream', 'Vista in diretta', settings.cameraPaused !== true, 'camera'),
      entityId,
      (value) => ({ calls: [], setting: { key: 'cameraPaused', value: !value } })
    );
    if (has('camera', 'turn_on') && has('camera', 'turn_off') && features & 1)
      add(toggle('power', 'Accensione videocamera', attrs.is_on !== false), entityId, (value) =>
        service('camera', value ? 'turn_on' : 'turn_off', entityId)
      );
    if (
      features & 4 &&
      attrs.motion_detection_enabled !== undefined &&
      has('camera', 'enable_motion_detection') &&
      has('camera', 'disable_motion_detection')
    )
      add(
        toggle(
          'motion',
          'Rilevamento movimento',
          Boolean(attrs.motion_detection_enabled),
          'activity'
        ),
        entityId,
        (value) =>
          service(
            'camera',
            value ? 'enable_motion_detection' : 'disable_motion_detection',
            entityId
          )
      );
    const directory = text(settings.cameraCaptureDirectory).trim();
    const validDirectory =
      directory.startsWith('/') &&
      !directory.split('/').includes('..') &&
      !directory.startsWith('/config/www') &&
      !directory.startsWith('/www');
    for (const [id, label, ext] of [
      ['snapshot', 'Scatta una foto', 'jpg'],
      ['record', 'Registra un video', 'mp4'],
    ] as const) {
      if (!validDirectory) {
        unavailable.push(label + ': configura una cartella privata autorizzata in Home Assistant');
        continue;
      }
      if (id === 'record' && !(features & 2)) continue;
      addService(action(id, label, 'camera'), 'camera', id, entityId, () => ({
        filename:
          directory.replace(/\/$/, '') +
          '/' +
          entityId.replace(/[^a-zA-Z0-9_-]/g, '_') +
          '-' +
          Date.now() +
          '.' +
          ext,
        ...(id === 'record'
          ? {
              duration: Math.max(1, Math.min(3600, Number(settings.cameraRecordDuration) || 30)),
              lookback: 0,
            }
          : {}),
      }));
    }
    const players = strings(settings.cameraCastIds).filter((target) => Boolean(entities[target]));
    if (players.length && features & 2)
      addService(
        {
          ...options('cast', 'Invia lo stream', '', players),
          labels: Object.fromEntries(
            players.map((id) => [id, text(entities[id]?.attributes.friendly_name) || id])
          ),
        } as Capability,
        'camera',
        'play_stream',
        entityId,
        (value) => ({ media_player: value, format: 'hls' })
      );
    if (has('onvif', 'ptz') && settings.cameraPtz === true)
      for (const [id, label, axis, direction] of [
        ['ptz_left', 'Ruota a sinistra', 'pan', 'LEFT'],
        ['ptz_right', 'Ruota a destra', 'pan', 'RIGHT'],
        ['ptz_up', 'Ruota in alto', 'tilt', 'UP'],
        ['ptz_down', 'Ruota in basso', 'tilt', 'DOWN'],
        ['ptz_in', 'Avvicina', 'zoom', 'ZOOM_IN'],
        ['ptz_out', 'Allontana', 'zoom', 'ZOOM_OUT'],
      ] as const)
        addService(action(id, label), 'onvif', 'ptz', entityId, () => ({
          [axis]: direction,
          move_mode: 'RelativeMove',
          distance: 0.1,
          speed: 0.5,
        }));
    const motion = text(settings.cameraMotionSensor);
    if (entities[motion])
      history = { entityId: motion, states: { on: 1, off: 0, detected: 1, clear: 0 } };
  }
  if (type === 'room') {
    const availableEntities = Object.fromEntries(
      Object.entries(entities).filter(
        ([, current]) => !['unknown', 'unavailable'].includes(current.state)
      )
    );
    const room = roomSummary(availableEntities, settings, input.haConfig ?? null);
    if (room.temperature !== null)
      add(reading('temperature', 'Temperatura ambiente', room.temperature, room.temperatureUnit));
    const motionId =
      text(settings.motionEntityId) ||
      room.ids.find((target) =>
        ['motion', 'occupancy', 'presence'].includes(
          text(availableEntities[target]?.attributes.device_class)
        )
      );
    if (motionId && availableEntities[motionId])
      add(
        reading(
          'presence',
          'Presenza',
          availableEntities[motionId]?.state === 'on' ? room.occupancyLabel : 'Libera'
        ),
        motionId
      );
    const lights = room.lightIds.filter(
      (target) => !['unknown', 'unavailable'].includes(entities[target]?.state ?? 'unknown')
    );
    if (lights.length && has('light', 'turn_on') && has('light', 'turn_off'))
      add(
        toggle('lights', 'Luci della stanza', room.lightsOn > 0, 'light'),
        lights[0],
        (value) => ({
          calls: [
            {
              domain: 'light',
              service: value ? 'turn_on' : 'turn_off',
              data: { entity_id: lights },
            },
          ],
        })
      );
    const climateId =
      text(settings.climateEntityId) ||
      room.ids.find((target) => target.startsWith('climate.')) ||
      '';
    const climate = availableEntities[climateId];
    if (climate)
      for (const cap of haEntityToCapabilities(climate).capabilities.filter((cap) =>
        ['target', 'power'].includes(cap.id)
      )) {
        const id = cap.id === 'power' ? 'climate' : 'target';
        const call = resolveHaService(climateId, cap.id, 'initial' in cap ? cap.initial : true);
        if (call && has(call.domain, call.service))
          add(
            {
              ...cap,
              id,
              ...('unit' in cap
                ? {
                    unit:
                      text(climate.attributes.temperature_unit) ||
                      input.haConfig?.unit_system?.temperature ||
                      '°C',
                  }
                : {}),
            },
            climateId,
            (value) => {
              const resolved = resolveHaService(climateId, cap.id, value);
              return resolved ? { calls: [resolved] } : null;
            }
          );
      }
    const dimmers = lights.filter((target) =>
      haEntityToCapabilities(entities[target]).capabilities.some((cap) => cap.id === 'brightness')
    );
    if (dimmers.length && has('light', 'turn_on'))
      add(
        range(
          'brightness',
          'Luminosità della stanza',
          Math.round(
            (dimmers.reduce(
              (total, target) => total + Number(entities[target]?.attributes.brightness ?? 0),
              0
            ) /
              dimmers.length /
              255) *
              100
          )
        ),
        dimmers[0],
        (value) => ({
          calls: [
            {
              domain: 'light',
              service: 'turn_on',
              data: { entity_id: dimmers, brightness_pct: value },
            },
          ],
        })
      );
    const switches = room.ids.filter(
      (target) =>
        ['light', 'fan', 'climate', 'switch', 'media_player'].includes(target.split('.')[0]!) &&
        has(target.split('.')[0]!, 'turn_off') &&
        (target.startsWith('fan.')
          ? Boolean(getFeatures(entities[target]) & 16)
          : target.startsWith('climate.')
            ? Boolean(getFeatures(entities[target]) & 128)
            : target.startsWith('media_player.')
              ? Boolean(getFeatures(entities[target]) & 256)
              : true) &&
        !['unknown', 'unavailable'].includes(entities[target]?.state ?? 'unknown')
    );
    if (switches.length)
      add(action('all_off', 'Spegni i dispositivi della stanza', 'power'), switches[0], () => ({
        calls: switches.map((target) => ({
          domain: target.split('.')[0]!,
          service: 'turn_off',
          data: { entity_id: target },
        })),
      }));
    const temp =
      text(settings.tempEntityId) ||
      room.ids.find((target) => entities[target]?.attributes.device_class === 'temperature');
    if (temp) history = { entityId: temp };
    const humidity = room.ids.find(
      (target) => entities[target]?.attributes.device_class === 'humidity'
    );
    if (humidity) addReading('humidity', 'Umidità', humidity);
  }
  if (type === 'todo' && entity)
    add(reading('count', 'Attività da completare', number(entity.state) ?? '—'));
  if (type === 'spacer') {
    add(
      options(
        'style',
        'Aspetto del separatore',
        settings.variant === 'spacer' ? 'Spazio' : 'Linea',
        ['Linea', 'Spazio']
      ),
      '',
      (value) => ({
        calls: [],
        setting: { key: 'variant', value: value === 'Spazio' ? 'spacer' : 'divider' },
      })
    );
    add(
      range('spacing', 'Spazio tra gruppi', Number(settings.adaptiveSpacing ?? 32), 8, 80, 4, 'px'),
      '',
      (value) => ({ calls: [], setting: { key: 'adaptiveSpacing', value: Number(value) } })
    );
  }

  const actionStates: Record<string, readonly string[]> =
    type === 'vacuum'
      ? {
          start: ['cleaning'],
          pause: ['paused'],
          dock: ['returning', 'docked'],
          stop: ['idle', 'docked'],
        }
      : type === 'mower'
        ? { start: ['mowing'], pause: ['paused'], dock: ['returning', 'docked'] }
        : type === 'cover'
          ? { open: ['open'], close: ['closed'] }
          : {};
  for (const cap of capabilities)
    if (cap.kind === 'action' && actionStates[cap.id])
      values[cap.id] = actionStates[cap.id]!.includes(entities[targets[cap.id]!]?.state ?? '');
  return {
    capabilities,
    values,
    targets,
    history,
    series,
    seriesLabel,
    historyHours,
    unavailable,
    execute: (id, value, current) => {
      const cap = capabilities.find((candidate) => candidate.id === id);
      if (
        !cap ||
        (cap.kind === 'input' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))) ||
        (cap.kind === 'options' && !cap.options.includes(String(value))) ||
        (cap.kind === 'range' &&
          (!Number.isFinite(Number(value)) || Number(value) < cap.min || Number(value) > cap.max))
      )
        return null;
      const operation = commands.get(id)?.(value, current) ?? null;
      if (
        operation?.calls.some(
          (call) =>
            !has(call.domain, call.service) ||
            (call.data.entity_id &&
              (typeof call.data.entity_id === 'string'
                ? [call.data.entity_id]
                : strings(call.data.entity_id)
              ).some(
                (target) =>
                  !entities[target] ||
                  entities[target]?.state === 'unavailable' ||
                  (entities[target]?.state === 'unknown' &&
                    !['button', 'input_button', 'scene'].includes(target.split('.')[0]!))
              ))
        )
      )
        return null;
      if (operation && cap.kind === 'action' && actionStates[id]) operation.confirmation = true;
      if (
        operation &&
        (id === 'cast' ||
          id === 'remove_queue' ||
          (id === 'queue' && attrs.queue_position === undefined))
      )
        operation.acknowledgementOnly = true;
      if (type === 'light' && operation)
        for (const call of operation.calls)
          if (call.service === 'turn_on' && Number(settings.lightTransition) > 0)
            call.data.transition = Number(settings.lightTransition);
      return operation;
    },
  };
}

export function readControlPreference(settings: CardSettings, capabilities: readonly Capability[]) {
  const raw =
    settings.adaptiveControls && typeof settings.adaptiveControls === 'object'
      ? settings.adaptiveControls
      : null;
  const ids = capabilities.map((cap) => cap.id);
  const order = [...new Set([...strings(raw?.order).filter((id) => ids.includes(id)), ...ids])];
  const visible =
    raw && Array.isArray(raw.visible)
      ? strings(raw.visible).filter((id) => ids.includes(id))
      : capabilities.filter((cap) => cap.frequent).map((cap) => cap.id);
  return { order, visible };
}
