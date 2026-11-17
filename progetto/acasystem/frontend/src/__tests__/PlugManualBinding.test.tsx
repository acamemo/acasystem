import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Configuration, LiveProfile } from '../../../contracts/collaboration';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { Connection, HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import type { LauncherLayout } from '@/@types/launcher';
import type { ProfileEditor } from '@/hooks/liveProfiles/coordinator';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { PlugBindingSection } from '@/templates/sheets/PlugBindingSection';
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
  findWidgetDefinition: () => ({ type: 'plug', label: 'Prese e interruttori', Widget: () => null }),
  findPageKindDefinition: () => undefined,
}));

const registry: HaEntityRegistryEntry[] = [
  { entity_id: 'switch.a', device_id: 'relay' }, { entity_id: 'switch.b', device_id: 'relay' },
  { entity_id: 'sensor.power', device_id: 'relay' },
  { entity_id: 'switch.child_lock', device_id: 'relay', entity_category: 'config' },
  { entity_id: 'switch.other', device_id: 'other' },
  { entity_id: 'switch.technical', device_id: 'technical', entity_category: 'config' },
];
const devices = [{ id: 'relay', name: 'Multipresa cucina' }, { id: 'other', name: 'Altra presa' }, { id: 'technical', name: 'Solo tecnica' }];
const entities = fixtureEntities([
  fixtureEntity('switch.a', 'off'), fixtureEntity('switch.b', 'on'), fixtureEntity('sensor.power', '12', { unit_of_measurement: 'W' }),
  fixtureEntity('switch.child_lock', 'on'), fixtureEntity('switch.other', 'off'), fixtureEntity('switch.technical', 'on'),
]);
const settings = { categoryWidgetType: 'plug', heading: 'Intestazione conservata' };
const initialCards: CardSettingsMap = { 'home::plug.widget': settings };
const layout: LauncherLayout = { version: 1, cover: { enabled: false }, pages: [
  { id: 'home', kind: 'widgets', label: 'Casa', placements: { tablet: { 'plug.widget': { x: 0, y: 0, w: 2, h: 2 } } } },
] };
const configuration = (): Configuration => ({ snapshot: { layout: { launcherLayout: structuredClone(layout), cardSettings: structuredClone(initialCards), customNames: { other: 'Conservato' } } } });
const profile = (id = 'profile-a'): LiveProfile => ({ id, userId: 'user-a', name: 'Casa', revision: 1,
  resourceRevisions: { profile: 1 }, migration: null, createdAt: '', updatedAt: '', configuration: configuration() });
const editor = (): ProfileEditor => ({ id: 'editor-a', draftId: 'draft-a', title: 'Widget',
  target: { kind: 'widget', widgetId: 'plug.widget', pageId: 'home' }, base: profile(), working: configuration(),
  lease: null, busy: false, error: '', conflict: null, quotaBlocked: false });

let currentConfiguration: Configuration;
let state: { profile: LiveProfile; editor: ProfileEditor | null; offline: boolean };
let accepted: Configuration[];
const commands = vi.fn(async () => undefined);
const saveSetting = vi.fn();
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
function mountSection(saveBinding = vi.fn(async () => undefined)) {
  return { saveBinding, ...render(<WidgetRuntimeProvider value={createFixtureRuntime({ entities, conn: {} as Connection, callService: commands, services: {} })}>
    <PlugBindingSection settings={settings} saveBinding={saveBinding} />
  </WidgetRuntimeProvider>) };
}
function mountSettings() {
  const onClose = vi.fn();
  const runtime = createFixtureRuntime({ entities, cardSettings: initialCards, conn: {} as Connection, callService: commands, saveCardSetting: saveSetting, services: {} });
  const tree = () => <WidgetRuntimeProvider value={runtime}><WidgetSettingsSheet open onClose={onClose} widgetId="plug.widget" settingsKey="home::plug.widget" pageId="home" /></WidgetRuntimeProvider>;
  return { ...render(tree()), onClose, update: tree };
}
async function chooseDevice() {
  fireEvent.click(await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Multipresa cucina' }));
}

beforeEach(() => {
  currentConfiguration = configuration(); accepted = [];
  state = { profile: profile(), editor: null, offline: false };
  mocks.live = null;
  mocks.devices.mockReset().mockResolvedValue(devices);
  mocks.registry.mockReset().mockResolvedValue(registry);
  commands.mockClear(); saveSetting.mockClear();
  begin.mockReset().mockImplementation(async () => { state = { ...state, editor: state.editor ?? editor() }; });
  finish.mockReset().mockImplementation(async () => { state = { ...state, editor: null }; return true; });
  mutate.mockClear();
  mocks.pages = { launcherLayout: layout, cardSettings: initialCards, pagesConfig: { pages: ['home'], header: [], home: ['plug.widget'] },
    customIcons: {}, pageSettings: {}, widgetMemoryNotice: null, setCardSettings: vi.fn(), saveCustomName: vi.fn(),
    saveCustomIcon: vi.fn(), persistCustomIcons: vi.fn(), savePageSetting: vi.fn() };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.documentElement.style.overflow = ''; });

describe('associazione manuale Prese e interruttori', () => {
  it('sceglie il dispositivo completo in una sola patch, senza esporre interruttori tecnici come prodotti o inviare comandi', async () => {
    const view = mountSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' }));
    expect(screen.queryByRole('button', { name: 'Solo tecnica' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Multipresa cucina' }));
    await waitFor(() => expect(view.saveBinding).toHaveBeenCalledOnce());
    expect(view.saveBinding).toHaveBeenCalledWith({ bindingEntityId: 'switch.a', name: 'Multipresa cucina', productDevice: {
      version: 1, family: 'plug', deviceId: 'relay', primaryEntityId: 'switch.a', channelEntityIds: ['switch.a', 'switch.b'],
      secondaryEntityIds: ['sensor.power', 'switch.child_lock'], technicalEntityIds: ['switch.child_lock'],
    } });
    expect(commands).not.toHaveBeenCalled(); expect(saveSetting).not.toHaveBeenCalled();
  });

  it('un errore di registro mostra un solo avviso e Riprova ricarica le scelte senza cambiare impostazioni', async () => {
    mocks.devices.mockRejectedValueOnce(new Error('Non autorizzato'));
    const view = mountSection();
    expect(await screen.findByRole('alert')).toHaveTextContent('Non posso leggere i dispositivi. Riprova.');
    expect(screen.queryByRole('status')).toBeNull(); expect(view.saveBinding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await chooseDevice();
    await waitFor(() => expect(view.saveBinding).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).toBeNull(); expect(commands).not.toHaveBeenCalled();
  });

  it('un salvataggio rifiutato conserva il widget, rende possibile riprovare e non invia comandi', async () => {
    const saveBinding = vi.fn(async () => undefined).mockRejectedValueOnce(new Error('Modifica negata'));
    mountSection(saveBinding); await chooseDevice();
    expect(await screen.findByRole('alert')).toHaveTextContent('Modifica negata');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' })); await chooseDevice();
    await waitFor(() => expect(saveBinding).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).toBeNull(); expect(commands).not.toHaveBeenCalled();
  });

  it('rilegge i registri al tap e scarta un dispositivo diventato interamente nascosto', async () => {
    const view = mountSection();
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    mocks.registry.mockResolvedValueOnce(registry.map(entry => entry.device_id === 'relay' ? { ...entry, hidden_by: 'user' } : entry));
    await chooseDevice();
    expect(await screen.findByRole('alert')).toHaveTextContent('Il dispositivo non è più disponibile');
    expect(view.saveBinding).not.toHaveBeenCalled(); expect(commands).not.toHaveBeenCalled();
  });

  it('la patch usa solo i canali ancora visibili al tap, non il binding costruito quando si apriva la lista', async () => {
    const view = mountSection();
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    mocks.registry.mockResolvedValueOnce(registry.map(entry => entry.entity_id === 'switch.b' ? { ...entry, hidden_by: 'integration' } : entry));
    await chooseDevice();
    await waitFor(() => expect(view.saveBinding).toHaveBeenCalledOnce());
    expect(view.saveBinding).toHaveBeenCalledWith(expect.objectContaining({ productDevice: expect.objectContaining({ channelEntityIds: ['switch.a'] }) }));
    expect(commands).not.toHaveBeenCalled();
  });

  it('lo sheet live applica insieme binding, metadati e nome senza perdere le altre impostazioni', async () => {
    mocks.live = { get state() { return state; }, coordinator: { snapshot: () => state, begin, finish }, mutate };
    const old = currentConfiguration;
    mountSettings(); await screen.findByText('Salvataggio automatico'); await chooseDevice();
    await waitFor(() => expect(accepted).toHaveLength(1));
    expect(mutate).toHaveBeenCalledOnce(); expect(saveSetting).not.toHaveBeenCalled(); expect(commands).not.toHaveBeenCalled();
    expect(currentConfiguration).toMatchObject({ snapshot: { layout: { cardSettings: { 'home::plug.widget': {
      categoryWidgetType: 'plug', heading: 'Intestazione conservata', bindingEntityId: 'switch.a', name: 'Multipresa cucina',
      productDevice: { family: 'plug', deviceId: 'relay', channelEntityIds: ['switch.a', 'switch.b'] },
    } }, customNames: { other: 'Conservato' } } } });
    expect(old).toEqual(configuration());
  });

  it('rilegge la disposizione nel mutator e rifiuta un duplicato arrivato su una pagina nascosta e in una pila', async () => {
    mocks.live = { get state() { return state; }, coordinator: { snapshot: () => state, begin, finish }, mutate };
    mountSettings(); await screen.findByText('Salvataggio automatico');
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    const gate = deferred<HaEntityRegistryEntry[]>(); mocks.registry.mockResolvedValueOnce(registry).mockReturnValueOnce(gate.promise);
    await chooseDevice();
    await waitFor(() => expect(mocks.registry).toHaveBeenCalledTimes(3));
    currentConfiguration = { snapshot: { layout: { launcherLayout: { ...layout, stacks: { stack_hidden: { ids: ['other-widget'] } }, pages: [
      ...layout.pages, { id: 'hidden', kind: 'widgets', hidden: true, label: 'Nascosta', placements: { tablet: { stack_hidden: { x: 0, y: 0, w: 2, h: 2 } } } },
    ] }, cardSettings: { ...initialCards, 'hidden::other-widget': { categoryWidgetType: 'plug', bindingEntityId: 'switch.b' } } } } };
    const before = JSON.stringify(currentConfiguration);
    await act(async () => { gate.resolve(registry); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Questo dispositivo ha già un widget');
    expect(accepted).toHaveLength(0); expect(JSON.stringify(currentConfiguration)).toBe(before); expect(commands).not.toHaveBeenCalled();
  });

  it.each(['profile', 'close'])('una risposta tardiva dopo %s non associa un dispositivo al contesto successivo', async action => {
    mocks.live = { get state() { return state; }, coordinator: { snapshot: () => state, begin, finish }, mutate };
    const view = mountSettings(); await screen.findByText('Salvataggio automatico');
    await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' });
    const gate = deferred<HaEntityRegistryEntry[]>(); mocks.registry.mockResolvedValueOnce(registry).mockReturnValueOnce(gate.promise);
    await chooseDevice();
    await waitFor(() => expect(mocks.registry).toHaveBeenCalledTimes(3));
    if (action === 'profile') state = { ...state, profile: profile('profile-b') };
    else { fireEvent.click(screen.getByRole('button', { name: 'Fatto' })); await waitFor(() => expect(view.onClose).toHaveBeenCalledOnce()); }
    await act(async () => { gate.resolve(registry); });
    if (action === 'profile') await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Il profilo o la modifica sono cambiati'));
    expect(mutate).not.toHaveBeenCalled(); expect(accepted).toHaveLength(0); expect(commands).not.toHaveBeenCalled();
  });

  it('con editor negato mantiene i campi inerti e non applica associazioni o comandi', async () => {
    begin.mockRejectedValueOnce(new Error('Un altro utente sta modificando.'));
    mocks.live = { get state() { return state; }, coordinator: { snapshot: () => state, begin, finish }, mutate };
    mountSettings();
    expect(await screen.findByRole('alert')).toHaveTextContent('Un altro utente sta modificando.');
    expect(screen.getByRole('group', { name: 'Campi del widget', hidden: true })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Campi del widget', hidden: true })).toHaveAttribute('inert');
    expect(mutate).not.toHaveBeenCalled(); expect(commands).not.toHaveBeenCalled();
  });
});
