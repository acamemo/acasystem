import type { ReactNode } from 'react';
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LauncherLayout, LauncherPage } from '@/@types/launcher';
import type { Configuration } from '../../../contracts/collaboration';
import type { ClientSession } from '@/api/clientSession';
import { createCategoryWidgetSeed } from '@/domain/launcher/categoryPages';
import { applyWidgetAddition, planWidgetAddition } from '@/domain/launcher/pendingPlacement';
import { projectCommonOrder } from '@/domain/launcher/commonOrder';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { emptyWidgetMemory, type WidgetState } from '@/utils/launcher/deviceMemory';
import { pageWidgetIds } from '@/utils/launcher/layout';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';
import { LiveProfilesProvider } from '@/hooks/liveProfiles/LiveProfilesContext';
import type { LiveProfilesState } from '@/hooks/liveProfiles/coordinator';
import type { PageContextValue } from '@/hooks/context/PageContext';
import { PendingWidgetPlacement } from '@/templates/launcher/PendingWidgetPlacement';
import { ADD_WIDGET_TYPES } from '@/domain/launcher/catalog';

const fake = vi.hoisted(() => ({ bridge: null as unknown, engine: {
  snapshot: vi.fn(), subscribe: () => () => undefined, start: vi.fn(async () => undefined), dispose: vi.fn(),
  updateSessionMetadata: vi.fn(), begin: vi.fn(), update: vi.fn(), save: vi.fn(), refresh: vi.fn(), close: vi.fn(),
} }));
vi.mock('@/hooks/liveProfiles/coordinator', () => ({ LiveProfileCoordinator: class { constructor() { return fake.engine; } } }));
vi.mock('@/hooks/context/PageContext', () => ({ usePages: () => ({}), PageContextOverride: ({ value, children }: { value: unknown; children: ReactNode }) => { fake.bridge = value; return children; } }));
vi.mock('@/api/snapshot', () => ({ applySnapshot: vi.fn(), collectSnapshot: () => ({ version: 1, layout: {} }) }));
vi.mock('@/hooks/launcher/useViewport', () => ({ useDeviceClass: () => 'tablet' }));
vi.mock('@/templates/sheets/WidgetCatalogPreview', () => ({ WidgetCatalogPreview: () => <span data-safe-preview="" /> }));

const sizes = { min: { w: 2, h: 2 }, default: { w: 2, h: 2 }, max: { w: 4, h: 4 } };
const ctx = { deviceClass: 'tablet' as const, grids: DEFAULT_GRIDS, sizesOf: () => sizes };
const seed = createCategoryWidgetSeed('light', 'one-selection', () => sizes)!;
const page = (id: string, extra: Partial<LauncherPage> = {}): LauncherPage => ({ id, label: id, kind: 'widgets', placements: { tablet: {} }, ...extra });
const layout = (pages = [page('home')]): LauncherLayout => ({ version: 1, cover: { enabled: false }, categoryDefaultsVersion: 1, casa3dVersion: 1, pages });
const documentOf = (value = layout()): WidgetState => ({ layout: value, pagesConfig: { header: [], pages: value.pages.map(item => item.id) }, cardSettings: {}, customNames: {}, customIcons: {}, memory: emptyWidgetMemory() });
const configOf = (value = documentOf()): Configuration => ({ snapshot: { version: 1, layout: { launcherLayout: value.layout, pagesConfig: value.pagesConfig, cardSettings: value.cardSettings, customNames: value.customNames, customIcons: value.customIcons, widgetMemory: value.memory } } });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
let state: LiveProfilesState;
const session = { houseId: 'house', user: { id: 'user', name: 'Utente' }, client: { id: 'client', label: 'PC' } } as ClientSession;
const bridge = () => fake.bridge as PageContextValue;
function provider() { return render(<LiveProfilesProvider session={session}><span>App</span></LiveProfilesProvider>); }
const add = (current: WidgetState) => applyWidgetAddition(current, ctx, seed, 'home', planWidgetAddition(current.layout!, ctx, seed, 'home')!);
const authoritative = () => (state.profile!.configuration.snapshot as { layout: { launcherLayout: LauncherLayout } }).layout.launcherLayout;

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); fake.bridge = null;
  state = { status: 'ready', usageStatus: 'active', profile: { id: 'profile', name: 'Casa', configuration: configOf(), revision: 0, resourceRevisions: {} }, editor: null, offline: false, error: '', canUndo: false } as LiveProfilesState;
  fake.engine.snapshot.mockImplementation(() => state);
  fake.engine.begin.mockImplementation(async () => { state = { ...state, editor: { id: 'own-editor', base: state.profile!, working: state.profile!.configuration, target: { kind: 'structure' }, transient: true } as LiveProfilesState['editor'] }; });
  fake.engine.update.mockImplementation(async (apply: (configuration: Configuration) => Configuration) => { state = { ...state, editor: { ...state.editor!, working: apply(state.editor!.working) } }; });
  fake.engine.save.mockImplementation(async () => { state = { ...state, profile: { ...state.profile!, configuration: state.editor!.working }, editor: null }; return true; });
  fake.engine.refresh.mockResolvedValue(undefined);
  fake.engine.close.mockImplementation(async () => { state = { ...state, editor: null }; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('pianificazione conservativa dell’aggiunta', () => {
  it('usa la pagina corrente e non modifica il documento prima della conferma', () => {
    const base = layout([page('home'), page('second')]), before = JSON.stringify(base);
    expect(planWidgetAddition(base, ctx, seed, 'second')?.viewPageId).toBe('second');
    expect(JSON.stringify(base)).toBe(before);
  });
  it('a pari distanza sceglie in avanti, saltando pagine nascoste e speciali', () => {
    const base = layout([page('left'), page('special', { kind: 'casa3d' }), page('hidden', { hidden: true }), page('right')]);
    expect(planWidgetAddition(base, ctx, seed, 'special')?.viewPageId).toBe('right');
    const tied = layout([page('left'), page('special', { kind: 'casa3d' }), page('right')]);
    expect(planWidgetAddition(tied, ctx, seed, 'special')?.viewPageId).toBe('right');
  });
  it('casa piena e disposizione bloccata non creano nuove pagine', () => {
    const base = layout([page('home', { placements: { tablet: Object.fromEntries(Array.from({ length: 8 }, (_, n) => [`full-${n}`, { x: (n % 4) * 2, y: Math.floor(n / 4) * 2, w: 2, h: 2 }])) } })]), before = JSON.stringify(base);
    expect(planWidgetAddition(base, ctx, seed, 'home')).toBeNull();
    expect(planWidgetAddition({ ...layout(), locked: true }, ctx, seed, 'home')).toBeNull();
    expect(JSON.stringify(base)).toBe(before);
  });
  it('riconosce un ID già salvato su altra pagina prima di cercare un posto più vicino', () => {
    const base: LauncherLayout = { ...layout(), commonOrderVersion: 1, pages: [page('home', { order: [] }), page('other', { order: [seed.id] })] };
    const result = planWidgetAddition(base, ctx, seed, 'home')!;
    expect(result.viewPageId).toBe('other'); expect(result.layout).toBe(base);
    expect(result.layout.pages.flatMap(item => item.order ?? []).filter(id => id === seed.id)).toHaveLength(1);
  });
  it('usa il segmento visuale ma salva soltanto pagina e ordine logici', () => {
    const ids = Array.from({ length: 11 }, (_, n) => `existing-${n}`);
    const base: LauncherLayout = { ...layout(), commonOrderVersion: 1, pages: [page('home', { placements: {}, order: ids, sizeHints: Object.fromEntries(ids.map(id => [id, { w: 2, h: 2 }])) })] };
    const last = projectCommonOrder(base, ctx).pages.at(-1)!;
    expect(last.logicalPageId).toBe('home');
    const result = planWidgetAddition(base, ctx, seed, last.id)!;
    expect(result.logicalPageId).toBe('home'); expect(result.viewPageId).toBe(last.id);
    expect(result.layout.pages).toHaveLength(1); expect(result.layout.pages[0].order).toContain(seed.id);
  });
  it('rifiuta una posizione obsoleta e conserva le altre configurazioni nel batch', () => {
    const current = documentOf(), plan = planWidgetAddition(current.layout!, ctx, seed, 'home')!;
    const occupied = documentOf(layout([page('home', { placements: { tablet: { other: plan.rect } } })]));
    expect(() => applyWidgetAddition(occupied, ctx, seed, 'home', plan)).toThrow('La posizione è cambiata');
    current.customNames.original = 'Nome da conservare'; current.cardSettings.original = { icon: 'home' };
    const result = applyWidgetAddition(current, ctx, seed, 'home', plan);
    expect(result.customNames.original).toBe('Nome da conservare'); expect(result.cardSettings.original).toEqual({ icon: 'home' });
    expect(result.cardSettings[`home::${seed.id}`]).toEqual(seed.settings);
    expect(current.layout!.pages[0].placements.tablet).toEqual({});
  });
});

describe('conferma con riscontro autorevole', () => {
  it('scrive un solo update senza autosave e attende il riscontro del salvataggio', async () => {
    provider(); expect(fake.engine.begin).not.toHaveBeenCalled(); expect(fake.engine.update).not.toHaveBeenCalled();
    const ack = deferred<boolean>(); fake.engine.save.mockImplementation(async () => { const ok = await ack.promise; state = { ...state, profile: { ...state.profile!, configuration: state.editor!.working }, editor: null }; return ok; });
    let complete = false; const job = bridge().commitWidgetAddition!(add, seed.id).then(() => { complete = true; });
    await vi.waitFor(() => expect(fake.engine.save).toHaveBeenCalledOnce());
    expect(complete).toBe(false); expect(fake.engine.update).toHaveBeenCalledOnce();
    expect(fake.engine.update.mock.calls[0][1]).toEqual({ autosave: false });
    ack.resolve(true); await job; expect(complete).toBe(true); expect(pageWidgetIds(authoritative().pages[0])).toContain(seed.id);
  });
  it('una bozza offline non è conferma e Annulla scarta solo il proprio editor senza salvataggi futuri', async () => {
    provider(); fake.engine.save.mockImplementation(async () => { state = { ...state, offline: true }; return true; });
    await expect(bridge().commitWidgetAddition!(add, seed.id)).rejects.toThrow('Salvataggio non confermato');
    expect(fake.engine.update.mock.calls[0][1]).toEqual({ autosave: false });
    expect(await bridge().cancelWidgetAddition!(seed.id)).toBe('cancelled');
    expect(fake.engine.close).toHaveBeenCalledWith(true); expect(state.editor).toBeNull(); expect(fake.engine.save).toHaveBeenCalledOnce();
    expect(pageWidgetIds(authoritative().pages[0])).not.toContain(seed.id);
  });
  it('recupera una risposta persa mantenendo lo stesso intento senza secondo update', async () => {
    provider(); let attempts = 0;
    fake.engine.save.mockImplementation(async () => { attempts++; if (attempts === 1) { state = { ...state, offline: true, editor: { ...state.editor!, pendingOperation: { operationId: 'same-operation' } as NonNullable<LiveProfilesState['editor']>['pendingOperation'] } }; return false; }
      expect(state.editor!.pendingOperation?.operationId).toBe('same-operation'); state = { ...state, profile: { ...state.profile!, configuration: state.editor!.working }, editor: null }; return true; });
    fake.engine.refresh.mockImplementation(async () => { state = { ...state, offline: false }; });
    await expect(bridge().commitWidgetAddition!(add, seed.id)).rejects.toThrow(); await bridge().commitWidgetAddition!(add, seed.id);
    expect(fake.engine.begin).toHaveBeenCalledOnce(); expect(fake.engine.update).toHaveBeenCalledOnce(); expect(fake.engine.save).toHaveBeenCalledTimes(2);
    expect(authoritative().pages.flatMap(item => pageWidgetIds(item)).filter(id => id === seed.id)).toHaveLength(1);
  });
  it('non dichiara annullato un intento dal risultato ancora ignoto', async () => {
    provider(); fake.engine.save.mockImplementation(async () => { state = { ...state, editor: { ...state.editor!, pendingOperation: { operationId: 'unknown' } as NonNullable<LiveProfilesState['editor']>['pendingOperation'] } }; return false; });
    await expect(bridge().commitWidgetAddition!(add, seed.id)).rejects.toThrow();
    await expect(bridge().cancelWidgetAddition!(seed.id)).rejects.toThrow('Esito da verificare'); expect(fake.engine.close).not.toHaveBeenCalled();
  });
  it('non modifica altri editor o un profilo revocato durante l’acquisizione', async () => {
    provider(); state = { ...state, editor: { id: 'other', base: state.profile!, working: state.profile!.configuration } as LiveProfilesState['editor'] };
    await expect(bridge().commitWidgetAddition!(add, seed.id)).rejects.toThrow('Completa la modifica'); expect(fake.engine.update).not.toHaveBeenCalled();
    state = { ...state, editor: null }; fake.engine.begin.mockImplementation(async () => { state = { ...state, usageStatus: 'blocked', editor: { id: 'own-editor', base: state.profile!, working: state.profile!.configuration } as LiveProfilesState['editor'] }; });
    await expect(bridge().commitWidgetAddition!(add, seed.id)).rejects.toThrow('Profilo non disponibile'); expect(fake.engine.save).not.toHaveBeenCalled();
  });
});

it('coalesca la doppia conferma e attende l’unico batch con ID stabile', async () => {
  const ack = deferred<void>(), current = documentOf();
  const writer = vi.fn(async (apply: (value: WidgetState) => WidgetState, _id: string) => { apply(current); await ack.promise; });
  const store: LauncherStore = { ready: true, layout: current.layout, pagesConfig: current.pagesConfig!, cardSettings: {}, pageSettings: {}, persistLayout: vi.fn(), persistPagesConfig: vi.fn(), persistCardSettings: vi.fn(), persistPageSettings: vi.fn(), commitWidgetAddition: writer };
  const hook = renderHook(() => useLauncherController({ store, deviceClass: 'tablet', resolveSizes: () => sizes }));
  const planned = hook.result.current.planWidgetAddition!(seed, 'home')!;
  const first = hook.result.current.confirmWidgetAddition!(seed, 'home', planned), second = hook.result.current.confirmWidgetAddition!(seed, 'home', planned);
  expect(writer).toHaveBeenCalledOnce(); expect(store.persistLayout).not.toHaveBeenCalled();
  ack.resolve(); const [a, b] = await Promise.all([first, second]); expect(a).toEqual(b); expect(writer.mock.calls[0][1]).toBe(seed.id);
});

describe('anteprima di posizionamento', () => {
  it.each([false, true])('la griglia fuori schermo=%s non abilita un fantasma tagliato', (offscreen) => {
    const root = document.createElement('div'); root.dataset.launcherPage = 'home';
    root.innerHTML = '<div class="aca-launcher-grid" data-layout-ready="true" style="--aca-cell:60px;--aca-gap-x:10px;--aca-gap-y:10px"></div>';
    document.body.append(root);
    const grid = root.firstElementChild as HTMLElement;
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({ x: offscreen ? -500 : 0, y: 0, left: offscreen ? -500 : 0, top: 0, width: 600, height: 400, right: 600, bottom: 400, toJSON: () => ({}) });
    render(<PendingWidgetPlacement item={ADD_WIDGET_TYPES[0]} plan={planWidgetAddition(layout(), ctx, seed, 'home')} busy={false} error="" onConfirm={vi.fn()} onCancel={vi.fn()} onRetry={vi.fn()} />);
    if (offscreen) { expect(screen.getByRole('button', { name: 'Conferma' })).toBeDisabled(); expect(document.querySelector('[data-safe-preview]')).toBeNull(); }
    else { expect(screen.getByRole('button', { name: 'Conferma' })).toBeEnabled(); expect(document.querySelector('[data-pending-widget-preview]')).toHaveAttribute('inert'); expect(document.querySelector('[data-safe-preview]')).not.toBeNull(); }
    cleanup(); root.remove();
  });
  it('sposta il dock sul bordo superiore quando coprirebbe il widget nell’ultima riga', () => {
    const root = document.createElement('div'); root.dataset.launcherPage = 'home';
    root.innerHTML = '<div class="aca-launcher-grid" data-layout-ready="true" style="--aca-cell:60px;--aca-gap-x:10px;--aca-gap-y:10px"></div>';
    document.body.append(root);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const dock = this.hasAttribute('data-pending-widget-actions'), top = dock ? window.innerHeight - 116 : window.innerHeight - 150;
      return { x: 0, y: top, left: 0, top, width: 600, height: dock ? 100 : 400, right: 600, bottom: top + 100, toJSON: () => ({}) };
    });
    render(<PendingWidgetPlacement item={ADD_WIDGET_TYPES[0]} plan={planWidgetAddition(layout(), ctx, seed, 'home')} busy={false} error="" onConfirm={vi.fn()} onCancel={vi.fn()} onRetry={vi.fn()} />);
    expect((document.querySelector('[data-pending-widget-actions]') as HTMLElement).style.top).not.toBe('');
    expect(screen.getByRole('button', { name: 'Conferma' })).toBeEnabled(); cleanup(); root.remove();
  });
});
