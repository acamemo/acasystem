import { useState } from 'react';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { CategoryBindingSection } from '@/templates/sheets/CategoryBindingSection';
import { ProductBindingSection, type SaveProductBinding } from '@/templates/sheets/ProductBindingSection';
import { mockHouse, buildRegistries } from '@/utils/mockup/mockData';
import { resolveTvDeviceBinding } from '@/utils/devices/productBinding';
import { multimediaAssociationPatch } from '@/utils/devices/multimediaSettings';
import { fakeConnection, flush, renderWithRuntime } from './ControlsHarness';

const mocked = vi.hoisted(() => ({ getDevices: vi.fn(), getEntities: vi.fn(), profile: 'profile-one', editor: 'editor-one', removeCallback: null as (() => void) | null }));
vi.mock('@/api/haClient', async importOriginal => ({ ...await importOriginal<typeof import('@/api/haClient')>(), getDeviceRegistry: mocked.getDevices, getEntityRegistry: mocked.getEntities, getAreas: async () => [] }));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({ useOptionalLiveProfiles: () => ({ coordinator: { snapshot: () => ({ profile: { id: mocked.profile }, editor: { id: mocked.editor } }) } }) }));
vi.mock('@/components/widgets/utilities/discover/DeviceFinder', () => ({ DeviceFinder: ({ onUse, onFlowDone }: { onUse: (device: { primaryEntityId: string }) => void; onFlowDone: (entry: { mediaPlayerEntityId: string }) => void }) => <div aria-label="Ricerca TV"><button onClick={() => onUse({ primaryEntityId: 'media_player.multimedia_tv_a' })}>Usa TV</button><button onClick={() => { onUse({ primaryEntityId: 'media_player.multimedia_tv_a' }); onUse({ primaryEntityId: 'media_player.multimedia_tv_a' }); }}>Doppio invio</button><button onClick={() => onFlowDone({ mediaPlayerEntityId: 'media_player.multimedia_tv_a' })}>Completa flusso</button></div> }));
vi.mock('@/templates/devices/RemoveDevice', () => ({ RemoveDevice: ({ entityId, onRemoved }: { entityId: string; onRemoved: () => void }) => { mocked.removeCallback = onRemoved; return <button aria-label={`Rimuovi dispositivo ${entityId}`} onClick={onRemoved}>Rimuovi dispositivo</button>; } }));

const house = mockHouse('normal'), registry = buildRegistries(house.entities, house.devices);
const binding = resolveTvDeviceBinding('dev_multimedia_tv', registry.devices, registry.entities, house.entities)!;
const settings: CardSettings = { categoryWidgetType: 'androidtv', ...multimediaAssociationPatch(binding), productDevice: binding };
const empty: CardSettings = { categoryWidgetType: 'androidtv' };
const overrides = () => ({ entities: house.entities, entitiesLoaded: true, conn: fakeConnection().conn });
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
function delayRegistries() {
  const devices = deferred<HaDeviceRegistryEntry[]>(), entities = deferred<HaEntityRegistryEntry[]>();
  mocked.getDevices.mockImplementationOnce(() => devices.promise); mocked.getEntities.mockImplementationOnce(() => entities.promise);
  return { resolve: () => { devices.resolve(registry.devices); entities.resolve(registry.entities); }, reject: () => { devices.reject(new Error('DENIED')); entities.reject(new Error('DENIED')); } };
}
const category = (saveBinding: SaveProductBinding = vi.fn(async () => undefined), current = empty) => <CategoryBindingSection settings={current} save={vi.fn()} saveBinding={saveBinding} />;
async function beginAddedTv() { fireEvent.click(screen.getByRole('button', { name: /Aggiungi un dispositivo/ })); await flush(); }
beforeEach(() => { mocked.getDevices.mockReset().mockResolvedValue(registry.devices); mocked.getEntities.mockReset().mockResolvedValue(registry.entities); mocked.profile = 'profile-one'; mocked.editor = 'editor-one'; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Associazione TV dopo aggiunta: contesto e singolo invio', () => {
  it.each(['Usa TV', 'Completa flusso'])('%s usa il risolutore prodotto e un’unica operazione atomica', async label => {
    const save = vi.fn(async () => undefined); renderWithRuntime(category(save), overrides()); await flush(); await beginAddedTv();
    fireEvent.click(screen.getByRole('button', { name: label })); await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ ...multimediaAssociationPatch(binding), productDevice: binding }));
  });
  it('rifiuta il doppio callback prima di qualsiasi risposta', async () => {
    const save = vi.fn(async () => undefined); renderWithRuntime(category(save), overrides()); await flush(); await beginAddedTv();
    const waiting = delayRegistries(); fireEvent.click(screen.getByRole('button', { name: 'Doppio invio' })); await flush();
    expect(save).not.toHaveBeenCalled(); waiting.resolve(); await flush(); expect(save).toHaveBeenCalledTimes(1);
  });
  it('la chiusura invalida una lettura tardiva prima del salvataggio', async () => {
    const save = vi.fn(async () => undefined), rendered = renderWithRuntime(category(save), overrides()); await flush(); await beginAddedTv();
    const waiting = delayRegistries(); fireEvent.click(screen.getByRole('button', { name: 'Usa TV' })); rendered.unmount(); waiting.resolve(); await flush(); expect(save).not.toHaveBeenCalled();
  });
  it.each(['profile', 'editor'] as const)('il cambio %s durante la prima await non riassocia il widget', async field => {
    const save = vi.fn(async () => undefined); renderWithRuntime(category(save), overrides()); await flush(); await beginAddedTv();
    const waiting = delayRegistries(); fireEvent.click(screen.getByRole('button', { name: 'Usa TV' })); mocked[field] = 'changed'; waiting.resolve(); await flush();
    expect(save).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('Non posso completare l’associazione');
  });
  it('il cambio connessione invalida la risposta precedente', async () => {
    const save = vi.fn(async () => undefined), rendered = renderWithRuntime(category(save), overrides()); await flush(); await beginAddedTv();
    const waiting = delayRegistries(); fireEvent.click(screen.getByRole('button', { name: 'Usa TV' })); rendered.update({ conn: fakeConnection().conn }); waiting.resolve(); await flush(); expect(save).not.toHaveBeenCalled();
  });
  it('il cambio target invalida la lettura precedente', async () => {
    const save = vi.fn(async () => undefined); let change!: (value: CardSettings) => void;
    function Target() { const [current, setCurrent] = useState(empty); change = setCurrent; return category(save, current); }
    renderWithRuntime(<Target />, overrides()); await flush(); await beginAddedTv();
    const waiting = delayRegistries(); fireEvent.click(screen.getByRole('button', { name: 'Usa TV' }));
    act(() => change({ categoryWidgetType: 'appletv' })); waiting.resolve(); await flush(); expect(save).not.toHaveBeenCalled();
  });
  it('durante l’associazione da Trova sono disabilitati scelta manuale e nuovo ingresso', async () => {
    const save = vi.fn(async () => undefined); renderWithRuntime(category(save), overrides()); await flush(); await beginAddedTv();
    const waiting = delayRegistries(); fireEvent.click(screen.getByRole('button', { name: 'Usa TV' })); await flush();
    expect(await screen.findByRole('button', { name: /Dispositivo da collegare:/ })).toBeDisabled(); expect(screen.getByRole('button', { name: /Aggiungi un dispositivo/ })).toBeDisabled();
    waiting.resolve(); await flush(); expect(save).toHaveBeenCalledOnce();
  });
  it('un errore libera il blocco e consente una nuova prova', async () => {
    const save = vi.fn(async () => undefined); renderWithRuntime(category(save), overrides()); await flush(); await beginAddedTv();
    const waiting = delayRegistries(); fireEvent.click(screen.getByRole('button', { name: 'Usa TV' })); waiting.reject(); await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Non posso completare l’associazione'); expect(screen.getByRole('button', { name: /Aggiungi un dispositivo/ })).not.toBeDisabled();
    await beginAddedTv(); fireEvent.click(screen.getByRole('button', { name: 'Usa TV' })); await flush(); expect(save).toHaveBeenCalledOnce();
  });
  it('mantiene RemoveDevice e scollega identità e metadati con un solo salvataggio', async () => {
    const save = vi.fn(async () => undefined); renderWithRuntime(category(save, settings), overrides()); await flush();
    fireEvent.click(screen.getByRole('button', { name: `Rimuovi dispositivo ${binding.primaryEntityId}` })); await flush();
    expect(save).toHaveBeenCalledOnce(); expect(save).toHaveBeenCalledWith({ mediaPlayerId: null, bindingEntityId: null, productDevice: undefined });
  });
});

describe('Associazione manuale Multimedia: contesto catturato al click', () => {
  async function choose() { fireEvent.click(await screen.findByRole('button', { name: /Dispositivo da collegare:/ })); fireEvent.click(await screen.findByRole('button', { name: /TV multicanale/ })); }
  it.each(['profile', 'editor'] as const)('non scrive dopo il cambio %s', async field => {
    const save = vi.fn(async () => undefined); renderWithRuntime(<ProductBindingSection family="tv" tvKind="androidtv" settings={empty} saveBinding={save} />, overrides()); await flush();
    const waiting = delayRegistries(); await choose(); mocked[field] = 'changed'; waiting.resolve(); await flush(); expect(save).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('Il profilo o la modifica sono cambiati');
  });
  it('non scrive dopo unmount', async () => {
    const save = vi.fn(async () => undefined), rendered = renderWithRuntime(<ProductBindingSection family="tv" tvKind="androidtv" settings={empty} saveBinding={save} />, overrides()); await flush();
    const waiting = delayRegistries(); await choose(); rendered.unmount(); waiting.resolve(); await flush(); expect(save).not.toHaveBeenCalled();
  });
  it('la selezione manuale impedisce un’aggiunta concorrente', async () => {
    const save = vi.fn(async () => undefined); renderWithRuntime(category(save), overrides()); await flush();
    const waiting = delayRegistries(); await choose(); expect(screen.getByRole('button', { name: /Aggiungi un dispositivo/ })).toBeDisabled(); waiting.resolve(); await flush(); expect(save).toHaveBeenCalledOnce();
  });
  it('disabled impedisce una nuova associazione senza inviare richieste di scrittura', async () => {
    const save = vi.fn(async () => undefined); renderWithRuntime(<ProductBindingSection family="tv" tvKind="androidtv" settings={empty} saveBinding={save} disabled />, overrides()); await flush();
    expect(await screen.findByRole('button', { name: /Dispositivo da collegare:/ })).toBeDisabled(); expect(save).not.toHaveBeenCalled();
  });
});


it('una rimozione completata dopo chiusura non avvia uno scollegamento tardivo', async () => {
  const save = vi.fn(async () => undefined), rendered = renderWithRuntime(category(save, settings), overrides()); await flush();
  const callback = mocked.removeCallback; expect(callback).not.toBeNull(); rendered.unmount(); callback?.(); await flush(); expect(save).not.toHaveBeenCalled();
});


it.each(['manuale', 'aggiunta'])('mantiene il blocco %s fino all’ACK anche dopo l’aggiornamento della bozza', async mode => {
  const waiting = deferred<void>(); let update!: (value: CardSettings) => void;
  const save = vi.fn(async (patch: Partial<CardSettings>) => { update({ ...empty, ...patch }); await waiting.promise; });
  function Target() { const [current, setCurrent] = useState(empty); update = setCurrent; return category(save, current); }
  renderWithRuntime(<Target />, overrides()); await flush();
  if (mode === 'manuale') {
    fireEvent.click(await screen.findByRole('button', { name: /Dispositivo da collegare:/ })); fireEvent.click(await screen.findByRole('button', { name: /TV multicanale/ }));
  } else { await beginAddedTv(); fireEvent.click(screen.getByRole('button', { name: 'Usa TV' })); }
  await flush(); expect(save).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: /Aggiungi un dispositivo/ })).toBeDisabled();
  waiting.resolve(); await flush(); expect(screen.getByRole('button', { name: /Aggiungi un dispositivo/ })).not.toBeDisabled();
});
