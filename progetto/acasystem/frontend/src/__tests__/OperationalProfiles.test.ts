import { describe, expect, it } from 'vitest';
import {
  operationalProfile,
  readControlPreference,
} from '@/components/widgets/adaptive/operationalProfile';
import {
  adaptiveFixtureEntities as entities,
  adaptiveFixtureServices as services,
  adaptiveFixtureSettings as fixtures,
} from '@/utils/fixtures/adaptiveData';
import { operationalHistoryPoints } from '@/components/widgets/adaptive/useOperationalHistory';
import { parseMediaChildren, parseQueue } from '@/components/widgets/adaptive/useMediaResources';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ADD_WIDGET_TYPES } from '@/templates/sheets/catalog';
import { isCardHiddenByLogic } from '@/utils/cardUtils';
import { ensureDeviceClass } from '@/utils/launcher/layout';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import type { LauncherLayout } from '@/@types/launcher';

describe('Disponibilità e quattro dimensioni nel launcher', () => {
  it.each(Object.keys(fixtures))(
    '%s conserva tutte le taglie e mostra associazioni assenti',
    (type) => {
      const sample = ADD_WIDGET_TYPES.find((item) => item.type === type)!.sample;
      const settings = {
        ...sample.settings,
        ...fixtures[type]!.settings,
        categoryWidgetType: type,
      };
      const definition = findWidgetDefinition(sample.id, settings)!;
      const previous = findWidgetDefinition(sample.id, {
        ...settings,
        categoryWidgetType: undefined,
      })!;
      expect(definition.sizes.min).toEqual(previous.sizes.min);
      expect(definition.sizes.max.w).toBeGreaterThanOrEqual(4);
      expect(definition.sizes.max.h).toBeGreaterThanOrEqual(4);
      expect(findWidgetDefinition(sample.id, settings)).toBe(definition);
      expect(
        isCardHiddenByLogic(fixtures[type]!.entityId, {
          getCardSettingsKey: () => 'widget',
          cardSettings: { widget: settings },
          entities: {},
        })
      ).toBe(false);
    }
  );
  it('mantiene i limiti dei widget precedenti', () => {
    expect(findWidgetDefinition('vacuum.fixture')!.sizes.max).toEqual({ w: 2, h: 2 });
  });
  it('non riallarga una tessera 1×1 già salvata né sposta quella accanto', () => {
    const settings = { categoryWidgetType: 'light' };
    const rects = {
      'light.fixture': { x: 0, y: 0, w: 1, h: 1 },
      'light.second': { x: 1, y: 0, w: 1, h: 1 },
    };
    const layout: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [{ id: 'saved', label: 'Salvata', kind: 'widgets', placements: { phone: rects } }],
    };
    const result = ensureDeviceClass(layout, {
      deviceClass: 'phone',
      grids: DEFAULT_GRIDS,
      sizesOf: (id) => findWidgetDefinition(id, settings)?.sizes,
    });
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]!.placements.phone).toEqual(rects);
  });
});

describe('Venti profili operativi, target e capacità', () => {
  it.each(['media', 'sonos', 'androidtv', 'appletv', 'fan', 'vacuum', 'mower'])(
    '%s: attributi conservati ma feature zero non abilitano scritture',
    (type) => {
      const source = fixtures[type]!;
      const reduced = {
        ...entities,
        [source.entityId]: {
          ...entities[source.entityId]!,
          attributes: { ...entities[source.entityId]!.attributes, supported_features: 0 },
        },
      };
      const profile = operationalProfile({ type, ...source, entities: reduced, services });
      expect(
        profile.capabilities.some((cap) =>
          [
            'volume',
            'mute',
            'playing',
            'source',
            'shuffle',
            'power',
            'start',
            'speed',
            'oscillation',
          ].includes(cap.id)
        )
      ).toBe(false);
    }
  );
  it('ventilatore e clima aggregato rispettano anche le feature di accensione/spegnimento', () => {
    const readonly = Object.fromEntries(
      Object.entries(entities).map(([id, source]) => [
        id,
        { ...source, attributes: { ...source.attributes, supported_features: 0 } },
      ])
    );
    for (const type of ['fan', 'car', 'room']) {
      const profile = operationalProfile({
        type,
        ...fixtures[type]!,
        entities: readonly,
        services,
      });
      expect(
        profile.capabilities.some((cap) => ['power', 'climate', 'target'].includes(cap.id))
      ).toBe(false);
      const allOff = profile.execute('all_off', true, profile.values);
      expect(
        allOff?.calls.some((call) => ['climate', 'fan', 'media_player'].includes(call.domain)) ??
          false
      ).toBe(false);
    }
  });
  it('Stanza non inventa presenza o temperatura quando i sensori sono assenti o indisponibili', () => {
    const unavailableEntities = Object.fromEntries(
      Object.entries(entities).map(([id, entity]) => [id, { ...entity, state: 'unavailable' }])
    );
    for (const current of [{}, unavailableEntities]) {
      const profile = operationalProfile({
        type: 'room',
        ...fixtures.room!,
        entities: current,
        services,
      });
      expect(profile.capabilities).toEqual([]);
    }
    const source = entities['binary_sensor.motion']!;
    const profile = operationalProfile({
      type: 'room',
      ...fixtures.room!,
      entities: { ...entities, [source.entity_id]: { ...source, state: 'off' } },
      services,
    });
    expect(profile.values.presence).toBe('Libera');
  });
  it('copre esattamente i venti tipi approvati', () =>
    expect(Object.keys(fixtures)).toHaveLength(20));
  it.each(Object.entries(fixtures))(
    '%s: valori reali e nessun target inventato',
    (type, binding) => {
      const profile = operationalProfile({ type, ...binding, entities, services });
      expect(profile.capabilities.length).toBeGreaterThan(0);
      for (const cap of profile.capabilities) {
        const value =
          cap.kind === 'toggle'
            ? !cap.initial
            : cap.kind === 'options'
              ? cap.options[0]!
              : 'initial' in cap
                ? cap.initial
                : true;
        const operation = profile.execute(cap.id, value, profile.values);
        for (const call of operation?.calls ?? []) {
          expect(services[call.domain]).toHaveProperty(call.service);
          const ids = Array.isArray(call.data.entity_id)
            ? call.data.entity_id
            : [call.data.entity_id];
          for (const id of ids) expect(entities).toHaveProperty(String(id));
        }
        expect(profile.execute(cap.id, value, profile.values)).not.toBeUndefined();
      }
      expect(profile.capabilities.some((cap) => cap.id === 'trigger')).toBe(false);
    }
  );
  it.each(Object.entries(fixtures))(
    '%s: entità assenti e servizi assenti non causano eccezioni',
    (type, binding) => {
      const profile = operationalProfile({ type, ...binding, entities: {}, services: {} });
      for (const cap of profile.capabilities)
        expect(profile.execute(cap.id, true, profile.values)?.calls ?? []).toEqual([]);
    }
  );
  it.each(Object.entries(fixtures))(
    '%s: profilo con capacità ridotte e catalogo vuoto non inventa azioni',
    (type, binding) => {
      const reduced = Object.fromEntries(
        Object.entries(entities).map(([id, entity]) => [
          id,
          {
            ...entity,
            attributes: { friendly_name: entity.attributes.friendly_name, supported_features: 0 },
          },
        ])
      );
      const profile = operationalProfile({ type, ...binding, entities: reduced, services: {} });
      for (const cap of profile.capabilities) {
        const value =
          cap.kind === 'options' ? cap.options[0]! : 'initial' in cap ? cap.initial : true;
        expect(profile.execute(cap.id, value, profile.values)?.calls ?? []).toEqual([]);
      }
    }
  );
  it('una selezione di stanza del robot non viene trasformata in un area_id HA inventato', () => {
    const profile = operationalProfile({ type: 'vacuum', ...fixtures.vacuum!, entities, services });
    expect(profile.execute('clean_area', true, profile.values)).toBeNull();
    expect(profile.execute('area', 'Cucina', profile.values)?.calls[0]).toMatchObject({
      domain: 'select',
      service: 'select_option',
      data: { entity_id: 'select.area', option: 'Cucina' },
    });
  });
  it('Auto invia la ricarica allo switch configurato, non al sensore batteria', () => {
    const profile = operationalProfile({ type: 'car', ...fixtures.car!, entities, services });
    expect(profile.execute('charging', true, profile.values)?.calls).toEqual([
      { domain: 'switch', service: 'turn_on', data: { entity_id: 'switch.charging' } },
    ]);
  });
  it('la cartella pubblica o non configurata non abilita foto e registrazione', () => {
    for (const directory of ['', '/config/www/photos', '/config/../www']) {
      const profile = operationalProfile({
        type: 'camera',
        ...fixtures.camera!,
        settings: { ...fixtures.camera!.settings, cameraCaptureDirectory: directory },
        entities,
        services,
      });
      expect(profile.execute('snapshot', true, profile.values)).toBeNull();
      expect(profile.execute('record', true, profile.values)).toBeNull();
    }
  });
  it('salva preferenze senza riattivare controlli nascosti', () => {
    const profile = operationalProfile({ type: 'light', ...fixtures.light!, entities, services });
    expect(
      readControlPreference(
        { adaptiveControls: { order: ['power', 'brightness', 'missing'], visible: ['power'] } },
        profile.capabilities
      )
    ).toMatchObject({ visible: ['power'] });
    expect(
      readControlPreference({ adaptiveControls: { visible: [], order: [] } }, profile.capabilities)
        .visible
    ).toEqual([]);
  });
  it('estrae luminosità e stati dalla cronologia senza fabbricare punti mancanti', () => {
    const entries = [
      { state: 'on', attributes: { brightness: 255 }, last_updated: '2026-10-15T08:00:00Z' },
    ];
    expect(
      operationalHistoryPoints(entries, {
        entityId: 'light.fixture',
        attribute: 'brightness',
        factor: 100 / 255,
      })[0]?.value
    ).toBe(100);
    expect(operationalHistoryPoints(entries, { entityId: 'light.fixture' })).toEqual([]);
    expect(
      operationalHistoryPoints([{ state: 'locked', last_updated: '2026-10-15T08:00:00Z' }], {
        entityId: 'lock.fixture',
        states: { locked: 1 },
      })[0]?.value
    ).toBe(1);
  });
  it('seleziona il lettore associato salvato e non invia al primo della lista', () => {
    const profile = operationalProfile({
      type: 'media',
      ...fixtures.media!,
      settings: { ...fixtures.media!.settings, activeId: 'media_player.sonos' },
      entities,
      services,
    });
    expect(profile.targets.volume).toBe('media_player.sonos');
    expect(profile.execute('volume', 40, profile.values)?.calls[0]?.data.entity_id).toBe(
      'media_player.sonos'
    );
    expect(profile.execute('player', 'media_player.non_associato', profile.values)).toBeNull();
  });
  it('conferma le azioni osservabili dallo stato HA e non dal solo ack', () => {
    const profile = operationalProfile({ type: 'vacuum', ...fixtures.vacuum!, entities, services });
    expect(profile.values.start).toBe(false);
    expect(profile.execute('start', true, profile.values)?.confirmation).toBe(true);
    const next = operationalProfile({
      type: 'vacuum',
      ...fixtures.vacuum!,
      entities: {
        ...entities,
        'vacuum.fixture': { ...entities['vacuum.fixture']!, state: 'cleaning' },
      },
      services,
    });
    expect(next.values.start).toBe(true);
  });
  it('le capacità ridotte non abilitano avvio robot o controlli volume in sola lettura', () => {
    for (const type of ['vacuum', 'mower', 'media'] as const) {
      const id = fixtures[type]!.entityId;
      const profile = operationalProfile({
        type,
        ...fixtures[type]!,
        entities: {
          ...entities,
          [id]: {
            ...entities[id]!,
            attributes: { ...entities[id]!.attributes, supported_features: 0 },
          },
        },
        services,
      });
      expect(profile.capabilities.some((cap) => ['start', 'volume', 'mute'].includes(cap.id))).toBe(
        false
      );
    }
  });
  it('le sveglie Sonos usano il contratto update_alarm e l’identificativo reale', () => {
    const profile = operationalProfile({ type: 'sonos', ...fixtures.sonos!, entities, services });
    expect(
      profile.execute('alarm_time:switch.sonos_alarm', '08:30', profile.values)?.calls[0]
    ).toEqual({
      domain: 'sonos',
      service: 'update_alarm',
      data: { entity_id: 'media_player.sonos', alarm_id: 1, time: '08:30' },
    });
    expect(profile.execute('alarm_time:switch.sonos_alarm', '30:90', profile.values)).toBeNull();
  });
  it('legge i contratti coda Sonos e cartelle media', () => {
    expect(
      parseQueue(
        { response: { 'media_player.sonos': { queue: [{ media_title: 'Brano reale' }] } } },
        'media_player.sonos'
      )
    ).toEqual([{ id: '0', label: 'Brano reale' }]);
    expect(
      parseMediaChildren({
        children: [
          {
            title: 'Musica',
            media_content_id: 'music',
            media_content_type: 'directory',
            can_expand: true,
            can_play: false,
          },
        ],
      })[0]
    ).toMatchObject({ id: 'music', expandable: true, playable: false });
  });
});
