import type { IconName } from '@/components/primitives';

interface Base {
  id: string;
  label: string;
  icon: IconName;
  frequent: boolean;
}
export type Capability = Base &
  (
    | { kind: 'reading'; initial: string | number; unit?: string }
    | {
        kind: 'range';
        initial: number;
        min: number;
        max: number;
        step: number;
        unit: string;
        colour?: 'hue' | 'white';
      }
    | { kind: 'toggle'; initial: boolean; on: string; off: string }
    | { kind: 'input'; initial: string; inputType: 'time' }
    | {
        kind: 'options';
        initial: string;
        options: readonly string[];
        labels?: Readonly<Record<string, string>>;
      }
    | { kind: 'action'; message: string; update?: { id: string; value: string | number | boolean } }
    | { kind: 'list'; initial: readonly Task[] }
  );
export interface Task {
  id: number;
  label: string;
  done: boolean;
}
export type SampleValue = string | number | boolean | readonly Task[];
export type SampleValues = Record<string, SampleValue>;
export interface DeviceProfile {
  id: string;
  label: string;
  capabilities: readonly Capability[];
}
export interface WidgetPreference {
  deviceId: string;
  visible: readonly string[];
  order: readonly string[];
}
export type SampleStatus = 'available' | 'unavailable' | 'pending' | 'error';

const reading = (
  id: string,
  label: string,
  initial: string | number,
  unit = '',
  frequent = true
): Capability => ({ id, label, initial, unit, kind: 'reading', icon: 'activity', frequent });
const range = (
  id: string,
  label: string,
  icon: IconName,
  initial: number,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  frequent = false,
  colour?: 'hue' | 'white'
): Capability => ({
  id,
  label,
  icon,
  initial,
  min,
  max,
  step,
  unit,
  frequent,
  colour,
  kind: 'range',
});
const toggle = (
  id: string,
  label: string,
  icon: IconName,
  initial = true,
  frequent = false,
  on = 'Acceso',
  off = 'Spento'
): Capability => ({ id, label, icon, initial, frequent, on, off, kind: 'toggle' });
const options = (
  id: string,
  label: string,
  names: readonly string[],
  frequent = false
): Capability => ({
  id,
  label,
  icon: 'settings',
  initial: names[0]!,
  options: names,
  frequent,
  kind: 'options',
});
const action = (
  id: string,
  label: string,
  icon: IconName,
  message: string,
  frequent = false,
  update?: { id: string; value: string | number | boolean }
): Capability => ({ id, label, icon, message, frequent, update, kind: 'action' });

const media: readonly Capability[] = [
  reading('track', 'Brano', 'Una mattina tranquilla'),
  toggle('playing', 'Riproduzione', 'play', true, true, 'In riproduzione', 'In pausa'),
  range('volume', 'Volume', 'volume', 65, 0, 100, 1, '%', true),
  action('previous', 'Brano precedente', 'previous', 'Brano precedente', true, {
    id: 'track',
    value: 'Piano in salotto',
  }),
  action('next', 'Brano successivo', 'next', 'Brano successivo', true, {
    id: 'track',
    value: 'Luce del giorno',
  }),
  action('stop', 'Ferma la riproduzione', 'stop', 'Riproduzione fermata', false, {
    id: 'playing',
    value: false,
  }),
  toggle('mute', 'Audio silenziato', 'mute', false),
  range('seek', 'Posizione nel brano', 'clock', 82, 0, 240, 1, 's'),
  toggle('shuffle', 'Riproduzione casuale', 'music', false),
  options('repeat', 'Ripetizione', ['Nessuna', 'Brano', 'Tutti']),
  options('source', 'Sorgente', ['Musica', 'Radio', 'Ingresso audio']),
  options('sound', 'Modalità audio', ['Normale', 'Cinema', 'Notte']),
  options('content', 'Contenuti', [
    'Una mattina tranquilla',
    'Luce del giorno',
    'Piano in salotto',
  ]),
  options('group', 'Gruppo di lettori', ['Solo soggiorno', 'Soggiorno e cucina']),
  action('ungroup', 'Separa dal gruppo', 'speaker', 'Gruppo separato', false, {
    id: 'group',
    value: 'Solo soggiorno',
  }),
  action('clear_queue', 'Svuota la coda', 'trash', 'Coda svuotata'),
];
const tv: readonly Capability[] = [
  reading('programme', 'Contenuto', 'Un documentario sulla natura'),
  toggle('power', 'Accensione TV', 'power', true, true),
  toggle('playing', 'Riproduzione TV', 'play', true, true, 'In riproduzione', 'In pausa'),
  range('volume', 'Volume TV', 'volume', 35, 0, 100, 1, '%', true),
  toggle('mute', 'Audio silenziato', 'mute', false),
  options('source', 'Sorgente o app', ['TV', 'Cinema', 'Musica']),
  ...(['chevronUp', 'chevronDown', 'chevronLeft', 'chevronRight'] as const).map((icon, index) =>
    action(
      `direction_${index}`,
      ['Su', 'Giù', 'Sinistra', 'Destra'][index]!,
      icon,
      'Navigazione del telecomando'
    )
  ),
  action('ok', 'Conferma', 'done', 'Selezione confermata'),
  action('back', 'Indietro', 'chevronLeft', 'Indietro'),
  action('home', 'Home TV', 'home', 'Schermata principale'),
  action('stop', 'Ferma la TV', 'stop', 'Riproduzione fermata', false, {
    id: 'playing',
    value: false,
  }),
];

export const widgetCapabilities: Readonly<Record<string, readonly Capability[]>> = {
  light: [
    range('brightness', 'Luminosità della luce', 'light', 65, 0, 100, 1, '%', true),
    range('hue', 'Colore della luce', 'appearance', 250, 0, 360, 1, '°', true, 'hue'),
    toggle('power', 'Accensione luce', 'power', true, true),
    range('saturation', 'Saturazione', 'appearance', 100),
    range('white', 'Temperatura del bianco', 'sun', 3500, 2200, 6500, 100, 'K', false, 'white'),
    options('effect', 'Effetto', ['Nessuno', 'Respiro', 'Colore dinamico']),
    range('transition', 'Durata transizione', 'clock', 1, 0, 10, 0.5, 's'),
  ],
  climate: [
    range('target', 'Temperatura desiderata', 'thermostat', 25, 16, 30, 0.5, '°C', true),
    reading('temperature', 'Temperatura in casa', 22, '°C'),
    toggle('power', 'Accensione clima', 'power', true, true),
    options('hvac', 'Modalità clima', ['Auto', 'Caldo', 'Freddo', 'Ventola', 'Deumidifica'], true),
    options('preset', 'Preset', ['Comfort', 'Eco', 'Assente']),
    options('fan', 'Ventola', ['Auto', 'Bassa', 'Media', 'Alta']),
    options('swing', 'Oscillazione verticale', ['Ferma', 'Oscillante']),
    options('horizontal', 'Oscillazione orizzontale', ['Ferma', 'Oscillante']),
    range('humidity', 'Umidità desiderata', 'humidity', 45, 30, 70, 1, '%'),
    range('target_low', 'Temperatura minima', 'thermostat', 19, 16, 24, 0.5, '°C'),
    range('target_high', 'Temperatura massima', 'thermostat', 26, 24, 30, 0.5, '°C'),
  ],
  fan: [
    range('speed', 'Velocità del ventilatore', 'fan', 65, 0, 100, 1, '%', true),
    toggle('power', 'Accensione ventilatore', 'power', true, true),
    toggle('oscillation', 'Oscillazione', 'fan', false),
    options('direction', 'Direzione', ['Avanti', 'Indietro']),
    options('preset', 'Modalità', ['Normale', 'Notte', 'Naturale']),
  ],
  cover: [
    range('position', 'Apertura tapparella', 'blinds', 65, 0, 100, 1, '%', true),
    action('open', 'Apri tapparella', 'chevronUp', 'Tapparella aperta', true, {
      id: 'position',
      value: 100,
    }),
    action('stop', 'Ferma tapparella', 'stop', 'Tapparella fermata', true),
    action('close', 'Chiudi tapparella', 'chevronDown', 'Tapparella chiusa', true, {
      id: 'position',
      value: 0,
    }),
    range('tilt', 'Inclinazione lamelle', 'blinds', 50),
    action('tilt_open', 'Apri lamelle', 'chevronUp', 'Lamelle aperte', false, {
      id: 'tilt',
      value: 100,
    }),
    action('tilt_close', 'Chiudi lamelle', 'chevronDown', 'Lamelle chiuse', false, {
      id: 'tilt',
      value: 0,
    }),
    action('tilt_stop', 'Ferma lamelle', 'stop', 'Lamelle ferme'),
  ],
  lock: [
    toggle('locked', 'Serratura', 'lock', true, true, 'Bloccata', 'Sbloccata'),
    action('open', 'Apri lo scrocco', 'unlock', 'Scrocco aperto', false, {
      id: 'locked',
      value: false,
    }),
    reading('battery', 'Batteria', 86, '%'),
  ],
  alarm: [
    reading('state', 'Stato allarme', 'Disattivato'),
    options(
      'arming',
      'Modalità allarme',
      ['Disattivato', 'In casa', 'Fuori casa', 'Notte', 'Vacanza', 'Esclusione zone'],
      true
    ),
    action('disarm', 'Disattiva allarme', 'shield', 'Allarme disattivato', true, {
      id: 'arming',
      value: 'Disattivato',
    }),
    action('trigger', 'Simula allarme scattato', 'warning', 'Allarme scattato', false, {
      id: 'state',
      value: 'Scattato',
    }),
  ],
  camera: [
    reading('view', 'Vista videocamera', 'Ingresso'),
    toggle('stream', 'Vista in diretta', 'camera', true, true, 'In diretta', 'In pausa'),
    toggle('power', 'Accensione videocamera', 'power'),
    toggle('motion', 'Rilevamento movimento', 'activity', true),
    action('snapshot', 'Scatta una foto', 'camera', 'Foto simulata acquisita'),
    action('record', 'Registra un video', 'camera', 'Registrazione simulata avviata'),
    options('cast', 'Invia lo stream', ['Nessuno', 'TV soggiorno']),
    action('ptz_left', 'Ruota a sinistra', 'chevronLeft', 'Camera ruotata a sinistra'),
    action('ptz_right', 'Ruota a destra', 'chevronRight', 'Camera ruotata a destra'),
  ],
  media,
  sonos: [
    ...media,
    range('sleep', 'Timer spegnimento', 'clock', 0, 0, 120, 5, 'min'),
    options('queue', 'Coda Sonos', ['Brano 1', 'Brano 2', 'Brano 3']),
    toggle('alarm', 'Sveglia Sonos', 'bell', false),
    action('snapshot', 'Salva riproduzione', 'music', 'Riproduzione salvata'),
    action('restore', 'Ripristina riproduzione', 'music', 'Riproduzione ripristinata'),
  ],
  androidtv: tv,
  appletv: tv,
  vacuum: [
    reading('state', 'Stato robot', 'Alla base'),
    action('start', 'Avvia pulizia', 'play', 'Pulizia avviata', true, {
      id: 'state',
      value: 'Pulizia in corso',
    }),
    action('pause', 'Pausa pulizia', 'pause', 'Pulizia sospesa', true, {
      id: 'state',
      value: 'In pausa',
    }),
    action('dock', 'Torna alla base', 'home', 'Ritorno alla base', true, {
      id: 'state',
      value: 'Ritorno alla base',
    }),
    action('stop', 'Ferma pulizia', 'stop', 'Pulizia fermata', false, {
      id: 'state',
      value: 'Fermo',
    }),
    reading('battery', 'Batteria', 78, '%'),
    options('fan', 'Potenza aspirazione', ['Normale', 'Silenziosa', 'Turbo']),
    action('locate', 'Trova il robot', 'bell', 'Segnale sonoro simulato'),
    options('area', 'Area da pulire', ['Tutta la casa', 'Soggiorno', 'Cucina']),
    action('clean_area', 'Pulisci area scelta', 'room', 'Pulizia area avviata', false, {
      id: 'state',
      value: 'Pulizia area in corso',
    }),
    action('spot', 'Pulizia localizzata', 'vacuum', 'Pulizia localizzata avviata'),
    range('mop', 'Intensità lavaggio', 'humidity', 50),
    action('maintenance', 'Manutenzione', 'settings', 'Controllo manutenzione simulato'),
  ],
  mower: [
    reading('state', 'Stato tosaerba', 'Alla base'),
    action('start', 'Avvia taglio', 'play', 'Taglio avviato', true, {
      id: 'state',
      value: 'Taglio in corso',
    }),
    action('pause', 'Pausa taglio', 'pause', 'Taglio sospeso', true, {
      id: 'state',
      value: 'In pausa',
    }),
    action('dock', 'Torna alla base', 'home', 'Ritorno alla base', true, {
      id: 'state',
      value: 'Ritorno alla base',
    }),
    action('stop', 'Ferma taglio', 'stop', 'Taglio fermato', false, {
      id: 'state',
      value: 'Fermo',
    }),
    reading('battery', 'Batteria', 78, '%'),
    options('zone', 'Zona di taglio', ['Tutto il giardino', 'Prato anteriore', 'Prato posteriore']),
    range('height', 'Altezza di taglio', 'mower', 40, 20, 60, 5, 'mm'),
  ],
  car: [
    reading('range', 'Autonomia residua', 284, 'km'),
    reading('battery', 'Batteria', 65, '%'),
    toggle('charging', 'Ricarica', 'energy', true, true, 'Attiva', 'Ferma'),
    range('limit', 'Limite di ricarica', 'battery', 80, 50, 100, 5, '%'),
    toggle('climate', 'Clima auto', 'thermostat', false),
    range('target', 'Temperatura auto', 'thermostat', 21, 16, 30, 0.5, '°C'),
    toggle('locked', 'Serratura auto', 'lock', true, false, 'Bloccata', 'Sbloccata'),
    toggle('ignition', 'Motore', 'key', false),
    action('update', 'Aggiorna veicolo', 'refresh', 'Dati simulati aggiornati'),
  ],
  room: [
    reading('temperature', 'Temperatura soggiorno', 22.4, '°C'),
    reading('humidity', 'Umidità', 46, '%'),
    reading('presence', 'Presenza', 'Occupato'),
    toggle('lights', 'Luci della stanza', 'light', true, true),
    toggle('climate', 'Clima della stanza', 'thermostat', true, true),
    range('target', 'Temperatura desiderata', 'thermostat', 22, 16, 30, 0.5, '°C'),
    range('brightness', 'Luminosità della stanza', 'light', 60),
    action('all_off', 'Spegni la stanza', 'power', 'Comando collettivo simulato', false, {
      id: 'lights',
      value: false,
    }),
  ],
  sensor: [
    reading('temperature', 'Temperatura soggiorno', 21.8, '°C'),
    reading('humidity', 'Umidità', 48, '%'),
    options('period', 'Periodo del grafico', ['6 ore', '24 ore', '7 giorni']),
    toggle('switch', 'Interruttore associato', 'power', false, false),
    action('button', 'Premi pulsante associato', 'play', 'Pulsante attivato'),
    action('script', 'Esegui script associato', 'play', 'Script simulato eseguito'),
    options('select', 'Selezione associata', ['Opzione 1', 'Opzione 2']),
    range('number', 'Valore numerico associato', 'activity', 5, 0, 10, 1, ''),
  ],
  todo: [
    {
      id: 'tasks',
      label: 'Attività',
      icon: 'task',
      frequent: true,
      kind: 'list',
      initial: [
        { id: 1, label: 'Controllare le luci esterne', done: false },
        { id: 2, label: 'Annaffiare le piante', done: true },
        { id: 3, label: 'Preparare la sala', done: false },
      ],
    },
  ],
  cost: [
    reading('today', 'Costo di oggi', '2,84', '€'),
    reading('month', 'Questo mese', '48,20', '€'),
    reading('consumption', 'Consumo di oggi', '8,4', 'kWh'),
    options('period', 'Periodo', ['Giorno', 'Mese'], true),
  ],
  nordpool: [
    reading('price', 'Prezzo attuale', '0,18', '€/kWh'),
    reading('minimum', 'Prezzo minimo', '0,12', '€/kWh'),
    reading('slot', 'Fascia conveniente', '14:00 – 16:00'),
    options('period', 'Periodo prezzi', ['Oggi', 'Domani']),
  ],
  spacer: [
    options('style', 'Aspetto del separatore', ['Linea', 'Spazio'], true),
    range('spacing', 'Spazio tra gruppi', 'minus', 32, 8, 80, 4, 'px', true),
  ],
};

export function profilesFor(type: string): readonly DeviceProfile[] {
  const capabilities = widgetCapabilities[type] ?? [];
  if (type === 'light')
    return [
      { id: 'rgb', label: 'Lampada soggiorno · colore e bianco', capabilities },
      {
        id: 'white',
        label: 'Lampada studio · bianco regolabile',
        capabilities: capabilities.filter((item) =>
          ['brightness', 'power', 'white', 'transition'].includes(item.id)
        ),
      },
      {
        id: 'basic',
        label: 'Lampada ingresso · solo accensione',
        capabilities: capabilities.filter((item) => item.id === 'power'),
      },
    ];
  if (['cost', 'nordpool', 'spacer', 'todo'].includes(type))
    return [
      {
        id: 'sample',
        label: type === 'spacer' ? 'Separatore della pagina' : 'Sorgente di esempio',
        capabilities,
      },
    ];
  return [
    { id: 'full', label: 'Dispositivo completo · simulato', capabilities },
    {
      id: 'basic',
      label: 'Dispositivo essenziale · simulato',
      capabilities: capabilities.filter((item) => item.frequent),
    },
  ];
}
export function initialPreference(device: DeviceProfile): WidgetPreference {
  return {
    deviceId: device.id,
    visible: device.capabilities.filter((item) => item.frequent).map((item) => item.id),
    order: device.capabilities.map((item) => item.id),
  };
}
export function preferenceForDevice(
  preference: WidgetPreference,
  device: DeviceProfile
): WidgetPreference {
  const ids = device.capabilities.map((item) => item.id);
  return {
    deviceId: device.id,
    visible: preference.visible.filter((id) => ids.includes(id)),
    order: [
      ...preference.order.filter((id) => ids.includes(id)),
      ...ids.filter((id) => !preference.order.includes(id)),
    ],
  };
}
export function valuesFor(device: DeviceProfile, previous: SampleValues = {}): SampleValues {
  return Object.fromEntries(
    device.capabilities
      .filter((item) => item.kind !== 'action')
      .map((item) => {
        const value = previous[item.id] ?? ('initial' in item ? item.initial : '');
        return [item.id, item.kind === 'range' ? normalizedValue(item, Number(value)) : value];
      })
  );
}
export function normalizedValue(
  capability: Extract<Capability, { kind: 'range' }>,
  value: number
): number {
  const bounded =
    capability.colour === 'hue'
      ? ((value % 360) + 360) % 360
      : Math.min(capability.max, Math.max(capability.min, value));
  const rounded = Number(
    (
      Math.round((bounded - capability.min) / capability.step) * capability.step +
      capability.min
    ).toFixed(3)
  );
  return capability.colour === 'hue'
    ? rounded % 360
    : Math.min(capability.max, Math.max(capability.min, rounded));
}
export function visibleCapacity(width: number, height: number): number {
  if (width < 260 || height < 240) return 1;
  if (height < 450) return width < 500 ? 4 : 6;
  if (width < 500) return 6;
  return 10;
}
