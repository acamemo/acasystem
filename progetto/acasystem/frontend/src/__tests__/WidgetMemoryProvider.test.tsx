/**
 * ADR-0019 on the real page store: the migration of the hidden widgets when the app starts and
 * when a snapshot arrives, the memory kept on removal, and the copy when a widget is linked.
 */
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { LauncherLayout } from '@/@types/launcher';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { applySnapshot, collectSnapshot } from '@/api/snapshot';
import {
  WIDGET_MEMORY_STORAGE_KEY,
  memoryKey,
  type WidgetMemory,
} from '@/utils/launcher/deviceMemory';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { migrateStoredWidgetState } from '@/utils/launcher/widgetStateStorage';

const wrapper = ({ children }: { children?: ReactNode }) => <PageProvider>{children}</PageProvider>;

const rect = { x: 0, y: 0, w: 2, h: 2 };
const layoutWith = (widgets: string[]) => ({
  version: 1,
  categoryDefaultsVersion: 1,
  cover: { enabled: false },
  pages: [
    {
      id: 'home',
      label: 'Principale',
      kind: 'widgets',
      placements: { tablet: Object.fromEntries(widgets.map((id) => [id, rect])) },
    },
  ],
});

const tv = (device = 'media_player.salotto') => ({
  categoryWidgetType: 'appletv',
  mediaPlayerId: device,
});

const stored = <T,>(key: string): T => JSON.parse(localStorage.getItem(key) ?? 'null') as T;

const seed = (hidden: string[]) => {
  localStorage.setItem(
    LAUNCHER_LAYOUT_STORAGE_KEY,
    JSON.stringify(layoutWith(['tv.a', 'tv.b', 'spacer_card_1']))
  );
  localStorage.setItem(
    'tunet_pages_config',
    JSON.stringify({ header: [], pages: ['home'], home: ['tv.a', 'tv.b', 'spacer_card_1'] })
  );
  localStorage.setItem(
    'tunet_card_settings',
    JSON.stringify({
      'home::tv.a': { ...tv(), heading: 'Salotto', tapAction: 'toggle' },
      'home::tv.b': tv('media_player.camera'),
      'home::spacer_card_1': { variant: 'divider', heading: 'Riga' },
    })
  );
  localStorage.setItem('tunet_custom_names', JSON.stringify({ 'tv.a': 'TV grande' }));
  localStorage.setItem('tunet_hidden_cards', JSON.stringify(hidden));
};

beforeEach(() => localStorage.clear());

const withLight = () => {
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layoutWith(['l.a', 'l.b'])));
  const light = (device: string) => ({ categoryWidgetType: 'light', bindingEntityId: device });
  localStorage.setItem(
    'tunet_card_settings',
    JSON.stringify({ 'home::l.a': light('light.cucina'), 'home::l.b': light('light.sala') })
  );
};

describe('hidden widgets when the app starts', () => {
  it('leave the pages, the configuration of one with a device goes to the memory, the list is emptied', () => {
    seed(['tv.a', 'spacer_card_1']);
    const { result } = renderHook(() => usePages(), { wrapper });

    const placed = Object.keys(result.current.launcherLayout!.pages[0]!.placements.tablet ?? {});
    expect(placed).toEqual(['tv.b']);
    expect(result.current.pagesConfig.home).toEqual(['tv.b']);
    expect(stored<string[]>('tunet_hidden_cards')).toEqual([]);
    const memory = stored<WidgetMemory>(WIDGET_MEMORY_STORAGE_KEY);
    expect(Object.keys(memory.entries)).toEqual([memoryKey('appletv', 'media_player.salotto')]);
    expect(memory.entries[memoryKey('appletv', 'media_player.salotto')]).toMatchObject({
      name: 'TV grande',
      settings: { heading: 'Salotto', tapAction: 'toggle' },
    });
    // the divider had no device: no memory, and its cell is free again
    expect(JSON.stringify(memory)).not.toContain('Riga');
    // the settings of the widgets that are gone are tidied up; the others stay
    expect(Object.keys(result.current.cardSettings)).toEqual(['home::tv.b', 'home::spacer_card_1']);
  });

  it('a second start changes nothing', () => {
    seed(['tv.a']);
    renderHook(() => usePages(), { wrapper }).unmount();
    const snapshot = Object.fromEntries(
      Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])
    );
    renderHook(() => usePages(), { wrapper }).unmount();
    expect(
      Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]))
    ).toEqual(snapshot);
  });

  it('with nothing hidden the stored layout and settings are left as they are', () => {
    seed([]);
    const before = {
      layout: localStorage.getItem(LAUNCHER_LAYOUT_STORAGE_KEY),
      settings: localStorage.getItem('tunet_card_settings'),
    };
    renderHook(() => usePages(), { wrapper });
    expect(localStorage.getItem(LAUNCHER_LAYOUT_STORAGE_KEY)).toBe(before.layout);
    expect(localStorage.getItem('tunet_card_settings')).toBe(before.settings);
  });
});

describe('hidden widgets in a snapshot that arrives', () => {
  it('an old snapshot (profile, file, other device) migrates the same way and brings no hidden list', () => {
    localStorage.setItem(WIDGET_MEMORY_STORAGE_KEY, JSON.stringify({ entries: {}, touched: {} }));
    const setters = {
      persistLauncherLayout: vi.fn(),
      persistWidgetMemory: vi.fn(),
      persistConfig: vi.fn(),
    };
    applySnapshot(
      {
        version: 1,
        layout: {
          pagesConfig: { header: [], pages: ['home'], home: ['tv.a', 'tv.b'] },
          cardSettings: {
            'home::tv.a': { ...tv(), heading: 'Salotto' },
            'home::tv.b': tv('media_player.camera'),
          },
          hiddenCards: ['tv.a'],
          launcherLayout: layoutWith(['tv.a', 'tv.b']),
        },
        appearance: {},
      },
      setters
    );
    const layout = stored<ReturnType<typeof layoutWith>>(LAUNCHER_LAYOUT_STORAGE_KEY);
    expect(Object.keys(layout.pages[0]!.placements.tablet ?? {})).toEqual(['tv.b']);
    expect(stored<{ home: string[] }>('tunet_pages_config').home).toEqual(['tv.b']);
    expect(localStorage.getItem('tunet_hidden_cards')).toBeNull();
    const memory = stored<WidgetMemory>(WIDGET_MEMORY_STORAGE_KEY);
    expect(memory.entries[memoryKey('appletv', 'media_player.salotto')]?.settings).toEqual({
      heading: 'Salotto',
    });
    expect(setters.persistWidgetMemory).toHaveBeenCalledWith(memory);
    expect(setters.persistLauncherLayout).toHaveBeenCalled();
  });

  it('a snapshot that comes back from the server has the memory and no hidden list', () => {
    seed([]);
    const { unmount } = renderHook(() => usePages(), { wrapper });
    const snapshot = collectSnapshot();
    unmount();
    expect(snapshot.layout).not.toHaveProperty('hiddenCards');
    expect(snapshot.layout.widgetMemory).toEqual({ entries: {}, touched: {} });
  });

  it('the memory of a snapshot is added to the stored one, bad parts dropped', () => {
    applySnapshot({
      version: 1,
      layout: {
        widgetMemory: {
          entries: {
            [memoryKey('light', 'light.a')]: {
              type: 'light',
              deviceKey: 'light.a',
              updatedAt: 4,
              label: null,
              settings: { heading: 'A' },
            },
            rotto: 'x',
          },
          touched: { w: 3 },
        },
      },
      appearance: {},
    });
    const memory = stored<WidgetMemory>(WIDGET_MEMORY_STORAGE_KEY);
    expect(Object.keys(memory.entries)).toEqual([memoryKey('light', 'light.a')]);
    expect(memory.touched).toEqual({ w: 3 });
  });

  it('keeps the memory of this device when a snapshot brings its own', () => {
    const entry = (deviceKey: string, heading: string) => ({
      type: 'light',
      deviceKey,
      updatedAt: 5,
      label: null,
      settings: { heading },
    });
    localStorage.setItem(
      WIDGET_MEMORY_STORAGE_KEY,
      JSON.stringify({
        entries: { [memoryKey('light', 'light.qui')]: entry('light.qui', 'Solo qui') },
        touched: {},
      })
    );
    const setters = { persistWidgetMemory: vi.fn() };
    applySnapshot(
      {
        version: 1,
        layout: {
          widgetMemory: {
            entries: { [memoryKey('light', 'light.la')]: entry('light.la', 'In arrivo') },
            touched: {},
          },
        },
        appearance: {},
      },
      setters
    );
    const memory = stored<WidgetMemory>(WIDGET_MEMORY_STORAGE_KEY);
    expect(Object.keys(memory.entries).sort()).toEqual([
      memoryKey('light', 'light.la'),
      memoryKey('light', 'light.qui'),
    ]);
    expect(setters.persistWidgetMemory).toHaveBeenCalledWith(memory);
  });

  it('a profile, or a blank start, keeps the configuration of the widgets it takes away', () => {
    seed([]);
    const setters = { persistWidgetMemory: vi.fn(), persistConfig: vi.fn() };
    applySnapshot(
      {
        version: 1,
        layout: {
          pagesConfig: { header: [], pages: ['home'], home: [] },
          cardSettings: {},
          customNames: {},
        },
        appearance: {},
      },
      setters
    );
    const memory = stored<WidgetMemory>(WIDGET_MEMORY_STORAGE_KEY);
    expect(memory.entries[memoryKey('appletv', 'media_player.salotto')]).toMatchObject({
      name: 'TV grande',
      settings: { heading: 'Salotto', tapAction: 'toggle' },
    });
    expect(JSON.stringify(memory)).not.toContain('Riga');
    expect(setters.persistWidgetMemory).toHaveBeenCalledWith(memory);
  });

  it('a snapshot that keeps a widget does not move it to the memory', () => {
    seed([]);
    applySnapshot({
      version: 1,
      layout: {
        pagesConfig: { header: [], pages: ['home'], home: ['tv.a'] },
        cardSettings: { 'home::tv.a': { ...tv(), heading: 'Nuovo' } },
        launcherLayout: layoutWith(['tv.a']),
      },
      appearance: {},
    });
    expect(Object.keys(stored<WidgetMemory>(WIDGET_MEMORY_STORAGE_KEY).entries)).toEqual([]);
  });
});

describe('removing a widget and linking another to the same device', () => {
  const withLayout = () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify(layoutWith(['tv.a', 'tv.new']))
    );
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({
        'home::tv.a': { ...tv(), heading: 'Salotto', tapAction: 'toggle' },
        'home::tv.new': { categoryWidgetType: 'appletv' },
      })
    );
    localStorage.setItem('tunet_custom_names', JSON.stringify({ 'tv.a': 'TV grande' }));
  };

  it('keeps the configuration on removal and gives it back, with a notice, on the link', async () => {
    withLayout();
    const { result } = renderHook(() => usePages(), { wrapper });
    act(() => result.current.rememberRemovedWidget('home', 'tv.a', 'TV grande'));
    // the removal itself leaves the settings alone («Annulla» keeps working)
    expect(result.current.cardSettings['home::tv.a']).toBeDefined();
    await waitFor(() =>
      expect(Object.keys(stored<WidgetMemory>(WIDGET_MEMORY_STORAGE_KEY).entries)).toEqual([
        memoryKey('appletv', 'media_player.salotto'),
      ])
    );

    // the layout loses the widget, as the controller does: only the memory is left
    act(() => result.current.persistLauncherLayout(layoutWith(['tv.new']) as LauncherLayout));

    act(() =>
      result.current.saveCardSetting('home::tv.new', 'mediaPlayerId', 'media_player.salotto')
    );
    await waitFor(() => expect(result.current.widgetMemoryNotice).not.toBeNull());
    expect(result.current.cardSettings['home::tv.new']).toMatchObject({
      categoryWidgetType: 'appletv',
      mediaPlayerId: 'media_player.salotto',
      heading: 'Salotto',
      tapAction: 'toggle',
    });
    expect(result.current.customNames['tv.new']).toBe('TV grande');
    expect(result.current.widgetMemoryNotice).toMatchObject({ kind: 'memory', label: 'TV grande' });
  });

  it('a link to another device, or a widget already edited, takes nothing', async () => {
    withLayout();
    const { result } = renderHook(() => usePages(), { wrapper });
    act(() => result.current.rememberRemovedWidget('home', 'tv.a', 'TV grande'));
    act(() =>
      result.current.saveCardSetting('home::tv.new', 'mediaPlayerId', 'media_player.cucina')
    );
    await act(async () => undefined);
    expect(result.current.cardSettings['home::tv.new']).not.toHaveProperty('heading');
    expect(result.current.widgetMemoryNotice).toBeNull();

    act(() => result.current.saveCardSetting('home::tv.new', 'heading', 'Mio'));
    act(() =>
      result.current.saveCardSetting('home::tv.new', 'mediaPlayerId', 'media_player.salotto')
    );
    await act(async () => undefined);
    expect(result.current.cardSettings['home::tv.new']).toMatchObject({ heading: 'Mio' });
    expect(result.current.cardSettings['home::tv.new']).not.toHaveProperty('tapAction');
  });

  it('a second widget on the same device takes the configuration of the first, then they are independent', async () => {
    withLayout();
    const { result } = renderHook(() => usePages(), { wrapper });
    act(() => result.current.saveCardSetting('home::tv.a', 'heading', 'Salotto'));
    act(() =>
      result.current.saveCardSetting('home::tv.new', 'mediaPlayerId', 'media_player.salotto')
    );
    await waitFor(() => expect(result.current.widgetMemoryNotice).not.toBeNull());
    expect(result.current.widgetMemoryNotice).toMatchObject({ kind: 'widget', label: 'TV grande' });
    expect(result.current.cardSettings['home::tv.new']).toMatchObject({
      heading: 'Salotto',
      tapAction: 'toggle',
    });

    act(() => result.current.saveCardSetting('home::tv.new', 'tapAction', 'modal'));
    expect(result.current.cardSettings['home::tv.new']?.tapAction).toBe('modal');
    expect(result.current.cardSettings['home::tv.a']?.tapAction).toBe('toggle');
  });

  it('removing a page keeps the configuration of its widgets', async () => {
    withLayout();
    const { result } = renderHook(() => usePages(), { wrapper });
    act(() => result.current.rememberRemovedPage('home'));
    await waitFor(() =>
      expect(Object.keys(stored<WidgetMemory>(WIDGET_MEMORY_STORAGE_KEY).entries)).toEqual([
        memoryKey('appletv', 'media_player.salotto'),
      ])
    );
  });
});

describe('a removal that is undone, and an entity added again', () => {
  const lightLayout = (widgets: string[]) => layoutWith(widgets) as LauncherLayout;

  it('with «Annulla» the widget stays as it was and keeps its own values when linked again', async () => {
    withLight();
    const { result } = renderHook(() => usePages(), { wrapper });
    act(() => result.current.saveCardSetting('home::l.a', 'heading', 'Mio'));
    act(() => result.current.rememberRemovedWidget('home', 'l.a', null));
    // the layout was not changed (the removal was undone): the widget is still there
    act(() => result.current.saveCardSetting('home::l.a', 'bindingEntityId', 'light.sala'));
    await act(async () => undefined);
    expect(result.current.cardSettings['home::l.a']).toMatchObject({
      heading: 'Mio',
      bindingEntityId: 'light.sala',
    });
  });

  it('the same entity, removed and added again, starts as a new widget and takes the configuration back', async () => {
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layoutWith(['light.cucina'])));
    const { result } = renderHook(() => usePages(), { wrapper });
    act(() => result.current.saveCardSetting('home::light.cucina', 'heading', 'Bancone'));
    act(() => result.current.rememberRemovedWidget('home', 'light.cucina', null));
    act(() => result.current.persistLauncherLayout(lightLayout([])));
    // gone from every page: the next widget with this id is not «already edited»
    act(() => result.current.persistCardSettings({}));
    act(() => result.current.persistLauncherLayout(lightLayout(['light.cucina'])));
    act(() => result.current.requestWidgetAdoption('home', 'light.cucina'));
    await waitFor(() => expect(result.current.widgetMemoryNotice).not.toBeNull());
    expect(result.current.cardSettings['home::light.cucina']).toMatchObject({
      heading: 'Bancone',
    });
  });

  it('an edited widget linked to a device takes the value of the device over its own', async () => {
    withLight();
    const { result } = renderHook(() => usePages(), { wrapper });
    act(() => result.current.saveCardSetting('home::l.b', 'lightTransition', 5));
    act(() => result.current.saveCardSetting('home::l.a', 'lightTransition', 1));
    act(() => result.current.saveCardSetting('home::l.a', 'bindingEntityId', 'light.sala'));
    await waitFor(() => expect(result.current.cardSettings['home::l.a']?.lightTransition).toBe(5));
    expect(result.current.cardSettings['home::l.b']?.lightTransition).toBe(5);
    // nothing was copied: no notice
    expect(result.current.widgetMemoryNotice).toBeNull();
  });
});

describe('the migration when the app starts, if the browser refuses a write', () => {
  it('writes the memory first; if it fails the settings and the hidden list stay as they are', () => {
    seed(['tv.a']);
    const before = Object.fromEntries(
      Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])
    );
    const original = Storage.prototype.setItem;
    const failing = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key === WIDGET_MEMORY_STORAGE_KEY) throw new Error('quota');
      return original.call(this, key, value);
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    migrateStoredWidgetState(1000);
    failing.mockRestore();
    error.mockRestore();
    for (const [key, value] of Object.entries(before)) {
      expect(localStorage.getItem(key)).toBe(value);
    }
    // the next start, with room in the storage, does the whole migration
    migrateStoredWidgetState(2000);
    expect(
      stored<WidgetMemory>(WIDGET_MEMORY_STORAGE_KEY).entries[
        memoryKey('appletv', 'media_player.salotto')
      ]
    ).toBeDefined();
    expect(stored<string[]>('tunet_hidden_cards')).toEqual([]);
  });
});

describe('a setting of the device, saved on one widget', () => {
  it('is the same on the other widgets of the device; a setting of the widget is not', () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify(layoutWith(['l.a', 'l.b', 'l.c']))
    );
    const light = (device: string) => ({ categoryWidgetType: 'light', bindingEntityId: device });
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({
        'home::l.a': light('light.cucina'),
        'home::l.b': light('light.cucina'),
        'home::l.c': light('light.sala'),
      })
    );
    const { result } = renderHook(() => usePages(), { wrapper });
    act(() => result.current.saveCardSetting('home::l.a', 'lightTransition', 2));
    act(() => result.current.saveCardSetting('home::l.a', 'heading', 'Solo questo'));
    expect(result.current.cardSettings['home::l.b']).toMatchObject({ lightTransition: 2 });
    expect(result.current.cardSettings['home::l.b']).not.toHaveProperty('heading');
    expect(result.current.cardSettings['home::l.c']).not.toHaveProperty('lightTransition');
  });

  it('writes back a stored layout whose empty stack was taken out, once (0.9.28)', () => {
    const dirty = layoutWith(['tv.a']);
    const page = dirty.pages[0];
    const withStack = {
      ...dirty,
      pages: [
        {
          ...page,
          placements: Object.fromEntries(
            Object.entries(page.placements).map(([key, rects]) => [
              key,
              { ...rects, stack_vuota: { x: 6, y: 6, w: 2, h: 2 } },
            ])
          ),
        },
        ...dirty.pages.slice(1),
      ],
      stacks: { stack_vuota: { ids: [] } },
    };
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(withStack));
    migrateStoredWidgetState(1000);
    const first = localStorage.getItem(LAUNCHER_LAYOUT_STORAGE_KEY);
    expect(first).not.toContain('stack_vuota');
    migrateStoredWidgetState(2000);
    expect(localStorage.getItem(LAUNCHER_LAYOUT_STORAGE_KEY)).toBe(first);
  });
});
