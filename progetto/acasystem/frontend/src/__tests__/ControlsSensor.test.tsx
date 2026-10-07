import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { CellSize, WidgetRuntime } from '@/@types/launcher';
import { SensorDetails } from '@/components/widgets/controls/sensor/SensorDetails';
import { SensorWidget } from '@/components/widgets/controls/sensor/SensorWidget';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const NOW = Date.UTC(2026, 9, 6, 8, 0, 0) / 1000;

const temperature = fixtureEntity('sensor.temperatura', '21.5', {
  friendly_name: 'Temperatura soggiorno',
  unit_of_measurement: '°C',
  device_class: 'temperature',
  state_class: 'measurement',
});
const door = fixtureEntity('binary_sensor.porta', 'on', {
  friendly_name: 'Porta di ingresso',
  device_class: 'door',
});
const plug = (state = 'on') => fixtureEntity('switch.presa', state, { friendly_name: 'Presa' });

function historyResponder(entityId: string, values: number[]) {
  return (message: { type: string }) => {
    if (message.type === 'history/history_during_period') {
      return {
        [entityId]: values.map((value, index) => ({ s: String(value), lc: NOW - (values.length - index) * 600 })),
      };
    }
    return {};
  };
}

function renderSensor(
  entities: HassEntity[],
  settings: CardSettings,
  size: CellSize,
  overrides: Partial<WidgetRuntime> & { id?: string; editMode?: boolean } = {}
) {
  const { id = 'entity_card_1', editMode = false, ...runtime } = overrides;
  const callService = runtime.callService ?? serviceMock();
  const connection = fakeConnection();
  const view = renderWithRuntime(
    <SensorWidget id={id} settingsKey={id} settings={settings} size={size} editMode={editMode} />,
    {
      entities: fixtureEntities(entities),
      conn: connection.conn,
      ...runtime,
      callService,
    }
  );
  return { ...view, callService };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SensorWidget: valori e densità', () => {
  it('1×1 compatto: valore in formato italiano, unità e nome', () => {
    renderSensor([temperature], { entityId: 'sensor.temperatura' }, { w: 1, h: 1 });
    expect(screen.getByText('21,5')).toBeInTheDocument();
    expect(screen.getByText('°C', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Temperatura soggiorno')).toBeInTheDocument();
  });

  it('2×1: andamento delle ultime 24 ore dallo storico di HA', async () => {
    const { conn, sendMessagePromise } = fakeConnection(
      historyResponder('sensor.temperatura', [20, 20.5, 21, 21.5])
    );
    const { container } = renderSensor([temperature], { entityId: 'sensor.temperatura' }, { w: 2, h: 1 }, { conn });
    await flush();
    const request = sendMessagePromise.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(request).toMatchObject({
      type: 'history/history_during_period',
      entity_ids: ['sensor.temperatura'],
      minimal_response: true,
    });
    expect(container.querySelector('.ctl-spark path.ctl-spark__line')).not.toBeNull();
  });

  it('1×1 non chiede lo storico (niente sparkline)', async () => {
    const { conn, sendMessagePromise } = fakeConnection();
    renderSensor([temperature], { entityId: 'sensor.temperatura' }, { w: 1, h: 1 }, { conn });
    await flush();
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });

  it('sensore binario: dicitura per classe del dispositivo', () => {
    renderSensor([door], { entityId: 'binary_sensor.porta' }, { w: 2, h: 1 });
    expect(screen.getByText('Aperta')).toBeInTheDocument();
  });

  it('variante a lancetta con intervallo dalle impostazioni', () => {
    renderSensor(
      [temperature],
      { entityId: 'sensor.temperatura', sensorVariant: 'gauge', sensorMin: 0, sensorMax: 40 },
      { w: 2, h: 2 }
    );
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '21.5');
    expect(meter).toHaveAttribute('aria-valuemax', '40');
  });

  it('caricamento, entità mancante e non disponibile', () => {
    const loading = renderSensor([temperature], { entityId: 'sensor.temperatura' }, { w: 1, h: 1 }, {
      entitiesLoaded: false,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del dispositivo…');
    loading.unmount();
    const missing = renderSensor([], { entityId: 'sensor.sparito' }, { w: 2, h: 1 });
    expect(screen.getByText('Dispositivo non trovato')).toBeInTheDocument();
    missing.unmount();
    renderSensor(
      [fixtureEntity('sensor.temperatura', 'unavailable', { friendly_name: 'Temperatura soggiorno' })],
      { entityId: 'sensor.temperatura' },
      { w: 2, h: 1 }
    );
    expect(screen.getAllByText('Non disponibile').length).toBeGreaterThan(0);
  });
});

describe('SensorWidget: comandi (parità con renderSensorCard e useSensorCardAction)', () => {
  it('interruttore: turn_off/turn_on e attesa fino alla conferma', async () => {
    const view = renderSensor([plug('on')], { entityId: 'switch.presa', type: 'toggle' }, { w: 2, h: 1 });
    const toggle = screen.getByRole('switch', { name: 'Presa' });
    fireEvent.click(toggle);
    expect(view.callService).toHaveBeenCalledWith('switch', 'turn_off', { entity_id: 'switch.presa' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('aria-busy', 'true');
    await flush();
    view.setEntities([plug('off')]);
    expect(toggle).not.toHaveAttribute('aria-busy');
    expect(screen.getByText('Aggiornato')).toBeInTheDocument();
  });

  it('1×1: l’icona è l’interruttore', () => {
    const view = renderSensor([plug('off')], { entityId: 'switch.presa' }, { w: 1, h: 1 });
    fireEvent.click(screen.getByRole('switch', { name: 'Presa' }));
    expect(view.callService).toHaveBeenCalledWith('switch', 'turn_on', { entity_id: 'switch.presa' });
  });

  it('errore del comando: messaggio e stato reale', async () => {
    const callService = serviceMock(async () => {
      throw new Error('no');
    });
    renderSensor([plug('on')], { entityId: 'switch.presa' }, { w: 2, h: 1 }, { callService });
    const toggle = screen.getByRole('switch', { name: 'Presa' });
    fireEvent.click(toggle);
    await flush();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Comando non riuscito')).toBeInTheDocument();
  });

  it('script e scena: turn_on dal pulsante dell’azione', async () => {
    const script = fixtureEntity('script.notte', 'off', { friendly_name: 'Buonanotte' });
    const view = renderSensor([script], { entityId: 'script.notte' }, { w: 2, h: 1 });
    fireEvent.click(screen.getByRole('button', { name: /Esegui/ }));
    expect(view.callService).toHaveBeenCalledWith('script', 'turn_on', { entity_id: 'script.notte' });
    await flush();
    expect(screen.getByText('Comando inviato')).toBeInTheDocument();
    view.unmount();

    const scene = fixtureEntity('scene.cinema', '2026-10-06T07:00:00Z', { friendly_name: 'Cinema' });
    const sceneView = renderSensor([scene], { entityId: 'scene.cinema' }, { w: 1, h: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Attiva la scena' }));
    expect(sceneView.callService).toHaveBeenCalledWith('scene', 'turn_on', { entity_id: 'scene.cinema' });
  });

  it('input_number: increment e decrement, fermi ai limiti', () => {
    const volume = fixtureEntity('input_number.volume', '5', {
      friendly_name: 'Volume',
      min: 0,
      max: 10,
      step: 1,
    });
    const view = renderSensor([volume], { entityId: 'input_number.volume' }, { w: 2, h: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta Volume' }));
    expect(view.callService).toHaveBeenLastCalledWith('input_number', 'increment', {
      entity_id: 'input_number.volume',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Diminuisci Volume' }));
    expect(view.callService).toHaveBeenLastCalledWith('input_number', 'decrement', {
      entity_id: 'input_number.volume',
    });
    view.unmount();
    renderSensor([fixtureEntity('input_number.volume', '10', { friendly_name: 'Volume', min: 0, max: 10 })], { entityId: 'input_number.volume' }, { w: 2, h: 1 });
    expect(screen.getByRole('button', { name: 'Aumenta Volume' })).toBeDisabled();
  });

  it('select: select_option con l’opzione scelta', () => {
    const mode = fixtureEntity('select.modalita', 'Eco', {
      friendly_name: 'Modalità caldaia',
      options: ['Eco', 'Comfort'],
    });
    const view = renderSensor([mode], { entityId: 'select.modalita' }, { w: 2, h: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Eco' }));
    fireEvent.click(screen.getByRole('button', { name: 'Comfort' }));
    expect(view.callService).toHaveBeenCalledWith('select', 'select_option', {
      entity_id: 'select.modalita',
      option: 'Comfort',
    });
  });

  it('senza connessione select e input_number non inviano nulla, come il legacy', () => {
    const volume = fixtureEntity('input_number.volume', '5', { friendly_name: 'Volume', min: 0, max: 10 });
    const view = renderSensor([volume], { entityId: 'input_number.volume' }, { w: 2, h: 1 }, { conn: null });
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta Volume' }));
    expect(view.callService).not.toHaveBeenCalled();
  });

  it('azione sulla scheda: il tocco esegue, il pulsante a parte apre i dettagli', () => {
    const openDetails = vi.fn();
    const view = renderSensor(
      [plug('on')],
      { entityId: 'switch.presa', sensorAction: { type: 'toggle', trigger: 'card' } },
      { w: 2, h: 1 },
      { openDetails }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(view.callService).toHaveBeenCalledWith('switch', 'turn_off', { entity_id: 'switch.presa' });
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli: Presa' }));
    expect(openDetails).toHaveBeenCalledWith('entity_card_1');
  });

  it('modalità modifica: nessun comando', () => {
    const view = renderSensor([plug('on')], { entityId: 'switch.presa' }, { w: 2, h: 1 }, { editMode: true });
    const toggle = screen.getByRole('switch', { name: 'Presa' });
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(view.callService).not.toHaveBeenCalled();
  });
});

describe('SensorDetails', () => {
  it('grafico della cronologia e scelta del periodo', async () => {
    const { conn, sendMessagePromise } = fakeConnection(
      historyResponder('sensor.temperatura', [19, 20, 21, 22])
    );
    renderWithRuntime(
      <SensorDetails id="entity_card_1" settingsKey="entity_card_1" settings={{ entityId: 'sensor.temperatura' }} onClose={() => undefined} />,
      { entities: fixtureEntities([temperature]), conn }
    );
    await flush();
    expect(screen.getByRole('img', { name: /Andamento nelle ultime 24 ore\. Minimo 19 °C, massimo 22 °C/ })).toBeInTheDocument();
    const detailed = sendMessagePromise.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(detailed).toMatchObject({ minimal_response: false, no_attributes: false });

    fireEvent.click(screen.getByRole('button', { name: '6 h' }));
    await flush();
    const last = sendMessagePromise.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    const start = new Date(String(last.start_time)).getTime();
    const end = new Date(String(last.end_time)).getTime();
    expect(Math.round((end - start) / 3_600_000)).toBe(6);
    expect(screen.getByRole('img', { name: /ultime 6 ore/ })).toBeInTheDocument();
  });

  it('registro delle attività per gli stati e informazioni dell’entità', async () => {
    const { conn } = fakeConnection((message) =>
      message.type === 'history/history_during_period'
        ? {
            'binary_sensor.porta': [
              { s: 'off', lc: NOW - 3600 },
              { s: 'on', lc: NOW - 60 },
            ],
          }
        : {}
    );
    renderWithRuntime(
      <SensorDetails id="entity_card_2" settingsKey="entity_card_2" settings={{ entityId: 'binary_sensor.porta' }} onClose={() => undefined} />,
      { entities: fixtureEntities([door]), conn }
    );
    await flush();
    expect(screen.getByRole('heading', { name: 'Registro' })).toBeInTheDocument();
    expect(screen.getAllByText('Chiusa').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Informazioni' })).toBeInTheDocument();
    expect(screen.getByText('binary_sensor.porta')).toBeInTheDocument();
  });

  it('select e interruttore anche nel foglio', () => {
    const callService = serviceMock();
    const { conn } = fakeConnection();
    renderWithRuntime(
      <SensorDetails id="entity_card_3" settingsKey="entity_card_3" settings={{ entityId: 'switch.presa' }} onClose={() => undefined} />,
      { entities: fixtureEntities([plug('off')]), conn, callService }
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Presa' }));
    expect(callService).toHaveBeenCalledWith('switch', 'turn_on', { entity_id: 'switch.presa' });
  });
});
