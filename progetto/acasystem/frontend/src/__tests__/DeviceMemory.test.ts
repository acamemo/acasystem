/**
 * ADR-0019: memory of the configuration of a widget per device, the migration of the retired
 * «Nascondi il widget» list and the tidying of the settings of widgets that are gone.
 */
import { describe, expect, it } from 'vitest';
import type { LauncherLayout } from '@/@types/launcher';
import { CAR_KEYS } from '@/templates/sheets/editTarget';
import { VACUUM_MAPPINGS } from '@/templates/sheets/sections/AdditionalTypeSections';
import {
  DEVICE_SCOPED_SETTINGS,
  MEMORY_ENTRY_LIMIT,
  MEMORY_VALUE_LIMIT,
  adoptDeviceConfig,
  captureWidget,
  configOf,
  emptyWidgetMemory,
  isStructuralSetting,
  memoryKey,
  normalizeWidgetState,
  mergeWidgetMemory,
  propagateDeviceScoped,
  rememberEntry,
  rememberLeavingWidgets,
  rememberWidgets,
  sanitizeWidgetMemory,
  touchWidget,
  widgetDeviceKey,
  widgetTypeOf,
  type MemoryEntry,
  type WidgetState,
} from '@/utils/launcher/deviceMemory';

const rect = { x: 0, y: 0, w: 2, h: 2 };

const layoutOf = (pages: Record<string, string[]>, extra: Partial<LauncherLayout> = {}) =>
  ({
    version: 1,
    cover: { enabled: false },
    pages: Object.entries(pages).map(([id, widgets]) => ({
      id,
      label: id,
      kind: 'widgets' as const,
      placements: {
        tablet: Object.fromEntries(widgets.map((widget) => [widget, rect])),
        phone: Object.fromEntries(widgets.map((widget) => [widget, rect])),
      },
    })),
    ...extra,
  }) satisfies LauncherLayout;

const stateOf = (over: Partial<WidgetState> = {}): WidgetState => ({
  layout: null,
  pagesConfig: null,
  cardSettings: {},
  customNames: {},
  customIcons: {},
  memory: emptyWidgetMemory(),
  ...over,
});

const tv = (extra: Record<string, unknown> = {}) => ({
  categoryWidgetType: 'appletv',
  mediaPlayerId: 'media_player.salotto',
  ...extra,
});

describe('which widget shows which device', () => {
  it('reads the type from the category, else from the legacy id rules', () => {
    expect(widgetTypeOf('appletv.preset_a', { categoryWidgetType: 'appletv' })).toBe('appletv');
    expect(widgetTypeOf('light.cucina', {})).toBe('light');
    expect(widgetTypeOf('lawn_mower.prato', {})).toBe('mower');
    expect(widgetTypeOf('spacer_card_1', {})).toBe('spacer');
  });

  it('finds the device in the binding, or in the id of an entity widget', () => {
    expect(widgetDeviceKey('appletv.preset_a', tv())).toBe('media_player.salotto');
    expect(widgetDeviceKey('light.preset_a', { categoryWidgetType: 'light' })).toBeNull();
    expect(widgetDeviceKey('light.cucina', {})).toBe('light.cucina');
    expect(widgetDeviceKey('climate_card_1', { climateId: 'climate.sala' })).toBe('climate.sala');
    expect(widgetDeviceKey('calendar_card_1', { calendars: ['calendar.a', 'calendar.b'] })).toBe(
      'calendar.a'
    );
    expect(widgetDeviceKey('spacer_card_1', { variant: 'divider' })).toBeNull();
  });
});

describe('what is kept for a device', () => {
  const settings = tv({ heading: 'Salotto', appearanceFrame: false, tapAction: 'toggle' });

  it('keeps name, icon and settings, without the device and the structure', () => {
    const entry = captureWidget({
      widgetId: 'appletv.preset_a',
      settings,
      name: ' TV grande ',
      icon: 'tv',
      updatedAt: 5,
    });
    expect(entry).toMatchObject({
      type: 'appletv',
      deviceKey: 'media_player.salotto',
      updatedAt: 5,
      name: 'TV grande',
      icon: 'tv',
      label: 'TV grande',
      settings: { heading: 'Salotto', appearanceFrame: false, tapAction: 'toggle' },
    });
    expect(entry?.settings).not.toHaveProperty('mediaPlayerId');
    expect(entry?.settings).not.toHaveProperty('categoryWidgetType');
  });

  it('keeps nothing for a widget without a device or without configuration', () => {
    expect(
      captureWidget({
        widgetId: 'light.preset',
        settings: { heading: 'x', categoryWidgetType: 'light' },
        updatedAt: 1,
      })
    ).toBeNull();
    expect(
      captureWidget({ widgetId: 'appletv.preset_a', settings: tv(), updatedAt: 1 })
    ).toBeNull();
  });

  it('does not keep a value that is too long (a picture)', () => {
    const entry = captureWidget({
      widgetId: 'appletv.preset_a',
      settings: tv({ imageUrl: 'x'.repeat(MEMORY_VALUE_LIMIT + 1), heading: 'ok' }),
      updatedAt: 1,
    });
    expect(entry?.settings).toEqual({ heading: 'ok' });
  });

  it('keeps the entry edited later, and at most the limit, dropping the oldest', () => {
    const entry = (deviceKey: string, updatedAt: number): MemoryEntry => ({
      type: 'light',
      deviceKey,
      updatedAt,
      label: null,
      settings: { heading: deviceKey },
    });
    let memory = rememberEntry(emptyWidgetMemory(), entry('light.a', 10));
    memory = rememberEntry(memory, entry('light.a', 5));
    expect(memory.entries[memoryKey('light', 'light.a')]?.updatedAt).toBe(10);
    memory = rememberEntry(memory, entry('light.a', 20));
    expect(memory.entries[memoryKey('light', 'light.a')]?.updatedAt).toBe(20);

    let full = emptyWidgetMemory();
    for (let i = 0; i < MEMORY_ENTRY_LIMIT + 5; i++)
      full = rememberEntry(full, entry(`light.l${i}`, 100 + i));
    expect(Object.keys(full.entries)).toHaveLength(MEMORY_ENTRY_LIMIT);
    expect(full.entries[memoryKey('light', 'light.l0')]).toBeUndefined();
    expect(full.entries[memoryKey('light', `light.l${MEMORY_ENTRY_LIMIT + 4}`)]).toBeDefined();
  });

  it('reads back a stored memory, dropping what is malformed', () => {
    const good: MemoryEntry = {
      type: 'light',
      deviceKey: 'light.a',
      updatedAt: 3,
      label: 'A',
      settings: { heading: 'x' },
    };
    const memory = sanitizeWidgetMemory({
      entries: {
        [memoryKey('light', 'light.a')]: good,
        wrong: { ...good, deviceKey: 'light.b' },
        [memoryKey('light', 'light.c')]: { ...good, deviceKey: 'light.c', updatedAt: 'x' },
      },
      touched: { w1: 4, w2: 'x' },
    });
    expect(Object.keys(memory.entries)).toEqual([memoryKey('light', 'light.a')]);
    expect(memory.touched).toEqual({ w1: 4 });
    expect(sanitizeWidgetMemory('garbage')).toEqual(emptyWidgetMemory());
  });

  it('remembers the widgets of a removal, the members of a stack one by one', () => {
    const layout = layoutOf(
      { home: ['stack_1'] },
      { stacks: { stack_1: { ids: ['light.a', 'light.b'] } } }
    );
    const state = stateOf({
      layout,
      cardSettings: { 'home::light.a': { heading: 'A' }, 'home::light.b': { heading: 'B' } },
    });
    const memory = rememberWidgets(state, 'home', ['stack_1'], 50);
    expect(Object.keys(memory.entries).sort()).toEqual([
      memoryKey('light', 'light.a'),
      memoryKey('light', 'light.b'),
    ]);
  });
});

describe('taking the configuration back when a widget is linked', () => {
  const entry = (
    settings: Record<string, unknown>,
    updatedAt: number,
    extra = {}
  ): MemoryEntry => ({
    type: 'appletv',
    deviceKey: 'media_player.salotto',
    updatedAt,
    label: 'TV in memoria',
    settings,
    ...extra,
  });
  const withMemory = (...entries: MemoryEntry[]) =>
    entries.reduce((memory, item) => rememberEntry(memory, item), emptyWidgetMemory());

  it('removed, then linked again: the configuration comes back, not the place or the device', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['appletv.preset_b'] }),
      cardSettings: { 'home::appletv.preset_b': tv({ mediaPlayerId: 'media_player.salotto' }) },
      memory: withMemory(
        entry({ heading: 'Salotto', tapAction: 'toggle' }, 10, { name: 'TV', icon: 'tv' })
      ),
    });
    const result = adoptDeviceConfig(state, 'home', 'appletv.preset_b', 99);
    expect(result?.cardSettings['home::appletv.preset_b']).toEqual({
      ...tv(),
      heading: 'Salotto',
      tapAction: 'toggle',
    });
    expect(result?.customNames).toEqual({ 'appletv.preset_b': 'TV' });
    expect(result?.customIcons).toEqual({ 'appletv.preset_b': 'tv' });
    expect(result?.source).toEqual({
      kind: 'memory',
      label: 'TV in memoria',
      deviceKey: 'media_player.salotto',
    });
    expect(result?.memory.touched['appletv.preset_b']).toBe(99);
    // the memory itself stays: removing the widget again will update it
    expect(result?.memory.entries[memoryKey('appletv', 'media_player.salotto')]).toBeDefined();
  });

  it("the widget's own values win over the copied ones, but not for the settings of the device", () => {
    const state = stateOf({
      cardSettings: {
        'home::appletv_card_9': { ...tv(), tapAction: 'modal', remoteId: 'remote.mio' },
      },
      memory: withMemory(
        entry({ tapAction: 'toggle', remoteId: 'remote.vecchio', heading: 'Salotto' }, 10)
      ),
    });
    const result = adoptDeviceConfig(state, 'home', 'appletv_card_9', 1);
    // the tap action is of the widget; the remote is of the device: one value for the device
    expect(result?.cardSettings['home::appletv_card_9']).toMatchObject({
      tapAction: 'modal',
      remoteId: 'remote.vecchio',
      heading: 'Salotto',
    });
  });

  it('a second widget on the same device takes the most recent configuration among the widget and the memory', () => {
    const base = {
      layout: layoutOf({ home: ['appletv.preset_a', 'appletv.preset_b'] }),
      cardSettings: {
        'home::appletv.preset_a': tv({ heading: "Dell'altro widget" }),
        'home::appletv.preset_b': tv(),
      },
    };
    const sibling = touchWidget(emptyWidgetMemory(), 'appletv.preset_a', 50);

    // the widget was edited after the memory entry: it wins
    const newerWidget = adoptDeviceConfig(
      stateOf({
        ...base,
        memory: { ...withMemory(entry({ heading: 'In memoria' }, 10)), touched: sibling.touched },
      }),
      'home',
      'appletv.preset_b',
      60
    );
    expect(newerWidget?.cardSettings['home::appletv.preset_b']).toMatchObject({
      heading: "Dell'altro widget",
    });
    expect(newerWidget?.source?.kind).toBe('widget');

    // the memory entry is newer: it wins
    const newerMemory = adoptDeviceConfig(
      stateOf({
        ...base,
        memory: { ...withMemory(entry({ heading: 'In memoria' }, 90)), touched: sibling.touched },
      }),
      'home',
      'appletv.preset_b',
      100
    );
    expect(newerMemory?.cardSettings['home::appletv.preset_b']).toMatchObject({
      heading: 'In memoria',
    });
    expect(newerMemory?.source?.kind).toBe('memory');

    // a tie goes to the widget
    const tie = adoptDeviceConfig(
      stateOf({
        ...base,
        memory: { ...withMemory(entry({ heading: 'In memoria' }, 50)), touched: sibling.touched },
      }),
      'home',
      'appletv.preset_b',
      100
    );
    expect(tie?.source?.kind).toBe('widget');
  });

  it('after the copy the two widgets are independent', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['appletv.preset_a', 'appletv.preset_b'] }),
      cardSettings: {
        'home::appletv.preset_a': tv({
          adaptiveControls: { order: ['power'], visible: ['power'] },
        }),
        'home::appletv.preset_b': tv(),
      },
    });
    const result = adoptDeviceConfig(state, 'home', 'appletv.preset_b', 1)!;
    const copied = result.cardSettings['home::appletv.preset_b']!.adaptiveControls as {
      order: string[];
    };
    copied.order.push('mute');
    expect(
      (state.cardSettings['home::appletv.preset_a']!.adaptiveControls as { order: string[] }).order
    ).toEqual(['power']);
    // and the sibling's own settings are not changed by the copy
    expect(result.cardSettings['home::appletv.preset_a']).toBe(
      state.cardSettings['home::appletv.preset_a']
    );
  });

  it('copies nothing for another type, another device, a widget already edited or one without a device', () => {
    const memory = withMemory(entry({ heading: 'x' }, 10));
    const base = stateOf({ memory });
    expect(
      adoptDeviceConfig(
        {
          ...base,
          cardSettings: {
            'home::light.preset': {
              categoryWidgetType: 'light',
              bindingEntityId: 'media_player.salotto',
            },
          },
        },
        'home',
        'light.preset',
        1
      )
    ).toBeNull();
    expect(
      adoptDeviceConfig(
        { ...base, cardSettings: { 'home::a': tv({ mediaPlayerId: 'media_player.cucina' }) } },
        'home',
        'a',
        1
      )
    ).toBeNull();
    expect(
      adoptDeviceConfig(
        { ...base, cardSettings: { 'home::a': tv() }, memory: touchWidget(memory, 'a', 5) },
        'home',
        'a',
        1
      )
    ).toBeNull();
    expect(
      adoptDeviceConfig(
        { ...base, cardSettings: { 'home::a': { categoryWidgetType: 'appletv' } } },
        'home',
        'a',
        1
      )
    ).toBeNull();
  });

  it('an unconfigured sibling is not a source', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['appletv.preset_a', 'appletv.preset_b'] }),
      cardSettings: { 'home::appletv.preset_a': tv(), 'home::appletv.preset_b': tv() },
    });
    expect(adoptDeviceConfig(state, 'home', 'appletv.preset_b', 1)).toBeNull();
  });
});

describe('settings of the device, shared by all its widgets', () => {
  const scope = new Set(['defaultSource']);
  const cardSettings = {
    'home::appletv.a': tv({ defaultSource: 'Netflix', heading: 'A' }),
    'home::appletv.b': tv({ defaultSource: 'Netflix', heading: 'B' }),
    'home::appletv.c': tv({ mediaPlayerId: 'media_player.cucina', defaultSource: 'Netflix' }),
    'home::light.d': { categoryWidgetType: 'light', bindingEntityId: 'media_player.salotto' },
  };

  it('one value for the device: the other widgets of the same type on it follow', () => {
    const changed = {
      ...cardSettings,
      'home::appletv.a': { ...cardSettings['home::appletv.a'], defaultSource: 'Prime' },
    };
    const next = propagateDeviceScoped(changed, 'home::appletv.a', 'defaultSource', 'Prime', scope);
    expect(next['home::appletv.b']).toMatchObject({ defaultSource: 'Prime', heading: 'B' });
    expect(next['home::appletv.c']).toMatchObject({ defaultSource: 'Netflix' });
    expect(next['home::light.d']).not.toHaveProperty('defaultSource');
  });

  it('a setting of the widget is not shared, and today none is of the device', () => {
    const changed = {
      ...cardSettings,
      'home::appletv.a': { ...cardSettings['home::appletv.a'], heading: 'Nuovo' },
    };
    expect(propagateDeviceScoped(changed, 'home::appletv.a', 'heading', 'Nuovo', scope)).toBe(
      changed
    );
    expect(propagateDeviceScoped(changed, 'home::appletv.a', 'defaultSource', 'Prime')).toBe(
      changed
    );
  });
});

describe('the inventory of the settings: of the device, or of the widget (ADR-0019)', () => {
  it('every association of the car and of the vacuum in the sheets is of the device', () => {
    for (const key of CAR_KEYS) {
      if (key !== 'batteryId') expect(DEVICE_SCOPED_SETTINGS.has(key), key).toBe(true);
    }
    for (const [key] of VACUUM_MAPPINGS) expect(DEVICE_SCOPED_SETTINGS.has(key), key).toBe(true);
  });

  it('what changes how one widget looks or behaves stays free', () => {
    for (const key of [
      'heading',
      'tapAction',
      'appearanceFrame',
      'appearanceOpacity',
      'adaptiveControls',
      'adaptiveSpacing',
      'climateFavoriteModes',
      'visibilityCondition',
      'sensorAction',
      'sensorStatusMode',
      'graphStyle',
      'currency',
      'decimals',
      'navigateToPageId',
      'imageUrl',
      'showStatus',
    ]) {
      expect(DEVICE_SCOPED_SETTINGS.has(key), key).toBe(false);
    }
  });

  it('the binding of a type is structure, the same name on another type is configuration', () => {
    expect(isStructuralSetting('climate', 'climateId')).toBe(true);
    expect(isStructuralSetting('car', 'climateId')).toBe(false);
    expect(isStructuralSetting('car', 'batteryId')).toBe(true);
    expect(isStructuralSetting('room', 'areaName')).toBe(true);
    expect(isStructuralSetting('light', 'categoryWidgetType')).toBe(true);
    expect(
      configOf('car', { batteryId: 'sensor.b', climateId: 'climate.auto', heading: 'x' })
    ).toEqual({
      climateId: 'climate.auto',
      heading: 'x',
    });
  });

  it('with the real list, a light transition is one value for the light, on its widgets only', () => {
    const lights = {
      'home::light.a': { categoryWidgetType: 'light', bindingEntityId: 'light.cucina' },
      'home::light.b': {
        categoryWidgetType: 'light',
        bindingEntityId: 'light.cucina',
        lightTransition: 1,
      },
      'home::light.c': { categoryWidgetType: 'light', bindingEntityId: 'light.sala' },
      'home::fan.d': { categoryWidgetType: 'fan', bindingEntityId: 'light.cucina' },
    };
    const next = propagateDeviceScoped(
      { ...lights, 'home::light.a': { ...lights['home::light.a'], lightTransition: 3 } },
      'home::light.a',
      'lightTransition',
      3
    );
    expect(next['home::light.b']).toMatchObject({ lightTransition: 3 });
    expect(next['home::light.c']).not.toHaveProperty('lightTransition');
    expect(next['home::fan.d']).not.toHaveProperty('lightTransition');
    // the name of the widget is not shared
    expect(propagateDeviceScoped(lights, 'home::light.a', 'heading', 'x')).toBe(lights);
  });

  it('the associations of a device come with the configuration taken back', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['car.a', 'car.b'] }),
      cardSettings: {
        'home::car.a': {
          categoryWidgetType: 'car',
          batteryId: 'sensor.auto_batteria',
          odometerId: 'sensor.auto_km',
          climateId: 'climate.auto',
        },
        'home::car.b': { categoryWidgetType: 'car', batteryId: 'sensor.auto_batteria' },
      },
    });
    const result = adoptDeviceConfig(state, 'home', 'car.b', 1);
    expect(result?.cardSettings['home::car.b']).toEqual({
      categoryWidgetType: 'car',
      batteryId: 'sensor.auto_batteria',
      odometerId: 'sensor.auto_km',
      climateId: 'climate.auto',
    });
  });
});

describe('the hidden widgets of an earlier version', () => {
  const build = () =>
    stateOf({
      layout: layoutOf(
        {
          home: ['appletv.preset_a', 'spacer_card_1', 'light.cucina'],
          altra: ['appletv.preset_a'],
        },
        { stacks: { stack_1: { ids: ['light.cucina', 'light.sala'] } } }
      ),
      pagesConfig: {
        pages: ['home', 'altra'],
        header: ['light.cucina'],
        home: ['appletv.preset_a', 'spacer_card_1'],
        altra: [],
      },
      cardSettings: {
        'home::appletv.preset_a': tv({ heading: 'Salotto' }),
        'home::spacer_card_1': { variant: 'divider', heading: 'Riga' },
        'home::light.cucina': { appearanceFrame: false },
      },
      customNames: { 'appletv.preset_a': 'TV', 'light.cucina': 'Cucina' },
    });

  it('leave the pages; the configuration of one with a device goes to the memory; one without a device frees only its place', () => {
    const state = build();
    const after = normalizeWidgetState(
      state,
      ['appletv.preset_a', 'spacer_card_1', 'light.cucina'],
      1000,
      { sweep: false }
    );
    const placed = after.layout!.pages.flatMap((page) =>
      Object.values(page.placements).flatMap((p) => Object.keys(p ?? {}))
    );
    expect(placed).toEqual([]);
    expect(after.pagesConfig).toEqual({
      pages: ['home', 'altra'],
      header: ['light.cucina'],
      home: [],
      altra: [],
    });
    expect(after.layout!.stacks).toEqual({ stack_1: { ids: ['light.sala'] } });
    expect(Object.keys(after.memory.entries).sort()).toEqual([
      memoryKey('appletv', 'media_player.salotto'),
      memoryKey('light', 'light.cucina'),
    ]);
    expect(after.memory.entries[memoryKey('appletv', 'media_player.salotto')]).toMatchObject({
      name: 'TV',
      settings: { heading: 'Salotto' },
    });
    // nothing to keep for the divider: no entry, only its cell is free
    expect(JSON.stringify(after.memory)).not.toContain('Riga');
  });

  it('is idempotent: a second run, with nothing hidden, changes nothing', () => {
    const once = normalizeWidgetState(build(), ['appletv.preset_a', 'light.cucina'], 1000, {
      sweep: true,
    });
    expect(normalizeWidgetState(once, [], 2000, { sweep: true })).toBe(once);
    // the same list again (an old snapshot applied twice) gives the same result
    const twice = normalizeWidgetState(once, ['appletv.preset_a', 'light.cucina'], 3000, {
      sweep: true,
    });
    expect(twice.layout).toBe(once.layout);
    expect(twice.pagesConfig).toBe(once.pagesConfig);
    expect(twice.memory.entries).toEqual(once.memory.entries);
  });

  it('works on old data: no layout yet, only the page lists; an id that is on no page; a hidden id with nothing stored', () => {
    const state = stateOf({
      pagesConfig: { pages: ['home'], header: [], home: ['appletv_card_1', 'x'] },
      cardSettings: { 'home::appletv_card_1': tv({ heading: 'Vecchio' }) },
    });
    const after = normalizeWidgetState(state, ['appletv_card_1', 'ghost', 'light.nessuno'], 7, {
      sweep: true,
    });
    expect(after.pagesConfig?.home).toEqual(['x']);
    expect(after.layout).toBeNull();
    expect(after.memory.entries[memoryKey('appletv', 'media_player.salotto')]?.settings).toEqual({
      heading: 'Vecchio',
    });
  });

  it('nothing hidden and nothing to tidy: the same object comes back', () => {
    const state = build();
    expect(normalizeWidgetState(state, [], 1, { sweep: true })).toBe(state);
  });
});

describe('the settings of widgets that are no longer on a page (ISSUE-114)', () => {
  it('the copy a move left behind is dropped, the widget keeps its settings where it is', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['light.a'], altra: [] }),
      cardSettings: { 'home::light.a': { heading: 'A' }, 'altra::light.a': { heading: 'A' } },
    });
    const after = normalizeWidgetState(state, [], 5, { sweep: true });
    expect(Object.keys(after.cardSettings)).toEqual(['home::light.a']);
    expect(Object.keys(after.memory.entries)).toEqual([]);
  });

  it('a removed widget with a device: its configuration goes to the memory and the entry is dropped', () => {
    const state = stateOf({
      layout: layoutOf({ home: [] }),
      cardSettings: { 'home::appletv.preset_a': tv({ heading: 'Salotto' }) },
    });
    const after = normalizeWidgetState(state, [], 5, { sweep: true });
    expect(after.cardSettings).toEqual({});
    expect(after.memory.entries[memoryKey('appletv', 'media_player.salotto')]?.settings).toEqual({
      heading: 'Salotto',
    });
  });

  it('a removed widget without a device: only structure is dropped, real settings stay', () => {
    const state = stateOf({
      layout: layoutOf({ home: [] }),
      cardSettings: {
        'home::light.preset_x': { categoryWidgetType: 'light' },
        'home::spacer_card_1': { variant: 'divider', heading: 'Riga' },
        'settings::sensor.t': { type: 'sensor' },
        'pagina_che_non_esiste::light.a': { heading: 'x' },
      },
    });
    const after = normalizeWidgetState(state, [], 5, { sweep: true });
    expect(Object.keys(after.cardSettings).sort()).toEqual([
      'home::spacer_card_1',
      'pagina_che_non_esiste::light.a',
      'settings::sensor.t',
    ]);
  });

  it('a widget in a stack is on its page', () => {
    const state = stateOf({
      layout: layoutOf(
        { home: ['stack_1'] },
        { stacks: { stack_1: { ids: ['light.a', 'light.b'] } } }
      ),
      cardSettings: { 'home::light.a': { heading: 'A' }, 'home::light.b': { heading: 'B' } },
    });
    expect(normalizeWidgetState(state, [], 5, { sweep: true })).toBe(state);
  });

  it('forgets the edit times of widgets that are gone', () => {
    let memory = touchWidget(emptyWidgetMemory(), 'light.a', 5);
    memory = touchWidget(memory, 'light.gone', 6);
    const state = stateOf({
      layout: layoutOf({ home: ['light.a'] }),
      cardSettings: { 'home::light.a': { heading: 'A' } },
      memory,
    });
    expect(normalizeWidgetState(state, [], 9, { sweep: true }).memory.touched).toEqual({
      'light.a': 5,
    });
  });
});

describe('a widget that leaves the pages (review of the memory)', () => {
  const light = (settings: Record<string, unknown> = {}) => ({ heading: 'Cucina', ...settings });

  it('keeps its configuration, loses its edit time, and one never edited enters with time 0', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['light.a', 'light.b'] }),
      cardSettings: { 'home::light.a': light(), 'home::light.b': light({ heading: 'B' }) },
      memory: touchWidget(emptyWidgetMemory(), 'light.a', 40),
    });
    const memory = rememberWidgets(state, 'home', ['light.a', 'light.b'], 999);
    expect(memory.entries[memoryKey('light', 'light.a')]?.updatedAt).toBe(40);
    expect(memory.entries[memoryKey('light', 'light.b')]?.updatedAt).toBe(0);
    expect(memory.touched).toEqual({});
  });

  it('keeps the edit time of a widget that is still on another page', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['light.a'], altra: ['light.a'] }),
      cardSettings: { 'home::light.a': light() },
      memory: touchWidget(emptyWidgetMemory(), 'light.a', 40),
    });
    expect(rememberWidgets(state, 'home', ['light.a'], 999).touched).toEqual({ 'light.a': 40 });
  });

  it('a never edited widget does not outrank a configuration somebody took care of', () => {
    const edited = stateOf({
      layout: layoutOf({ home: ['light.a'] }),
      cardSettings: { 'home::light.a': light({ heading: 'Curata' }) },
      memory: touchWidget(emptyWidgetMemory(), 'light.a', 40),
    });
    let memory = rememberWidgets(edited, 'home', ['light.a'], 999);
    // the same entity, a widget never edited, is removed later
    const plain = stateOf({
      layout: layoutOf({ altra: ['light.a'] }),
      cardSettings: { 'altra::light.a': light({ heading: 'Quasi di serie' }) },
      memory,
    });
    memory = rememberWidgets(plain, 'altra', ['light.a'], 5000);
    expect(memory.entries[memoryKey('light', 'light.a')]?.settings).toMatchObject({
      heading: 'Curata',
    });
  });

  it('hidden widgets lose their edit time as well', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['light.a'] }),
      cardSettings: { 'home::light.a': light() },
      memory: touchWidget(emptyWidgetMemory(), 'light.a', 40),
    });
    const after = normalizeWidgetState(state, ['light.a'], 9, { sweep: false });
    expect(after.memory.touched).toEqual({});
    expect(after.memory.entries[memoryKey('light', 'light.a')]?.updatedAt).toBe(40);
  });

  it('an entity added again with the same id takes the configuration back', () => {
    const removed = rememberWidgets(
      stateOf({
        layout: layoutOf({ home: ['light.a'] }),
        cardSettings: { 'home::light.a': light() },
        customNames: { 'light.a': 'Tavolo' },
        memory: touchWidget(emptyWidgetMemory(), 'light.a', 40),
      }),
      'home',
      ['light.a'],
      50
    );
    const result = adoptDeviceConfig(
      stateOf({ layout: layoutOf({ altra: ['light.a'] }), memory: removed }),
      'altra',
      'light.a',
      60
    );
    expect(result?.cardSettings['altra::light.a']).toMatchObject({ heading: 'Cucina' });
    expect(result?.customNames).toEqual({ 'light.a': 'Tavolo' });
  });
});

describe('the settings of the device when a widget is linked (review of the memory)', () => {
  const lightOn = (device: string, extra: Record<string, unknown> = {}) => ({
    categoryWidgetType: 'light',
    bindingEntityId: device,
    ...extra,
  });

  it('a widget already edited takes the value of the device, over its own', () => {
    // l.b was just linked to the sala, where l.a has lightTransition 5; its own 1 gives way
    const state = stateOf({
      layout: layoutOf({ home: ['l.a', 'l.b'] }),
      cardSettings: {
        'home::l.a': lightOn('light.sala', { lightTransition: 5, heading: 'A' }),
        'home::l.b': lightOn('light.sala', { lightTransition: 1, heading: 'B' }),
      },
      memory: touchWidget(touchWidget(emptyWidgetMemory(), 'l.a', 10), 'l.b', 20),
    });
    const result = adoptDeviceConfig(state, 'home', 'l.b', 30);
    expect(result?.cardSettings['home::l.b']).toMatchObject({ lightTransition: 5, heading: 'B' });
    // only the settings of the device were aligned: no copy, no new edit time, no notice
    expect(result?.source).toBeNull();
    expect(result?.memory).toBe(state.memory);
    expect(result?.cardSettings['home::l.a']).toBe(state.cardSettings['home::l.a']);
  });

  it('takes the value of the memory when no other widget is on the device', () => {
    const state = stateOf({
      cardSettings: { 'home::l.b': lightOn('light.sala', { lightTransition: 1 }) },
      memory: rememberEntry(touchWidget(emptyWidgetMemory(), 'l.b', 3), {
        type: 'light',
        deviceKey: 'light.sala',
        updatedAt: 9,
        label: null,
        settings: { lightTransition: 7 },
      }),
    });
    expect(
      adoptDeviceConfig(state, 'home', 'l.b', 10)?.cardSettings['home::l.b']?.lightTransition
    ).toBe(7);
  });

  it('nothing changes when the widget already has the value of the device', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['l.a', 'l.b'] }),
      cardSettings: {
        'home::l.a': lightOn('light.sala', { lightTransition: 5 }),
        'home::l.b': lightOn('light.sala', { lightTransition: 5 }),
      },
      memory: touchWidget(emptyWidgetMemory(), 'l.b', 3),
    });
    expect(adoptDeviceConfig(state, 'home', 'l.b', 10)).toBeNull();
  });
});

describe('a room is born with defaults that the kept configuration replaces', () => {
  it('the kept settings and name win over the defaults of the new room', () => {
    const state = stateOf({
      cardSettings: {
        'home::room_card_9_0': { areaId: 'cucina', areaName: 'Cucina', showClimate: false },
      },
      customNames: { room_card_9_0: 'Cucina' },
      memory: rememberEntry(emptyWidgetMemory(), {
        type: 'room',
        deviceKey: 'cucina',
        updatedAt: 9,
        label: null,
        name: 'La cucina',
        settings: { showClimate: true },
      }),
    });
    const result = adoptDeviceConfig(state, 'home', 'room_card_9_0', 10);
    expect(result?.cardSettings['home::room_card_9_0']).toMatchObject({
      areaName: 'Cucina',
      showClimate: true,
    });
    expect(result?.customNames).toEqual({ room_card_9_0: 'La cucina' });
  });
});

describe('a snapshot arrives (review of the memory)', () => {
  const entry = (deviceKey: string, updatedAt: number, heading: string): MemoryEntry => ({
    type: 'light',
    deviceKey,
    updatedAt,
    label: null,
    settings: { heading },
  });

  it('merges the incoming memory into the local one, the later edit of an entry stays', () => {
    const local = rememberEntry(
      rememberEntry(emptyWidgetMemory(), entry('light.a', 10, 'locale')),
      entry('light.b', 5, 'solo qui')
    );
    const incoming = rememberEntry(
      rememberEntry(emptyWidgetMemory(), entry('light.a', 20, 'in arrivo')),
      entry('light.c', 1, 'nuovo')
    );
    const merged = mergeWidgetMemory(
      { ...local, touched: { w: 4 } },
      { ...incoming, touched: { w: 9, v: 2 } }
    );
    expect(Object.keys(merged.entries).sort()).toEqual([
      memoryKey('light', 'light.a'),
      memoryKey('light', 'light.b'),
      memoryKey('light', 'light.c'),
    ]);
    expect(merged.entries[memoryKey('light', 'light.a')]?.settings.heading).toBe('in arrivo');
    expect(merged.touched).toEqual({ w: 9, v: 2 });
  });

  it('keeps the linked widgets the incoming pages leave out, not the ones they keep', () => {
    const state = stateOf({
      layout: layoutOf({ home: ['light.a', 'light.b', 'spacer_card_1'] }),
      cardSettings: {
        'home::light.a': { heading: 'A' },
        'home::light.b': { heading: 'B' },
        'home::spacer_card_1': { heading: 'Riga' },
      },
      memory: touchWidget(touchWidget(emptyWidgetMemory(), 'light.a', 7), 'light.b', 8),
    });
    const memory = rememberLeavingWidgets(state, new Set(['light.b']));
    expect(Object.keys(memory.entries)).toEqual([memoryKey('light', 'light.a')]);
    expect(memory.entries[memoryKey('light', 'light.a')]?.updatedAt).toBe(7);
    expect(memory.touched).toEqual({ 'light.b': 8 });
  });
});
