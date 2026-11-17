import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FanWidget } from '@/components/widgets/controls/fan/FanWidget';
import { FanDetails } from '@/components/widgets/controls/fan/FanDetails';
import { ProductFanConsole } from '@/components/widgets/home/fan/ProductFanDetails';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import {
  fanDirectionCall,
  fanOscillationCall,
  fanPercentage,
  fanPowerCall,
  fanPresetCall,
  fanProductBinding,
  fanSpeedCall,
  productFanPresetLabel,
  productFanView,
} from '@/components/widgets/home/fan/productFanModel';
import { COMMAND_LABELS } from '@/components/widgets/controls/shared/labels';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'fan',
  deviceId: 'fan-controller',
  primaryEntityId: 'fan.main',
  channelEntityIds: ['fan.main'],
  secondaryEntityIds: ['sensor.power', 'sensor.firmware', 'switch.led'],
  technicalEntityIds: ['sensor.firmware', 'switch.led'],
};
const settings = {
  bindingEntityId: 'fan.main',
  categoryWidgetType: 'fan',
  name: 'Ventilatore studio',
  productDevice: binding,
};
const attributes = {
  friendly_name: 'Canale',
  supported_features: 63,
  percentage: 50,
  percentage_step: 25,
  preset_mode: 'normal',
  preset_modes: ['normal', 'natural', 'sleep'],
  oscillating: false,
  direction: 'forward',
};
const entities = fixtureEntities([
  fixtureEntity('fan.main', 'on', attributes),
  fixtureEntity('sensor.power', '7.5', { friendly_name: 'Potenza', unit_of_measurement: 'W' }),
  fixtureEntity('sensor.firmware', 'versione-firmware-molto-lunga-2026.10.4', {
    friendly_name: 'Firmware',
  }),
  fixtureEntity('switch.led', 'on', { friendly_name: 'Spia' }),
]);
const services = {
  fan: Object.fromEntries(
    ['turn_on', 'turn_off', 'set_percentage', 'set_preset_mode', 'oscillate', 'set_direction'].map(
      (key) => [key, {}]
    )
  ),
  switch: { turn_on: {}, turn_off: {} },
};
const runtime = () => ({ entities, services, conn: fakeConnection().conn });
const home = (current = settings, editMode = false) => (
  <FanWidget
    id="fan.widget"
    settingsKey="home::fan"
    settings={current}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
const details = (current = settings) => (
  <FanDetails
    id="fan.widget"
    settingsKey="home::fan"
    settings={current}
    onClose={() => undefined}
  />
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Ventilatore prodotto: dati e feature HA2026.10.4', () => {
  it('richiede fan e bindingEntityId uguale al primary, senza convertire lo storico', () => {
    expect(fanProductBinding(settings)).toEqual(binding);
    expect(fanProductBinding({ bindingEntityId: 'fan.main' })).toBeNull();
    expect(fanProductBinding({ ...settings, bindingEntityId: 'fan.other' })).toBeNull();
    expect(
      fanProductBinding({ ...settings, productDevice: { ...binding, family: 'light' } })
    ).toBeNull();
  });
  it.each([null, undefined, '', false, true, NaN, Infinity, -1, 101])(
    'non inventa una velocità da %s',
    (value) => {
      expect(fanPercentage(value)).toBeNull();
    }
  );
  it.each(['unknown', 'unavailable', '', 'constructor', '__proto__'])(
    'distingue %s da spento',
    (state) => {
      const view = productFanView(fixtureEntity('fan.main', state, attributes));
      expect(view.available).toBe(false);
      expect(view.stateLabel).toBe('Non disponibile');
      expect(fanPowerCall(view, services, false)).toBeNull();
    }
  );
  it('off16 e on32 sono separati e richiedono il servizio effettivo', () => {
    const off = productFanView(fixtureEntity('fan.main', 'on', { supported_features: 16 })),
      on = productFanView(fixtureEntity('fan.main', 'off', { supported_features: 32 }));
    expect(fanPowerCall(off, services, false)).toEqual({ service: 'turn_off' });
    expect(fanPowerCall(off, services, true)).toBeNull();
    expect(fanPowerCall(on, services, true)).toEqual({ service: 'turn_on' });
    expect(fanPowerCall(on, services, false)).toBeNull();
    expect(fanPowerCall(on, { fan: {} }, true)).toBeNull();
  });
  it.each(['percentage', 'percentage_step'])('non inventa valori quando manca %s', (key) => {
    const view = productFanView(fixtureEntity('fan.main', 'on', { ...attributes, [key]: null }));
    expect(fanSpeedCall(view, services, 75)).toBeNull();
  });
  it('rifiuta step0/negativo, servizio e feature mancanti', () => {
    for (const step of [0, -1, 101, NaN])
      expect(
        fanSpeedCall(
          productFanView(fixtureEntity('fan.main', 'on', { ...attributes, percentage_step: step })),
          services,
          75
        )
      ).toBeNull();
    expect(
      fanSpeedCall(productFanView(fixtureEntity('fan.main', 'on', attributes)), { fan: {} }, 75)
    ).toBeNull();
    expect(
      fanSpeedCall(
        productFanView(fixtureEntity('fan.main', 'on', { ...attributes, supported_features: 48 })),
        services,
        75
      )
    ).toBeNull();
  });
  it('quantizza i tre livelli100/3 in33/66/100 senza inviare float o saltare il secondo', () => {
    const step = 100 / 3,
      view = productFanView(
        fixtureEntity('fan.main', 'on', { ...attributes, percentage_step: step })
      );
    expect(
      [step, step * 2, 100].map((value) => fanSpeedCall(view, services, value)?.data.percentage)
    ).toEqual([33, 66, 100]);
  });
  it('usa soltanto preset presenti; SET_SPEED o PRESET_MODE sono ammessi dal servizio pinned', () => {
    const view = productFanView(
      fixtureEntity('fan.main', 'on', { ...attributes, supported_features: 1 })
    );
    expect(fanPresetCall(view, services, 'sleep')).toEqual({
      service: 'set_preset_mode',
      data: { preset_mode: 'sleep' },
    });
    expect(fanPresetCall(view, services, 'not-provided')).toBeNull();
    expect(fanPresetCall(view, { fan: {} }, 'sleep')).toBeNull();
    expect(productFanPresetLabel('constructor')).toBe('constructor');
  });
  it('oscillazione e direzione richiedono attributi reali, feature e servizi', () => {
    const missing = productFanView(fixtureEntity('fan.main', 'on', { supported_features: 63 }));
    expect(fanOscillationCall(missing, services, true)).toBeNull();
    expect(fanDirectionCall(missing, services, 'forward')).toBeNull();
    const view = productFanView(fixtureEntity('fan.main', 'on', attributes));
    expect(fanOscillationCall(view, services, true)).toEqual({
      service: 'oscillate',
      data: { oscillating: true },
    });
    expect(fanDirectionCall(view, services, 'reverse')).toEqual({
      service: 'set_direction',
      data: { direction: 'reverse' },
    });
    expect(fanDirectionCall(view, services, 'invented')).toBeNull();
    expect(fanOscillationCall(view, { fan: {} }, true)).toBeNull();
  });
});

describe('Ventilatore prodotto: Home e dettagli', () => {
  it('non comanda al montaggio e mostra stato e velocità osservati', async () => {
    const callService = serviceMock(),
      rendered = renderWithRuntime(home(), { ...runtime(), callService });
    await flush();
    expect(rendered.container.querySelector('article.product-fan')).toBeTruthy();
    expect(screen.getByText('Acceso')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(callService).not.toHaveBeenCalled();
  });
  it('Home multicanale espone soltanto riepilogo, senza azione collettiva', () => {
    const current = {
      ...settings,
      productDevice: { ...binding, channelEntityIds: ['fan.main', 'fan.second', 'fan.third'] },
    };
    renderWithRuntime(home(current), {
      ...runtime(),
      entities: {
        ...entities,
        'fan.second': fixtureEntity('fan.second', 'off', { supported_features: 48 }),
        'fan.third': fixtureEntity('fan.third', 'unavailable', attributes),
      },
    });
    expect(screen.getByText('1 di 3 canali accesi')).toBeTruthy();
    expect(screen.getByText('1 non disponibili')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^(Accendi|Spegni) / })).toBeNull();
  });
  it.each([
    [16, 'on', 'Spegni', 'Accendi', 'turn_off'],
    [32, 'off', 'Accendi', 'Spegni', 'turn_on'],
  ])(
    'power one-way%d non finge la funzione opposta',
    async (features, state, label, absent, service) => {
      const callService = serviceMock();
      renderWithRuntime(home(), {
        ...runtime(),
        callService,
        entities: fixtureEntities([
          fixtureEntity('fan.main', String(state), { supported_features: features }),
        ]),
      });
      await flush();
      expect(screen.queryByRole('button', { name: `${absent} Ventilatore studio` })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: `${label} Ventilatore studio` }));
      expect(callService).toHaveBeenCalledExactlyOnceWith('fan', service, {
        entity_id: 'fan.main',
      });
    }
  );
  it('non mostra0% o slider quando velocità/passo non sono disponibili', () => {
    renderWithRuntime(details(), {
      ...runtime(),
      entities: fixtureEntities([fixtureEntity('fan.main', 'on', { supported_features: 49 })]),
    });
    expect(
      within(screen.getByRole('region', { name: 'main' })).getByText('Non disponibile')
    ).toBeTruthy();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByText('0%')).toBeNull();
  });
  it('mantiene unavailable distinto da off e non abilita i comandi', () => {
    renderWithRuntime(home(), {
      ...runtime(),
      entities: fixtureEntities([fixtureEntity('fan.main', 'unavailable', attributes)]),
    });
    expect(screen.getByText('Non disponibile')).toBeTruthy();
    expect(screen.queryByText('Spento')).toBeNull();
    expect(screen.queryByText('50%')).toBeNull();
    expect(screen.getByRole('button', { name: 'Spegni Ventilatore studio' })).toBeDisabled();
  });
  it('distingue i canali omonimi e separa Misure dalla tecnica', () => {
    const current = {
      ...settings,
      productDevice: { ...binding, channelEntityIds: ['fan.main', 'fan.second'] },
    };
    renderWithRuntime(details(current), {
      ...runtime(),
      entities: { ...entities, 'fan.second': fixtureEntity('fan.second', 'off', attributes) },
    });
    expect(screen.getByRole('region', { name: 'Canale (fan.main)' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Canale (fan.second)' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Misure' })).getByText('7.5 W')).toBeTruthy();
    const technical = screen.getByRole('button', { name: 'Tecnica e manutenzione' });
    expect(technical).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByText('versione-firmware-molto-lunga-2026.10.4').closest('.aca-disclosure__panel')
    ).toHaveAttribute('inert');
  });
  it('usa Console condivisa e dispatch adattivo coerente, preservando il legacy', () => {
    const rendered = renderWithRuntime(
      <ProductFanConsole
        id="fan.widget"
        settingsKey="home::fan"
        settings={settings}
        onClose={() => undefined}
      />,
      runtime()
    );
    expect(
      rendered.container.querySelector(
        '.aca-console-columns .widget-console-details .product-fan-details'
      )
    ).toBeTruthy();
    cleanup();
    const adaptive = renderWithRuntime(
      <AdaptiveCategoryWidget
        type="fan"
        entityId="fan.main"
        settings={settings}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />,
      runtime()
    );
    expect(adaptive.container.querySelector('article.product-fan')).toBeTruthy();
    cleanup();
    const legacy = renderWithRuntime(
      <FanWidget
        id="fan.main"
        settingsKey="legacy"
        settings={{}}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />,
      runtime()
    );
    expect(legacy.container.querySelector('.product-fan')).toBeNull();
    expect(legacy.container.querySelector('.ctl-fan')).toBeTruthy();
  });
});

describe('Ventilatore prodotto: richieste, Off e risultati indipendenti', () => {
  it('il passo1 resta31 richiesto con30 osservato e invia una sola volta', async () => {
    vi.useFakeTimers();
    const callService = serviceMock(),
      observed = { ...attributes, percentage: 30, percentage_step: 1 };
    const rendered = renderWithRuntime(details(), {
      ...runtime(),
      callService,
      entities: { ...entities, 'fan.main': fixtureEntity('fan.main', 'on', observed) },
    });
    await flush();
    const slider = screen.getByRole('slider', { name: 'Velocità di Canale' });
    fireEvent.change(slider, { target: { value: '31' } });
    expect(slider).toHaveAttribute('aria-busy', 'true');
    expect(slider).toHaveValue('31');
    expect(screen.getByText('Velocità osservata · 30%')).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(201);
    });
    expect(callService).toHaveBeenCalledExactlyOnceWith('fan', 'set_percentage', {
      entity_id: 'fan.main',
      percentage: 31,
    });
    expect(slider).toHaveAttribute('aria-busy', 'true');
    rendered.setEntities([fixtureEntity('fan.main', 'on', { ...observed, percentage: 31 })]);
    await flush();
    expect(slider).not.toHaveAttribute('aria-busy');
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('il secondo livello100/3 invia66 una volta, con stato osservato separato', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    renderWithRuntime(details(), {
      ...runtime(),
      callService,
      entities: {
        ...entities,
        'fan.main': fixtureEntity('fan.main', 'on', {
          ...attributes,
          percentage: 33,
          percentage_step: 100 / 3,
        }),
      },
    });
    await flush();
    const slider = screen.getByRole('slider', { name: 'Velocità di Canale' });
    expect(slider).toHaveAttribute('step', String(100 / 3));
    fireEvent.change(slider, { target: { value: String(200 / 3) } });
    await act(async () => {
      vi.advanceTimersByTime(201);
    });
    expect(callService).toHaveBeenCalledExactlyOnceWith('fan', 'set_percentage', {
      entity_id: 'fan.main',
      percentage: 66,
    });
    expect(screen.getByText('Velocità osservata · 33%')).toBeTruthy();
    expect(slider).toHaveAttribute('aria-busy', 'true');
  });
  it('Spegni resta disponibile con velocità già inviata e conserva un errore tardivo', async () => {
    vi.useFakeTimers();
    let rejectSpeed: (error: Error) => void = () => undefined;
    const callService = serviceMock((_domain, service) =>
      service === 'set_percentage'
        ? new Promise((_resolve, reject) => {
            rejectSpeed = reject;
          })
        : Promise.resolve()
    );
    const rendered = renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.change(screen.getByRole('slider', { name: 'Velocità di Canale' }), {
      target: { value: '75' },
    });
    await act(async () => {
      vi.advanceTimersByTime(201);
    });
    expect(screen.getByRole('button', { name: 'Spegni Canale' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Spegni Canale' }));
    expect(callService.mock.calls).toEqual([
      ['fan', 'set_percentage', { entity_id: 'fan.main', percentage: 75 }],
      ['fan', 'turn_off', { entity_id: 'fan.main' }],
    ]);
    expect(screen.getByText('Acceso')).toBeTruthy();
    rejectSpeed(new Error('synthetic rejection'));
    await flush();
    expect(screen.getByText(COMMAND_LABELS.error)).toBeTruthy();
    rendered.setEntities([fixtureEntity('fan.main', 'off', { ...attributes, percentage: 0 })]);
    await flush();
    expect(screen.getByText(COMMAND_LABELS.error)).toBeTruthy();
  });
  it('Spegni resta disponibile con preset pendente, senza cancellarne il risultato', async () => {
    const callService = serviceMock((_domain, service) =>
      service === 'set_preset_mode' ? new Promise(() => undefined) : Promise.resolve()
    );
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Modalità di Canale: Normale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notte' }));
    expect(screen.getByRole('button', { name: 'Spegni Canale' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Spegni Canale' }));
    expect(callService.mock.calls).toEqual([
      ['fan', 'set_preset_mode', { entity_id: 'fan.main', preset_mode: 'sleep' }],
      ['fan', 'turn_off', { entity_id: 'fan.main' }],
    ]);
    expect(screen.getByText('Modalità richiesta · Notte')).toBeTruthy();
    expect(screen.getByText('Modalità osservata · Normale')).toBeTruthy();
  });
  it('ritornare a50 prima del debounce annulla75 senza invio o pending residuo', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    const slider = screen.getByRole('slider', { name: 'Velocità di Canale' });
    fireEvent.change(slider, { target: { value: '75' } });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(slider, { target: { value: '50' } });
    expect(slider).toHaveValue('50');
    expect(slider).not.toHaveAttribute('aria-busy');
    expect(screen.queryByText('Velocità richiesta · 75%')).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(callService).not.toHaveBeenCalled();
  });
  it('tornare all osservato dopo l invio non finge annullamento e conserva l errore tardivo', async () => {
    vi.useFakeTimers();
    let rejectSpeed: (error: Error) => void = () => undefined;
    const callService = serviceMock(
      () =>
        new Promise((_resolve, reject) => {
          rejectSpeed = reject;
        })
    );
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    const slider = screen.getByRole('slider', { name: 'Velocità di Canale' });
    fireEvent.change(slider, { target: { value: '75' } });
    await act(async () => {
      vi.advanceTimersByTime(201);
    });
    fireEvent.change(slider, { target: { value: '50' } });
    expect(slider).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Velocità richiesta · 75%')).toBeTruthy();
    expect(callService).toHaveBeenCalledExactlyOnceWith('fan', 'set_percentage', {
      entity_id: 'fan.main',
      percentage: 75,
    });
    rejectSpeed(new Error('synthetic rejection after attempted cancellation'));
    await flush();
    expect(screen.getByText(COMMAND_LABELS.error)).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(screen.getByText(COMMAND_LABELS.error)).toBeTruthy();
  });
  it('Spegni cancella solo la velocità non ancora inviata', async () => {
    vi.useFakeTimers();
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.change(screen.getByRole('slider', { name: 'Velocità di Canale' }), {
      target: { value: '75' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Spegni Canale' }));
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(callService.mock.calls).toEqual([['fan', 'turn_off', { entity_id: 'fan.main' }]]);
  });
  it.each(['offline', 'unmount'])('non invia una velocità accodata dopo%s', async (action) => {
    vi.useFakeTimers();
    const callService = serviceMock(),
      rendered = renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.change(screen.getByRole('slider', { name: 'Velocità di Canale' }), {
      target: { value: '75' },
    });
    if (action === 'offline') rendered.update({ conn: null });
    else rendered.unmount();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(callService).not.toHaveBeenCalled();
  });
  it('oscillazione e direzione inviano soltanto il proprio canale e payload', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.click(screen.getByRole('switch', { name: 'Oscillazione di Canale' }));
    expect(callService).toHaveBeenLastCalledWith('fan', 'oscillate', {
      entity_id: 'fan.main',
      oscillating: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Direzione di Canale: Avanti' }));
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(callService).toHaveBeenLastCalledWith('fan', 'set_direction', {
      entity_id: 'fan.main',
      direction: 'reverse',
    });
  });
});
