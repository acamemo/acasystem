/**
 * Launcher contract of the comfort widgets (wave 3): content only inside the WidgetHost frame,
 * a transparent details opener marked `data-widget-open`, no long press from gestures that hold
 * the pointer, units from the HA unit system (runtime.haConfig) when the entity has none.
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { HaConfig, HaMessage } from '@/@types/ha';
import type { CellSize, WidgetDefinition, WidgetRuntime } from '@/@types/launcher';
import { alarmWidget } from '@/components/widgets/home/alarm';
import { calendarWidget } from '@/components/widgets/home/calendar';
import { climateWidget } from '@/components/widgets/home/climate';
import { todoWidget } from '@/components/widgets/home/todo';
import { weatherWidget } from '@/components/widgets/home/weather';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderDetails, renderWidget, serviceMock } from './ComfortHarness';

afterEach(cleanup);

const entities = fixtureEntities([
  fixtureEntity('climate.soggiorno', 'heat', {
    friendly_name: 'Soggiorno',
    current_temperature: 20.5,
    temperature: 21,
    min_temp: 7,
    max_temp: 35,
    hvac_action: 'heating',
    hvac_modes: ['off', 'heat'],
  }),
  fixtureEntity('weather.casa', 'sunny', { friendly_name: 'Casa', temperature: 17.4 }),
  fixtureEntity('calendar.famiglia', 'off', { friendly_name: 'Famiglia' }),
  fixtureEntity('todo.spesa', '0', { friendly_name: 'Spesa' }),
  fixtureEntity('alarm_control_panel.casa', 'disarmed', {
    friendly_name: 'Centrale',
    supported_features: 1 + 2,
    code_format: null,
  }),
]);

/** HA answering the reads of calendar and to-do with empty data. */
const { conn } = fakeConnection((message: HaMessage) => {
  if (message.service === 'get_events') return { response: {} };
  if (message.type === 'todo/item/list') return { items: [] };
  return null;
});

interface ContractCase {
  definition: WidgetDefinition;
  id: string;
  settings: CardSettings;
  opener: string;
}

const CASES: ContractCase[] = [
  {
    definition: climateWidget,
    id: 'climate_card_1',
    settings: { climateId: 'climate.soggiorno' },
    opener: 'Apri i dettagli di Soggiorno',
  },
  {
    definition: weatherWidget,
    id: 'weather_temp_1',
    settings: { weatherId: 'weather.casa' },
    opener: 'Apri il meteo di Casa',
  },
  {
    definition: calendarWidget,
    id: 'calendar_card_1',
    settings: { calendars: ['calendar.famiglia'], name: 'Agenda' },
    opener: 'Apri il calendario Agenda',
  },
  {
    definition: todoWidget,
    id: 'todo_card_1',
    settings: { todoEntityId: 'todo.spesa' },
    opener: 'Apri la lista Spesa',
  },
  {
    definition: alarmWidget,
    id: 'alarm_card_1',
    settings: { alarmId: 'alarm_control_panel.casa' },
    opener: 'Apri l’allarme Centrale',
  },
];

const sizesOf = (definition: WidgetDefinition): CellSize[] => {
  const { min, max } = definition.sizes;
  const sizes: CellSize[] = [];
  for (let w = min.w; w <= max.w; w += 1) {
    for (let h = min.h; h <= max.h; h += 1) sizes.push({ w, h });
  }
  return sizes;
};

/** No material of the kit drawn as a card or filling the cells: that is the launcher frame. */
function expectContentOnly(container: HTMLElement, label: string) {
  const root = container.firstElementChild;
  expect(root, label).not.toBeNull();
  expect(root, label).not.toHaveClass('aca-m');
  expect(container.querySelector('.aca-m--card, .aca-m--fill'), label).toBeNull();
}

describe('Contenuto nella cornice del launcher', () => {
  it.each(CASES.map((item) => [item.definition.type, item] as const))(
    '%s: nessuna cornice propria in ogni taglia',
    async (_type, { definition, id, settings, opener }) => {
      for (const size of sizesOf(definition)) {
        const view = renderWidget(definition, { id, settings, size, runtime: { entities, conn } });
        await screen.findByRole('button', { name: opener });
        expectContentOnly(view.container, `${definition.type} ${size.w}×${size.h}`);
        view.unmount();
      }
    }
  );

  it.each(CASES.map((item) => [item.definition.type, item] as const))(
    '%s: anche caricamento ed entità mancante non disegnano una card',
    (_type, { definition, id, settings }) => {
      const loading = renderWidget(definition, {
        id,
        settings,
        runtime: { entitiesLoaded: false },
      });
      expect(loading.container.querySelector('[role="status"]')).not.toBeNull();
      expectContentOnly(loading.container, `${definition.type} in caricamento`);
      loading.unmount();
      const missing = renderWidget(definition, { id, settings: {}, runtime: { entities: {} } });
      expectContentOnly(missing.container, `${definition.type} da configurare`);
      missing.unmount();
    }
  );
});

describe('Area che apre i dettagli: pulsante trasparente con data-widget-open', () => {
  it.each(CASES.map((item) => [item.definition.type, item] as const))(
    '%s: un solo apri-dettagli, vuoto, fuori dai comandi; il tocco apre il foglio',
    async (_type, { definition, id, settings, opener }) => {
      const openDetails = vi.fn();
      const { container } = renderWidget(definition, {
        id,
        settings,
        runtime: { entities, conn, openDetails },
      });
      const button = await screen.findByRole('button', { name: opener });
      const marked = container.querySelectorAll('[data-widget-open]');
      expect(marked).toHaveLength(1);
      expect(marked[0]).toBe(button);
      expect(button).toHaveAttribute('aria-haspopup', 'dialog');
      expect(button).toHaveClass('home-widget__press');
      expect(button).toBeEmptyDOMElement();
      // The widget's own commands are not inside the opener, so they never press the frame.
      for (const control of within(container).getAllByRole('button')) {
        if (control !== button) expect(control.closest('[data-widget-open]')).toBeNull();
      }
      fireEvent.click(button);
      expect(openDetails).toHaveBeenCalledWith(id);
    }
  );

  it.each(CASES.map((item) => [item.definition.type, item] as const))(
    '%s: in modalità modifica nessun apri-dettagli (il launcher gestisce tocchi e trascinamento)',
    async (_type, { definition, id, settings, opener }) => {
      const { container } = renderWidget(definition, {
        id,
        settings,
        editMode: true,
        runtime: { entities, conn },
      });
      await waitFor(() => expect(container.querySelector('.aca-skeleton')).toBeNull());
      expect(screen.queryByRole('button', { name: opener })).not.toBeInTheDocument();
      expect(container.querySelector('[data-widget-open]')).toBeNull();
    }
  );

  it('clima con tapAction toggle: il tocco esegue il comando, quindi non è un apri-dettagli', () => {
    const callService = serviceMock();
    const { container } = renderWidget(climateWidget, {
      id: 'climate_card_1',
      settings: { climateId: 'climate.soggiorno', tapAction: 'toggle' },
      runtime: { entities, callService },
    });
    const tap = screen.getByRole('button', { name: 'Accendi o spegni Soggiorno' });
    expect(tap).not.toHaveAttribute('data-widget-open');
    expect(tap).not.toHaveAttribute('aria-haspopup');
    expect(container.querySelector('[data-widget-open]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Dettagli di Soggiorno' })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
  });
});

describe('Gesti che tengono il puntatore: niente pressione prolungata', () => {
  it('il cursore della temperatura nei dettagli del clima', () => {
    renderDetails(climateWidget, {
      id: 'climate_card_1',
      settings: { climateId: 'climate.soggiorno' },
      runtime: { entities },
    });
    const slider = screen.getByRole('slider', { name: 'Temperatura desiderata' });
    expect(slider.closest('[data-no-long-press]')).not.toBeNull();
  });

  it('la riga delle previsioni scorrevole nei dettagli del meteo', () => {
    const forecast = Array.from({ length: 4 }, (_, index) => ({
      datetime: new Date(Date.UTC(2026, 9, 6, 10 + index)).toISOString(),
      condition: 'sunny',
      temperature: 18 + index,
    }));
    renderDetails(weatherWidget, {
      id: 'weather_temp_1',
      settings: { weatherId: 'weather.casa' },
      runtime: {
        entities: fixtureEntities([fixtureEntity('weather.casa', 'sunny', { forecast })]),
      },
    });
    expect(screen.getByRole('list', { name: 'Previsioni orarie' })).toHaveAttribute(
      'data-no-long-press'
    );
  });
});

const IMPERIAL: HaConfig = {
  unit_system: {
    temperature: '°F',
    length: 'mi',
    mass: 'lb',
    volume: 'gal',
    pressure: 'inHg',
    wind_speed: 'mph',
    accumulated_precipitation: 'in',
  },
  currency: 'USD',
  time_zone: 'America/New_York',
};

const fahrenheitThermostat = (attributes: Record<string, unknown> = {}) =>
  fixtureEntities([
    fixtureEntity('climate.soggiorno', 'heat', {
      friendly_name: 'Soggiorno',
      current_temperature: 68,
      temperature: 70,
      min_temp: 45,
      max_temp: 95,
      hvac_action: 'heating',
      ...attributes,
    }),
  ]);

function renderClimate(runtime: Partial<WidgetRuntime>) {
  return renderWidget(climateWidget, {
    id: 'climate_card_1',
    settings: { climateId: 'climate.soggiorno' },
    size: { w: 2, h: 2 },
    runtime,
  });
}

describe('Unità dal sistema di Home Assistant (haConfig)', () => {
  it('clima: senza unità sull’entità usa unit_system.temperature', () => {
    renderClimate({ entities: fahrenheitThermostat(), haConfig: IMPERIAL });
    const card = screen.getByRole('group', { name: 'Soggiorno' });
    expect(within(card).getByText('68 °F')).toBeInTheDocument();
    expect(card.querySelector('.home-stepper__number')).toHaveTextContent('70 °F');
    expect(within(card).queryByText(/°C/)).not.toBeInTheDocument();
  });

  it('clima: l’unità riportata dall’entità prevale; senza haConfig resta °C come il legacy', () => {
    const { update } = renderClimate({
      entities: fahrenheitThermostat({ temperature_unit: '°C' }),
      haConfig: IMPERIAL,
    });
    expect(screen.getByText('68 °C')).toBeInTheDocument();
    update({
      id: 'climate_card_1',
      settings: { climateId: 'climate.soggiorno' },
      size: { w: 2, h: 2 },
      runtime: { entities: fahrenheitThermostat(), haConfig: null },
    });
    expect(screen.getByText('68 °C')).toBeInTheDocument();
  });

  it('clima, dettagli: valore, obiettivo e limiti nell’unità di HA', () => {
    renderDetails(climateWidget, {
      id: 'climate_card_1',
      settings: { climateId: 'climate.soggiorno' },
      runtime: { entities: fahrenheitThermostat(), haConfig: IMPERIAL },
    });
    expect(screen.getByText('68 °F')).toBeInTheDocument();
    expect(screen.getByText('70 °F')).toBeInTheDocument();
    expect(screen.getByText('45 °F')).toBeInTheDocument();
    expect(screen.getByText('95 °F')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Temperatura desiderata' })).toHaveAttribute(
      'aria-valuetext',
      '70 °F'
    );
  });

  const bareWeather = (attributes: Record<string, unknown> = {}) =>
    fixtureEntity('weather.casa', 'sunny', {
      friendly_name: 'Casa',
      temperature: 63.3,
      humidity: 62,
      pressure: 29.9,
      wind_speed: 8,
      dew_point: 49,
      precipitation: 0.2,
      ...attributes,
    });

  it('meteo: widget e dettagli senza unità sull’entità usano temperatura, pressione, vento e pioggia di HA', () => {
    renderWidget(weatherWidget, {
      id: 'weather_temp_1',
      settings: { weatherId: 'weather.casa' },
      size: { w: 2, h: 1 },
      runtime: { entities: fixtureEntities([bareWeather()]), haConfig: IMPERIAL },
    });
    expect(screen.getByText('63,3 °F')).toBeInTheDocument();
    cleanup();

    renderDetails(weatherWidget, {
      id: 'weather_temp_1',
      settings: { weatherId: 'weather.casa' },
      runtime: { entities: fixtureEntities([bareWeather()]), haConfig: IMPERIAL },
    });
    expect(screen.getByText('63,3 °F')).toBeInTheDocument();
    expect(screen.getByText('30 inHg')).toBeInTheDocument();
    expect(screen.getByText('8 mph')).toBeInTheDocument();
    expect(screen.getByText('49 °F')).toBeInTheDocument();
    expect(screen.getByText('0,2 in')).toBeInTheDocument();
  });

  it('meteo: le unità dell’entità prevalgono su quelle del sistema', () => {
    renderDetails(weatherWidget, {
      id: 'weather_temp_1',
      settings: { weatherId: 'weather.casa' },
      runtime: {
        entities: fixtureEntities([
          bareWeather({
            temperature: 17.4,
            temperature_unit: '°C',
            pressure: 1013,
            pressure_unit: 'hPa',
            wind_speed: 12,
            wind_speed_unit: 'km/h',
          }),
        ]),
        haConfig: IMPERIAL,
      },
    });
    expect(screen.getByText('17,4 °C')).toBeInTheDocument();
    expect(screen.getByText('1013 hPa')).toBeInTheDocument();
    expect(screen.getByText('12 km/h')).toBeInTheDocument();
  });

  it('meteo con sensore: il valore attuale nell’unità del sensore, le previsioni in quella del meteo', () => {
    const forecast = Array.from({ length: 4 }, (_, index) => ({
      datetime: new Date(Date.now() + (index + 1) * 3600 * 1000).toISOString(),
      condition: 'sunny',
      temperature: 60 + index,
    }));
    renderWidget(weatherWidget, {
      id: 'weather_temp_1',
      settings: { weatherId: 'weather.casa', tempId: 'sensor.esterno' },
      size: { w: 4, h: 1 },
      runtime: {
        entities: fixtureEntities([
          bareWeather({ forecast }),
          fixtureEntity('sensor.esterno', '15.2', { unit_of_measurement: '°C' }),
        ]),
        haConfig: IMPERIAL,
      },
    });
    expect(screen.getByText('15,2 °C')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Previsioni orarie' });
    expect(within(list).getByText('60 °F')).toBeInTheDocument();
  });
});
