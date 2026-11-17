import { describe, expect, it } from 'vitest';
import type { EntityLike, EntityLikeMap } from '@/@types/ha';
import {
  CAR_SOURCE_FIELDS,
  candidateCarSourceIds,
  carCapabilities,
  carCoordinates,
  carFiniteNumber,
  carHistoryReading,
  carImageSource,
  carNativeBounds,
  carReading,
  carSourceMetadata,
  configuredCarSources,
  type CarSourceField,
} from '@/domain/car/carSources';
import { readCarSettings } from '@/components/widgets/utilities/car/carData';

const entity = (
  id: string,
  state = '0',
  unit?: string,
  cls?: string,
  extra: Record<string, unknown> = {}
): EntityLike => ({
  entity_id: id,
  state,
  attributes: { unit_of_measurement: unit, device_class: cls, ...extra },
});
const services = {
  switch: { turn_on: {}, turn_off: {} },
  button: { press: {} },
  input_button: { press: {} },
  script: { turn_on: {} },
  number: { set_value: {} },
  select: { select_option: {} },
  climate: { turn_on: {}, turn_off: {}, set_temperature: {} },
  lock: { lock: {}, unlock: {} },
};

describe('Auto: associazioni manuali conservate senza euristiche', () => {
  it('conserva tutti gli scalar, alias, array e immagine come il contratto precedente', () => {
    const settings = Object.fromEntries(CAR_SOURCE_FIELDS.map(({ key }) => [key, `sensor.${key}`]));
    Object.assign(settings, {
      chargingId: 'sensor.old_charge',
      chargeControlIds: ['switch.a', 'switch.a', '', 'button.b', 3],
      imageUrl: 'legacy:picture',
    });
    expect(configuredCarSources(settings)).toEqual(readCarSettings(settings));
    expect(configuredCarSources({ chargingId: 'binary_sensor.old' }).ids).toEqual({
      chargingStateId: 'binary_sensor.old',
      chargingId: 'binary_sensor.old',
    });
    expect(
      configuredCarSources({ chargingStateId: 'sensor.new', chargingId: 'sensor.old' }).ids
        .chargingStateId
    ).toBe('sensor.new');
    expect(
      configuredCarSources({
        chargeControlIds: ['button.a', 'switch.b'],
        chargeControlId: 'button.a',
      }).chargeControlIds
    ).toEqual(['button.a', 'switch.b']);
  });
  it('nomi, marchi e aree non rendono una lettura incompatibile un candidato', () => {
    const entities = {
      'sensor.tesla_car_soc': entity('sensor.tesla_car_soc', '80', 'V', 'voltage', {
        friendly_name: 'Auto batteria',
      }),
      'sensor.unknown': entity('sensor.unknown', 'unavailable', '%', 'battery'),
      'sensor.other': entity('sensor.other', '5', 'kW', 'power'),
    };
    expect(candidateCarSourceIds(entities, 'batteryId')).toEqual(['sensor.unknown']);
    expect(candidateCarSourceIds(entities, 'chargingPowerId')).toEqual(['sensor.other']);
    expect(configuredCarSources({ batteryId: 'sensor.tesla_car_soc' }).ids.batteryId).toBe(
      'sensor.tesla_car_soc'
    );
  });
  it('non legge associazioni e servizi dal prototipo', () => {
    expect(configuredCarSources(Object.create({ batteryId: 'sensor.private' })).ids).toEqual({});
    expect(
      carCapabilities(entity('switch.x', 'off'), 'chargeControlId', Object.create(services))
    ).toEqual([]);
    expect(
      carCapabilities(entity('switch.x', 'off'), 'chargeControlId', {
        switch: Object.create(services.switch),
      })
    ).toEqual([]);
  });
  it('mantiene i riferimenti legacy anomali ma non li propone come nuove fonti', () => {
    const sources = { 'sensor.bad.id': entity('sensor.bad.id', '50', '%', 'battery') };
    expect(candidateCarSourceIds(sources, 'batteryId')).toEqual([]);
    expect(configuredCarSources({ batteryId: 'sensor.bad.id' }).ids.batteryId).toBe(
      'sensor.bad.id'
    );
  });
});

describe('Auto: misure finite, unità native e stati distinti', () => {
  it.each<[CarSourceField, string, string, string | undefined]>([
    ['batteryId', '0', '%', 'battery'],
    ['fuelLevelId', '35.4', '%', undefined],
    ['rangeId', '215', 'mi', 'distance'],
    ['odometerId', '50000', 'km', 'distance'],
    ['chargingPowerId', '7300', 'W', 'power'],
    ['chargeRateId', '25', 'km/h', 'speed'],
    ['timeToFullId', '90', 'min', 'duration'],
    ['tempId', '-4.5', '°C', 'temperature'],
  ])('%s conserva %s %s senza convertire o inventare etichette', (field, state, unit, cls) => {
    expect(carReading(entity('sensor.reading', state, unit, cls), field)).toMatchObject({
      available: true,
      value: Number(state),
      unit,
    });
  });
  it.each([null, undefined, '', ' ', '12watts', '0x10', '0b10', Infinity, NaN, true])(
    'rifiuta numero non valido %s',
    (value) => {
      expect(carFiniteNumber(value)).toBeNull();
    }
  );
  it.each<[CarSourceField, string, string | undefined, string | undefined]>([
    ['batteryId', '101', '%', 'battery'],
    ['fuelLevelId', '-1', '%', undefined],
    ['rangeId', '200', undefined, 'distance'],
    ['batteryId', '12', 'V', 'voltage'],
    ['chargingPowerId', '7', 'kWh', 'energy'],
    ['chargingPowerId', '7', 'W', 'monetary'],
    ['timeToFullId', '-1', 'min', 'duration'],
    ['tempId', '10', '%', 'temperature'],
  ])('%s rifiuta %s / %s / %s', (field, state, unit, cls) => {
    expect(carReading(entity('sensor.reading', state, unit, cls), field)).toMatchObject({
      available: false,
      status: 'invalid',
      value: null,
    });
  });
  it('sconosciuto, non disponibile e fonte assente sono distinti da una carica a zero', () => {
    expect(carReading(undefined, 'batteryId').status).toBe('missing');
    expect(carReading(entity('sensor.b', 'unknown', '%', 'battery'), 'batteryId').status).toBe(
      'unknown'
    );
    expect(carReading(entity('sensor.b', 'unavailable', '%', 'battery'), 'batteryId').status).toBe(
      'unavailable'
    );
    expect(carReading(entity('sensor.b', '0', '%', 'battery'), 'batteryId')).toMatchObject({
      value: 0,
      available: true,
    });
  });
  it('fonte non disponibile senza unità non viene travestita da una misura incompatibile', () => {
    expect(carReading(entity('sensor.battery', 'unavailable'), 'batteryId')).toMatchObject({
      status: 'unavailable',
      valueText: 'Non disponibile',
      value: null,
    });
    expect(carReading(entity('sensor.battery', 'unknown'), 'batteryId').status).toBe('unknown');
    expect(carSourceMetadata(entity('sensor.battery', 'unavailable'), 'batteryId').compatible).toBe(
      false
    );
  });
  it.each(['unknown', 'unavailable', 'unexpected', 'constructor', 'toString'])(
    'non trasforma %s in scollegata o inattiva',
    (state) => {
      for (const field of ['pluggedId', 'chargingStateId'] as const) {
        expect(carReading(entity('binary_sensor.state', state), field)).toMatchObject({
          available: false,
          active: null,
        });
      }
    }
  );
  it('distingue gli stati ricarica reali e la serratura Renault readonly', () => {
    expect(
      carReading(entity('sensor.charge', 'starting', undefined, 'enum'), 'chargingStateId')
    ).toMatchObject({ active: true, valueText: 'Avvio della ricarica' });
    expect(
      carReading(entity('sensor.charge', 'no_power', undefined, 'enum'), 'chargingId')
    ).toMatchObject({ active: false, valueText: 'Alimentazione assente' });
    const lock = entity('binary_sensor.lock', 'on', undefined, 'lock');
    expect(carReading(lock, 'lockId').valueText).toBe('Sbloccata');
    expect(carCapabilities(lock, 'lockId', services)).toEqual([]);
    expect(
      carSourceMetadata(entity('binary_sensor.door', 'on', undefined, 'door'), 'lockId').compatible
    ).toBe(false);
  });
  it('timestamp richiede offset dichiarato, senza assumere fuso o inventare un orario', () => {
    expect(
      carReading(
        entity('sensor.end', '2026-11-11T15:00:00Z', undefined, 'timestamp'),
        'chargeEndTimeId'
      ).available
    ).toBe(true);
    expect(
      carReading(
        entity('sensor.end', '2026-11-11T15:00:00', undefined, 'timestamp'),
        'chargeEndTimeId'
      ).available
    ).toBe(false);
  });
  it('carburante conserva volume nativo senza percentuali o capienza dedotte', () => {
    expect(
      carReading(entity('sensor.fuel', '120', 'L', 'volume_storage'), 'fuelLevelId')
    ).toMatchObject({ available: true, value: 120, unit: 'L' });
    expect(carReading(entity('sensor.fuel', '120', '%'), 'fuelLevelId').available).toBe(false);
    expect(
      carReading(entity('sensor.fuel', '20', '%', 'volume_storage'), 'fuelLevelId').available
    ).toBe(false);
  });
  it('conserva una potenza firmata senza dedurre ricarica o scarica', () => {
    expect(
      carReading(entity('sensor.power', '-3.6', 'kW', 'power'), 'chargingPowerId')
    ).toMatchObject({ status: 'ready', value: -3.6, unit: 'kW', active: null });
  });
  it('lo storico non usa unità/classi attuali per validare campioni incompatibili', () => {
    const current = entity('sensor.battery', 'unavailable', '%', 'battery');
    expect(
      carHistoryReading({ state: '0', unit: '%', deviceClass: 'battery' }, current, 'batteryId')
    ).toMatchObject({ available: true, value: 0 });
    expect(
      carHistoryReading({ state: '150', unit: '%', deviceClass: 'battery' }, current, 'batteryId')
        .available
    ).toBe(false);
    expect(
      carHistoryReading({ state: '20', unit: '%', deviceClass: 'power' }, current, 'batteryId')
        .available
    ).toBe(false);
    expect(carHistoryReading({ state: '20' }, current, 'batteryId').available).toBe(false);
    expect(
      carHistoryReading(
        { state: '20', unit: 'mi', deviceClass: 'distance' },
        entity('sensor.range', '20', 'km', 'distance'),
        'rangeId'
      ).available
    ).toBe(false);
  });
});

describe('Auto: coppie di coordinate e immagini esplicite', () => {
  const settings = {
    locationId: 'device_tracker.car',
    latitudeId: 'sensor.lat',
    longitudeId: 'sensor.lon',
  };
  const entities: EntityLikeMap = {
    'device_tracker.car': entity('device_tracker.car', 'home', undefined, undefined, {
      latitude: 45,
      longitude: 7,
    }),
    'sensor.lat': entity('sensor.lat', '0'),
    'sensor.lon': entity('sensor.lon', '0'),
  };
  it('preferisce la coppia tracker e ammette lo zero della coppia manuale', () => {
    expect(carCoordinates(entities, settings)).toEqual({ lat: 45, lon: 7, source: 'tracker' });
    expect(
      carCoordinates(entities, { latitudeId: 'sensor.lat', longitudeId: 'sensor.lon' })
    ).toEqual({ lat: 0, lon: 0, source: 'manual' });
  });
  it('non mescola mezza posizione tracker con un sensore diverso', () => {
    const partial = {
      ...entities,
      'device_tracker.car': entity('device_tracker.car', 'home', undefined, undefined, {
        latitude: 45,
      }),
    };
    expect(
      carCoordinates(partial, {
        locationId: settings.locationId,
        longitudeId: settings.longitudeId,
      })
    ).toBeNull();
    expect(carCoordinates(partial, settings)).toEqual({ lat: 0, lon: 0, source: 'manual' });
  });
  it('rifiuta coordinate stale non disponibili o fuori dominio', () => {
    expect(
      carCoordinates(
        {
          ...entities,
          'device_tracker.car': entity('device_tracker.car', 'unavailable', undefined, undefined, {
            latitude: 45,
            longitude: 7,
          }),
        },
        { locationId: settings.locationId }
      )
    ).toBeNull();
    expect(
      carCoordinates(
        { 'sensor.lat': entity('sensor.lat', '91'), 'sensor.lon': entity('sensor.lon', '7') },
        settings
      )
    ).toBeNull();
  });
  it.each(['/local/auto.png', '/api/image/serve/car/original', 'https://example.com/auto.png'])(
    'ammette immagine esplicita %s senza fetch',
    (source) => {
      expect(carImageSource(source)).toBe(source);
    }
  );
  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml,bad',
    '//example.com/car',
    'https://user:secret@example.com/car',
    '/local/../private',
    '/local/\\evil',
  ])('rifiuta origine/credenziali non sicure %s', (source) => {
    expect(carImageSource(source)).toBeNull();
  });
});

describe('Auto: capacità solo da fonti e servizi reali', () => {
  const limit = entity('number.limit', '80', '%', 'battery', { min: 40, max: 95, step: 5 });
  const climate = entity('climate.car', 'off', undefined, undefined, {
    min_temp: 10,
    max_temp: 28,
    target_temp_step: 1,
    temperature_unit: '°C',
    temperature: 20,
    supported_features: 385,
  });
  it.each(['°C', '°F'])(
    'clima HA standard senza attributo unità usa soltanto la configurazione %s',
    (unit) => {
      const standard = {
        ...climate,
        attributes: { ...climate.attributes, temperature_unit: undefined },
      };
      expect(carNativeBounds(standard, 'climateId', unit)).toEqual({
        min: 10,
        max: 28,
        step: 1,
        unit,
      });
      expect(carCapabilities(standard, 'climateId', services, unit)).toEqual([
        'climate.turn_on',
        'climate.set_temperature',
      ]);
    }
  );
  it('unità HA valida prevale sull’attributo legacy, senza convertire valori già serializzati', () => {
    expect(carNativeBounds(climate, 'climateId', '°F')).toEqual({
      min: 10,
      max: 28,
      step: 1,
      unit: '°F',
    });
    expect(carNativeBounds(climate, 'climateId', 'invalid')?.unit).toBe('°C');
    expect(carNativeBounds(limit, 'chargeLimitNumberId', '°F')?.unit).toBe('%');
  });
  it.each([undefined, null, '', 'C', 'constructor', 'toString'])(
    'clima senza una fonte valida di unità resta senza regolazione: %s',
    (unit) => {
      const standard = {
        ...climate,
        attributes: { ...climate.attributes, temperature_unit: undefined },
      };
      expect(carNativeBounds(standard, 'climateId', unit)).toBeNull();
      expect(carCapabilities(standard, 'climateId', services, unit)).toEqual(['climate.turn_on']);
    }
  );
  it('usa esclusivamente limiti e passo dichiarati', () => {
    expect(carNativeBounds(limit, 'chargeLimitNumberId')).toEqual({
      min: 40,
      max: 95,
      step: 5,
      unit: '%',
    });
    expect(carNativeBounds(climate, 'climateId')).toEqual({
      min: 10,
      max: 28,
      step: 1,
      unit: '°C',
    });
    expect(carNativeBounds(entity('number.limit', '80', '%'), 'chargeLimitNumberId')).toBeNull();
    expect(
      carNativeBounds(
        entity('climate.car', 'off', undefined, undefined, {
          ...climate.attributes,
          target_temp_step: undefined,
        }),
        'climateId'
      )
    ).toBeNull();
  });
  it('senza metadata, servizio o stato valido non abilita richieste', () => {
    expect(carCapabilities(limit, 'chargeLimitNumberId', services)).toEqual(['number.set_value']);
    expect(carCapabilities(limit, 'chargeLimitNumberId', null)).toEqual([]);
    expect(carCapabilities(entity('switch.car', 'unknown'), 'ignitionSwitchId', services)).toEqual(
      []
    );
    expect(
      carCapabilities(entity('switch.car', 'unavailable'), 'chargeControlId', services)
    ).toEqual([]);
    expect(carCapabilities(entity('switch.car', 'off'), 'ignitionSwitchId', services)).toEqual([
      'switch.turn_on',
    ]);
    expect(carCapabilities(entity('switch.car', 'on'), 'chargeControlId', services)).toEqual([
      'switch.turn_off',
    ]);
  });
  it('bottone HA unknown rimane un comando esplicito, non una lettura confermata', () => {
    expect(carCapabilities(entity('button.update', 'unknown'), 'updateButtonId', services)).toEqual(
      ['button.press']
    );
    expect(
      carCapabilities(entity('button.update', 'unavailable'), 'updateButtonId', services)
    ).toEqual([]);
  });
  it('le opzioni select sono le opzioni reali e non percentuali inventate', () => {
    expect(
      carCapabilities(
        entity('select.charge', 'scheduled', undefined, undefined, {
          options: ['always', 'scheduled'],
        }),
        'chargeLimitSelectId',
        services
      )
    ).toEqual(['select.select_option']);
    expect(
      carCapabilities(
        entity('select.charge', '80%', undefined, undefined, { options: ['always', 'scheduled'] }),
        'chargeLimitSelectId',
        services
      )
    ).toEqual([]);
  });
  it('il clima richiede bit, temperatura e bounds; la serratura non guadagna open', () => {
    expect(carCapabilities(climate, 'climateId', services)).toEqual([
      'climate.turn_on',
      'climate.set_temperature',
    ]);
    expect(
      carCapabilities(
        { ...climate, attributes: { ...climate.attributes, supported_features: 0 } },
        'climateId',
        services
      )
    ).toEqual([]);
    expect(carCapabilities(entity('lock.car', 'locked'), 'lockId', services)).toEqual([
      'lock.unlock',
    ]);
    expect(carCapabilities(entity('lock.car', 'constructor'), 'lockId', services)).toEqual([]);
  });
  it('conserva Apri solo per la serratura OPEN1 con stato noto e servizio proprio', () => {
    const openServices = { lock: { ...services.lock, open: {} } };
    const lock = entity('lock.car', 'locked', undefined, undefined, { supported_features: 1 });
    expect(carCapabilities(lock, 'lockId', openServices)).toEqual(['lock.unlock', 'lock.open']);
    expect(carCapabilities({ ...lock, state: 'unlocked' }, 'lockId', openServices)).toEqual([
      'lock.lock',
      'lock.open',
    ]);
    expect(carCapabilities(lock, 'lockId', services)).toEqual(['lock.unlock']);
    expect(carCapabilities(lock, 'lockId', { lock: Object.create({ open: {} }) })).toEqual([]);
    expect(
      carCapabilities(
        entity('binary_sensor.lock', 'on', undefined, 'lock', { supported_features: 1 }),
        'lockId',
        openServices
      )
    ).toEqual([]);
    for (const state of ['unknown', 'unavailable', 'constructor', 'open', 'opening'])
      expect(carCapabilities({ ...lock, state }, 'lockId', openServices)).not.toContain(
        'lock.open'
      );
  });
  it.each([undefined, 0, '1', 1.5, -1, 2, NaN])('non inventa OPEN con feature %s', (features) => {
    expect(
      carCapabilities(
        entity('lock.car', 'locked', undefined, undefined, { supported_features: features }),
        'lockId',
        { lock: { open: {} } }
      )
    ).toEqual([]);
  });
});
