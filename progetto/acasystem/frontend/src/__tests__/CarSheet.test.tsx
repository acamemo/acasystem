import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettingsMap } from '@/@types/dashboard';
import { WidgetSettingsSheet } from '@/templates/sheets/WidgetSettingsSheet';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { applyCarBinding } from '@/utils/launcher/carBinding';
import { emptyWidgetMemory, type WidgetState } from '@/utils/launcher/deviceMemory';
import type { Configuration } from '../../../contracts/collaboration';
import {
  configurationLayout,
  diffConfiguration,
  resourcesForChanges,
} from '../../../contracts/profileResources';
import { flush } from './ControlsHarness';

const state = vi.hoisted(() => ({
  pages: {} as Record<string, unknown>,
  live: null as Record<string, unknown> | null,
}));
vi.mock('@/hooks/context', () => ({ usePages: () => state.pages }));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({
  useOptionalLiveProfiles: () => state.live,
}));
beforeEach(() => {
  state.live = null;
  localStorage.removeItem('tunet_widget_memory');
});
afterEach(async () => {
  await flush();
  cleanup();
  state.live = null;
});

function memoryState(): WidgetState {
  return {
    layout: null,
    pagesConfig: { pages: ['home'], header: [], home: ['car_card_a'] },
    cardSettings: {
      'home::car_card_a': { batteryId: 'sensor.battery' },
      'hidden::car_card_b': { batteryId: 'sensor.battery', rangeId: 'sensor.old_range' },
      'home::car_card_other': { batteryId: 'sensor.other', rangeId: 'sensor.other_range' },
    },
    customNames: {},
    customIcons: {},
    memory: emptyWidgetMemory(),
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function liveSheet() {
  const current = memoryState();
  const before: Configuration = {
    snapshot: {
      layout: {
        cardSettings: current.cardSettings,
        pagesConfig: current.pagesConfig,
        customNames: {},
        customIcons: {},
        widgetMemory: current.memory,
      },
    },
  };
  let configuration = before;
  let snapshot = {
    profile: { id: 'profile-one' },
    offline: false,
    editor: {
      id: 'editor-one',
      target: { kind: 'widget', widgetId: 'car_card_a', pageId: 'home' },
      working: before,
      base: { configuration: before },
      quotaBlocked: false,
      conflict: null,
      pendingOperation: null,
      busy: false,
    },
  };
  const save = vi.fn(async () => true),
    begin = vi.fn(async () => undefined),
    finish = vi.fn(async () => true);
  const mutate = vi.fn(async (apply: (value: Configuration) => Configuration) => {
    configuration = apply(configuration);
    snapshot = { ...snapshot, editor: { ...snapshot.editor, working: configuration } };
  });
  state.live = {
    state: snapshot,
    coordinator: { snapshot: () => snapshot, begin, finish, save },
    mutate,
  };
  state.pages = {
    cardSettings: current.cardSettings,
    pagesConfig: current.pagesConfig,
    customIcons: {},
    customNames: {},
    pageSettings: {},
  };
  const entities = fixtureEntities([
    fixtureEntity('sensor.battery', '82', {
      device_class: 'battery',
      unit_of_measurement: '%',
      friendly_name: 'Batteria auto',
    }),
    fixtureEntity('sensor.old_range', '260', {
      device_class: 'distance',
      unit_of_measurement: 'km',
    }),
    fixtureEntity('sensor.new_range', '275', {
      device_class: 'distance',
      unit_of_measurement: 'km',
      friendly_name: 'Nuova autonomia',
    }),
  ]);
  const ui = render(
    <WidgetRuntimeProvider
      value={createFixtureRuntime({
        entities,
        entitiesLoaded: true,
        cardSettings: current.cardSettings,
        customNames: {},
        saveCardSetting: vi.fn(),
      })}
    >
      <WidgetSettingsSheet
        open
        onClose={() => undefined}
        widgetId="car_card_a"
        settingsKey="home::car_card_a"
        pageId="home"
      />
    </WidgetRuntimeProvider>
  );
  return {
    ...ui,
    save,
    mutate,
    before,
    configuration: () => configuration,
    owner: (key: 'profile' | 'editor') => {
      snapshot =
        key === 'profile'
          ? { ...snapshot, profile: { id: 'profile-other' } }
          : { ...snapshot, editor: { ...snapshot.editor, id: 'editor-other' } };
    },
    offline: () => {
      snapshot = { ...snapshot, offline: true };
    },
  };
}
async function selectRange() {
  fireEvent.click(await screen.findByRole('button', { name: /^Autonomia:/ }));
  fireEvent.click(await screen.findByRole('button', { name: /^Nuova autonomia$/ }));
}

describe('Auto: riscontro della centrale nella scheda reale', () => {
  it('mutate aggiorna la bozza ma il form resta bloccato fino al vero ACK', async () => {
    const ui = liveSheet(),
      ack = deferred<boolean>();
    ui.save.mockImplementation(() => ack.promise);
    await selectRange();
    await waitFor(() => expect(ui.save).toHaveBeenCalledExactlyOnceWith({ keepOpen: true }));
    const battery = screen.getByRole('button', { name: /^Batteria:/ });
    expect(battery).toBeDisabled();
    fireEvent.click(battery);
    fireEvent.click(await screen.findByRole('button', { name: /^Batteria auto$/ }));
    expect(ui.mutate).toHaveBeenCalledOnce();
    ack.resolve(true);
    await flush();
    expect(battery).not.toBeDisabled();
    const args = ui.mutate.mock.calls[0] as unknown as [unknown, unknown, unknown];
    expect(args[1]).toEqual({ kind: 'widget', widgetId: 'car_card_a', pageId: 'home' });
    const next = ui.configuration();
    expect(resourcesForChanges(ui.before, next, diffConfiguration(ui.before, next))).toEqual(
      expect.arrayContaining([
        'widget:car_card_a',
        'widget:car_card_b',
        'device:car:sensor.battery',
      ])
    );
  });
  it.each(['false', 'rejected'] as const)(
    'un ACK %s non viene ritentato automaticamente',
    async (result) => {
      const ui = liveSheet();
      if (result === 'false') ui.save.mockResolvedValue(false);
      else ui.save.mockRejectedValue(new Error('SECRET'));
      await selectRange();
      expect(await screen.findByRole('alert')).toHaveTextContent('Associazione non confermata');
      expect(ui.save).toHaveBeenCalledOnce();
      expect(ui.mutate).toHaveBeenCalledOnce();
      expect(configurationLayout(ui.configuration()).cardSettings).toMatchObject({
        'home::car_card_a': { rangeId: 'sensor.new_range' },
      });
      expect(document.body).not.toHaveTextContent('SECRET');
    }
  );
  it('il permesso negato non applica la patch e non prova a salvare', async () => {
    const ui = liveSheet();
    ui.mutate.mockRejectedValue(Object.assign(new Error('Risorsa riservata'), { status: 423 }));
    await selectRange();
    expect(await screen.findByRole('alert')).toHaveTextContent('Associazione non confermata');
    expect(ui.save).not.toHaveBeenCalled();
    expect(ui.configuration()).toBe(ui.before);
  });
  it.each(['profile', 'editor'] as const)(
    'il cambio %s durante mutate impedisce il save nel nuovo contesto',
    async (key) => {
      const ui = liveSheet(),
        mutation = deferred<void>();
      ui.mutate.mockImplementation(() => mutation.promise);
      await selectRange();
      await waitFor(() => expect(ui.mutate).toHaveBeenCalledOnce());
      ui.owner(key);
      mutation.resolve();
      await flush();
      expect(ui.save).not.toHaveBeenCalled();
    }
  );
  it('offline mantiene la bozza senza presentarla come ACK della centrale', async () => {
    const ui = liveSheet(),
      apply = ui.mutate.getMockImplementation()!;
    ui.mutate.mockImplementation(async (mutator) => {
      await apply(mutator);
      ui.offline();
    });
    await selectRange();
    expect(await screen.findByRole('alert')).toHaveTextContent('Associazione non confermata');
    expect(ui.save).not.toHaveBeenCalled();
  });
});

describe('Auto: continuità della memoria e delle fonti', () => {
  it('il percorso locale consegna associazioni e metadati insieme all’API di commit esistente', async () => {
    let current = memoryState();
    current.cardSettings = { 'home::car_card_a': {} };
    current.layout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        { id: 'home', label: 'Casa', kind: 'widgets', order: ['car_card_a'], placements: {} },
      ],
    };
    current.memory.entries['car|sensor.battery'] = {
      type: 'car',
      deviceKey: 'sensor.battery',
      updatedAt: 100,
      label: 'Auto salvata',
      name: 'Auto salvata',
      icon: 'car',
      settings: { rangeId: 'sensor.old_range' },
    };
    const commit = vi.fn(async (apply: (old: WidgetState) => WidgetState, _widgetId: string) => {
      current = apply(current);
    });
    state.pages = {
      cardSettings: current.cardSettings,
      launcherLayout: current.layout,
      pagesConfig: current.pagesConfig,
      customNames: {},
      customIcons: {},
      pageSettings: {},
      commitWidgetAddition: commit,
    };
    render(
      <WidgetRuntimeProvider
        value={createFixtureRuntime({
          cardSettings: current.cardSettings,
          entitiesLoaded: true,
          entities: fixtureEntities([
            fixtureEntity('sensor.battery', '80', {
              device_class: 'battery',
              unit_of_measurement: '%',
              friendly_name: 'Batteria auto',
            }),
          ]),
        })}
      >
        <WidgetSettingsSheet
          open
          onClose={() => undefined}
          widgetId="car_card_a"
          settingsKey="home::car_card_a"
          pageId="home"
        />
      </WidgetRuntimeProvider>
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Batteria:/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Batteria auto$/ }));
    await waitFor(() => expect(commit).toHaveBeenCalledOnce());
    expect(commit.mock.calls[0]?.[1]).toBe('car_card_a');
    expect(current.cardSettings['home::car_card_a']).toMatchObject({
      batteryId: 'sensor.battery',
      rangeId: 'sensor.old_range',
    });
    expect(current.customNames.car_card_a).toBe('Auto salvata');
    expect(current.customIcons.car_card_a).toBe('car');
    expect(current.memory.touched.car_card_a).toBeGreaterThan(100);
  });
  it('recupera fonti, nome e icona quando viene scelta una batteria già conservata', () => {
    const current = memoryState();
    current.cardSettings = { 'home::car_card_a': {} };
    current.memory.entries['car|sensor.battery'] = {
      type: 'car',
      deviceKey: 'sensor.battery',
      updatedAt: 100,
      label: 'Auto salvata',
      name: 'Auto salvata',
      icon: 'car',
      settings: { rangeId: 'sensor.old_range', imageUrl: '/local/old.png' },
    };
    const next = applyCarBinding(current, 'home::car_card_a', { batteryId: 'sensor.battery' }, 500);
    expect(next.cardSettings['home::car_card_a']).toMatchObject({
      batteryId: 'sensor.battery',
      rangeId: 'sensor.old_range',
      imageUrl: '/local/old.png',
    });
    expect(next.customNames.car_card_a).toBe('Auto salvata');
    expect(next.customIcons.car_card_a).toBe('car');
    expect(next.memory.touched.car_card_a).toBe(500);
    expect(current.cardSettings['home::car_card_a']?.batteryId).toBeUndefined();
  });
  it('le modifiche aggiornano touched e propagano solo sulla medesima identità storica', () => {
    const current = memoryState();
    const next = applyCarBinding(
      current,
      'home::car_card_a',
      {
        rangeId: 'sensor.new_range',
        chargingStateId: 'sensor.charge',
        chargingId: 'sensor.charge',
      },
      500
    );
    expect(next.cardSettings['hidden::car_card_b']).toMatchObject({
      rangeId: 'sensor.new_range',
      chargingStateId: 'sensor.charge',
      chargingId: 'sensor.charge',
    });
    expect(next.cardSettings['home::car_card_other']?.rangeId).toBe('sensor.other_range');
    expect(next.memory.touched.car_card_a).toBe(500);
    expect(current.memory.touched.car_card_a).toBeUndefined();
  });
  it('cambiare batteria non cambia quella degli altri widget', () => {
    const current = memoryState();
    const next = applyCarBinding(current, 'home::car_card_a', { batteryId: 'sensor.other' }, 500);
    expect(next.cardSettings['hidden::car_card_b']?.batteryId).toBe('sensor.battery');
    expect(next.cardSettings['home::car_card_a']?.batteryId).toBe('sensor.other');
  });
});

describe('Auto: associazione atomica nella scheda reale', () => {
  it.each([false, true])(
    'raw/category=%s: un solo selettore e propagazione conservativa sui widget della stessa batteria',
    async (category) => {
      const settings = {
        ...(category ? { categoryWidgetType: 'car' } : {}),
        batteryId: 'sensor.battery',
        rangeId: 'sensor.old_range',
        appearanceOpacity: 60,
      };
      let cards: CardSettingsMap = {
        'home::car_card_a': settings,
        'hidden::car_card_b': {
          batteryId: 'sensor.battery',
          rangeId: 'sensor.old_range',
          heading: 'Secondo widget',
        },
        'home::car_card_other': {
          batteryId: 'sensor.other_battery',
          rangeId: 'sensor.other_range',
        },
      };
      const setCardSettings = vi.fn((updater: (value: CardSettingsMap) => CardSettingsMap) => {
        cards = updater(cards);
      });
      state.pages = {
        cardSettings: cards,
        setCardSettings,
        customIcons: {},
        pageSettings: {},
        customNames: {},
        persistCustomNames: vi.fn(),
        persistCustomIcons: vi.fn(),
        persistWidgetMemory: vi.fn(),
        pagesConfig: {
          pages: ['home', 'hidden'],
          header: [],
          home: ['car_card_a', 'car_card_other'],
          hidden: ['car_card_b'],
        },
      };
      const callService = vi.fn();
      const entities = fixtureEntities([
        fixtureEntity('sensor.battery', '82', {
          device_class: 'battery',
          unit_of_measurement: '%',
        }),
        fixtureEntity('sensor.old_range', '260', {
          device_class: 'distance',
          unit_of_measurement: 'km',
          friendly_name: 'Vecchia autonomia',
        }),
        fixtureEntity('sensor.new_range', '275', {
          device_class: 'distance',
          unit_of_measurement: 'km',
          friendly_name: 'Nuova autonomia',
        }),
      ]);
      render(
        <WidgetRuntimeProvider
          value={createFixtureRuntime({
            entities,
            entitiesLoaded: true,
            callService,
            cardSettings: cards,
            customNames: {},
            saveCardSetting: vi.fn(),
          })}
        >
          <WidgetSettingsSheet
            open
            onClose={() => undefined}
            widgetId="car_card_a"
            settingsKey="home::car_card_a"
            pageId="home"
          />
        </WidgetRuntimeProvider>
      );
      const trigger = await screen.findByRole('button', { name: /^Autonomia: Vecchia autonomia$/ });
      expect(screen.getAllByRole('button', { name: /^Autonomia:/ })).toHaveLength(1);
      expect(screen.queryByText('Controlli visibili')).toBeNull();
      fireEvent.click(trigger);
      fireEvent.click(await screen.findByRole('button', { name: /^Nuova autonomia$/ }));
      await waitFor(() => expect(setCardSettings).toHaveBeenCalledTimes(1));
      expect(cards['home::car_card_a']).toMatchObject({
        rangeId: 'sensor.new_range',
        appearanceOpacity: 60,
      });
      expect(cards['hidden::car_card_b']).toMatchObject({
        rangeId: 'sensor.new_range',
        heading: 'Secondo widget',
      });
      expect(cards['home::car_card_other']?.rangeId).toBe('sensor.other_range');
      expect(callService).not.toHaveBeenCalled();
    }
  );
});
