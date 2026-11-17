import type { CardSettings } from '@/@types/dashboard';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MowerWidget } from '@/components/widgets/utilities/robots/RobotWidget';
import { MowerDetails } from '@/components/widgets/utilities/robots/MowerDetails';
import { ProductMowerControls } from '@/components/widgets/home/mower/ProductMowerControls';
import { ProductMowerConsole } from '@/components/widgets/home/mower/ProductMowerDetails';
import {
  MOWER_ACTIONS,
  mowerActionAllowed,
  mowerActionSupported,
  mowerNumericControlReady,
  mowerProductBinding,
  productMowerView,
} from '@/components/widgets/home/mower/productMowerModel';
import { CommandResultError } from '@/api/commandApi';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'mower',
  deviceId: 'garden',
  primaryEntityId: 'lawn_mower.main',
  channelEntityIds: ['lawn_mower.main'],
  secondaryEntityIds: [],
};
const settings: CardSettings = {
  categoryWidgetType: 'mower',
  bindingEntityId: binding.primaryEntityId,
  productDevice: binding,
  name: 'Giardino',
};
const services = {
  lawn_mower: { start_mowing: {}, pause: {}, stop: {}, dock: {} },
  number: { set_value: {} },
  input_number: { set_value: {} },
  select: { select_option: {} },
  button: { press: {} },
};
const mower = (
  state = 'docked',
  patch: Record<string, unknown> = {},
  id = binding.primaryEntityId
) =>
  fixtureEntity(id, state, {
    friendly_name: 'Prato',
    supported_features: 15,
    battery_level: 80,
    ...patch,
  });
const runtime = (state = 'docked', patch: Record<string, unknown> = {}) => ({
  entities: fixtureEntities([mower(state, patch)]),
  services,
  conn: fakeConnection().conn,
});
const home = (current = settings, editMode = false) => (
  <MowerWidget
    id="lawn_mower.widget"
    settingsKey="home::mower"
    settings={current}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
const details = (current = settings) => (
  <MowerDetails
    id="lawn_mower.widget"
    settingsKey="home::mower"
    settings={current}
    onClose={() => undefined}
  />
);
const controls = (id = binding.primaryEntityId) => (
  <ProductMowerControls entityId={id} label="Prato" />
);
const press = (label: string) =>
  fireEvent.click(screen.getByRole('button', { name: `${label} Prato` }));
function deferred() {
  let resolve!: () => void, reject!: (reason: Error) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Tagliaerba prodotto: contratto e capacità HA2026.10.4', () => {
  it('richiede v1 mower con bindingEntityId uguale al primario', () => {
    expect(mowerProductBinding(settings)).toEqual(binding);
    expect(mowerProductBinding({ bindingEntityId: binding.primaryEntityId })).toBeNull();
    expect(mowerProductBinding({ ...settings, bindingEntityId: 'lawn_mower.other' })).toBeNull();
    expect(
      mowerProductBinding({ ...settings, productDevice: { ...binding, family: 'vacuum' } })
    ).toBeNull();
  });
  it.each([
    'unknown',
    'unavailable',
    '',
    'constructor',
    'toString',
    '__proto__',
    'charging',
    'stopped',
  ])('%s non diventa un’attività canonica o una carica inventata', (state) => {
    const view = productMowerView(mower(state));
    expect(view.available).toBe(false);
    expect(view.stateLabel).toBe('Non disponibile');
    expect(mowerActionAllowed(view, services, MOWER_ACTIONS[0])).toBe(false);
  });
  it.each([
    ['mowing', 'Taglio in corso'],
    ['paused', 'In pausa'],
    ['docked', 'Alla base'],
    ['returning', 'Ritorno alla base'],
    ['idle', 'Inattivo'],
    ['error', 'Richiede attenzione'],
  ])('nomina %s senza inferire altro', (state, label) => {
    expect(productMowerView(mower(state)).stateLabel).toBe(label);
    expect(productMowerView(mower(state)).available).toBe(true);
  });
  it.each(MOWER_ACTIONS)('$service richiede il bit$bit e il suo servizio', (action) => {
    expect(
      mowerActionSupported(
        productMowerView(mower('idle', { supported_features: action.bit })),
        services,
        action
      )
    ).toBe(true);
    expect(
      mowerActionSupported(
        productMowerView(mower('idle', { supported_features: 0 })),
        services,
        action
      )
    ).toBe(false);
    expect(mowerActionSupported(productMowerView(mower()), { lawn_mower: {} }, action)).toBe(false);
  });
  it('STOP è bit8 e il solo servizio globale non concede la capacità', () => {
    renderWithRuntime(controls(), runtime('mowing', { supported_features: 7 }));
    expect(screen.queryByRole('button', { name: 'Ferma Prato' })).toBeNull();
  });
  it.each([undefined, NaN, Infinity, -1, 101, '80'])(
    'batteria %s non diventa numero o stato di carica',
    (value) => {
      expect(productMowerView(mower('docked', { battery_level: value })).battery).toBeNull();
      expect(productMowerView(mower('docked', { battery_level: value })).stateLabel).toBe(
        'Alla base'
      );
    }
  );
  it.each(['15', NaN, Infinity, -1, 1.5])(
    'feature malformate %s non concedono comandi',
    (supported_features) => {
      expect(
        mowerActionSupported(
          productMowerView(mower('docked', { supported_features })),
          services,
          MOWER_ACTIONS[0]
        )
      ).toBe(false);
    }
  );
});

describe('Tagliaerba: richieste esplicite e stato osservato', () => {
  it('mount non comanda e un doppio avvio ravvicinato invia una sola richiesta', () => {
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime(), callService });
    expect(callService).not.toHaveBeenCalled();
    act(() => {
      press('Avvia taglio');
      press('Avvia taglio');
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('lawn_mower', 'start_mowing', {
      entity_id: binding.primaryEntityId,
    });
  });
  it('un dock su stato giàdocked non lascia il guard bloccato dopo la risposta', async () => {
    const held = deferred();
    const callService = serviceMock(async (_domain, service) =>
      service === 'start_mowing' ? held.promise : undefined
    );
    const view = renderWithRuntime(controls(), { ...runtime(), callService });
    press('Avvia taglio');
    press('Torna alla base');
    await flush();
    view.setEntities([mower('returning')]);
    expect(screen.getByRole('button', { name: 'Torna alla base Prato' })).not.toBeDisabled();
    press('Torna alla base');
    expect(callService).toHaveBeenCalledTimes(3);
  });
  it('una chiamata dock ancora in volo resta protetta dal doppio click anche sul vecchio stato docked', async () => {
    const start = deferred(),
      dock = deferred();
    const callService = serviceMock(async (_domain, service) =>
      service === 'start_mowing' ? start.promise : dock.promise
    );
    renderWithRuntime(controls(), { ...runtime(), callService });
    press('Avvia taglio');
    act(() => {
      press('Torna alla base');
      press('Torna alla base');
    });
    expect(callService).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Torna alla base Prato' })).toBeDisabled();
    await act(async () => dock.resolve());
    await flush();
    expect(callService).toHaveBeenCalledTimes(2);
  });
  it('il gate visuale conserva gli arresti finché la chiamata di avvio resta in volo, anche dopo un target osservato', () => {
    const held = deferred();
    const callService = serviceMock(async (_domain, service) =>
      service === 'start_mowing' ? held.promise : undefined
    );
    const view = renderWithRuntime(controls(), { ...runtime(), callService });
    press('Avvia taglio');
    view.setEntities([mower('mowing')]);
    view.setEntities([mower('docked')]);
    expect(screen.getByRole('button', { name: 'Torna alla base Prato' })).not.toBeDisabled();
    press('Torna alla base');
    expect(callService).toHaveBeenCalledTimes(2);
  });
  it('Pausa/Ferma/Base restano indipendenti da un avvio pendente, senza perdere il rifiuto tardivo', async () => {
    const held = deferred();
    const callService = serviceMock(async (_domain, service) =>
      service === 'start_mowing' ? held.promise : undefined
    );
    renderWithRuntime(controls(), { ...runtime(), callService });
    press('Avvia taglio');
    press('Pausa');
    press('Ferma');
    press('Torna alla base');
    expect(callService.mock.calls.map((call) => call[1])).toEqual([
      'start_mowing',
      'pause',
      'stop',
      'dock',
    ]);
    held.reject(new CommandResultError('RESULT_UNKNOWN', null));
    await flush();
    expect(
      screen.getByText('Esito non confermato. Verifica lo stato del robot.')
    ).toBeInTheDocument();
    expect(callService).toHaveBeenCalledTimes(4);
  });
  it('returning non conferma l’arrivo docked e l’ACK non sostituisce lo stato osservato', async () => {
    const callService = serviceMock(),
      view = renderWithRuntime(controls(), { ...runtime('mowing'), callService });
    press('Torna alla base');
    await flush();
    expect(screen.getByText('Torna alla base: richiesta in attesa')).toBeInTheDocument();
    view.setEntities([mower('returning')]);
    expect(screen.getByText('Torna alla base: richiesta in attesa')).toBeInTheDocument();
    view.setEntities([mower('docked')]);
    expect(screen.queryByText('Torna alla base: richiesta in attesa')).toBeNull();
  });
  it('avvio/pausa/stop richiedono il rispettivo target canonico', async () => {
    const callService = serviceMock(),
      view = renderWithRuntime(controls(), { ...runtime(), callService });
    press('Avvia taglio');
    await flush();
    view.setEntities([mower('returning')]);
    expect(screen.getByText('Avvia taglio: richiesta in attesa')).toBeTruthy();
    view.setEntities([mower('mowing')]);
    expect(screen.queryByText('Avvia taglio: richiesta in attesa')).toBeNull();
    press('Pausa');
    view.setEntities([mower('paused')]);
    expect(screen.queryByText('Pausa: richiesta in attesa')).toBeNull();
    press('Ferma');
    view.setEntities([mower('idle')]);
    expect(screen.queryByText('Ferma: richiesta in attesa')).toBeNull();
  });
  it('timeout30s non è conferma fisica e non genera retry', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    renderWithRuntime(controls(), { ...runtime(), callService });
    press('Avvia taglio');
    await flush();
    act(() => vi.advanceTimersByTime(29999));
    expect(screen.getByText('Avvia taglio: richiesta in attesa')).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('Esito non confermato. Verifica lo stato del robot.')).toBeTruthy();
    act(() => vi.advanceTimersByTime(60000));
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it.each(['offline', 'loading', 'edit', 'unknown'])(
    'il passaggio a %s non avvia o accoda comandi',
    (reason) => {
      const callService = serviceMock(),
        view = renderWithRuntime(controls(), { ...runtime(), callService });
      if (reason === 'offline') view.update({ conn: null });
      if (reason === 'loading') view.update({ entitiesLoaded: false });
      if (reason === 'edit') view.update({ editMode: true });
      if (reason === 'unknown') view.setEntities([mower('unknown')]);
      press('Avvia taglio');
      expect(callService).not.toHaveBeenCalled();
      view.update({ conn: fakeConnection().conn, entitiesLoaded: true, editMode: false });
      view.setEntities([mower()]);
      expect(callService).not.toHaveBeenCalled();
    }
  );
  it('negato da HA resta esito non confermato, senza modificare lo stato o persistere comandi', async () => {
    const callService = serviceMock(async () => {
        throw new CommandResultError('DENIED', null);
      }),
      save = vi.fn();
    renderWithRuntime(home(), { ...runtime(), callService, saveCardSetting: save });
    fireEvent.click(screen.getByRole('button', { name: 'Avvia taglio Giardino' }));
    await flush();
    expect(screen.getByText('Alla base')).toBeTruthy();
    expect(screen.getByText('Non confermato')).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
    expect(callService).toHaveBeenCalledTimes(1);
  });
});

describe('Tagliaerba: Home, canali, associazioni esplicite e tecnica', () => {
  it('Home multicanale riepiloga e non offre azioni collettive', () => {
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: [binding.primaryEntityId, 'lawn_mower.second'],
      },
    };
    const rt = runtime('mowing');
    const callService = serviceMock();
    renderWithRuntime(home(current), {
      ...rt,
      callService,
      entities: { ...rt.entities, ...fixtureEntities([mower('docked', {}, 'lawn_mower.second')]) },
    });
    expect(screen.getByText('1 di 2 canali in taglio')).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
    expect(callService).not.toHaveBeenCalled();
  });
  it('il cambio canale non comanda e usa nomi/ID univoci per il solo canale scelto', async () => {
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: [binding.primaryEntityId, 'lawn_mower.second'],
      },
    };
    const rt = runtime(),
      callService = serviceMock();
    const view = renderWithRuntime(details(current), {
      ...rt,
      callService,
      entities: { ...rt.entities, ...fixtureEntities([mower('idle', {}, 'lawn_mower.second')]) },
    });
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tagliaerba: Prato (lawn_mower.main)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prato (lawn_mower.second)' }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Avvia taglio Prato (lawn_mower.second)' }));
    expect(callService).toHaveBeenCalledWith('lawn_mower', 'start_mowing', {
      entity_id: 'lawn_mower.second',
    });
    const ids = [...view.container.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('Console usa il contenitore comune e il rebind ignora i metadati precedenti', () => {
    const view = renderWithRuntime(
      <ProductMowerConsole
        id="lawn_mower.widget"
        settingsKey="home::mower"
        settings={settings}
        onClose={() => undefined}
      />,
      runtime()
    );
    expect(
      view.container.querySelector('.widget-console-details .product-mower-details')
    ).toBeTruthy();
    view.unmount();
    const rebound = renderWithRuntime(
      details({ ...settings, bindingEntityId: 'lawn_mower.other' }),
      runtime()
    );
    expect(rebound.container.querySelector('.product-mower-details')).toBeNull();
  });
  it('image/camera secondarie restano sole letture e non montano feed o mappe', () => {
    const current = {
      ...settings,
      productDevice: { ...binding, secondaryEntityIds: ['image.map', 'camera.map'] },
    };
    const rt = runtime(),
      callService = serviceMock();
    const conn = fakeConnection();
    const view = renderWithRuntime(details(current), {
      ...rt,
      conn: conn.conn,
      callService,
      entities: {
        ...rt.entities,
        ...fixtureEntities([
          fixtureEntity('image.map', '2026-11-11', {
            friendly_name: 'Mappa',
            entity_picture: '/api/image_proxy/map',
          }),
          fixtureEntity('camera.map', 'idle', {
            friendly_name: 'Camera robot',
            access_token: 'synthetic',
          }),
        ]),
      },
    });
    expect(view.container.querySelector('img,video,iframe,canvas')).toBeNull();
    expect(callService).not.toHaveBeenCalled();
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
  });
  it('metadati tecnici prevalgono sull’alias esplicito e non duplicano l’entità', () => {
    const current = {
      ...settings,
      adaptiveBindings: { height: 'number.height' },
      productDevice: {
        ...binding,
        secondaryEntityIds: ['number.height'],
        technicalEntityIds: ['number.height'],
      },
    };
    const rt = runtime();
    renderWithRuntime(details(current), {
      ...rt,
      entities: {
        ...rt.entities,
        ...fixtureEntities([
          fixtureEntity('number.height', '3', {
            friendly_name: 'Altezza nativa',
            min: 2,
            max: 8,
            step: 0.5,
            unit_of_measurement: 'cm',
          }),
        ]),
      },
    });
    expect(screen.queryByRole('region', { name: 'Altre funzioni' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tecnica e manutenzione' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
  it('altezza esplicita conserva limiti, passo e unità reali e comanda soltanto la sua entità', async () => {
    const current = { ...settings, adaptiveBindings: { height: 'number.height' } };
    const rt = runtime(),
      callService = serviceMock();
    renderWithRuntime(details(current), {
      ...rt,
      callService,
      entities: {
        ...rt.entities,
        ...fixtureEntities([
          fixtureEntity('number.height', '3', {
            friendly_name: 'Altezza nativa',
            min: 2,
            max: 8,
            step: 0.5,
            unit_of_measurement: 'cm',
          }),
        ]),
      },
    });
    const slider = screen.getByRole('slider', { name: 'Altezza nativa' });
    expect(slider).toHaveAttribute('aria-valuemin', '2');
    expect(slider).toHaveAttribute('aria-valuemax', '8');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    await flush();
    expect(callService).toHaveBeenCalledWith('number', 'set_value', {
      entity_id: 'number.height',
      value: 3.5,
    });
    expect(callService.mock.calls.every((call) => call[2]?.entity_id === 'number.height')).toBe(
      true
    );
  });
  it.each([
    { min: undefined },
    { max: undefined },
    { step: undefined },
    { step: 0 },
    { step: NaN },
    { min: 8, max: 2 },
  ])('un limite numerico mancante o invalido %j non crea una scala0–100', (patch) => {
    const current = { ...settings, adaptiveBindings: { height: 'number.height' } };
    const rt = runtime(),
      entity = fixtureEntity('number.height', '3', {
        friendly_name: 'Altezza nativa',
        min: 2,
        max: 8,
        step: 0.5,
        ...patch,
      });
    expect(mowerNumericControlReady(entity)).toBe(false);
    renderWithRuntime(details(current), {
      ...rt,
      entities: { ...rt.entities, ...fixtureEntities([entity]) },
    });
    expect(screen.queryByRole('slider')).toBeNull();
  });
  it.each(['unknown', 'unavailable'])(
    'selettore zona %s è disabilitato e non inventa un’opzione attiva',
    (state) => {
      const current = { ...settings, adaptiveBindings: { zone: 'select.zone' } };
      const rt = runtime();
      renderWithRuntime(details(current), {
        ...rt,
        entities: {
          ...rt.entities,
          ...fixtureEntities([
            fixtureEntity('select.zone', state, {
              friendly_name: 'Zona nativa',
              options: ['Prato', 'Bordo'],
            }),
          ]),
        },
      });
      expect(
        screen.getByRole('button', { name: 'Zona di taglio: Non disponibile' })
      ).toBeDisabled();
      expect(screen.queryByText(state)).toBeNull();
    }
  );
  it('zona esplicita usa solo un’opzione reale senza modificare altri canali', async () => {
    const current = { ...settings, adaptiveBindings: { zone: 'select.zone' } };
    const rt = runtime(),
      callService = serviceMock();
    renderWithRuntime(details(current), {
      ...rt,
      callService,
      entities: {
        ...rt.entities,
        ...fixtureEntities([
          fixtureEntity('select.zone', 'Prato', {
            friendly_name: 'Zona nativa',
            options: ['Prato', 'Bordo'],
          }),
        ]),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zona nativa: Prato' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bordo' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('select', 'select_option', {
      entity_id: 'select.zone',
      option: 'Bordo',
    });
  });
});
