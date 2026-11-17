import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Configuration, LiveProfile } from '../../../contracts/collaboration';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { Connection, HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import type { LauncherLayout } from '@/@types/launcher';
import type { ProfileEditor } from '@/hooks/liveProfiles/coordinator';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { ProductBindingSection } from '@/templates/sheets/ProductBindingSection';
import { WidgetSettingsSheet } from '@/templates/sheets/WidgetSettingsSheet';

const mocks = vi.hoisted(() => ({
  live: null as unknown,
  pages: {} as Record<string, unknown>,
  devices: vi.fn<() => Promise<HaDeviceRegistryEntry[]>>(),
  registry: vi.fn<() => Promise<HaEntityRegistryEntry[]>>(),
}));
vi.mock('@/hooks/context', async (original) => ({
  ...(await original<typeof import('@/hooks/context')>()),
  usePages: () => mocks.pages,
}));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({
  useOptionalLiveProfiles: () => mocks.live,
}));
vi.mock('@/api/haClient', async (original) => ({
  ...(await original<typeof import('@/api/haClient')>()),
  getDeviceRegistry: mocks.devices,
  getEntityRegistry: mocks.registry,
}));
vi.mock('@/templates/sheets/parts/useEntityRooms', () => ({ useEntityRooms: () => ({}) }));
vi.mock('@/components/widgets/registry', () => ({
  widgetDefinitions: [],
  pageKindDefinitions: [],
  findWidgetDefinition: () => ({ type: 'mower', label: 'Tagliaerba', Widget: () => null }),
  findPageKindDefinition: () => undefined,
}));

const registry: HaEntityRegistryEntry[] = [
  { entity_id: 'lawn_mower.a', device_id: 'garden-robots' },
  { entity_id: 'lawn_mower.b', device_id: 'garden-robots' },
  { entity_id: 'sensor.temperature', device_id: 'garden-robots' },
  { entity_id: 'number.calibration', device_id: 'garden-robots', entity_category: 'config' },
  { entity_id: 'lawn_mower.hidden', device_id: 'garden-robots', hidden_by: 'user' },
  { entity_id: 'lawn_mower.disabled', device_id: 'garden-robots', disabled_by: 'integration' },
  { entity_id: 'lawn_mower.other', device_id: 'other' },
  { entity_id: 'lawn_mower.technical', device_id: 'technical', entity_category: 'config' },
];
const devices = [
  { id: 'garden-robots', name: 'Robot giardino', config_entries: ['hub'] },
  { id: 'other', name: 'Tagliaerba studio', config_entries: ['hub'] },
  { id: 'technical', name: 'Solo manutenzione' },
];
const entities = fixtureEntities([
  fixtureEntity('lawn_mower.a', 'docked'),
  fixtureEntity('lawn_mower.b', 'mowing'),
  fixtureEntity('sensor.temperature', '21'),
  fixtureEntity('number.calibration', '0'),
  fixtureEntity('lawn_mower.hidden', 'docked'),
  fixtureEntity('lawn_mower.disabled', 'docked'),
  fixtureEntity('lawn_mower.other', 'docked'),
  fixtureEntity('lawn_mower.technical', 'docked'),
]);
const widgetId = 'lawn_mower.manual';
const settings = {
  categoryWidgetType: 'mower',
  bindingEntityId: null,
  heading: 'Conservata',
  appearanceOpacity: 25,
};
const cards: CardSettingsMap = { [`home::${widgetId}`]: settings };
const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: false },
  pages: [
    {
      id: 'home',
      kind: 'widgets',
      label: 'Casa',
      placements: { tablet: { [widgetId]: { x: 0, y: 0, w: 2, h: 2 } } },
    },
  ],
};
const configuration = (): Configuration => ({
  snapshot: {
    layout: {
      launcherLayout: structuredClone(layout),
      cardSettings: structuredClone(cards),
      customNames: { keep: 'Conservato' },
    },
  },
});
const profile = (id = 'profile-a'): LiveProfile => ({
  id,
  userId: 'user-a',
  name: 'Casa',
  revision: 1,
  resourceRevisions: { profile: 1 },
  migration: null,
  createdAt: '',
  updatedAt: '',
  configuration: configuration(),
});
const editor = (): ProfileEditor => ({
  id: 'editor-a',
  draftId: 'draft-a',
  title: 'Widget',
  target: { kind: 'widget', widgetId, pageId: 'home' },
  base: profile(),
  working: configuration(),
  lease: null,
  busy: false,
  error: '',
  conflict: null,
  quotaBlocked: false,
});
let currentConfiguration: Configuration;
let state: { profile: LiveProfile; editor: ProfileEditor | null; offline: boolean };
let accepted: Configuration[];
const commands = vi.fn(async () => undefined),
  saveSetting = vi.fn(),
  transport = vi.fn(async () => ({}));
const begin = vi.fn(async () => {
  state = { ...state, editor: state.editor ?? editor() };
});
const finish = vi.fn(async () => {
  state = { ...state, editor: null };
  return true;
});
const mutate = vi.fn(async (update: (value: Configuration) => Configuration) => {
  const next = update(currentConfiguration);
  accepted.push(next);
  currentConfiguration = next;
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function mountSection() {
  const saveBinding = vi.fn(async () => undefined);
  return {
    saveBinding,
    ...render(
      <WidgetRuntimeProvider
        value={createFixtureRuntime({
          entities,
          conn: { sendMessagePromise: transport } as unknown as Connection,
          callService: commands,
          services: {},
        })}
      >
        <ProductBindingSection family="mower" settings={settings} saveBinding={saveBinding} />
      </WidgetRuntimeProvider>
    ),
  };
}
function mountSettings() {
  mocks.live = {
    get state() {
      return state;
    },
    coordinator: { snapshot: () => state, begin, finish },
    mutate,
  };
  const onClose = vi.fn();
  return {
    onClose,
    ...render(
      <WidgetRuntimeProvider
        value={createFixtureRuntime({
          entities,
          cardSettings: cards,
          conn: { sendMessagePromise: transport } as unknown as Connection,
          callService: commands,
          saveCardSetting: saveSetting,
          services: {},
        })}
      >
        <WidgetSettingsSheet
          open
          onClose={onClose}
          widgetId={widgetId}
          settingsKey={`home::${widgetId}`}
          pageId="home"
        />
      </WidgetRuntimeProvider>
    ),
  };
}
async function chooseDevice() {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' })
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Robot giardino' }));
}
beforeEach(() => {
  currentConfiguration = configuration();
  accepted = [];
  state = { profile: profile(), editor: null, offline: false };
  mocks.live = null;
  mocks.devices.mockReset().mockResolvedValue(devices);
  mocks.registry.mockReset().mockResolvedValue(registry);
  commands.mockClear();
  saveSetting.mockClear();
  transport.mockClear();
  mutate.mockClear();
  begin.mockReset().mockImplementation(async () => {
    state = { ...state, editor: state.editor ?? editor() };
  });
  finish.mockReset().mockImplementation(async () => {
    state = { ...state, editor: null };
    return true;
  });
  mocks.pages = {
    launcherLayout: layout,
    cardSettings: cards,
    pagesConfig: { pages: ['home'], header: [], home: [widgetId] },
    customIcons: {},
    pageSettings: {},
    widgetMemoryNotice: null,
    setCardSettings: vi.fn(),
    saveCustomName: vi.fn(),
    saveCustomIcon: vi.fn(),
    persistCustomIcons: vi.fn(),
    savePageSetting: vi.fn(),
  };
});
afterEach(() => {
  expect(commands).not.toHaveBeenCalled();
  expect(transport).not.toHaveBeenCalled();
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = '';
});

describe('associazione manuale Tagliaerba sul percorso prodotto comune', () => {
  it('preserva bindingEntityId nella patch unica e associa solo i canali ordinari dello stesso dispositivo', async () => {
    const view = mountSection();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' })
    );
    expect(screen.queryByRole('button', { name: 'Solo manutenzione' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Robot giardino' }));
    await waitFor(() => expect(view.saveBinding).toHaveBeenCalledOnce());
    expect(view.saveBinding).toHaveBeenCalledWith({
      bindingEntityId: 'lawn_mower.a',
      name: 'Robot giardino',
      productDevice: {
        version: 1,
        family: 'mower',
        deviceId: 'garden-robots',
        primaryEntityId: 'lawn_mower.a',
        channelEntityIds: ['lawn_mower.a', 'lawn_mower.b'],
        secondaryEntityIds: ['sensor.temperature', 'number.calibration'],
        technicalEntityIds: ['number.calibration'],
      },
    });
    expect(commands).not.toHaveBeenCalled();
    expect(saveSetting).not.toHaveBeenCalled();
  });

  it('un errore di lettura non scrive dati e Riprova ripristina le scelte senza avvisi sovrapposti', async () => {
    mocks.devices.mockRejectedValueOnce(new Error('Registro non disponibile'));
    const view = mountSection();
    expect(await screen.findByRole('alert')).toHaveTextContent('Non posso leggere i dispositivi');
    expect(screen.queryByRole('status')).toBeNull();
    expect(view.saveBinding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await chooseDevice();
    await waitFor(() => expect(view.saveBinding).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(commands).not.toHaveBeenCalled();
  });

  it('rilegge i canali al tap e salva il primario rimasto abilitato, senza riusare il collegamento della lista', async () => {
    const view = mountSection();
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    mocks.registry.mockResolvedValueOnce(
      registry.map((entry) =>
        entry.entity_id === 'lawn_mower.a' ? { ...entry, disabled_by: 'user' } : entry
      )
    );
    await chooseDevice();
    await waitFor(() => expect(view.saveBinding).toHaveBeenCalledOnce());
    expect(view.saveBinding).toHaveBeenCalledWith(
      expect.objectContaining({
        bindingEntityId: 'lawn_mower.b',
        productDevice: expect.objectContaining({
          family: 'mower',
          deviceId: 'garden-robots',
          primaryEntityId: 'lawn_mower.b',
          channelEntityIds: ['lawn_mower.b'],
        }),
      })
    );
    expect(commands).not.toHaveBeenCalled();
    expect(saveSetting).not.toHaveBeenCalled();
  });

  it('lo sheet applica insieme bindingEntityId, metadata e nome e conserva tutte le impostazioni precedenti', async () => {
    const old = currentConfiguration;
    mountSettings();
    await screen.findByText('Salvataggio automatico');
    await chooseDevice();
    await waitFor(() => expect(accepted).toHaveLength(1));
    expect(mutate).toHaveBeenCalledOnce();
    expect(saveSetting).not.toHaveBeenCalled();
    expect(commands).not.toHaveBeenCalled();
    expect(currentConfiguration).toMatchObject({
      snapshot: {
        layout: {
          cardSettings: {
            [`home::${widgetId}`]: {
              categoryWidgetType: 'mower',
              bindingEntityId: 'lawn_mower.a',
              heading: 'Conservata',
              appearanceOpacity: 25,
              name: 'Robot giardino',
              productDevice: {
                family: 'mower',
                deviceId: 'garden-robots',
                channelEntityIds: ['lawn_mower.a', 'lawn_mower.b'],
              },
            },
          },
          customNames: { keep: 'Conservato' },
        },
      },
    });
    expect(old).toEqual(configuration());
  });

  it('un rifiuto del salvataggio non applica campi parziali e consente una nuova associazione esplicita', async () => {
    mutate.mockRejectedValueOnce(new Error('Riserva non più disponibile'));
    mountSettings();
    await screen.findByText('Salvataggio automatico');
    await chooseDevice();
    expect(await screen.findByRole('alert')).toHaveTextContent('Riserva non più disponibile');
    expect(accepted).toHaveLength(0);
    expect(currentConfiguration).toEqual(configuration());
    expect(saveSetting).not.toHaveBeenCalled();
    expect(commands).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await chooseDevice();
    await waitFor(() => expect(accepted).toHaveLength(1));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(commands).not.toHaveBeenCalled();
  });

  it('rifiuta un dispositivo associato nel frattempo a un widget di una pila nascosta', async () => {
    mountSettings();
    await screen.findByText('Salvataggio automatico');
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    const gate = deferred<HaEntityRegistryEntry[]>();
    mocks.registry.mockResolvedValueOnce(registry).mockReturnValueOnce(gate.promise);
    await chooseDevice();
    await waitFor(() => expect(mocks.registry).toHaveBeenCalledTimes(3));
    currentConfiguration = {
      snapshot: {
        layout: {
          launcherLayout: {
            ...layout,
            stacks: { stack_hidden: { ids: ['lawn_mower.existing'] } },
            pages: [
              ...layout.pages,
              {
                id: 'hidden',
                kind: 'widgets',
                hidden: true,
                label: 'Nascosta',
                placements: { tablet: { stack_hidden: { x: 0, y: 0, w: 2, h: 2 } } },
              },
            ],
          },
          cardSettings: {
            ...cards,
            'hidden::lawn_mower.existing': {
              categoryWidgetType: 'mower',
              bindingEntityId: 'lawn_mower.b',
            },
          },
        },
      },
    };
    const before = JSON.stringify(currentConfiguration);
    await act(async () => {
      gate.resolve(registry);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Questo dispositivo ha già un widget'
    );
    expect(accepted).toHaveLength(0);
    expect(JSON.stringify(currentConfiguration)).toBe(before);
    expect(commands).not.toHaveBeenCalled();
  });

  it.each(['profile', 'close'])(
    'una risposta tardiva dopo %s non aggiorna un altro contesto',
    async (action) => {
      const view = mountSettings();
      await screen.findByText('Salvataggio automatico');
      await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
      const gate = deferred<HaEntityRegistryEntry[]>();
      mocks.registry.mockResolvedValueOnce(registry).mockReturnValueOnce(gate.promise);
      await chooseDevice();
      await waitFor(() => expect(mocks.registry).toHaveBeenCalledTimes(3));
      if (action === 'profile') state = { ...state, profile: profile('profile-b') };
      else {
        fireEvent.click(screen.getByRole('button', { name: 'Fatto' }));
        await waitFor(() => expect(view.onClose).toHaveBeenCalledOnce());
      }
      await act(async () => {
        gate.resolve(registry);
      });
      if (action === 'profile')
        expect(await screen.findByRole('alert')).toHaveTextContent(
          'Il profilo o la modifica sono cambiati'
        );
      expect(mutate).not.toHaveBeenCalled();
      expect(accepted).toHaveLength(0);
      expect(commands).not.toHaveBeenCalled();
    }
  );

  it('una chiusura prima della lettura fresca annulla il callback ancora pendente', async () => {
    const view = mountSection();
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    const gate = deferred<HaEntityRegistryEntry[]>();
    mocks.registry.mockReturnValueOnce(gate.promise);
    await chooseDevice();
    view.unmount();
    await act(async () => {
      gate.resolve(registry);
    });
    expect(view.saveBinding).not.toHaveBeenCalled();
    expect(commands).not.toHaveBeenCalled();
  });
});
