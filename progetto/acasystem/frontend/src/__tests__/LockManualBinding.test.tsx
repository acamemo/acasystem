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
vi.mock('@/hooks/context', async original => ({ ...await original<typeof import('@/hooks/context')>(), usePages: () => mocks.pages }));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({ useOptionalLiveProfiles: () => mocks.live }));
vi.mock('@/api/haClient', async original => ({ ...await original<typeof import('@/api/haClient')>(), getDeviceRegistry: mocks.devices, getEntityRegistry: mocks.registry }));
vi.mock('@/templates/sheets/parts/useEntityRooms', () => ({ useEntityRooms: () => ({}) }));
vi.mock('@/components/widgets/registry', () => ({
  widgetDefinitions: [], pageKindDefinitions: [],
  findWidgetDefinition: () => ({ type: 'lock', label: 'Serrature', Widget: () => null }),
  findPageKindDefinition: () => undefined,
}));

const registry: HaEntityRegistryEntry[] = [
  { entity_id: 'lock.a', device_id: 'locks' }, { entity_id: 'lock.b', device_id: 'locks' },
  { entity_id: 'sensor.temperature', device_id: 'locks' },
  { entity_id: 'number.calibration', device_id: 'locks', entity_category: 'config' },
  { entity_id: 'lock.hidden', device_id: 'locks', hidden_by: 'user' },
  { entity_id: 'lock.disabled', device_id: 'locks', disabled_by: 'integration' },
  { entity_id: 'lock.other', device_id: 'other' },
  { entity_id: 'lock.technical', device_id: 'technical', entity_category: 'config' },
];
const devices = [{ id: 'locks', name: 'Serrature soggiorno', config_entries: ['hub'] },
  { id: 'other', name: 'Serrature studio', config_entries: ['hub'] }, { id: 'technical', name: 'Solo manutenzione' }];
const entities = fixtureEntities([
  fixtureEntity('lock.a', 'locked'), fixtureEntity('lock.b', 'unlocking'), fixtureEntity('sensor.temperature', '21'),
  fixtureEntity('number.calibration', '0'), fixtureEntity('lock.hidden', 'locked'), fixtureEntity('lock.disabled', 'locked'),
  fixtureEntity('lock.other', 'locked'), fixtureEntity('lock.technical', 'locked'),
]);
const widgetId = 'lock_card_manual';
const settings = { categoryWidgetType: 'lock', lockId: null, bindingEntityId: 'lock.stale', heading: 'Conservata', coverInvert: true };
const cards: CardSettingsMap = { [`home::${widgetId}`]: settings };
const layout: LauncherLayout = { version: 1, cover: { enabled: false }, pages: [
  { id: 'home', kind: 'widgets', label: 'Casa', placements: { tablet: { [widgetId]: { x: 0, y: 0, w: 2, h: 2 } } } },
] };
const configuration = (): Configuration => ({ snapshot: { layout: { launcherLayout: structuredClone(layout), cardSettings: structuredClone(cards), customNames: { keep: 'Conservato' } } } });
const profile = (id = 'profile-a'): LiveProfile => ({ id, userId: 'user-a', name: 'Casa', revision: 1,
  resourceRevisions: { profile: 1 }, migration: null, createdAt: '', updatedAt: '', configuration: configuration() });
const editor = (): ProfileEditor => ({ id: 'editor-a', draftId: 'draft-a', title: 'Widget',
  target: { kind: 'widget', widgetId, pageId: 'home' }, base: profile(), working: configuration(),
  lease: null, busy: false, error: '', conflict: null, quotaBlocked: false });
let currentConfiguration: Configuration;
let state: { profile: LiveProfile; editor: ProfileEditor | null; offline: boolean };
let accepted: Configuration[];
const commands = vi.fn(async () => undefined), saveSetting = vi.fn();
const begin = vi.fn(async () => { state = { ...state, editor: state.editor ?? editor() }; });
const finish = vi.fn(async () => { state = { ...state, editor: null }; return true; });
const mutate = vi.fn(async (update: (value: Configuration) => Configuration) => {
  const next = update(currentConfiguration); accepted.push(next); currentConfiguration = next;
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function mountSection() {
  const saveBinding = vi.fn(async () => undefined);
  return { saveBinding, ...render(<WidgetRuntimeProvider value={createFixtureRuntime({ entities, conn: {} as Connection, callService: commands, services: {} })}>
    <ProductBindingSection family="lock" settings={settings} saveBinding={saveBinding} />
  </WidgetRuntimeProvider>) };
}
function mountSettings() {
  mocks.live = { get state() { return state; }, coordinator: { snapshot: () => state, begin, finish }, mutate };
  const onClose = vi.fn();
  return { onClose, ...render(<WidgetRuntimeProvider value={createFixtureRuntime({ entities, cardSettings: cards, conn: {} as Connection,
    callService: commands, saveCardSetting: saveSetting, services: {} })}>
    <WidgetSettingsSheet open onClose={onClose} widgetId={widgetId} settingsKey={`home::${widgetId}`} pageId="home" />
  </WidgetRuntimeProvider>) };
}
async function chooseDevice() {
  fireEvent.click(await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Serrature soggiorno' }));
}
beforeEach(() => {
  currentConfiguration = configuration(); accepted = []; state = { profile: profile(), editor: null, offline: false };
  mocks.live = null; mocks.devices.mockReset().mockResolvedValue(devices); mocks.registry.mockReset().mockResolvedValue(registry);
  commands.mockClear(); saveSetting.mockClear(); mutate.mockClear();
  begin.mockReset().mockImplementation(async () => { state = { ...state, editor: state.editor ?? editor() }; });
  finish.mockReset().mockImplementation(async () => { state = { ...state, editor: null }; return true; });
  mocks.pages = { launcherLayout: layout, cardSettings: cards, pagesConfig: { pages: ['home'], header: [], home: [widgetId] },
    customIcons: {}, pageSettings: {}, widgetMemoryNotice: null, setCardSettings: vi.fn(), saveCustomName: vi.fn(),
    saveCustomIcon: vi.fn(), persistCustomIcons: vi.fn(), savePageSetting: vi.fn() };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.documentElement.style.overflow = ''; });

describe('associazione manuale Serrature sul percorso prodotto comune', () => {
  it('usa lockId nella patch unica e associa solo i canali ordinari dello stesso dispositivo', async () => {
    const view = mountSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' }));
    expect(screen.queryByRole('button', { name: 'Solo manutenzione' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Serrature soggiorno' }));
    await waitFor(() => expect(view.saveBinding).toHaveBeenCalledOnce());
    expect(view.saveBinding).toHaveBeenCalledWith({ lockId: 'lock.a', bindingEntityId: null, name: 'Serrature soggiorno', productDevice: {
      version: 1, family: 'lock', deviceId: 'locks', primaryEntityId: 'lock.a', channelEntityIds: ['lock.a', 'lock.b'],
      secondaryEntityIds: ['sensor.temperature', 'number.calibration'], technicalEntityIds: ['number.calibration'],
    } });
    expect(commands).not.toHaveBeenCalled(); expect(saveSetting).not.toHaveBeenCalled();
  });

  it('un errore di lettura non scrive dati e Riprova ripristina le scelte senza avvisi sovrapposti', async () => {
    mocks.devices.mockRejectedValueOnce(new Error('Registro non disponibile'));
    const view = mountSection();
    expect(await screen.findByRole('alert')).toHaveTextContent('Non posso leggere i dispositivi');
    expect(screen.queryByRole('status')).toBeNull(); expect(view.saveBinding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' })); await chooseDevice();
    await waitFor(() => expect(view.saveBinding).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).toBeNull(); expect(commands).not.toHaveBeenCalled();
  });

  it('rilegge i canali al tap e salva il primario rimasto abilitato, senza riusare il collegamento della lista', async () => {
    const view = mountSection();
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    mocks.registry.mockResolvedValueOnce(registry.map(entry => entry.entity_id === 'lock.a' ? { ...entry, disabled_by: 'user' } : entry));
    await chooseDevice();
    await waitFor(() => expect(view.saveBinding).toHaveBeenCalledOnce());
    expect(view.saveBinding).toHaveBeenCalledWith(expect.objectContaining({ lockId: 'lock.b', bindingEntityId: null,
      productDevice: expect.objectContaining({ family: 'lock', deviceId: 'locks', primaryEntityId: 'lock.b', channelEntityIds: ['lock.b'] }) }));
    expect(commands).not.toHaveBeenCalled(); expect(saveSetting).not.toHaveBeenCalled();
  });

  it('lo sheet applica insieme lockId, metadata e nome e conserva tutte le impostazioni precedenti', async () => {
    const old = currentConfiguration;
    mountSettings(); await screen.findByText('Salvataggio automatico'); await chooseDevice();
    await waitFor(() => expect(accepted).toHaveLength(1));
    expect(mutate).toHaveBeenCalledOnce(); expect(saveSetting).not.toHaveBeenCalled(); expect(commands).not.toHaveBeenCalled();
    expect(currentConfiguration).toMatchObject({ snapshot: { layout: { cardSettings: { [`home::${widgetId}`]: {
      categoryWidgetType: 'lock', lockId: 'lock.a', bindingEntityId: null, heading: 'Conservata', coverInvert: true, name: 'Serrature soggiorno',
      productDevice: { family: 'lock', deviceId: 'locks', channelEntityIds: ['lock.a', 'lock.b'] },
    } }, customNames: { keep: 'Conservato' } } } });
    expect(old).toEqual(configuration());
  });

  it('un rifiuto del salvataggio non applica campi parziali e consente una nuova associazione esplicita', async () => {
    mutate.mockRejectedValueOnce(new Error('Riserva non più disponibile'));
    mountSettings(); await screen.findByText('Salvataggio automatico'); await chooseDevice();
    expect(await screen.findByRole('alert')).toHaveTextContent('Riserva non più disponibile');
    expect(accepted).toHaveLength(0); expect(currentConfiguration).toEqual(configuration());
    expect(saveSetting).not.toHaveBeenCalled(); expect(commands).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' })); await chooseDevice();
    await waitFor(() => expect(accepted).toHaveLength(1));
    expect(screen.queryByRole('alert')).toBeNull(); expect(mutate).toHaveBeenCalledTimes(2);
    expect(commands).not.toHaveBeenCalled();
  });

  it('rifiuta un dispositivo associato nel frattempo a un widget di una pila nascosta', async () => {
    mountSettings(); await screen.findByText('Salvataggio automatico');
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    const gate = deferred<HaEntityRegistryEntry[]>(); mocks.registry.mockResolvedValueOnce(registry).mockReturnValueOnce(gate.promise);
    await chooseDevice(); await waitFor(() => expect(mocks.registry).toHaveBeenCalledTimes(3));
    currentConfiguration = { snapshot: { layout: { launcherLayout: { ...layout, stacks: { stack_hidden: { ids: ['lock_card_existing'] } }, pages: [
      ...layout.pages, { id: 'hidden', kind: 'widgets', hidden: true, label: 'Nascosta', placements: { tablet: { stack_hidden: { x: 0, y: 0, w: 2, h: 2 } } } },
    ] }, cardSettings: { ...cards, 'hidden::lock_card_existing': { categoryWidgetType: 'lock', lockId: 'lock.b' } } } } };
    const before = JSON.stringify(currentConfiguration);
    await act(async () => { gate.resolve(registry); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Questo dispositivo ha già un widget');
    expect(accepted).toHaveLength(0); expect(JSON.stringify(currentConfiguration)).toBe(before); expect(commands).not.toHaveBeenCalled();
  });

  it.each(['profile', 'close'])('una risposta tardiva dopo %s non aggiorna un altro contesto', async action => {
    const view = mountSettings(); await screen.findByText('Salvataggio automatico');
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    const gate = deferred<HaEntityRegistryEntry[]>(); mocks.registry.mockResolvedValueOnce(registry).mockReturnValueOnce(gate.promise);
    await chooseDevice(); await waitFor(() => expect(mocks.registry).toHaveBeenCalledTimes(3));
    if (action === 'profile') state = { ...state, profile: profile('profile-b') };
    else { fireEvent.click(screen.getByRole('button', { name: 'Fatto' })); await waitFor(() => expect(view.onClose).toHaveBeenCalledOnce()); }
    await act(async () => { gate.resolve(registry); });
    if (action === 'profile') expect(await screen.findByRole('alert')).toHaveTextContent('Il profilo o la modifica sono cambiati');
    expect(mutate).not.toHaveBeenCalled(); expect(accepted).toHaveLength(0); expect(commands).not.toHaveBeenCalled();
  });

  it('una chiusura prima della lettura fresca annulla il callback ancora pendente', async () => {
    const view = mountSection();
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    const gate = deferred<HaEntityRegistryEntry[]>(); mocks.registry.mockReturnValueOnce(gate.promise);
    await chooseDevice(); view.unmount();
    await act(async () => { gate.resolve(registry); });
    expect(view.saveBinding).not.toHaveBeenCalled(); expect(commands).not.toHaveBeenCalled();
  });
});
