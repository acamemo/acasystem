import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CarWidget } from '@/components/widgets/utilities/car/CarWidget';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { CAR_SOURCE_FIELDS, configuredCarSources } from '@/domain/car/carSources';
import { ADD_WIDGET_TYPES } from '@/domain/launcher/catalog';
import { isCategoryWidgetReady, isCategoryWidgetUnbound } from '@/domain/launcher/categoryPages';
import { boundEntityIds } from '@/utils/devices/bound';
import { widgetDisplayName } from '@/utils/launcher/names';
import { FAMILY_ORDER } from '@/utils/devices/classify';
import { createCategoryWidgetSeed } from '@/utils/launcher/categoryModels';
import { mockBindingSettings, mockHouse } from '@/utils/mockup/mockData';
import { categoryEntityId, kindOf } from '../../../contracts/widgetIdentity';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { renderWithRuntime, serviceMock } from './ControlsHarness';

afterEach(cleanup);

describe('Auto: percorsi comuni e conservazione', () => {
  it.each(CAR_SOURCE_FIELDS.map((field) => field.key))(
    'la sola fonte %s rende pronto il widget senza cambiare la sua identità',
    (key) => {
      const settings = { categoryWidgetType: 'car', [key]: 'sensor.explicit' };
      expect(isCategoryWidgetReady(settings)).toBe(true);
      expect(isCategoryWidgetUnbound(settings)).toBe(false);
      expect(kindOf('car_card_stable', settings)).toBe('car');
      expect(categoryEntityId('car', settings)).toBe(
        key === 'batteryId' ? 'sensor.explicit' : undefined
      );
    }
  );
  it('ricarica legacy o array sono utilizzabili senza batteria; la sola foto non è una fonte', () => {
    expect(
      isCategoryWidgetReady({ categoryWidgetType: 'car', chargingId: 'binary_sensor.charge' })
    ).toBe(true);
    expect(
      isCategoryWidgetReady({ categoryWidgetType: 'car', chargeControlIds: ['switch.charge'] })
    ).toBe(true);
    expect(isCategoryWidgetReady({ categoryWidgetType: 'car', imageUrl: '/local/car.png' })).toBe(
      false
    );
    expect(isCategoryWidgetReady({ categoryWidgetType: 'car', chargeControlIds: [] })).toBe(false);
  });
  it('catalogo e registrazione mantengono car, anteprima e dettagli comuni', () => {
    const seed = createCategoryWidgetSeed('car', 'stable')!;
    expect(seed.id).toBe('car_card_stable');
    expect(seed.settings).toEqual({ categoryWidgetType: 'car' });
    expect(isCategoryWidgetUnbound(seed.settings)).toBe(true);
    expect(ADD_WIDGET_TYPES.find((item) => item.type === 'car')?.flow).toBe('simple');
    expect(ADD_WIDGET_TYPES.slice(0, 2).map((item) => item.type)).toEqual(['rileva', 'tavano']);
    expect(findWidgetDefinition(seed.id, seed.settings)?.Console).toBeDefined();
    expect(findWidgetDefinition('car', {})?.Console).toBeDefined();
    expect(FAMILY_ORDER).toHaveLength(14);
    expect(FAMILY_ORDER).not.toContain('car');
  });
  it('indice delle fonti completo per Auto, separato dalla memoria batteryId e dagli altri tipi', () => {
    const settings = {
      categoryWidgetType: 'car',
      batteryId: 'sensor.battery',
      chargingId: 'binary_sensor.old_charge',
      chargingStateId: 'binary_sensor.charge',
      tempId: 'sensor.temperature',
      chargeControlId: 'switch.single',
      chargeControlIds: ['button.extra', 'switch.single'],
      latitudeId: 'sensor.latitude',
      longitudeId: 'sensor.longitude',
      apiStatusId: 'sensor.api',
      imageUrl: '/local/car.png',
    };
    expect(categoryEntityId('car', settings)).toBe('sensor.battery');
    const bound = boundEntityIds(
      { pages: ['hidden'], header: [], hidden: ['car_card_stable'] },
      { 'hidden::car_card_stable': settings }
    );
    expect([...bound].sort()).toEqual(
      [
        'sensor.battery',
        'binary_sensor.old_charge',
        'binary_sensor.charge',
        'sensor.temperature',
        'switch.single',
        'button.extra',
        'sensor.latitude',
        'sensor.longitude',
        'sensor.api',
      ].sort()
    );
    const other = boundEntityIds(
      { pages: ['home'], header: [], home: ['entity_card_stable'] },
      {
        'home::entity_card_stable': {
          categoryWidgetType: 'sensor',
          entityId: 'sensor.reading',
          chargingId: 'sensor.ignored',
          chargeControlIds: ['switch.ignored'],
          tempId: 'sensor.ignored_temp',
        },
      }
    );
    expect([...other]).toEqual(['sensor.reading']);
  });
  it('il raccordo Home usa Auto readonly e i dettagli non assumono fonti dagli attributi', () => {
    const callService = serviceMock();
    const entities = fixtureEntities([
      fixtureEntity('sensor.battery', '82', {
        unit_of_measurement: '%',
        range: 999,
        charging: true,
      }),
      fixtureEntity('sensor.range', '215', { unit_of_measurement: 'mi', device_class: 'distance' }),
    ]);
    const base = {
      type: 'car',
      id: 'car_card_stable',
      settingsKey: 'home::car_card_stable',
      entityId: 'sensor.battery',
      settings: { categoryWidgetType: 'car', batteryId: 'sensor.battery', rangeId: 'sensor.range' },
      size: { w: 2, h: 2 },
      editMode: false,
    };
    const view = renderWithRuntime(<AdaptiveCategoryWidget {...base} />, {
      entities,
      entitiesLoaded: true,
      callService,
    });
    expect(view.container.querySelector('.aca-adaptive-widget')).toBeNull();
    expect(view.container.textContent).toContain('82');
    expect(view.container.textContent).toContain('215');
    expect(view.container.textContent).toContain('mi');
    expect(view.container.textContent).not.toContain('999');
    expect(view.container.textContent).not.toContain('In carica');
    expect(view.container.querySelector('input,select,[role="slider"],[role="switch"]')).toBeNull();
    expect(callService).not.toHaveBeenCalled();
  });
  it.each(['car', 'car_card_stable', 'generic'])(
    'Home e Console di Auto usano lo stesso nome, senza prendere quello della serratura (%s)',
    (id) => {
      const entities = fixtureEntities([
        fixtureEntity('lock.car', 'locked', { friendly_name: 'Porte auto' }),
        fixtureEntity('climate.car', 'off', { friendly_name: 'Clima abitacolo' }),
      ]);
      const settings = { categoryWidgetType: 'car', lockId: 'lock.car', climateId: 'climate.car' };
      expect(widgetDisplayName(id, settings, entities, {}, 'Auto')).toBe('Auto');
      const view = renderWithRuntime(
        <CarWidget
          id={id}
          settingsKey={`home::${id}`}
          settings={settings}
          size={{ w: 2, h: 2 }}
          editMode={false}
        />,
        { entities, entitiesLoaded: true }
      );
      expect(view.container.querySelector('.car-widget__name')).toHaveTextContent('Auto');
      expect(view.container.querySelector('.car-widget__name')).not.toHaveTextContent('Porte auto');
    }
  );
  it('conserva i nomi espliciti di Auto e la risoluzione delle altre famiglie', () => {
    const entities = fixtureEntities([
      fixtureEntity('lock.car', 'locked', { friendly_name: 'Porte auto' }),
    ]);
    const settings = {
      categoryWidgetType: 'car',
      lockId: 'lock.car',
      name: 'Auto personale',
      heading: 'Intestazione precedente',
    };
    expect(
      widgetDisplayName(
        'car_card_stable',
        settings,
        entities,
        { car_card_stable: 'La mia auto' },
        'Auto'
      )
    ).toBe('La mia auto');
    expect(widgetDisplayName('car_card_stable', settings, entities, {}, 'Auto')).toBe(
      'Auto personale'
    );
    expect(
      widgetDisplayName('car_card_stable', { ...settings, name: '' }, entities, {}, 'Auto')
    ).toBe('Intestazione precedente');
    expect(
      widgetDisplayName('lock_card_stable', { lockId: 'lock.car' }, entities, {}, 'Serratura')
    ).toBe('Porte auto');
  });
  it('la compatta mostra nome e lettura principale senza sovrapporre icona, immagine o stato', () => {
    const entities = fixtureEntities([
      fixtureEntity('sensor.battery', '82', { unit_of_measurement: '%' }),
      fixtureEntity('sensor.range', '215', { unit_of_measurement: 'km' }),
      fixtureEntity('binary_sensor.charging', 'on', { device_class: 'battery_charging' }),
    ]);
    const view = renderWithRuntime(
      <CarWidget
        id="car_card_compact"
        settingsKey="home::car_card_compact"
        settings={{
          batteryId: 'sensor.battery',
          rangeId: 'sensor.range',
          chargingStateId: 'binary_sensor.charging',
          imageUrl: '/local/car.png',
        }}
        size={{ w: 2, h: 1 }}
        editMode={false}
      />,
      { entities, entitiesLoaded: true }
    );
    expect(view.container.textContent).toContain('82 %');
    expect(view.container.textContent).not.toContain('215');
    expect(view.container.querySelector('.car-widget__status')).toBeNull();
    expect(view.container.querySelector('.car-widget__card > .sr-only')).toHaveTextContent(
      'In carica'
    );
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.querySelector('.utility-head svg')).toBeNull();
  });
  it('il percorso cold prepara soltanto fonti esplicite della vettura simulata', () => {
    const house = mockHouse('normal'),
      settings = mockBindingSettings('car'),
      sources = configuredCarSources(settings);
    expect(settings.productDevice).toBeUndefined();
    expect(sources.ids.climateId).toBe('climate.auto_abitacolo');
    expect(sources.ids.lockId).toBe('lock.auto_porte');
    expect(sources.ids.locationId).toBe('device_tracker.auto_posizione');
    for (const id of new Set([...Object.values(sources.ids), ...sources.chargeControlIds]))
      expect(house.entities[id!]).toBeDefined();
    expect(Object.values(sources.ids)).not.toContain('climate.termostato_soggiorno');
    expect(Object.values(sources.ids)).not.toContain('lock.porta_ingresso');
  });
});
