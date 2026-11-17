import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings, CardSettingsMap } from '@/@types/dashboard';
import type { Connection, HaMessage } from '@/@types/ha';
import { WidgetSettingsSheet } from '@/templates/sheets/WidgetSettingsSheet';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { emptyWidgetMemory } from '@/utils/launcher/deviceMemory';
import type { Configuration } from '../../../contracts/collaboration';
import { configurationLayout } from '../../../contracts/profileResources';
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

type Kind = 'calendar' | 'todo' | 'room';
const variants = [
  { kind: 'calendar', category: false },
  { kind: 'calendar', category: true },
  { kind: 'todo', category: false },
  { kind: 'todo', category: true },
  { kind: 'room', category: false },
  { kind: 'room', category: true },
] as const;
const entities = fixtureEntities([
  fixtureEntity('calendar.old', 'off', { friendly_name: 'Calendario precedente' }),
  fixtureEntity('calendar.new', 'off', { friendly_name: 'Nuovo calendario' }),
  fixtureEntity('calendar.other', 'off', { friendly_name: 'Altro calendario' }),
  fixtureEntity('todo.old', '2', { friendly_name: 'Lista precedente' }),
  fixtureEntity('todo.new', '1', { friendly_name: 'Nuova lista' }),
  fixtureEntity('todo.other', '3', { friendly_name: 'Altra lista' }),
  fixtureEntity('light.new', 'off', { friendly_name: 'Luce nuova' }),
  fixtureEntity('light.overridden', 'off', { friendly_name: 'Altro canale' }),
]);
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function connection() {
  const listeners = new Map<string, Set<() => void>>();
  const add = (event: string, callback: () => void) => {
    const list = listeners.get(event) ?? new Set();
    list.add(callback);
    listeners.set(event, list);
  };
  const sendMessagePromise = vi.fn(async (message: HaMessage): Promise<unknown> => {
    if (message.type === 'config/area_registry/list')
      return [
        { area_id: 'new', name: 'Area nuova', icon: 'mdi:sofa' },
        { area_id: 'other', name: 'Altra area' },
      ];
    if (message.type === 'config/device_registry/list')
      return [{ id: 'device-new', area_id: 'new' }];
    if (message.type === 'config/entity_registry/list')
      return [
        { entity_id: 'light.new', device_id: 'device-new' },
        { entity_id: 'light.overridden', device_id: 'device-new', area_id: 'other' },
      ];
    if (message.type === 'get_services') return {};
    throw new Error(`Unexpected read ${message.type}`);
  });
  return {
    connected: true,
    sendMessagePromise,
    addEventListener: add,
    removeEventListener: (event: string, callback: () => void) => {
      listeners.get(event)?.delete(callback);
    },
    subscribeEvents: async (callback: () => void, event: string) => {
      add(event, callback);
      return () => {
        listeners.get(event)?.delete(callback);
      };
    },
  } as unknown as Connection;
}
const initialBinding = (kind: Kind): CardSettings =>
  kind === 'calendar'
    ? { calendars: ['calendar.old'] }
    : kind === 'todo'
      ? { todoEntityId: 'todo.old' }
      : { areaId: 'old', areaName: 'Area precedente', entityIds: ['light.legacy'] };
const expectedBinding = (kind: Kind): CardSettings =>
  kind === 'calendar'
    ? { calendars: ['calendar.old', 'calendar.new'] }
    : kind === 'todo'
      ? { todoEntityId: 'todo.new' }
      : {
          areaId: 'new',
          areaName: 'Area nuova',
          areaIcon: 'mdi:sofa',
          entityIds: ['light.new'],
          roomMembershipSource: 'area',
        };
const otherBinding = (kind: Kind): CardSettings =>
  kind === 'calendar'
    ? { calendars: ['calendar.other'] }
    : kind === 'todo'
      ? { todoEntityId: 'todo.other' }
      : { areaId: 'other', areaName: 'Altra area', entityIds: ['light.overridden'] };

function sheet(kind: Kind, category: boolean) {
  const id = `${kind}_card_${category ? 'category' : 'raw'}`,
    settingsKey = `home::${id}`;
  const settings: CardSettings = {
    ...(category ? { categoryWidgetType: kind } : {}),
    ...initialBinding(kind),
    appearanceOpacity: 60,
    heading: 'Da conservare',
  };
  let cards: CardSettingsMap = {
    [settingsKey]: settings,
    'other::sensor.keep': { entityId: 'sensor.keep', heading: 'Estraneo' },
  };
  const before: Configuration = {
    snapshot: {
      layout: {
        cardSettings: cards,
        pagesConfig: { pages: ['home'], header: [], home: [id] },
        customNames: {},
        customIcons: {},
        widgetMemory: emptyWidgetMemory(),
      },
    },
  };
  let configuration = before;
  let snapshot = {
    profile: { id: 'profile-one' },
    offline: false,
    editor: {
      id: 'editor-one',
      target: { kind: 'widget', widgetId: id, pageId: 'home' },
      working: before,
      base: { configuration: before },
      quotaBlocked: false,
      conflict: null,
      pendingOperation: null,
      busy: false,
    },
  };
  const subscriptions = new Set<() => void>();
  const save = vi.fn(async () => true),
    begin = vi.fn(async () => undefined),
    finish = vi.fn(async () => true);
  const mutate = vi.fn(async (apply: (value: Configuration) => Configuration) => {
    configuration = apply(configuration);
    snapshot = { ...snapshot, editor: { ...snapshot.editor, working: configuration } };
  });
  const live = {
    state: snapshot,
    coordinator: {
      snapshot: () => snapshot,
      begin,
      finish,
      save,
      subscribe: (callback: () => void) => {
        subscriptions.add(callback);
        return () => {
          subscriptions.delete(callback);
        };
      },
    },
    mutate,
  };
  state.live = live;
  state.pages = {
    cardSettings: cards,
    pagesConfig: { pages: ['home'], header: [], home: [id] },
    customIcons: {},
    customNames: {},
    pageSettings: {},
  };
  const callService = vi.fn(),
    saveCardSetting = vi.fn();
  let conn = connection();
  const tree = () => (
    <WidgetRuntimeProvider
      value={createFixtureRuntime({
        conn,
        entities,
        entitiesLoaded: true,
        cardSettings: cards,
        customNames: {},
        saveCardSetting,
        callService,
      })}
    >
      <WidgetSettingsSheet
        open
        onClose={() => undefined}
        widgetId={id}
        settingsKey={settingsKey}
        pageId="home"
      />
    </WidgetRuntimeProvider>
  );
  const ui = render(tree());
  return {
    ...ui,
    id,
    settingsKey,
    before,
    save,
    mutate,
    callService,
    saveCardSetting,
    configuration: () => configuration,
    owner: (key: 'profile' | 'editor') => {
      act(() => {
        snapshot =
          key === 'profile'
            ? { ...snapshot, profile: { id: 'other' } }
            : { ...snapshot, editor: { ...snapshot.editor, id: 'other' } };
        subscriptions.forEach((callback) => callback());
      });
    },
    updateConnection: () => {
      conn = connection();
      ui.rerender(tree());
    },
    updateBinding: (patch: CardSettings) => {
      cards = { ...cards, [settingsKey]: { ...cards[settingsKey], ...patch } };
      state.pages.cardSettings = cards;
      ui.rerender(tree());
    },
  };
}
const control = (kind: Kind) =>
  screen.getByRole('button', {
    name:
      kind === 'calendar'
        ? 'Applica i calendari'
        : kind === 'todo'
          ? /^Lista di attività:/
          : 'Collega la stanza',
  });
async function choose(kind: Kind) {
  if (kind === 'calendar') {
    const next = await screen.findByRole('button', { name: /^Nuovo calendario/ });
    await waitFor(() => expect(next).not.toBeDisabled());
    fireEvent.click(next);
    fireEvent.click(screen.getByRole('button', { name: 'Applica i calendari' }));
  } else if (kind === 'todo') {
    const picker = await screen.findByRole('button', { name: /^Lista di attività:/ });
    await waitFor(() => expect(picker).not.toBeDisabled());
    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('button', { name: /^Nuova lista/ }));
  } else {
    const next = await screen.findByRole('button', { name: /^Area nuova/ });
    await waitFor(() => expect(next).not.toBeDisabled());
    fireEvent.click(next);
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
  }
}

describe.each(variants)(
  'Scheda reale $kind, categoria=$category: ACK condiviso',
  ({ kind, category }) => {
    it('mostra un solo form e applica la patch mirata soltanto al widget scelto', async () => {
      const ui = sheet(kind, category);
      await choose(kind);
      await waitFor(() => expect(ui.save).toHaveBeenCalledExactlyOnceWith({ keepOpen: true }));
      await flush();
      expect(ui.mutate).toHaveBeenCalledOnce();
      expect(
        screen.getAllByRole('button', {
          name:
            kind === 'calendar'
              ? 'Applica i calendari'
              : kind === 'todo'
                ? /^Lista di attività:/
                : 'Collega la stanza',
        })
      ).toHaveLength(1);
      expect(configurationLayout(ui.configuration()).cardSettings).toMatchObject({
        [ui.settingsKey]: {
          ...expectedBinding(kind),
          appearanceOpacity: 60,
          heading: 'Da conservare',
        },
        'other::sensor.keep': { entityId: 'sensor.keep', heading: 'Estraneo' },
      });
      expect(ui.callService).not.toHaveBeenCalled();
      expect(ui.saveCardSetting).not.toHaveBeenCalled();
    });
    it('mutate da sola lascia il form occupato fino al vero ACK', async () => {
      const ui = sheet(kind, category),
        ack = deferred<boolean>();
      ui.save.mockImplementation(() => ack.promise);
      await choose(kind);
      await waitFor(() => expect(ui.save).toHaveBeenCalledOnce());
      expect(control(kind)).toBeDisabled();
      expect(screen.getByText(/Associazione in corso/)).toBeInTheDocument();
      ack.resolve(true);
      await flush();
      expect(control(kind)).not.toBeDisabled();
    });
    it('la propria bozza ottimistica conserva attesa e ACK nel contesto corrente', async () => {
      const ui = sheet(kind, category),
        mutation = deferred<void>(),
        ack = deferred<boolean>();
      const original = ui.mutate.getMockImplementation()!;
      ui.mutate.mockImplementation(async (apply) => {
        await original(apply);
        await mutation.promise;
      });
      ui.save.mockImplementation(() => ack.promise);
      await choose(kind);
      await waitFor(() => expect(ui.mutate).toHaveBeenCalledOnce());
      ui.updateBinding(expectedBinding(kind));
      expect(control(kind)).toBeDisabled();
      mutation.resolve();
      await flush();
      expect(ui.save).toHaveBeenCalledExactlyOnceWith({ keepOpen: true });
      expect(control(kind)).toBeDisabled();
      ack.resolve(true);
      await flush();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText(/Associazione in corso/)).not.toBeInTheDocument();
      expect(kind === 'calendar' ? screen.getByRole('button', { name: /^Nuovo calendario/ }) : control(kind)).not.toBeDisabled();
    });
    it.each(['false', 'rejected'] as const)(
      'ACK %s conserva la bozza senza riprovare da solo',
      async (result) => {
        const ui = sheet(kind, category);
        if (result === 'false') ui.save.mockResolvedValue(false);
        else ui.save.mockRejectedValue(new Error('SECRET_ACK'));
        await choose(kind);
        expect(await screen.findByRole('alert')).toHaveTextContent('Associazione non confermata');
        await flush();
        expect(ui.save).toHaveBeenCalledOnce();
        expect(ui.mutate).toHaveBeenCalledOnce();
        expect(configurationLayout(ui.configuration()).cardSettings).toMatchObject({
          [ui.settingsKey]: expectedBinding(kind),
        });
        expect(document.body).not.toHaveTextContent('SECRET_ACK');
      }
    );
    it('mutate negata non applica la bozza e non richiede save', async () => {
      const ui = sheet(kind, category);
      ui.mutate.mockRejectedValue(Object.assign(new Error('Negato'), { status: 423 }));
      await choose(kind);
      expect(await screen.findByRole('alert')).toHaveTextContent('Associazione non confermata');
      expect(ui.save).not.toHaveBeenCalled();
      expect(ui.configuration()).toBe(ui.before);
    });
    it.each(['profile', 'editor'] as const)(
      'cambio %s durante mutate blocca save sul nuovo contesto',
      async (key) => {
        const ui = sheet(kind, category),
          pending = deferred<void>();
        ui.mutate.mockImplementation(() => pending.promise);
        await choose(kind);
        await waitFor(() => expect(ui.mutate).toHaveBeenCalledOnce());
        ui.owner(key);
        pending.resolve();
        await flush();
        expect(ui.save).not.toHaveBeenCalled();
      }
    );
    it('cambio connessione durante mutate blocca save sul nuovo contesto', async () => {
      const ui = sheet(kind, category),
        pending = deferred<void>();
      ui.mutate.mockImplementation(() => pending.promise);
      await choose(kind);
      await waitFor(() => expect(ui.mutate).toHaveBeenCalledOnce());
      ui.updateConnection();
      pending.resolve();
      await flush();
      expect(ui.save).not.toHaveBeenCalled();
    });
    it('cambio fonte estraneo durante mutate blocca save sul nuovo contesto', async () => {
      const ui = sheet(kind, category),
        pending = deferred<void>();
      ui.mutate.mockImplementation(() => pending.promise);
      await choose(kind);
      await waitFor(() => expect(ui.mutate).toHaveBeenCalledOnce());
      ui.updateBinding(otherBinding(kind));
      pending.resolve();
      await flush();
      expect(ui.save).not.toHaveBeenCalled();
    });
  }
);
