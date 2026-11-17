import { describe, expect, it } from 'vitest';
import { fixtureEntities, fixtureEntity, createFixtureRuntime } from '@/utils/fixtures/runtime';
import {
  ROOM_ROLES,
  roomAreaIds,
  roomMembershipIds,
  roomTechnicalIds,
  type RoomRegistry,
} from '@/components/widgets/utilities/room/roomMembership';
import { brightnessPercent, roomSummary } from '@/components/widgets/utilities/room/roomData';
import { roomServiceAllowed } from '@/components/widgets/utilities/room/roomCapabilities';
import { entityStateText } from '@/components/widgets/utilities/room/EntityRow';
import { areaStats, entitiesByArea } from '@/components/widgets/utilities/fullpage/roomsData';

const registry: RoomRegistry = {
  areas: [
    { area_id: 'a', name: 'Stanza' },
    { area_id: 'b', name: 'Stanza' },
  ],
  devices: [
    { id: 'dev-a', area_id: 'a' },
    { id: 'dev-b', area_id: 'b' },
  ],
  entities: [
    { entity_id: 'light.inherited', device_id: 'dev-a' },
    { entity_id: 'light.overridden', device_id: 'dev-a', area_id: 'b' },
    { entity_id: 'sensor.direct', device_id: 'dev-b', area_id: 'a' },
    { entity_id: 'sensor.hidden', area_id: 'a', hidden_by: 'user' },
    { entity_id: 'sensor.disabled', area_id: 'a', disabled_by: 'integration' },
    { entity_id: 'sensor.tech', area_id: 'a', entity_category: 'diagnostic' },
    { entity_id: 'switch.config', area_id: 'a', entity_category: 'config' },
    { entity_id: 'sensor.unrelated', config_entry_id: 'same', name: 'Stanza' },
  ],
};
describe('Stanze 2026: provenienza e appartenenza', () => {
  it('l’area diretta dell’entità prevale su quella del dispositivo', () => {
    expect(roomAreaIds('a', registry)).toEqual([
      'light.inherited',
      'sensor.direct',
      'sensor.tech',
      'switch.config',
    ]);
    expect(roomAreaIds('b', registry)).toEqual(['light.overridden']);
  });
  it('esclude nascosti/disabilitati e non raggruppa per nomi o integrazione', () => {
    expect(roomAreaIds('a', registry)).not.toContain('sensor.unrelated');
    expect(roomAreaIds('a', registry)).not.toContain('sensor.hidden');
    expect(roomAreaIds('a', registry)).not.toContain('sensor.disabled');
  });
  it('deduplica le righe di registro', () => {
    expect(
      roomAreaIds('a', { ...registry, entities: [...registry.entities, registry.entities[0]!] })
    ).toEqual(roomAreaIds('a', registry));
  });
  it('un’area rimossa non adotta un’altra area con lo stesso nome', () => {
    expect(roomAreaIds('removed', registry)).toEqual([]);
    expect(
      roomMembershipIds(
        { areaId: 'removed', roomMembershipSource: 'area', entityIds: ['light.old'] },
        registry
      )
    ).toEqual([]);
  });
  it('preserva entityIds legacy anche quando è salvato areaId', () => {
    const settings = {
      areaId: 'a',
      entityIds: ['light.old', 'light.old'],
      includedEntityIds: ['sensor.explicit'],
      excludedEntityIds: ['light.old'],
    };
    expect(roomMembershipIds(settings, registry)).toEqual(['sensor.explicit']);
    expect(roomMembershipIds(settings, null)).toEqual(['sensor.explicit']);
  });
  it('aggiorna lo snapshot soltanto con provenienza area esplicita', () => {
    const settings = { areaId: 'a', roomMembershipSource: 'area', entityIds: ['light.old'] };
    expect(roomMembershipIds(settings, registry)).toEqual(roomAreaIds('a', registry));
    expect(settings.entityIds).toEqual(['light.old']);
  });
  it('conserva i ruoli legacy scelti esplicitamente fuori dalla lista base', () => {
    expect(
      roomMembershipIds(
        {
          entityIds: ['sensor.a'],
          mainLightEntityId: 'light.chosen',
          climateEntityId: 'climate.chosen',
        },
        null
      )
    ).toEqual(['sensor.a', 'light.chosen', 'climate.chosen']);
    expect(
      roomMembershipIds(
        {
          entityIds: ['sensor.a'],
          mainLightEntityId: 'light.chosen',
          excludedEntityIds: ['light.chosen'],
        },
        null
      )
    ).toEqual(['sensor.a']);
  });
  it('conserva aggiunte/ruoli espliciti e dà precedenza all’esclusione', () => {
    expect(
      roomMembershipIds(
        {
          areaId: 'a',
          roomMembershipSource: 'area',
          includedEntityIds: ['sensor.explicit'],
          mainLightEntityId: 'light.chosen',
          excludedEntityIds: ['light.inherited', 'light.chosen'],
        },
        registry
      )
    ).toEqual(['sensor.direct', 'sensor.tech', 'switch.config', 'sensor.explicit']);
    expect(ROOM_ROLES).toContain('climateEntityId');
  });
  it('toglie subito dal gruppo area le entità riassegnate o rimosse', () => {
    const updated = {
      ...registry,
      entities: registry.entities
        .filter((e) => e.entity_id !== 'sensor.direct')
        .map((e) => (e.entity_id === 'light.inherited' ? { ...e, area_id: 'b' } : e)),
    };
    expect(roomAreaIds('a', updated)).toEqual(['sensor.tech', 'switch.config']);
  });
  it('la pagina usa lo stesso risolutore e tiene separati i dispositivi', () => {
    const result = entitiesByArea(registry.areas, registry.entities, registry.devices);
    expect(result.a).toEqual(roomAreaIds('a', registry));
    expect(result.a).not.toContain('light.overridden');
  });
  it('la tecnica dipende da entity_category, senza euristiche sul nome', () => {
    expect(roomTechnicalIds(['sensor.tech', 'switch.config', 'sensor.direct'], registry)).toEqual([
      'sensor.tech',
      'switch.config',
    ]);
  });
});

describe('Stanze 2026: osservazioni e unità native', () => {
  const config = createFixtureRuntime().haConfig;
  it('non converte il sensore nell’unità configurata della casa', () => {
    const entities = fixtureEntities([
      fixtureEntity('sensor.t', '21.5', { device_class: 'temperature', unit_of_measurement: '°C' }),
    ]);
    const result = roomSummary(
      entities,
      { entityIds: ['sensor.t'] },
      { ...config, unit_system: { temperature: '°F' } }
    );
    expect(result.temperature).toBe(21.5);
    expect(result.temperatureUnit).toBe('°C');
  });
  it('non sceglie un sensore dal solo nome', () => {
    const entities = fixtureEntities([
      fixtureEntity('sensor.temperature_fake', '999', { unit_of_measurement: 'W' }),
    ]);
    expect(
      roomSummary(entities, { entityIds: ['sensor.temperature_fake'] }, config).temperature
    ).toBeNull();
  });
  it('non presenta una lettura parziale come temperatura numerica', () => {
    const entities = fixtureEntities([
      fixtureEntity('sensor.t', '21x', { device_class: 'temperature', unit_of_measurement: '°C' }),
    ]);
    expect(roomSummary(entities, { entityIds: ['sensor.t'] }, config).temperature).toBeNull();
    expect(entityStateText('sensor.t', entities['sensor.t']!, config)).not.toBe('21 °C');
  });
  it('non usa attributi vecchi di un clima non disponibile', () => {
    const entity = fixtureEntity('climate.a', 'unavailable', {
      current_temperature: 0,
      temperature: 20,
      hvac_action: 'heating',
    });
    expect(
      roomSummary({ 'climate.a': entity }, { entityIds: ['climate.a'] }, config).temperature
    ).toBeNull();
    expect(entityStateText('climate.a', entity, config)).toBe('Non disponibile');
  });
  it('non scambia luminosità assente o stato sconosciuto con 100% o spento', () => {
    expect(brightnessPercent(fixtureEntity('light.a', 'on'))).toBeNull();
    expect(brightnessPercent(fixtureEntity('light.a', 'unknown', { brightness: 0 }))).toBeNull();
    expect(brightnessPercent(fixtureEntity('light.a', 'off'))).toBe(0);
    expect(
      entityStateText(
        'light.a',
        fixtureEntity('light.a', 'on', { supported_color_modes: ['brightness'] }),
        config
      )
    ).toBe('Acceso');
  });
  it('conta le luci non disponibili senza ridurre il denominatore', () => {
    const stats = areaStats(['light.a', 'light.a', 'light.missing'], {
      'light.a': fixtureEntity('light.a', 'unknown'),
    });
    expect(stats).toMatchObject({
      totalCount: 2,
      lightsTotal: 2,
      lightsOn: 0,
      unavailableCount: 2,
    });
  });
  it('rifiuta letture parzialmente numeriche e conserva zero reale', () => {
    const entities = fixtureEntities([
      fixtureEntity('sensor.t', '0', { device_class: 'temperature', unit_of_measurement: '°F' }),
      fixtureEntity('sensor.h', '20x', { device_class: 'humidity', unit_of_measurement: '%' }),
    ]);
    expect(areaStats(Object.keys(entities), entities)).toMatchObject({
      temperature: 0,
      temperatureUnit: '°F',
      humidity: null,
    });
  });
  it('conserva l’unità di umidità esposta, senza percentuali inventate', () => {
    const e = fixtureEntity('sensor.h', '0.5', {
      device_class: 'humidity',
      unit_of_measurement: 'g/m³',
    });
    expect(areaStats(['sensor.h'], { 'sensor.h': e }).humidityUnit).toBe('g/m³');
  });
  it('riporta entità mancanti senza inventare attività o stati robot', () => {
    const entities = fixtureEntities([fixtureEntity('vacuum.a', 'unknown')]);
    const summary = roomSummary(entities, { entityIds: ['vacuum.a', 'light.missing'] }, config);
    expect(summary.unavailableCount).toBe(2);
    expect(summary.vacuumLabel).toBeNull();
    expect(summary.activeDevices).toBe(0);
  });
});

describe('Stanze 2026: servizi e capacità reali', () => {
  const services = {
    light: { turn_on: {}, turn_off: {} },
    fan: { turn_on: {}, turn_off: {} },
    cover: { open_cover: {}, close_cover: {}, stop_cover: {} },
    vacuum: { start: {}, pause: {}, return_to_base: {} },
  };
  it.each([
    ['cover.a', 'cover', 'open_cover', 1],
    ['vacuum.a', 'vacuum', 'start', 8192],
    ['fan.a', 'fan', 'turn_on', 32],
  ])('richiede capacità e servizio per %s', (id, domain, service, bit) => {
    const state = domain === 'cover' ? 'closed' : domain === 'vacuum' ? 'idle' : 'off';
    expect(
      roomServiceAllowed(
        fixtureEntity(id, state, { supported_features: bit }),
        services,
        domain,
        service
      )
    ).toBe(true);
    expect(
      roomServiceAllowed(
        fixtureEntity(id, state, { supported_features: 0 }),
        services,
        domain,
        service
      )
    ).toBe(false);
    expect(
      roomServiceAllowed(fixtureEntity(id, state, { supported_features: bit }), {}, domain, service)
    ).toBe(false);
  });
  it('non espone luminosità su una luce soltanto on/off', () => {
    expect(
      roomServiceAllowed(
        fixtureEntity('light.a', 'on', { supported_color_modes: ['onoff'] }),
        services,
        'light',
        'turn_on',
        { brightness_pct: 20 }
      )
    ).toBe(false);
  });
  it('non invia comandi su stati sconosciuti', () => {
    expect(
      roomServiceAllowed(fixtureEntity('light.a', 'unknown'), services, 'light', 'turn_on')
    ).toBe(false);
  });
});
