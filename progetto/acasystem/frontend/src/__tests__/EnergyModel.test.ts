import { describe, expect, it, vi } from 'vitest';
import type { EntityLike, EntityLikeMap } from '@/@types/ha';
import {
  energyPreferences,
  energyReading,
  energyHistoryReading,
  energySourceCandidateIds,
  parseEnergyPriceSlots,
  validatableEnergySourceIds,
  type EnergyKind,
} from '@/components/widgets/utilities/energy/energyModel';

const entity = (
  state: string,
  unit?: unknown,
  deviceClass?: unknown,
  extra: Record<string, unknown> = {}
): EntityLike => ({
  entity_id: 'sensor.reading',
  state,
  attributes: {
    friendly_name: 'Lettura esplicita',
    unit_of_measurement: unit,
    device_class: deviceClass,
    ...extra,
  },
});
const price = (attributes: Record<string, unknown>, state = '0.12', unit = 'EUR/kWh') =>
  entity(state, unit, undefined, attributes);
const slot = (start: unknown, end: unknown, value: unknown = 0.12) => ({ start, end, value });
const now = new Date('2026-11-11T10:30:00Z');
const first = slot('2026-11-11T10:00:00Z', '2026-11-11T11:00:00Z');

describe('Energia: grandezze distinte e unità native', () => {
  it.each<[EnergyKind, string, string | undefined]>([
    ['power', 'W', 'power'],
    ['power', 'kW', undefined],
    ['power', 'MW', 'power'],
    ['energy', 'Wh', 'energy'],
    ['energy', 'kWh', undefined],
    ['energy', 'J', 'energy'],
    ['cost', 'EUR', 'monetary'],
    ['cost', 'USD', undefined],
    ['cost', '€', 'monetary'],
    ['price', 'EUR/kWh', undefined],
    ['price', 'USD/Wh', 'monetary'],
    ['price', '€/MWh', undefined],
  ])('%s legge %s senza convertirlo o cambiare etichetta', (kind, unit, cls) => {
    const result = energyReading(entity('12.3456', unit, cls), kind, {
      decimals: 3,
      currency: 'JPY',
    });
    expect(result).toMatchObject({
      status: 'ready',
      available: true,
      value: 12.3456,
      valueText: '12,346',
      unit,
      label: 'Lettura esplicita',
      reason: null,
    });
  });
  it.each(['0', '-0.15', '+3.5', '1e2'])(
    'preserva lettura finita %s compresi zero e prezzo negativo',
    (state) => {
      expect(energyReading(entity(state, 'EUR/kWh'), 'price').value).toBe(Number(state));
      expect(energyReading(entity(state, 'EUR/kWh'), 'price').available).toBe(true);
    }
  );
  it.each(['', 'NaN', 'Infinity', '-Infinity', '12 kWh', '1,2', 'false', 'constructor'])(
    'non usa parseFloat o zero fittizio per %s',
    (state) => {
      const reading = energyReading(entity(state, 'kWh', 'energy'), 'energy');
      expect(reading.available).toBe(false);
      expect(reading.value).toBeNull();
      expect(reading.valueText).not.toBe('0');
    }
  );
  it.each<[EnergyKind, string, string | undefined]>([
    ['power', 'kWh', 'power'],
    ['power', 'W', 'energy'],
    ['power', 'var', 'reactive_power'],
    ['energy', 'kW', 'energy'],
    ['energy', 'kWh', 'energy_storage'],
    ['energy', 'kvarh', undefined],
    ['cost', 'EUR/kWh', 'monetary'],
    ['cost', 'kWh', undefined],
    ['cost', 'EUR', 'temperature'],
    ['price', 'EUR', undefined],
    ['price', 'EUR/W', undefined],
    ['price', 'kWh/EUR', undefined],
    ['price', 'EUR/kWh/hour', undefined],
    ['price', 'ZZZ/kWh', undefined],
    ['cost', 'ZZZ', undefined],
  ])('rifiuta la contraddizione %s/%s/%s senza rietichettare', (kind, unit, cls) => {
    expect(energyReading(entity('8', unit, cls), kind)).toMatchObject({
      status: 'invalid',
      available: false,
      value: null,
      unit: null,
    });
  });
  it('la preferenza valuta non ripara unità mancante o incompatibile', () => {
    expect(
      energyReading(entity('8', undefined, 'monetary'), 'cost', { currency: 'EUR' }).status
    ).toBe('invalid');
    expect(
      energyReading(entity('8', 'USD', 'monetary'), 'cost', { currency: 'EUR' })
    ).toMatchObject({ available: true, unit: 'USD' });
    expect(
      energyReading(entity('8', 'EUR/kWh', undefined, { currency: 'USD' }), 'price').status
    ).toBe('invalid');
    expect(energyReading(entity('8', '$', 'monetary'), 'cost').status).toBe('invalid');
    expect(energyReading(entity('8', 'EUR', 'monetary', { currency: 42 }), 'cost').status).toBe(
      'invalid'
    );
    expect(energyReading(entity('8', '$', 'monetary', { currency: 'CAD' }), 'cost')).toMatchObject({
      available: true,
      unit: '$',
    });
  });
  it('stati mancanti, sconosciuti e indisponibili rimangono distinti', () => {
    expect(energyReading(undefined, 'power')).toMatchObject({
      status: 'missing',
      valueText: 'Fonte non presente',
      value: null,
    });
    expect(energyReading(entity('unknown', 'W', 'power'), 'power')).toMatchObject({
      status: 'unknown',
      valueText: 'Stato sconosciuto',
      value: null,
    });
    expect(energyReading(entity('unavailable', 'W', 'power'), 'power')).toMatchObject({
      status: 'unavailable',
      valueText: 'Non disponibile',
      value: null,
    });
  });
  it('decimali sono limitati e la valuta valida resta soltanto una preferenza', () => {
    expect(energyPreferences({ decimals: -3, currency: 'eur' })).toEqual({
      decimals: 0,
      currency: 'EUR',
    });
    expect(energyPreferences({ decimals: '12', currency: 'constructor' })).toEqual({
      decimals: 6,
      currency: null,
    });
    expect(energyPreferences({ decimals: NaN })).toEqual({ decimals: 2, currency: null });
    expect(energyPreferences({ decimals: Infinity })).toEqual({ decimals: 2, currency: null });
    expect(energyReading(entity('1.25', 'W'), 'power', { decimals: 0 }).valueText).toBe('1');
  });
  it('si importa e legge valute certe anche senza Intl.supportedValuesOf nel browser', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'supportedValuesOf')!;
    try {
      Object.defineProperty(Intl, 'supportedValuesOf', { configurable: true, value: undefined });
      vi.resetModules();
      const portable = await import('@/components/widgets/utilities/energy/energyModel');
      expect(portable.energyReading(entity('1', 'EUR'), 'cost')).toMatchObject({
        available: true,
        unit: 'EUR',
      });
      expect(portable.energyReading(entity('1', 'NOK/kWh'), 'price')).toMatchObject({
        available: true,
        unit: 'NOK/kWh',
      });
      expect(portable.energyReading(entity('1', 'ZZZ'), 'cost').available).toBe(false);
    } finally {
      Object.defineProperty(Intl, 'supportedValuesOf', descriptor);
      vi.resetModules();
    }
  });
  it('candidati dipendono da metadati e unità, mai da nomi o stato corrente', () => {
    const entities: EntityLikeMap = {
      'sensor.power_unavailable': entity('unavailable', 'W', 'power'),
      'sensor.energy': entity('1', 'kWh', 'energy'),
      'input_number.cost': entity('2', 'EUR'),
      'sensor.nordpool_name_only': entity('0.2', undefined, undefined, {
        friendly_name: 'Energia kWh',
      }),
      'sensor.price': price({}),
      'switch.power': entity('on', 'W', 'power'),
      'sensor.conflict': entity('1', 'W', 'temperature'),
      'sensor.diagnostic': entity('unknown', 'W'),
    };
    expect(energySourceCandidateIds(entities, 'power')).toEqual([
      'sensor.diagnostic',
      'sensor.power_unavailable',
    ]);
    expect(energySourceCandidateIds(entities, 'energy')).toEqual(['sensor.energy']);
    expect(energySourceCandidateIds(entities, 'cost')).toEqual(['input_number.cost']);
    expect(energySourceCandidateIds(entities, 'price')).toEqual(['sensor.price']);
  });
  it('la validazione sintattica non cancella o muta riferimenti legacy incompatibili', () => {
    const raw = {
      powerId: 'sensor.power',
      consumptionId: 'sensor.energy',
      todayId: 'input_number.amount',
      monthId: 'malformed',
      nordpoolId: 'sensor.price',
      other: 4,
    };
    const copy = { ...raw };
    expect(validatableEnergySourceIds(raw)).toEqual({
      powerId: 'sensor.power',
      consumptionId: 'sensor.energy',
      todayId: 'input_number.amount',
      monthId: null,
      nordpoolId: 'sensor.price',
    });
    expect(raw).toEqual(copy);
    expect(
      validatableEnergySourceIds(Object.create({ todayId: 'sensor.prototype' })).todayId
    ).toBeNull();
  });
});

describe('Storico energetico: ruolo, unità e valuta di ogni campione', () => {
  const current = entity('4', 'EUR', 'monetary');
  it('rifiuta il campione power3EUR e conserva la lettura monetary4EUR valida', () => {
    expect(
      energyHistoryReading({ state: '3', unit: 'EUR', deviceClass: 'power' }, current, 'cost')
    ).toMatchObject({ available: false, value: null, unit: null });
    expect(
      energyHistoryReading({ state: '4', unit: 'EUR', deviceClass: 'monetary' }, current, 'cost')
    ).toMatchObject({ available: true, value: 4, unit: 'EUR' });
  });
  it('non prende unità o classe attuali per completare dati storici assenti', () => {
    expect(
      energyHistoryReading({ state: '3', unit: null, deviceClass: '' }, current, 'cost')
    ).toMatchObject({ available: false, value: null });
    expect(
      energyHistoryReading({ state: '3', unit: 'W', deviceClass: '' }, current, 'cost')
    ).toMatchObject({ available: false, value: null });
  });
  it('unità diverse e denominatore prezzo non diventano costo', () => {
    expect(
      energyHistoryReading({ state: '3', unit: 'USD', deviceClass: 'monetary' }, current, 'cost')
    ).toMatchObject({ available: false, value: null });
    expect(
      energyHistoryReading(
        { state: '3', unit: 'EUR/kWh', deviceClass: 'monetary' },
        current,
        'cost'
      )
    ).toMatchObject({ available: false, value: null });
    expect(
      energyHistoryReading(
        { state: '3', unit: 'Wh', deviceClass: 'energy' },
        entity('5', 'kWh', 'energy'),
        'energy'
      )
    ).toMatchObject({ available: false, value: null });
  });
  it.each(['cost', 'price'] as const)(
    'stessa unità col simbolo $ ma CAD/USDstorico non sono la stessa valuta per %s',
    (kind) => {
      const unit = kind === 'cost' ? '$' : '$/kWh',
        live = entity('4', unit, 'monetary', { currency: 'USD' });
      expect(
        energyHistoryReading(
          { state: '3', unit, deviceClass: 'monetary', currency: 'CAD' },
          live,
          kind
        )
      ).toMatchObject({
        available: false,
        value: null,
        valueText: 'Lettura storica incompatibile',
      });
      expect(
        energyHistoryReading(
          { state: '3', unit, deviceClass: 'monetary', currency: 'USD' },
          live,
          kind
        )
      ).toMatchObject({ available: true, value: 3 });
      expect(
        energyHistoryReading({ state: '3', unit, deviceClass: 'monetary' }, live, kind).available
      ).toBe(false);
    }
  );
  it('preserva zero, negativi e letture storiche valide anche se ora il sensore non risponde', () => {
    for (const state of ['0', '-0.02'])
      expect(
        energyHistoryReading(
          { state, unit: 'EUR/kWh', deviceClass: 'monetary' },
          price({}, 'unavailable'),
          'price'
        )
      ).toMatchObject({ available: true, value: Number(state), unit: 'EUR/kWh' });
  });
  it('riutilizza al massimo sette formatter per migliaia di campioni senza alterare i valori', async () => {
    vi.resetModules();
    const constructors = vi.spyOn(Intl, 'NumberFormat');
    try {
      const fresh = await import('@/components/widgets/utilities/energy/energyModel');
      for (let decimals = 0; decimals <= 6; decimals++) {
        for (let sample = 0; sample < 1000; sample++) {
          const reading = fresh.energyHistoryReading(
            { state: '1.23456', unit: 'EUR', deviceClass: 'monetary' },
            current,
            'cost',
            { decimals }
          );
          expect(reading.value).toBe(1.23456);
        }
      }
      expect(constructors).toHaveBeenCalledTimes(7);
      expect(
        fresh.energyHistoryReading(
          { state: '1.23456', unit: 'EUR', deviceClass: 'monetary' },
          current,
          'cost',
          { decimals: 6 }
        ).valueText
      ).toBe('1,234560');
    } finally {
      constructors.mockRestore();
      vi.resetModules();
    }
  });
  it('incompatibilità esplicita non muta il campione, né converte valore o valuta', () => {
    const event = { state: '3', unit: '$', deviceClass: 'monetary', currency: 'CAD' },
      copy = { ...event };
    expect(
      energyHistoryReading(event, entity('4', '$', 'monetary', { currency: 'USD' }), 'cost').value
    ).toBeNull();
    expect(event).toEqual(copy);
  });
});

describe('Prezzi: soltanto intervalli pubblicati e non ambigui', () => {
  it('preserva tempi, gap, durata irregolare, prezzo negativo e sorgenti separate', () => {
    const next = slot('2026-11-11T11:15:00Z', '2026-11-11T11:30:00Z', -0.03);
    const tomorrow = slot('2026-11-12T00:00:00+01:00', '2026-11-12T00:15:00+01:00', 0);
    const result = parseEnergyPriceSlots(
      price({ raw_today: [next, first], raw_tomorrow: [tomorrow], tomorrow_valid: true }),
      now,
      'Europe/Rome'
    );
    expect(result).toMatchObject({ status: 'ready', activeIndex: 0, unit: 'EUR/kWh' });
    expect(result.slots.map((x) => x.value)).toEqual([0.12, -0.03, 0]);
    expect(result.today).toHaveLength(2);
    expect(result.tomorrow).toHaveLength(1);
    expect(result.today[1]!.start.toISOString()).toBe('2026-11-11T11:15:00.000Z');
    expect(result.today[1]!.end.getTime() - result.today[1]!.start.getTime()).toBe(15 * 60000);
    expect(
      parseEnergyPriceSlots(price({ raw_today: [first, next] }), new Date('2026-11-11T11:05:00Z'))
        .activeIndex
    ).toBe(-1);
  });
  it('l’estremo finale è escluso: nessuna doppia fascia attiva', () => {
    const result = parseEnergyPriceSlots(
      price({ raw_today: [first, slot('2026-11-11T11:00:00Z', '2026-11-11T12:00:00Z')] }),
      new Date('2026-11-11T11:00:00Z')
    );
    expect(result.activeIndex).toBe(1);
  });
  it('epoch secondi e millisecondi sono tempi reali, non indici orari', () => {
    const start = Date.parse('2026-11-11T10:00:00Z');
    const result = parseEnergyPriceSlots(
      price({ raw_today: [slot(start / 1000, start + 900000, '0.15')] }),
      now
    );
    expect(result.status).toBe('ready');
    expect(result.slots[0]!.start.getTime()).toBe(start);
    expect(result.slots[0]!.end.getTime()).toBe(start + 900000);
  });
  it('il cambio DST conserva due ore locali identiche ma intervalli assoluti diversi', () => {
    const result = parseEnergyPriceSlots(
      price({
        raw_today: [
          slot('2026-10-25T02:00:00+02:00', '2026-10-25T02:00:00+01:00', 0.2),
          slot('2026-10-25T02:00:00+01:00', '2026-10-25T03:00:00+01:00', 0.3),
        ],
      }),
      new Date('2026-10-25T02:30:00+01:00'),
      'Europe/Rome'
    );
    expect(result.status).toBe('ready');
    expect(result.activeIndex).toBe(1);
    expect(result.slots[1]!.start.getTime() - result.slots[0]!.start.getTime()).toBe(3600000);
  });
  it.each(
    [
      [slot('2026-11-11T10:00:00', '2026-11-11T11:00:00')],
      [slot('2026-02-30T10:00:00Z', '2026-03-01T11:00:00Z')],
      [slot('bad', '2026-11-11T11:00:00Z')],
      [slot(null, '2026-11-11T11:00:00Z')],
      [slot('2026-11-11T11:00:00Z', '2026-11-11T10:00:00Z')],
      [slot('2026-11-11T10:00:00Z', '2026-11-11T10:00:00Z')],
      [slot('2026-11-11T10:00:00Z', '2026-11-11T11:00:00Z', NaN)],
      [slot('2026-11-11T10:00:00Z', '2026-11-11T11:00:00Z', '1.2 EUR')],
      [first, first],
      [first, slot('2026-11-11T10:30:00Z', '2026-11-11T12:00:00Z')],
    ].map((raw) => [raw])
  )('rifiuta l’intera serie malformata senza grafico parziale: %j', (raw_today) => {
    expect(parseEnergyPriceSlots(price({ raw_today }), now)).toMatchObject({
      status: 'invalid',
      slots: [],
      activeIndex: -1,
    });
  });
  it('duplicati e sovrapposizioni fra oggi e domani non vengono sommati o nascosti', () => {
    expect(
      parseEnergyPriceSlots(
        price({ raw_today: [first], raw_tomorrow: [first], tomorrow_valid: true }),
        now
      ).status
    ).toBe('invalid');
  });
  it('non costruisce mai 24/96 durate dagli array today e tomorrow senza timestamp', () => {
    expect(
      parseEnergyPriceSlots(
        price({ today: Array(24).fill(0.2), tomorrow: [0.3], tomorrow_valid: true }),
        now
      )
    ).toMatchObject({ status: 'missing', slots: [], activeIndex: -1 });
  });
  it('non promuove fasce domani esplicitamente non pubblicate', () => {
    const result = parseEnergyPriceSlots(
      price({ raw_today: [first], raw_tomorrow: [{ malformed: true }], tomorrow_valid: false }),
      now
    );
    expect(result.status).toBe('ready');
    expect(result.tomorrow).toEqual([]);
  });
  it('la serie pubblicata non trasforma uno stato sconosciuto in prezzo osservato', () => {
    const current = price({ raw_today: [first] }, 'unknown');
    expect(parseEnergyPriceSlots(current, now).slots).toHaveLength(1);
    expect(energyReading(current, 'price')).toMatchObject({ status: 'unknown', value: null });
  });
  it('forme, fuso e istante invalidi restano espliciti', () => {
    expect(parseEnergyPriceSlots(undefined, now).status).toBe('missing');
    expect(parseEnergyPriceSlots(price({ raw_today: {} }), now).status).toBe('invalid');
    expect(parseEnergyPriceSlots(price({ raw_today: [first] }), new Date(NaN)).status).toBe(
      'invalid'
    );
    expect(parseEnergyPriceSlots(price({ raw_today: [first] }), now, 'bad/timezone').status).toBe(
      'invalid'
    );
    expect(parseEnergyPriceSlots(price({ raw_today: [first] }, '1', 'EUR'), now).status).toBe(
      'invalid'
    );
    expect(parseEnergyPriceSlots(price({ raw_today: [Object.create(first)] }), now).status).toBe(
      'invalid'
    );
  });
});
