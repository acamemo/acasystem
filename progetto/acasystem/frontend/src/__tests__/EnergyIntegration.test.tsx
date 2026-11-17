import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import { findWidgetDefinition } from '@/components/widgets/registry';
import {
  energyReading,
  parseEnergyPriceSlots,
} from '@/components/widgets/utilities/energy/energyModel';
import { EnergyBindingSection } from '@/templates/sheets/EnergyBindingSection';
import { candidateEntityIds, ADD_WIDGET_TYPES } from '@/domain/launcher/catalog';
import { isCategoryWidgetReady, isCategoryWidgetUnbound } from '@/domain/launcher/categoryPages';
import { createCategoryWidgetSeed } from '@/utils/launcher/categoryModels';
import { boundEntityIds } from '@/utils/devices/bound';
import { classifyDevices, FAMILY_ORDER } from '@/utils/devices/classify';
import { buildRegistries, mockHouse } from '@/utils/mockup/mockData';
import { buildMockupSeed } from '@/utils/mockup/seed';
import { kindOf, categoryEntityId } from '../../../contracts/widgetIdentity';
import { isProductDeviceBinding } from '../../../contracts/productDevice';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { renderWithRuntime, serviceMock } from './ControlsHarness';

afterEach(cleanup);
const entities = fixtureEntities([
  fixtureEntity('sensor.power', '830', {
    friendly_name: 'Potenza casa',
    device_class: 'power',
    unit_of_measurement: 'W',
  }),
  fixtureEntity('sensor.energy', '8.4', {
    friendly_name: 'Energia misurata',
    device_class: 'energy',
    unit_of_measurement: 'kWh',
  }),
  fixtureEntity('sensor.today', '2.84', {
    friendly_name: 'Costo oggi',
    device_class: 'monetary',
    unit_of_measurement: 'EUR',
  }),
  fixtureEntity('sensor.month', '48.2', {
    friendly_name: 'Costo mese',
    device_class: 'monetary',
    unit_of_measurement: 'EUR',
  }),
  fixtureEntity('sensor.price', '-0.05', {
    friendly_name: 'Prezzo originale',
    unit_of_measurement: 'EUR/kWh',
  }),
]);
const energySettings = {
  categoryWidgetType: 'cost',
  powerId: 'sensor.power',
  consumptionId: 'sensor.energy',
  todayId: 'sensor.today',
  monthId: 'sensor.month',
};

describe('Energia e consumi: raccordi e identità esistenti', () => {
  it.each(['powerId', 'consumptionId', 'todayId', 'monthId'])(
    'unicamente %s rende pronto cost senza richiedere altri collegamenti',
    (key) => {
      const settings = { categoryWidgetType: 'cost', [key]: 'sensor.explicit' };
      expect(isCategoryWidgetReady(settings)).toBe(true);
      expect(isCategoryWidgetUnbound(settings)).toBe(false);
      expect(kindOf('cost_card_stable', settings)).toBe('cost');
    }
  );
  it('il catalogo cambia soltanto le etichette, preservando due tipi, ID e Console condivise', () => {
    const cost = createCategoryWidgetSeed('cost', 'isolated')!,
      price = createCategoryWidgetSeed('nordpool', 'isolated')!;
    expect(cost.id).toBe('cost_card_isolated');
    expect(price.id).toBe('nordpool_card_isolated');
    expect(cost.settings).toEqual({ categoryWidgetType: 'cost' });
    expect(price.settings).toEqual({ categoryWidgetType: 'nordpool' });
    expect(isCategoryWidgetUnbound(cost.settings)).toBe(true);
    expect(ADD_WIDGET_TYPES.find((item) => item.type === 'cost')?.label).toBe('Energia e consumi');
    expect(ADD_WIDGET_TYPES.find((item) => item.type === 'nordpool')?.label).toBe(
      'Prezzo dell’energia'
    );
    expect(findWidgetDefinition(cost.id, cost.settings)).toMatchObject({
      type: 'cost',
      sizes: { min: { w: 2, h: 1 } },
    });
    expect(findWidgetDefinition(cost.id, cost.settings)?.Console).toBeDefined();
    expect(findWidgetDefinition(price.id, price.settings)?.Console).toBeDefined();
  });
  it('candidati Costi e Prezzi restano semanticamente distinti anche senza nomi riconoscibili', () => {
    expect(candidateEntityIds('cost', entities, new Set())).toEqual([
      'sensor.month',
      'sensor.today',
    ]);
    expect(candidateEntityIds('nordpool', entities, new Set())).toEqual(['sensor.price']);
  });
  it('l’identità cost storica resta todayId mentre tutte le quattro fonti appartengono al bound index', () => {
    expect(categoryEntityId('cost', energySettings)).toBe('sensor.today');
    expect(categoryEntityId('cost', { ...energySettings, powerId: 'sensor.other_power' })).toBe(
      'sensor.today'
    );
    const bound = boundEntityIds(
      { pages: ['home'], header: [], home: ['cost_card_stable', 'nordpool_card_stable'] },
      {
        'home::cost_card_stable': energySettings,
        'home::nordpool_card_stable': {
          categoryWidgetType: 'nordpool',
          nordpoolId: 'sensor.price',
        },
      }
    );
    expect([...bound].sort()).toEqual([
      'sensor.energy',
      'sensor.month',
      'sensor.power',
      'sensor.price',
      'sensor.today',
    ]);
  });
  it('le fonti energetiche extra sono indicizzate soltanto per il tipo cost', () => {
    const bound = boundEntityIds(
      { pages: ['home'], header: [], home: ['entity_card_sensor'] },
      {
        'home::entity_card_sensor': {
          categoryWidgetType: 'sensor',
          entityId: 'sensor.reading',
          powerId: 'sensor.ignored',
          consumptionId: 'sensor.ignored_energy',
          monthId: 'sensor.ignored_cost',
        },
      }
    );
    expect([...bound]).toEqual(['sensor.reading']);
  });
  it.each(['cost', 'nordpool'])(
    'il raccordo adattivo %s rende la stessa utilità readonly invece del vecchio profilo generico',
    (type) => {
      const callService = serviceMock(),
        settings =
          type === 'cost'
            ? energySettings
            : { categoryWidgetType: 'nordpool', nordpoolId: 'sensor.price' };
      const view = renderWithRuntime(
        <AdaptiveCategoryWidget
          type={type}
          id={`${type}_card_a`}
          settingsKey={`home::${type}_card_a`}
          settings={settings}
          entityId={type === 'cost' ? 'sensor.today' : 'sensor.price'}
          size={{ w: 2, h: 2 }}
          editMode={false}
        />,
        { entities, entitiesLoaded: true, callService }
      );
      expect(
        view.container.querySelector(`.energy-widget[data-widget-type="${type}"]`)
      ).not.toBeNull();
      expect(view.container.querySelector('.aca-adaptive-widget')).toBeNull();
      expect(
        view.container.querySelector('input,select,[role="slider"],[role="switch"]')
      ).toBeNull();
      expect(callService).not.toHaveBeenCalled();
      expect(view.container.textContent).toContain(type === 'cost' ? '830,00' : '-0,05');
    }
  );
  it('una sorgente manuale salva una sola patch, senza creare prodotto o inviare comandi', async () => {
    const save = vi.fn(async () => undefined),
      callService = serviceMock();
    renderWithRuntime(
      <EnergyBindingSection
        kind="cost"
        settings={{ categoryWidgetType: 'cost' }}
        saveBinding={save}
      />,
      { entities, entitiesLoaded: true, callService }
    );
    fireEvent.click(screen.getByRole('button', { name: /^Potenza istantanea: Non collegato$/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Potenza casa$/ }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith({ powerId: 'sensor.power' });
    expect(callService).not.toHaveBeenCalled();
  });
  it('lo scenario cold contiene quattro letture esplicite e vere fasce timestamped, senza ProductDeviceBinding energetico', () => {
    const house = mockHouse('normal'),
      seed = buildMockupSeed();
    const cards = Object.values(
      JSON.parse(seed.storage.tunet_card_settings!) as Record<string, CardSettings>
    );
    const cost = cards.find((settings) => settings.categoryWidgetType === 'cost')!;
    expect(cost).toMatchObject({
      powerId: 'sensor.potenza_casa',
      consumptionId: 'sensor.consumo_oggi',
      todayId: 'sensor.costo_oggi',
      monthId: 'sensor.costo_mese',
    });
    expect(cost.productDevice).toBeUndefined();
    expect(energyReading(house.entities['sensor.potenza_casa'], 'power').value).toBe(830);
    expect(
      parseEnergyPriceSlots(house.entities['sensor.prezzo_energia'], new Date(), 'Europe/Rome')
        .slots
    ).toHaveLength(48);
    expect(
      isProductDeviceBinding({
        version: 1,
        family: 'energy',
        deviceId: 'x',
        primaryEntityId: 'sensor.energy',
        channelEntityIds: ['sensor.energy'],
        secondaryEntityIds: [],
      })
    ).toBe(false);
  });
  it('Trova conserva le quattordici famiglie e la telemetria rimane nel prodotto originale', () => {
    const house = mockHouse('normal'),
      registry = buildRegistries(house.entities, house.devices);
    const found = classifyDevices({
      devices: registry.devices,
      entityRegistry: registry.entities,
      entities: house.entities,
    });
    expect(FAMILY_ORDER).toHaveLength(14);
    expect(found.every((item) => FAMILY_ORDER.includes(item.family))).toBe(true);
    expect(found.find((item) => item.deviceId === 'dev_multipresa_studio')?.family).toBe('plug');
    expect(found.find((item) => item.deviceId === 'dev_sensor_environment')?.family).toBe('sensor');
    expect(found.some((item) => (item.family as string) === 'energy')).toBe(false);
  });
});
