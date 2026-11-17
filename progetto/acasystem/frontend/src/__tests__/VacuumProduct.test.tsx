import type { CardSettings } from '@/@types/dashboard';
import { useState } from 'react';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VacuumWidget } from '@/components/widgets/utilities/robots/RobotWidget';
import { VacuumDetails } from '@/components/widgets/utilities/robots/VacuumDetails';
import { VacuumConsole } from '@/components/widgets/utilities/robots/VacuumConsole';
import { ProductVacuumControls } from '@/components/widgets/home/vacuum/ProductVacuumControls';
import {
  productVacuumView,
  vacuumProductBinding,
  vacuumActionSupported,
  PRODUCT_VACUUM_FEATURE,
  vacuumMapUrl,
} from '@/components/widgets/home/vacuum/productVacuumModel';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';
import { CommandResultError } from '@/api/commandApi';

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'vacuum',
  deviceId: 'robot',
  primaryEntityId: 'vacuum.main',
  channelEntityIds: ['vacuum.main'],
  secondaryEntityIds: [],
};
const settings: CardSettings = {
  bindingEntityId: 'vacuum.main',
  productDevice: binding,
  name: 'Robot',
};
const services = {
  vacuum: Object.fromEntries(Object.keys(PRODUCT_VACUUM_FEATURE).map((key) => [key, {}])),
  script: { turn_on: {} },
  select: { select_option: {} },
  number: { set_value: {} },
  input_number: { set_value: {} },
  button: { press: {} },
};
const robot = (state = 'docked', patch: Record<string, unknown> = {}, id = 'vacuum.main') =>
  fixtureEntity(id, state, {
    friendly_name: id === 'vacuum.main' ? 'Principale' : 'Secondario',
    supported_features: 26300,
    fan_speed: 'Normal',
    fan_speed_list: ['Quiet', 'Normal', 'Turbo'],
    battery_level: 73,
    ...patch,
  });
const runtime = (state = 'docked', patch: Record<string, unknown> = {}) => ({
  entities: fixtureEntities([robot(state, patch)]),
  conn: fakeConnection().conn,
  services,
});
const home = (current = settings, editMode = false) => (
  <VacuumWidget
    id="vacuum.widget"
    settingsKey="home::vacuum"
    settings={current}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
const details = (current = settings) => (
  <VacuumDetails
    id="vacuum.widget"
    settingsKey="home::vacuum"
    settings={current}
    onClose={() => undefined}
  />
);
const controls = () => <ProductVacuumControls entityId="vacuum.main" label="Principale" />;
const dataUrl =
  'data:image/svg+xml,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('Aspirapolvere prodotto: identità e capacità HA 2026.10.4', () => {
  it('richiede binding v1 con primary coerente e non converte i vecchi widget', () => {
    expect(vacuumProductBinding(settings)).toEqual(binding);
    expect(vacuumProductBinding({ bindingEntityId: 'vacuum.main' })).toBeNull();
    expect(vacuumProductBinding({ ...settings, bindingEntityId: 'vacuum.other' })).toBeNull();
    expect(
      vacuumProductBinding({ ...settings, productDevice: { ...binding, family: 'mower' } })
    ).toBeNull();
  });
  it.each(['unknown', 'unavailable', '', '__proto__', 'constructor', 'toString'])(
    '%s resta non disponibile senza stato fittizio',
    (state) => {
      expect(productVacuumView(robot(state)).available).toBe(false);
      expect(productVacuumView(robot(state)).stateLabel).toBe('Non disponibile');
    }
  );
  it.each([
    ['cleaning', 'Pulizia in corso'],
    ['docked', 'Alla base'],
    ['idle', 'Inattivo'],
    ['paused', 'In pausa'],
    ['returning', 'Ritorno alla base'],
    ['error', 'Richiede attenzione'],
  ])('distingue %s', (state, label) => {
    expect(productVacuumView(robot(state)).stateLabel).toBe(label);
    expect(productVacuumView(robot(state)).available).toBe(true);
  });
  it.each(Object.entries(PRODUCT_VACUUM_FEATURE))(
    '%s richiede esattamente bit%s e servizio',
    (service, feature) => {
      const key = service as keyof typeof PRODUCT_VACUUM_FEATURE;
      expect(
        vacuumActionSupported(
          productVacuumView(robot('idle', { supported_features: feature })),
          services,
          key
        )
      ).toBe(true);
      expect(
        vacuumActionSupported(
          productVacuumView(robot('idle', { supported_features: 0 })),
          services,
          key
        )
      ).toBe(false);
      expect(
        vacuumActionSupported(
          productVacuumView(robot('idle', { supported_features: feature })),
          {},
          key
        )
      ).toBe(false);
    }
  );
  it('bit deprecati TURN_ON/OFF non consentono avvio né altri fallback', () => {
    const view = productVacuumView(robot('idle', { supported_features: 3 }));
    expect(vacuumActionSupported(view, services, 'start')).toBe(false);
  });
  it('aspirazione resta stringa di fan_speed_list, senza percentuali inventate', () => {
    const view = productVacuumView(
      robot('idle', { fan_speed_list: ['Quiet', 'Normal', 'Turbo', '', 33, 'Quiet'] })
    );
    expect(view.speeds).toEqual(['Quiet', 'Normal', 'Turbo']);
    expect(view.fanSpeed).toBe('Normal');
  });
  it.each([undefined, NaN, Infinity, -1, 101, '73'])(
    'batteria %s non diventa un valore fittizio',
    (value) => {
      expect(productVacuumView(robot('docked', { battery_level: value })).battery).toBeNull();
    }
  );
});

describe('Aspirapolvere: controlli espliciti e indipendenti', () => {
  it('RESULT_UNKNOWN non diventa fallimento fisico certo e non viene reinviato', async () => {
    const callService = serviceMock(async () => {
      throw new CommandResultError('RESULT_UNKNOWN', 'demo-intent');
    });
    renderWithRuntime(controls(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Avvia pulizia Principale' }));
    await flush();
    expect(
      screen.getByText('Esito non determinato. Verifica lo stato del robot.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Comando non riuscito/)).toBeNull();
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('mount Home, dettagli e Console non avviano azioni e docked non implica carica', async () => {
    const callService = serviceMock(),
      first = renderWithRuntime(home(), { ...runtime(), callService });
    expect(screen.getByText('Alla base')).toBeInTheDocument();
    expect(screen.queryByText('In carica')).toBeNull();
    first.unmount();
    const second = renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    second.unmount();
    renderWithRuntime(
      <VacuumConsole
        id="vacuum.widget"
        settingsKey="home::vacuum"
        settings={settings}
        onClose={() => undefined}
      />,
      { ...runtime(), callService }
    );
    await flush();
    expect(callService).not.toHaveBeenCalled();
  });
  it('avvio in attesa non blocca Pausa/Ferma/Ritorno e non trasforma lo stato osservato', async () => {
    const callService = serviceMock(() => new Promise(() => undefined));
    renderWithRuntime(details(), { ...runtime(), callService });
    for (const name of ['Avvia pulizia', 'Pausa', 'Ferma', 'Torna alla base'])
      fireEvent.click(screen.getByRole('button', { name: `${name} Principale` }));
    expect(callService.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      ['start', { entity_id: 'vacuum.main' }],
      ['pause', { entity_id: 'vacuum.main' }],
      ['stop', { entity_id: 'vacuum.main' }],
      ['return_to_base', { entity_id: 'vacuum.main' }],
    ]);
    expect(screen.getByText('Alla base')).toBeInTheDocument();
  });
  it('aspirazione invia la stringa esatta e Pausa resta disponibile mentre attende HA', async () => {
    const callService = serviceMock(() => new Promise(() => undefined));
    renderWithRuntime(controls(), { ...runtime('cleaning'), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Aspirazione di Principale: Normal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turbo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pausa Principale' }));
    expect(callService.mock.calls).toEqual([
      ['vacuum', 'set_fan_speed', { entity_id: 'vacuum.main', fan_speed: 'Turbo' }],
      ['vacuum', 'pause', { entity_id: 'vacuum.main' }],
    ]);
  });
  it('locate e spot sono azioni del solo canale, con feedback accettazione distinto dallo stato', async () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Trova il robot Principale' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Pulizia localizzata Principale' }));
    await flush();
    expect(callService.mock.calls.map((call) => call[1])).toEqual(['locate', 'clean_spot']);
    expect(screen.getAllByText('Home Assistant ha accettato il comando.')).toHaveLength(2);
  });
  it('errore servizi non espone payload, URL o stack e non ripete il comando', async () => {
    const callService = serviceMock(async () => {
      throw new Error('https://secret.example/?token=PRIVATE');
    });
    const view = renderWithRuntime(controls(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Avvia pulizia Principale' }));
    await flush();
    expect(view.container.textContent).toContain('Comando non riuscito');
    expect(view.container.textContent).not.toContain('PRIVATE');
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it.each(['unknown', 'unavailable'])('nessun comando quando %s o disconnesso', (state) => {
    const callService = serviceMock();
    const view = renderWithRuntime(controls(), { ...runtime(state), callService });
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    view.update({ ...runtime(), conn: null });
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(callService).not.toHaveBeenCalled();
  });
  it('doppio click sullo stesso comando pendente non duplica', () => {
    const callService = serviceMock(() => new Promise(() => undefined));
    renderWithRuntime(controls(), { ...runtime(), callService });
    const button = screen.getByRole('button', { name: 'Avvia pulizia Principale' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('multicanale Home non fornisce comandi collettivi; dettagli cambiano canale senza inviare', async () => {
    const current = {
      ...settings,
      productDevice: { ...binding, channelEntityIds: ['vacuum.main', 'vacuum.other'] },
    };
    const callService = serviceMock(),
      context = {
        ...runtime(),
        callService,
        entities: fixtureEntities([robot(), robot('cleaning', {}, 'vacuum.other')]),
      };
    const first = renderWithRuntime(home(current), context);
    expect(screen.getByText('1 di 2 canali in pulizia')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Avvia pulizia/ })).toBeNull();
    first.unmount();
    renderWithRuntime(details(current), context);
    fireEvent.click(screen.getByRole('button', { name: 'Aspirapolvere: Principale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Secondario' }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Pausa Secondario' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('vacuum', 'pause', {
      entity_id: 'vacuum.other',
    });
  });
  it('mantiene il ramo legacy quando manca il binding prodotto', () => {
    const view = renderWithRuntime(home({ bindingEntityId: 'vacuum.main' }), runtime());
    expect(view.container.querySelector('.product-vacuum')).toBeNull();
  });
});

describe('Aspirapolvere: mapping HA, preferenze esplicite e mappe', () => {
  it.each(['unknown', 'unavailable'])(
    'selettore esplicito %s mostra placeholder italiano e resta disabilitato',
    (state) => {
      renderWithRuntime(details({ ...settings, roomSelectEntityId: 'select.room' }), {
        ...runtime(),
        entities: fixtureEntities([
          robot(),
          fixtureEntity('select.room', state, { options: ['Cucina', 'Sala'] }),
        ]),
      });
      expect(
        screen.getByRole('button', { name: 'Stanza di Principale: Non impostato' })
      ).toBeDisabled();
      expect(screen.queryByText(state)).toBeNull();
    }
  );
  it('RESULT_UNKNOWN anche per uno script esplicito conserva esito prudente senza retry', async () => {
    const callService = serviceMock(async () => {
      throw new CommandResultError('RESULT_UNKNOWN', 'demo-intent');
    });
    renderWithRuntime(
      details({
        ...settings,
        roomScripts: [{ label: 'Sala configurata', entityId: 'script.room' }],
      }),
      {
        ...runtime(),
        callService,
        entities: fixtureEntities([robot(), fixtureEntity('script.room', 'off')]),
      }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sala configurata' }));
    await flush();
    expect(
      screen.getByText('Esito non determinato. Verifica lo stato del robot.')
    ).toBeInTheDocument();
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('stesso entityId con deviceId cambiato nasconde il mapping precedente prima della nuova risposta', async () => {
    let calls = 0,
      complete!: (value: unknown) => void;
    const registry = (deviceId: string, areaId: string) => [
      {
        entity_id: 'vacuum.main',
        device_id: deviceId,
        options: { vacuum: { area_mapping: { [areaId]: ['segment1'] } } },
      },
    ];
    const { conn } = fakeConnection((message) =>
      message.type === 'config/entity_registry/list'
        ? ++calls === 1
          ? registry('robot', 'kitchen')
          : new Promise((resolve) => {
              complete = resolve;
            })
        : [
            { area_id: 'kitchen', name: 'Cucina' },
            { area_id: 'garage', name: 'Garage' },
          ]
    );
    function Rebind() {
      const [other, setOther] = useState(false);
      return (
        <>
          <button onClick={() => setOther(true)}>Cambia dispositivo</button>
          {details({
            ...settings,
            productDevice: { ...binding, deviceId: other ? 'robot-new' : 'robot' },
          })}
        </>
      );
    }
    renderWithRuntime(<Rebind />, { ...runtime(), conn });
    await flush();
    expect(screen.getByRole('button', { name: 'Cucina' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cambia dispositivo' }));
    expect(screen.queryByRole('button', { name: 'Cucina' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pulisci le aree scelte' })).toBeNull();
    complete(registry('robot-new', 'garage'));
    await flush();
    expect(screen.getByRole('button', { name: 'Garage' })).toBeInTheDocument();
  });
  it('perdita di CLEAN_AREA rimuove tutte le aree anche quando rimangono script espliciti', async () => {
    const { conn } = fakeConnection((message) =>
      message.type === 'config/entity_registry/list'
        ? [
            {
              entity_id: 'vacuum.main',
              device_id: 'robot',
              options: { vacuum: { area_mapping: { kitchen: ['segment1'] } } },
            },
          ]
        : [{ area_id: 'kitchen', name: 'Cucina' }]
    );
    const current = {
      ...settings,
      roomScripts: [{ label: 'Sala configurata', entityId: 'script.room' }],
    };
    const view = renderWithRuntime(details(current), {
      ...runtime(),
      conn,
      entities: fixtureEntities([robot(), fixtureEntity('script.room', 'off')]),
    });
    await flush();
    expect(screen.getByRole('button', { name: 'Cucina' })).toBeInTheDocument();
    view.setEntities([robot('docked', { supported_features: 8192 })]);
    expect(screen.queryByRole('button', { name: 'Cucina' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pulisci le aree scelte' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sala configurata' })).toBeEnabled();
  });
  it('manutenzione esplicita conserva button unknown nella sola Tecnica e invia press al click', async () => {
    const current = { ...settings, adaptiveBindings: { maintenance: 'button.filter' } },
      callService = serviceMock();
    renderWithRuntime(details(current), {
      ...runtime(),
      callService,
      entities: fixtureEntities([
        robot(),
        fixtureEntity('button.filter', 'unknown', { friendly_name: 'Reset filtro' }),
      ]),
    });
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    const section = screen.getByRole('region', { name: 'Reset filtro' });
    const button = within(section).getByRole('button');
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('button', 'press', {
      entity_id: 'button.filter',
    });
  });
  it('clean_area usa solo aree già mappate del canale esatto, mai get_segments admin o stessa integrazione', async () => {
    const { conn, sendMessagePromise } = fakeConnection((message) =>
      message.type === 'config/entity_registry/list'
        ? [
            {
              entity_id: 'vacuum.main',
              device_id: 'robot',
              options: { vacuum: { area_mapping: { kitchen: ['segment16'] } } },
            },
            {
              entity_id: 'vacuum.foreign',
              device_id: 'other',
              options: { vacuum: { area_mapping: { garage: ['segment4'] } } },
            },
          ]
        : message.type === 'config/area_registry/list'
          ? [
              { area_id: 'kitchen', name: 'Cucina' },
              { area_id: 'garage', name: 'Garage' },
            ]
          : []
    );
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), conn, callService });
    await flush();
    expect(screen.queryByRole('button', { name: 'Garage' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cucina' }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Pulisci le aree scelte' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('vacuum', 'clean_area', {
      entity_id: 'vacuum.main',
      cleaning_area_id: ['kitchen'],
    });
    expect(
      sendMessagePromise.mock.calls.some(([message]) => message.type === 'vacuum/get_segments')
    ).toBe(false);
  });
  it('errore permessi registro non sostituisce identità e lascia i comandi robot disponibili', async () => {
    const { conn } = fakeConnection(() => {
      throw new Error('forbidden secret');
    });
    const callService = serviceMock();
    const view = renderWithRuntime(details(), { ...runtime(), conn, callService });
    await flush();
    expect(screen.getByText(/Non riesco a leggere le stanze/)).toBeInTheDocument();
    expect(view.container.textContent).not.toContain('secret');
    fireEvent.click(screen.getByRole('button', { name: 'Avvia pulizia Principale' }));
    await flush();
    expect(callService).toHaveBeenCalledOnce();
  });
  it('roomScripts e select espliciti esterni restano inerti fino alla scelta dell’utente', async () => {
    const current = {
      ...settings,
      roomScripts: [{ label: 'Sala configurata', entityId: 'script.room' }],
      roomSelectEntityId: 'select.room',
    };
    const callService = serviceMock();
    renderWithRuntime(details(current), {
      ...runtime(),
      callService,
      entities: fixtureEntities([
        robot(),
        fixtureEntity('script.room', 'off'),
        fixtureEntity('select.room', 'Cucina', { options: ['Cucina', 'Sala'] }),
      ]),
    });
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sala configurata' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Stanza di Principale: Cucina' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sala' }));
    await flush();
    expect(callService.mock.calls).toEqual([
      ['script', 'turn_on', { entity_id: 'script.room' }],
      ['select', 'select_option', { entity_id: 'select.room', option: 'Sala' }],
    ]);
  });
  it('mop numerico esplicito usa min/max/step osservati e set_value; scollegamento annulla invio non partito', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    const current = { ...settings, adaptiveBindings: { mop: 'number.water' } };
    const view = renderWithRuntime(details(current), {
      ...runtime(),
      callService,
      entities: fixtureEntities([
        robot(),
        fixtureEntity('number.water', '2', { min: 0, max: 5, step: 1 }),
      ]),
    });
    const range = screen.getByRole('slider', { name: 'Lavaggio di Principale' });
    expect(range).toHaveAttribute('min', '0');
    expect(range).toHaveAttribute('max', '5');
    expect(range).toHaveAttribute('step', '1');
    fireEvent.change(range, { target: { value: '3' } });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(callService).toHaveBeenCalledExactlyOnceWith('number', 'set_value', {
      entity_id: 'number.water',
      value: 3,
    });
    fireEvent.change(range, { target: { value: '4' } });
    view.update({ conn: null });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('nessun sensore o mappa viene scoperto solo dal marchio/nome', () => {
    const view = renderWithRuntime(details(), {
      ...runtime(),
      entities: fixtureEntities([
        robot(),
        fixtureEntity('sensor.main_battery', '80'),
        fixtureEntity('camera.robot_map', 'idle', { entity_picture: '/foreign-secret' }),
      ]),
    });
    expect(view.container.querySelector('img')).toBeNull();
    expect(screen.queryByText('80')).toBeNull();
  });
  it.each([
    ['data', dataUrl],
    ['blob', 'blob:http://local/map'],
    ['http', 'http://local/map?sig=CAP#image'],
  ])('mappa %s conserva correttamente sorgente e refresh', (kind, url) => {
    expect(vacuumMapUrl(url, 1)).toBe(
      kind === 'http' ? 'http://local/map?sig=CAP&_aca_refresh=1#image' : url
    );
  });
  it('mappa dello stesso dispositivo e esplicita rispettano visibilità e preferenze esistenti', () => {
    const current = {
      ...settings,
      productDevice: { ...binding, secondaryEntityIds: ['image.map'] },
    };
    const context = {
      ...runtime(),
      getEntityImageUrl: () => dataUrl,
      entities: fixtureEntities([
        robot(),
        fixtureEntity('image.map', 'ready', { entity_picture: '/map' }),
      ]),
    };
    const first = renderWithRuntime(details(current), context);
    expect(screen.getByRole('img')).toHaveAttribute('src', dataUrl);
    fireEvent.click(screen.getByRole('button', { name: 'Nascondi mappa' }));
    expect(screen.queryByRole('img')).toBeNull();
    expect(localStorage.getItem('tunet_vacuum_show_map_vacuum.main')).toBe('false');
    first.unmount();
    renderWithRuntime(
      <PageVisibilityContext.Provider value={false}>
        {details(current)}
      </PageVisibilityContext.Provider>,
      context
    );
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('camera tecnica esplicitamente mappata resta solo informazione, senza img o feed', () => {
    const current = {
      ...settings,
      mapImageEntityId: 'camera.diagnostic',
      productDevice: {
        ...binding,
        secondaryEntityIds: ['camera.diagnostic'],
        technicalEntityIds: ['camera.diagnostic'],
      },
    };
    const view = renderWithRuntime(details(current), {
      ...runtime(),
      entities: fixtureEntities([
        robot(),
        fixtureEntity('camera.diagnostic', 'idle', { entity_picture: '/private' }),
      ]),
    });
    expect(view.container.querySelector('img,video,iframe')).toBeNull();
    expect(screen.queryByText('Mappa')).toBeNull();
  });
  it('batteria diagnostica configurata mantiene una sola voce in Tecnica, senza duplicazione quotidiana', () => {
    const current = {
      ...settings,
      batterySensorId: 'sensor.battery',
      productDevice: {
        ...binding,
        secondaryEntityIds: ['sensor.battery'],
        technicalEntityIds: ['sensor.battery'],
      },
    };
    renderWithRuntime(details(current), {
      ...runtime(),
      entities: fixtureEntities([
        robot(),
        fixtureEntity('sensor.battery', '92', {
          friendly_name: 'Batteria tecnica',
          unit_of_measurement: '%',
        }),
      ]),
    });
    expect(screen.queryByRole('heading', { name: 'Misure e pulizie' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    expect(screen.getAllByText('Batteria tecnica')).toHaveLength(1);
  });
});
