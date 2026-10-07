/**
 * Wave 3 contract of the control widgets: content only inside the launcher frame, the
 * `data-widget-open` target, `data-no-long-press` on held gestures, icons of the Icon
 * primitive and units from the HA configuration (WidgetRuntime.haConfig).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { HaConfig } from '@/@types/ha';
import type { CellSize, WidgetDefinition } from '@/@types/launcher';
import { isIconName } from '@/components/primitives';
import { controlsWidgets } from '@/components/widgets/controls';
import {
  ControlIcon,
  aliasIcon,
  localGlyphNames,
} from '@/components/widgets/controls/shared/ControlIcon';
import { buildSensorModel } from '@/components/widgets/controls/sensor/sensorModel';
import { SensorWidget } from '@/components/widgets/controls/sensor/SensorWidget';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime } from './ControlsHarness';

afterEach(() => {
  cleanup();
});

/** One configured card per definition of the group, with the entities it needs. */
const CASES: Record<string, { id: string; settings: CardSettings; entities: HassEntity[] }> = {
  light: {
    id: 'light.cucina',
    settings: {},
    entities: [
      fixtureEntity('light.cucina', 'on', {
        friendly_name: 'Luce cucina',
        supported_color_modes: ['brightness'],
        brightness: 128,
      }),
    ],
  },
  lock: {
    id: 'lock.ingresso',
    settings: {},
    entities: [fixtureEntity('lock.ingresso', 'locked', { friendly_name: 'Porta di casa' })],
  },
  fan: {
    id: 'fan.soffitto',
    settings: {},
    entities: [
      fixtureEntity('fan.soffitto', 'on', {
        friendly_name: 'Ventilatore',
        supported_features: 1 | 16 | 32,
        percentage: 40,
      }),
    ],
  },
  cover: {
    id: 'cover_card_1',
    settings: { coverId: 'cover.salotto' },
    entities: [
      fixtureEntity('cover.salotto', 'open', {
        friendly_name: 'Tapparella',
        supported_features: 15,
        current_position: 60,
      }),
    ],
  },
  automation: {
    id: 'automation.notte',
    settings: {},
    entities: [fixtureEntity('automation.notte', 'on', { friendly_name: 'Luci della notte' })],
  },
  sensor: {
    id: 'entity_card_1',
    settings: { entityId: 'sensor.temperatura' },
    entities: [
      fixtureEntity('sensor.temperatura', '21.5', {
        friendly_name: 'Temperatura',
        unit_of_measurement: '°C',
        device_class: 'temperature',
      }),
    ],
  },
};

/** Every size from min to max of a definition. */
function sizesOf(definition: WidgetDefinition): CellSize[] {
  const sizes: CellSize[] = [];
  for (let w = definition.sizes.min.w; w <= definition.sizes.max.w; w += 1) {
    for (let h = definition.sizes.min.h; h <= definition.sizes.max.h; h += 1) sizes.push({ w, h });
  }
  return sizes;
}

function mountDefinition(
  definition: WidgetDefinition,
  size: CellSize,
  options: { editMode?: boolean; openDetails?: (id: string) => void; entities?: HassEntity[] } = {}
) {
  const config = CASES[definition.type];
  if (!config) throw new Error(`no case for ${definition.type}`);
  const { Widget } = definition;
  return renderWithRuntime(
    <Widget
      id={config.id}
      settingsKey={config.id}
      settings={config.settings}
      size={size}
      editMode={options.editMode ?? false}
    />,
    {
      entities: fixtureEntities(options.entities ?? config.entities),
      conn: fakeConnection().conn,
      openDetails: options.openDetails ?? (() => undefined),
    }
  );
}

describe('cornice: il widget disegna solo contenuto dentro WidgetHost', () => {
  for (const definition of controlsWidgets) {
    it(`${definition.type}: nessuna card propria, in ogni dimensione e stato`, () => {
      for (const size of sizesOf(definition)) {
        for (const state of ['ready', 'loading', 'missing'] as const) {
          const view =
            state === 'loading'
              ? renderWithRuntime(
                  <definition.Widget
                    id={CASES[definition.type]?.id ?? ''}
                    settingsKey="x"
                    settings={CASES[definition.type]?.settings ?? {}}
                    size={size}
                    editMode={false}
                  />,
                  { entitiesLoaded: false }
                )
              : mountDefinition(definition, size, state === 'missing' ? { entities: [] } : {});
          const root = view.container.firstElementChild;
          expect(root).toHaveClass('ctl-widget');
          expect(root).not.toHaveClass('aca-m');
          expect(view.container.querySelector('.aca-m--card')).toBeNull();
          view.unmount();
        }
      }
      expect(definition.frameless).toBeFalsy();
    });
  }
});

describe('data-widget-open: il pulsante trasparente che apre i dettagli', () => {
  for (const definition of controlsWidgets) {
    it(`${definition.type}: un solo bersaglio marcato, apre i dettagli, disabilitato in modifica`, () => {
      const openDetails = vi.fn();
      const view = mountDefinition(definition, definition.sizes.default, { openDetails });
      const targets = view.container.querySelectorAll('[data-widget-open]');
      expect(targets).toHaveLength(1);
      const target = targets[0] as HTMLButtonElement;
      expect(target.tagName).toBe('BUTTON');
      expect(target).toHaveAccessibleName(/^Dettagli: /);
      fireEvent.click(target);
      expect(openDetails).toHaveBeenCalledWith(CASES[definition.type]?.id);
      // The commands of the widget are not the opener: they sit outside it.
      for (const control of view.container.querySelectorAll('.ctl-widget__body button')) {
        expect(control).not.toHaveAttribute('data-widget-open');
      }
      view.unmount();

      const editing = mountDefinition(definition, definition.sizes.default, { editMode: true });
      expect(editing.container.querySelector('[data-widget-open]')).toBeDisabled();
    });
  }

  it('entità mancante: nessun bersaglio che apra dettagli vuoti', () => {
    const light = controlsWidgets.find((definition) => definition.type === 'light');
    if (!light) throw new Error('light');
    const view = mountDefinition(light, { w: 2, h: 2 }, { entities: [] });
    expect(view.container.querySelector('[data-widget-open]')).toBeNull();
  });
});

describe('data-no-long-press sui gesti che tengono il puntatore', () => {
  const definition = (type: string) => {
    const found = controlsWidgets.find((item) => item.type === type);
    if (!found) throw new Error(type);
    return found;
  };

  it('manopola della luce: solo quando la luminosità si regola col gesto', () => {
    mountDefinition(definition('light'), { w: 1, h: 1 });
    expect(screen.getByRole('switch', { name: 'Luce cucina' })).toHaveAttribute(
      'data-no-long-press'
    );
    cleanup();
    mountDefinition(
      definition('light'),
      { w: 1, h: 1 },
      {
        entities: [
          fixtureEntity('light.cucina', 'on', {
            friendly_name: 'Luce cucina',
            supported_color_modes: ['onoff'],
          }),
        ],
      }
    );
    expect(screen.getByRole('switch', { name: 'Luce cucina' })).not.toHaveAttribute(
      'data-no-long-press'
    );
  });

  it.each([
    ['light', { w: 2, h: 2 }, 'Luminosità di Luce cucina'],
    ['fan', { w: 2, h: 1 }, 'Velocità di Ventilatore'],
    ['cover', { w: 2, h: 2 }, 'Apertura di Tapparella'],
  ])('cursore del widget %s', (type, size, name) => {
    mountDefinition(definition(type), size);
    expect(screen.getByRole('slider', { name })).toHaveAttribute('data-no-long-press');
  });
});

describe('icone: nomi della primitiva Icon', () => {
  it('ogni WidgetDefinition usa un nome della primitiva', () => {
    for (const definition of controlsWidgets) expect(isIconName(definition.icon)).toBe(true);
  });

  it('i glifi locali esistono davvero a runtime e non duplicano la primitiva', () => {
    for (const name of localGlyphNames) {
      expect(isIconName(name)).toBe(false);
      const { container } = render(<ControlIcon name={name} size="md" />);
      expect(container.querySelector('svg')).not.toBeNull();
      cleanup();
    }
  });

  it('i nomi della primitiva passano dal componente Icon', () => {
    const { container } = render(<ControlIcon name="blinds" size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('aca-icon', 'aca-icon--sm');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('alias legacy e nomi del kit', () => {
    expect(aliasIcon('mdi:thermometer')).toBe('thermostat');
    expect(aliasIcon('Lightbulb')).toBe('light');
    expect(aliasIcon('window-shutter')).toBe('blinds');
    expect(aliasIcon('vacuum')).toBe('vacuum');
    expect(aliasIcon('robot')).toBe('automation');
    expect(aliasIcon('sconosciuta')).toBeNull();
  });
});

describe('unità dalla configurazione di Home Assistant (haConfig.unit_system)', () => {
  const imperial: HaConfig = {
    unit_system: { temperature: '°F', length: 'mi', pressure: 'psi', wind_speed: 'mph' },
  };
  const metric: HaConfig = {
    unit_system: { temperature: '°C', length: 'km', pressure: 'hPa', wind_speed: 'km/h' },
  };
  const fahrenheit = fixtureEntity('sensor.esterno', '68', {
    friendly_name: 'Esterno',
    unit_of_measurement: '°F',
    device_class: 'temperature',
  });
  const celsius = fixtureEntity('sensor.esterno', '20', {
    friendly_name: 'Esterno',
    unit_of_measurement: '°C',
    device_class: 'temperature',
  });
  const settings = { entityId: 'sensor.esterno' };

  it('HA metrico: un sensore in °F si mostra in °C', () => {
    const model = buildSensorModel(settings, fahrenheit, fixtureEntities([fahrenheit]), metric);
    expect(model.unit).toBe('°C');
    expect(model.displayState).toBe('20');
  });

  it('HA imperiale: un sensore in °C si mostra in °F', () => {
    const model = buildSensorModel(settings, celsius, fixtureEntities([celsius]), imperial);
    expect(model.unit).toBe('°F');
    expect(model.displayState).toBe('68');
  });

  it('configurazione non ancora caricata: resta l’unità della sorgente', () => {
    const model = buildSensorModel(settings, fahrenheit, fixtureEntities([fahrenheit]), null);
    expect(model.unit).toBe('°F');
    expect(model.displayState).toBe('68');
  });

  it('attributo di temperatura del clima senza unità: quella di HA', () => {
    const climate = fixtureEntity('climate.soggiorno', 'heat', { current_temperature: 21 });
    const model = buildSensorModel(
      {
        entityId: 'climate.soggiorno',
        sensorStatusMode: 'attribute',
        sensorStatusAttribute: 'current_temperature',
      },
      climate,
      fixtureEntities([climate]),
      metric
    );
    expect(model.config.statusMode).toBe('attribute');
    expect(model.unit).toBe('°C');
    expect(model.displayState).toBe('21');
  });

  it('intervallo da un’entità convertito nello stesso sistema del valore', () => {
    const limit = fixtureEntity('sensor.limite', '86', {
      unit_of_measurement: '°F',
      device_class: 'temperature',
    });
    const model = buildSensorModel(
      {
        entityId: 'sensor.esterno',
        sensorVariant: 'gauge',
        sensorMin: 0,
        sensorMaxType: 'entity',
        sensorMaxEntity: 'sensor.limite',
      },
      celsius,
      fixtureEntities([celsius, limit]),
      metric
    );
    expect(model.chartMax).toBeCloseTo(30, 5);
  });

  it('il widget legge haConfig dal runtime', () => {
    renderWithRuntime(
      <SensorWidget
        id="entity_card_1"
        settingsKey="entity_card_1"
        settings={settings}
        size={{ w: 1, h: 1 }}
        editMode={false}
      />,
      { entities: fixtureEntities([fahrenheit]), haConfig: metric }
    );
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('°C', { exact: false })).toBeInTheDocument();
    cleanup();
    renderWithRuntime(
      <SensorWidget
        id="entity_card_1"
        settingsKey="entity_card_1"
        settings={settings}
        size={{ w: 1, h: 1 }}
        editMode={false}
      />,
      { entities: fixtureEntities([celsius]), haConfig: imperial }
    );
    expect(screen.getByText('68')).toBeInTheDocument();
    expect(screen.getByText('°F', { exact: false })).toBeInTheDocument();
  });
});
