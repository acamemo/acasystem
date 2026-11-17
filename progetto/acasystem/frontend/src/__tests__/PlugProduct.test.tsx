import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlugDetails, PlugWidget } from '@/components/widgets/controls';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import { operationalProfile } from '@/components/widgets/adaptive/operationalProfile';
import { findWidgetDefinition } from '@/components/widgets/registry';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'plug',
  deviceId: 'strip',
  primaryEntityId: 'switch.a',
  channelEntityIds: ['switch.a', 'switch.b', 'switch.c'],
  secondaryEntityIds: [
    'sensor.power',
    'sensor.energy',
    'sensor.energy_other',
    'sensor.current',
    'sensor.voltage',
    'sensor.temperature',
    'sensor.diagnostic_power',
    'switch.led',
    'number.timer',
    'select.boot',
    'button.restart',
  ],
  technicalEntityIds: [
    'sensor.diagnostic_power',
    'switch.led',
    'number.timer',
    'select.boot',
    'button.restart',
  ],
};
const entities = fixtureEntities([
  fixtureEntity('switch.a', 'on', { friendly_name: 'Uscita' }),
  fixtureEntity('switch.b', 'off', { friendly_name: 'Uscita' }),
  fixtureEntity('switch.c', 'unavailable', { friendly_name: 'Uscita C' }),
  fixtureEntity('sensor.power', '12', {
    friendly_name: 'Assorbimento',
    device_class: 'power',
    unit_of_measurement: 'W',
  }),
  fixtureEntity('sensor.energy', '3', {
    friendly_name: 'Energia 1',
    device_class: 'energy',
    unit_of_measurement: 'kWh',
  }),
  fixtureEntity('sensor.energy_other', '7.5', {
    friendly_name: 'Energia 2',
    device_class: 'energy',
    unit_of_measurement: 'kWh',
  }),
  fixtureEntity('sensor.current', '0.05', {
    friendly_name: 'Misura A',
    device_class: 'current',
    unit_of_measurement: 'A',
  }),
  fixtureEntity('sensor.voltage', '230', {
    friendly_name: 'Misura V',
    device_class: 'voltage',
    unit_of_measurement: 'V',
  }),
  fixtureEntity('sensor.temperature', '21', {
    friendly_name: 'Temperatura interna',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('sensor.diagnostic_power', '99', {
    friendly_name: 'Potenza diagnostica',
    device_class: 'power',
    unit_of_measurement: 'W',
  }),
  fixtureEntity('switch.led', 'on', { friendly_name: 'Spia LED' }),
  fixtureEntity('number.timer', '30', {
    friendly_name: 'Auto spegnimento',
    min: 1,
    max: 60,
    step: 1,
  }),
  fixtureEntity('select.boot', 'off', {
    friendly_name: 'Ripristino corrente',
    options: ['off', 'on'],
  }),
  fixtureEntity('button.restart', 'unknown', { friendly_name: 'Riavvia dispositivo' }),
]);
const services = {
  switch: { turn_on: {}, turn_off: {} },
  number: { set_value: {} },
  select: { select_option: {} },
  button: { press: {} },
};
const settings = {
  categoryWidgetType: 'plug',
  bindingEntityId: 'switch.a',
  name: 'Multipresa studio',
  productDevice: binding,
};
const single = {
  ...settings,
  productDevice: {
    ...binding,
    channelEntityIds: ['switch.a'],
    secondaryEntityIds: [],
    technicalEntityIds: [],
  },
};
const widget = (current = settings, editMode = false) => (
  <PlugWidget
    id="plug_card_strip"
    settingsKey="home::strip"
    settings={current}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Prese e interruttori: profilo e registrazione', () => {
  it('registra il nuovo tipo senza trasformare i widget generici storici', () => {
    expect(findWidgetDefinition('plug_card_strip', settings)?.type).toBe('plug');
    expect(findWidgetDefinition('entity_card_old', { type: 'sensor' })?.type).toBe('sensor');
  });
  it('il profilo singolo esegue solo il proprio turn_on/off, con servizi e stato disponibili', () => {
    const profile = operationalProfile({
      type: 'plug',
      entityId: 'switch.a',
      settings: single,
      entities,
      services,
    });
    expect(profile.execute('power', false, profile.values)?.calls).toEqual([
      { domain: 'switch', service: 'turn_off', data: { entity_id: 'switch.a' } },
    ]);
    expect(profile.execute('all_off', false, profile.values)).toBeNull();
    expect(profile.execute('power', 'on', profile.values)).toBeNull();
    const denied = operationalProfile({
      type: 'plug',
      entityId: 'switch.a',
      settings: single,
      entities,
      services: {},
    });
    expect(denied.execute('power', true, denied.values)).toBeNull();
  });
  it('il profilo multicanale non espone comandi, neppure da vecchie preferenze o binding estesi', () => {
    const profile = operationalProfile({
      type: 'plug',
      entityId: 'switch.a',
      settings: {
        ...settings,
        adaptiveBindings: { switch: 'switch.led' },
        adaptiveControls: { order: ['power', 'all_off'], visible: ['power', 'all_off'] },
      },
      entities,
      services,
    });
    expect(profile.capabilities.every((cap) => cap.kind === 'reading')).toBe(true);
    for (const id of [
      'power',
      'all_on',
      'all_off',
      'channel:switch.b:power',
      ...profile.capabilities.map((cap) => cap.id),
    ])
      expect(profile.execute(id, true, profile.values)).toBeNull();
  });
});

describe('Home Plug', () => {
  it('la multipresa mostra soltanto uscite osservate e potenza operativa univoca', () => {
    const callService = serviceMock();
    renderWithRuntime(widget(), { entities, services, conn: fakeConnection().conn, callService });
    expect(screen.getByText('1 di 3 uscite attive')).toBeInTheDocument();
    expect(screen.getByText('1 non disponibili')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByText('Potenza · 12 W')).toBeInTheDocument();
    expect(screen.queryByText(/99 W/)).toBeNull();
    expect(callService).not.toHaveBeenCalled();
  });
  it('il percorso adaptive conserva la stessa Home senza esporre i controlli dei singoli canali', () => {
    renderWithRuntime(
      <AdaptiveCategoryWidget
        type="plug"
        entityId="switch.a"
        id="plug_card_strip"
        settings={settings}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />,
      { entities, services, conn: fakeConnection().conn }
    );
    expect(screen.getByText('1 di 3 uscite attive')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });
  it('una sola uscita usa il percorso personale e resta richiesta fino allo stato HA', async () => {
    const callService = serviceMock();
    const view = renderWithRuntime(widget(single), {
      entities,
      services,
      conn: fakeConnection().conn,
      callService,
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Accensione di Multipresa studio' }));
    await flush();
    expect(callService).toHaveBeenCalledOnce();
    expect(callService).toHaveBeenCalledWith('switch', 'turn_off', { entity_id: 'switch.a' });
    expect(screen.getByText('Acceso')).toBeInTheDocument();
    expect(screen.getByText('Richiesto…')).toBeInTheDocument();
    view.setEntities([fixtureEntity('switch.a', 'off', { friendly_name: 'Uscita' })]);
    expect(screen.getByText('Spento', { selector: '.aca-type--caption' })).toBeInTheDocument();
    expect(screen.queryByText('Richiesto…')).toBeNull();
  });
  it.each(['unknown', 'unavailable'])(
    'uno stato %s non diventa spento né un comando',
    async (state) => {
      const callService = serviceMock();
      renderWithRuntime(widget(single), {
        entities: { ...entities, 'switch.a': fixtureEntity('switch.a', state) },
        services,
        conn: fakeConnection().conn,
        callService,
      });
      expect(
        screen.getByText('Non disponibile', { selector: '.aca-type--caption' })
      ).toBeInTheDocument();
      expect(screen.getByRole('switch')).toHaveAccessibleDescription(/Non disponibile/);
      expect(screen.queryByText('Spento')).toBeNull();
      fireEvent.click(screen.getByRole('switch'));
      await flush();
      expect(callService).not.toHaveBeenCalled();
    }
  );
  it('connessione assente, servizio assente ed editing bloccano il comando', () => {
    const callService = serviceMock();
    const view = renderWithRuntime(widget(single), { entities, services, callService });
    expect(screen.getByRole('switch')).toBeDisabled();
    view.update({ conn: fakeConnection().conn, services: {} });
    expect(screen.getByRole('switch')).toBeDisabled();
    view.unmount();
    renderWithRuntime(widget(single, true), {
      entities,
      services,
      conn: fakeConnection().conn,
      callService,
    });
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(callService).not.toHaveBeenCalled();
  });
  it('non somma due misure di potenza e non converte unknown in zero', () => {
    const withTwo = {
      ...settings,
      productDevice: {
        ...binding,
        secondaryEntityIds: ['sensor.power', 'sensor.second_power'],
        technicalEntityIds: [],
      },
    };
    const view = renderWithRuntime(widget(withTwo), {
      entities: {
        ...entities,
        'sensor.second_power': fixtureEntity('sensor.second_power', '5', {
          device_class: 'power',
          unit_of_measurement: 'W',
        }),
      },
      services,
    });
    expect(screen.queryByText(/Potenza ·/)).toBeNull();
    view.unmount();
    renderWithRuntime(widget(), {
      entities: {
        ...entities,
        'sensor.power': fixtureEntity('sensor.power', 'unknown', {
          device_class: 'power',
          unit_of_measurement: 'W',
        }),
      },
      services,
    });
    expect(screen.getByText('Potenza non disponibile')).toBeInTheDocument();
    expect(screen.queryByText(/0 W/)).toBeNull();
  });
});

describe('Dettagli Plug', () => {
  const details = (current = settings) => (
    <PlugDetails
      id="switch.a"
      settingsKey="home::strip"
      settings={current}
      onClose={() => undefined}
    />
  );
  it('Uscite ha comandi distinti anche con nomi uguali e nessun invio all’apertura', async () => {
    const callService = serviceMock(),
      { conn, sendMessagePromise } = fakeConnection();
    renderWithRuntime(details(), { entities, services, conn, callService });
    await flush();
    const outputs = within(screen.getByRole('region', { name: 'Uscite' }));
    expect(
      outputs.getByRole('switch', { name: 'Accensione di Uscita (switch.a)' })
    ).toBeInTheDocument();
    expect(outputs.getByRole('switch', { name: 'Accensione di Uscita C' })).toBeDisabled();
    expect(callService).not.toHaveBeenCalled();
    expect(sendMessagePromise).not.toHaveBeenCalled();
    fireEvent.click(outputs.getByRole('switch', { name: 'Accensione di Uscita (switch.b)' }));
    await flush();
    expect(callService).toHaveBeenCalledOnce();
    expect(callService).toHaveBeenCalledWith('switch', 'turn_on', { entity_id: 'switch.b' });
  });
  it('mantiene potenza, energia, corrente e tensione reali, senza sommare o attribuire ai canali', () => {
    renderWithRuntime(details(), { entities, services, conn: fakeConnection().conn });
    const consumption = within(screen.getByRole('region', { name: 'Consumi e misure' }));
    expect(consumption.getByText('Assorbimento · Potenza')).toBeInTheDocument();
    expect(consumption.getByText('Energia 1 · Energia')).toBeInTheDocument();
    expect(consumption.getByText('Energia 2 · Energia')).toBeInTheDocument();
    expect(consumption.queryByText('10.5')).toBeNull();
    expect(consumption.getByText('Misura A · Corrente')).toBeInTheDocument();
    expect(consumption.getByText('Misura V · Tensione')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Misure' })).getByText('Temperatura interna')
    ).toBeInTheDocument();
    expect(consumption.queryByText('Potenza diagnostica · Potenza')).toBeNull();
  });
  it('la tecnica resta chiusa e i suoi controlli riusano i servizi personali esatti', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { entities, services, conn: fakeConnection().conn, callService });
    const toggle = screen.getByRole('button', { name: 'Tecnica e manutenzione' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toHaveAttribute('inert');
    expect(
      within(screen.getByRole('region', { name: 'Uscite' })).queryByText('Spia LED')
    ).toBeNull();
    fireEvent.click(toggle);
    const boot = within(screen.getByRole('region', { name: 'Ripristino corrente' }));
    fireEvent.click(boot.getByRole('button', { name: 'Ripristino corrente: off' }));
    fireEvent.click(await screen.findByRole('button', { name: 'on' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('select', 'select_option', {
      entity_id: 'select.boot',
      option: 'on',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Riavvia dispositivo' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('button', 'press', { entity_id: 'button.restart' });
  });
  it('un LED light tecnico resta fuori da Home e Uscite e comanda solo la propria luce', async () => {
    const current = { ...settings, productDevice: { ...binding, channelEntityIds: ['switch.a'],
      secondaryEntityIds: ['light.status_led'], technicalEntityIds: ['light.status_led'] } };
    const withLed = { ...entities, 'light.status_led': fixtureEntity('light.status_led', 'off', {
      friendly_name: 'LED di stato', supported_color_modes: ['onoff'],
    }) };
    const catalog = { ...services, light: { turn_on: {}, turn_off: {} } };
    const callService = serviceMock(), { conn, sendMessagePromise } = fakeConnection();
    const home = renderWithRuntime(widget(current), { entities: withLed, services: catalog, conn, callService });
    await flush();
    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(screen.queryByText('LED di stato')).toBeNull();
    expect(callService).not.toHaveBeenCalled();
    home.unmount();

    renderWithRuntime(details(current), { entities: withLed, services: catalog, conn, callService });
    await flush();
    expect(within(screen.getByRole('region', { name: 'Uscite' })).queryByText('LED di stato')).toBeNull();
    const technical = screen.getByRole('button', { name: 'Tecnica e manutenzione' });
    expect(technical).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(technical.getAttribute('aria-controls')!)).toHaveAttribute('inert');
    expect(callService).not.toHaveBeenCalled();
    expect(sendMessagePromise).not.toHaveBeenCalled();
    fireEvent.click(technical);
    fireEvent.click(within(screen.getByRole('region', { name: 'LED di stato' })).getByRole('button', { name: 'Accensione luce' }));
    await flush();
    expect(callService).toHaveBeenCalledOnce();
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.status_led' });
  });

  it('un rifiuto HA resta nel canale e non viene ritentato automaticamente', async () => {
    const callService = serviceMock(async () => {
      throw Object.assign(new Error('Permesso negato'), { status: 403 });
    });
    renderWithRuntime(details(), { entities, services, conn: fakeConnection().conn, callService });
    const output = within(screen.getByRole('region', { name: 'Uscita (switch.b)' }));
    fireEvent.click(output.getByRole('switch'));
    await flush();
    expect(callService).toHaveBeenCalledOnce();
    expect(output.getByText(/non riuscito/i)).toBeInTheDocument();
    expect(output.queryByText(/confermato/i)).toBeNull();
    await flush();
    expect(callService).toHaveBeenCalledOnce();
  });
  it('una riassociazione manuale ignora canali, misure e tecnica del vecchio dispositivo', async () => {
    const current = { ...settings, bindingEntityId: 'switch.new' };
    const callService = serviceMock();
    renderWithRuntime(
      <PlugDetails
        id="switch.new"
        settingsKey="home::strip"
        settings={current}
        onClose={() => undefined}
      />,
      {
        entities: {
          ...entities,
          'switch.new': fixtureEntity('switch.new', 'off', { friendly_name: 'Nuova presa' }),
        },
        services,
        conn: fakeConnection().conn,
        callService,
      }
    );
    expect(screen.queryByText('Uscita (switch.a)')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Consumi e misure' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tecnica e manutenzione' })).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Accensione di Nuova presa' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('switch', 'turn_on', { entity_id: 'switch.new' });
  });
});
