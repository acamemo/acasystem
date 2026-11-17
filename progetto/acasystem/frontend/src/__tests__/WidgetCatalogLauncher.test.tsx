import { useMemo } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LauncherLayout } from '@/@types/launcher';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { useLauncherController, type LauncherController } from '@/hooks/launcher/useLauncherController';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';

const live = vi.hoisted(() => ({ usage: 'active', busy: null as { current: boolean } | null }));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({
  useOptionalLiveProfiles: () => ({ state: { usageStatus: live.usage, profile: null, leases: [] }, coordinator: { begin: async () => undefined } }),
}));
vi.mock('@/templates/launcher/Pager', async (load) => {
  const real = await load<typeof import('@/templates/launcher/Pager')>();
  return { ...real, Pager: (props: import('@/templates/launcher/Pager').PagerProps) => {
    live.busy = props.busyRef ?? null;
    return <real.Pager {...props} />;
  } };
});

let latest: LauncherController | null = null;
const initial: LauncherLayout = { version: 1, cover: { enabled: false },
  pages: [{ id: 'home', label: 'Casa', kind: 'widgets', placements: { tablet: {} } }] };

function Screen({ visible = true }: { visible?: boolean }) {
  const pages = usePages();
  const store = useMemo(() => ({ ready: pages.settingsLoaded, layout: pages.launcherLayout,
    persistLayout: pages.persistLauncherLayout, pagesConfig: pages.pagesConfig, pageSettings: pages.pageSettings,
    cardSettings: pages.cardSettings, persistPagesConfig: pages.persistConfig,
    commitWidgetAddition: pages.commitWidgetAddition, persistPageSettings: pages.persistPageSettings, persistCardSettings: pages.persistCardSettings }), [pages]);
  const controller = useLauncherController({ store, deviceClass: 'tablet', resolveSizes: () => ({
    min: { w: 1, h: 1 }, default: { w: 2, h: 2 }, max: { w: 4, h: 4 },
  }) });
  latest = controller;
  const runtime = useMemo(() => createFixtureRuntime({ services: {} }), []);
  return <PageVisibilityContext.Provider value={visible}>
    <LauncherScreen controller={controller} runtime={runtime} connection={{ phase: 'connected', label: 'Connesso' }}
      onOpenSystem={() => undefined} detailsWidgetId={null} onCloseDetails={() => undefined} />
  </PageVisibilityContext.Provider>;
}
const app = (visible = true) => <ToastProvider><PageProvider><Screen visible={visible} /></PageProvider></ToastProvider>;
const scrollHome = (container: HTMLElement) => fireEvent.wheel(container.querySelector('.aca-shell__main')!, { deltaY: 80, deltaX: 0 });
const ready = async () => {
  await waitFor(() => { expect(latest?.ready).toBe(true); expect(live.busy?.current).toBe(false); });
  await waitFor(() => {
    const current = document.querySelector('.aca-widget-catalog__page:not([inert])');
    expect(current).not.toBeNull();
    expect(current?.querySelector('.aca-adaptive-widget')).not.toBeNull();
    expect(current?.querySelector('.aca-widget-catalog-preview__placeholder')).toBeNull();
    expect(document.querySelector('.aca-widget-catalog')).toHaveAttribute('aria-busy', 'false');
  }, { timeout: 5000 });
};

beforeEach(() => {
  localStorage.clear(); live.usage = 'active'; live.busy = null; latest = null;
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(initial));
  vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = this.matches('.aca-launcher-page, .aca-launcher-grid, .aca-widget-catalog__pages, .aca-bottom-drawer') ? 973 : 0;
    const height = this.classList.contains('aca-bottom-drawer') ? 600
      : this.classList.contains('aca-widget-catalog__pages') ? 540 : this.matches('.aca-launcher-page, .aca-launcher-grid') ? 430 : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height, toJSON: () => ({}) };
  });
  const width = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!.get!;
  const height = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!.get!;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('aca-widget-catalog-preview') ? 230 : width.call(this);
  });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('aca-widget-catalog-preview') ? parseFloat(this.style.height) || 172 : height.call(this);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.documentElement.style.overflow = ''; });

describe('Home widget catalog ownership', () => {
  it('reveals the prepared catalog before mouse release and completes autonomously without changing Home', async () => {
    const view = render(app()); await ready();
    const main = view.container.querySelector('.aca-shell__main')!;
    const before = JSON.stringify(latest?.layout);
    const page = latest?.currentPage;
    vi.mocked(window.history.pushState).mockClear();
    fireEvent.pointerDown(main, { pointerId: 31, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 300, clientY: 400 });
    fireEvent.pointerMove(document, { pointerId: 31, pointerType: 'mouse', isPrimary: true, buttons: 1, clientX: 300, clientY: 340 });
    const panel = document.querySelector<HTMLElement>('.aca-bottom-drawer')!;
    expect(await screen.findByRole('dialog', { name: 'Aggiungi un widget' })).toBeInTheDocument();
    expect(panel.style.transform).toBe('');
    expect(view.container.querySelector('.aca-widget-scene')).toHaveAttribute('data-widget-screen', 'open');
    expect(view.container.querySelector('.aca-widget-scene')).not.toHaveAttribute('data-catalog-gesture');
    expect(window.history.pushState).toHaveBeenCalledOnce();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 320)); });
    expect(panel.style.transform).toBe('');
    expect(screen.getByRole('dialog')).toBeInTheDocument(); expect(window.history.pushState).toHaveBeenCalledOnce();
    fireEvent.pointerUp(document, { pointerId: 31, pointerType: 'mouse', isPrimary: true, clientX: 300, clientY: 340 });
    expect(await screen.findByRole('dialog', { name: 'Aggiungi un widget' })).toBeInTheDocument();
    expect(window.history.pushState).toHaveBeenCalledOnce();
    expect(latest?.currentPage).toBe(page); expect(JSON.stringify(latest?.layout)).toBe(before);
    expect(latest?.editMode).toBe(false);
  });

  it('cancels a short intent before reveal without a layout or history mutation', async () => {
    const view = render(app()); await ready();
    const main = view.container.querySelector('.aca-shell__main')!, before = JSON.stringify(latest?.layout);
    vi.mocked(window.history.pushState).mockClear();
    fireEvent.pointerDown(main, { pointerId: 32, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 300, clientY: 400 });
    fireEvent.pointerMove(document, { pointerId: 32, pointerType: 'mouse', isPrimary: true, buttons: 1, clientX: 300, clientY: 390 });
    expect(document.querySelector<HTMLElement>('.aca-bottom-drawer')?.style.transform).toBe('translateY(100%)');
    fireEvent.pointerCancel(document, { pointerId: 32, pointerType: 'mouse', isPrimary: true, clientX: 300, clientY: 390 });
    await waitFor(() => expect(view.container.querySelector('.aca-widget-scene')).not.toHaveAttribute('data-catalog-gesture'));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(window.history.pushState).not.toHaveBeenCalled();
    expect(JSON.stringify(latest?.layout)).toBe(before); expect(latest?.editMode).toBe(false);
  });

  it('cancels the Home long press at vertical intent before the catalog threshold', async () => {
    const view = render(app()); await ready();
    const target = view.container.querySelector('[data-launcher-cell]')!;
    expect(target).not.toBeNull();
    fireEvent.pointerDown(target, { pointerId: 33, pointerType: 'touch', isPrimary: true, button: 0, clientX: 100, clientY: 400 });
    fireEvent.pointerMove(document, { pointerId: 33, pointerType: 'touch', isPrimary: true, buttons: 1, clientX: 100, clientY: 390 });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 650)); });
    expect(latest?.editMode).toBe(false); expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.pointerMove(document, { pointerId: 33, pointerType: 'touch', isPrimary: true, buttons: 1, clientX: 100, clientY: 340 });
    expect(await screen.findByRole('dialog', { name: 'Aggiungi un widget' })).toBeInTheDocument();
    fireEvent.pointerUp(document, { pointerId: 33, pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 340 });
    expect(latest?.editMode).toBe(false);
  });

  it('retains the immediate keyboard alternative independently of the direct manipulation release', async () => {
    render(app()); await ready();
    const before = JSON.stringify(latest?.layout);
    fireEvent.keyDown(document.body, { key: 'PageDown' });
    expect(await screen.findByRole('dialog', { name: 'Aggiungi un widget' })).toBeInTheDocument();
    expect(JSON.stringify(latest?.layout)).toBe(before);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opens by scrolling normal Home without a button, slot, added widget or edit-mode change', async () => {
    const view = render(app()); await ready();
    expect(screen.queryByRole('button', { name: 'Widget' })).toBeNull();
    expect(document.querySelector('.aca-widget-catalog-slot')).toBeNull();
    const before = JSON.stringify(latest?.layout);
    scrollHome(view.container);
    const catalog = await screen.findByRole('dialog', { name: 'Aggiungi un widget' }, { timeout: 5000 });
    expect(catalog).toBeInTheDocument(); expect(catalog.querySelector('.aca-bottom-drawer__header')).toBeNull();
    expect(screen.getByRole('button', { name: 'Trova dispositivi' })).toBeInTheDocument();
    expect(view.container.querySelector('.aca-widget-scene')).toHaveAttribute('data-widget-screen', 'open');
    expect(JSON.stringify(latest?.layout)).toBe(before);
    expect(latest?.editMode).toBe(false);
  });

  it('does not open on covered Home and closes an open catalog when another route covers it', async () => {
    const view = render(app(false)); await ready();
    scrollHome(view.container); expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(app()); scrollHome(view.container);
    await screen.findByRole('dialog', { name: 'Aggiungi un widget' });
    view.rerender(app(false));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull());
    expect(document.querySelector('.aca-widget-catalog-slot')).toBeNull();
  });

  it('closes and refuses scroll when the owner loses confirmed profile usage', async () => {
    const view = render(app()); await ready(); scrollHome(view.container);
    await screen.findByRole('dialog', { name: 'Aggiungi un widget' });
    live.usage = 'blocked'; view.rerender(app());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull());
    scrollHome(view.container); expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('preserves the existing locked-page refusal through the scroll entry point', async () => {
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify({ ...initial, locked: true }));
    const view = render(app()); await ready(); scrollHome(view.container);
    expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull();
    expect(latest?.layout.locked).toBe(true);
    expect(latest?.layout.pages[0].placements.tablet).toEqual({});
  });

  it('reads the live pager-busy ref again when a fling starts without a Home render', async () => {
    const view = render(app()); await ready();
    live.busy!.current = true;
    scrollHome(view.container);
    expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull();
    expect(view.container.querySelector('.aca-widget-scene')).toHaveAttribute('data-widget-screen', 'closed');
  });
  it.each(['cover', 'casa3d'] as const)('opens on %s and returns to that same page without writing a layout', async (kind) => {
    const layout: LauncherLayout = { ...initial, cover: { enabled: true }, pages: [...initial.pages,
      { id: 'house', label: 'Casa 3D', kind: 'casa3d', placements: { tablet: {} } }] };
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    const view = render(app()); await ready();
    const pageId = kind === 'cover' ? 'cover' : 'house';
    act(() => latest?.goToPageId(pageId)); await ready();
    const before = JSON.stringify(latest?.layout);
    const selected = () => view.container.querySelector('.aca-pager__page.is-current')?.getAttribute('data-page-key');
    const original = selected();
    scrollHome(view.container);
    await screen.findByRole('dialog', { name: 'Aggiungi un widget' });
    expect(JSON.stringify(latest?.layout)).toBe(before);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull());
    expect(selected()).toBe(original);
    expect(latest?.currentPage).toBe(latest?.entries.findIndex((entry) => entry.key === pageId));
    expect(JSON.stringify(latest?.layout)).toBe(before);
  });

  it('adds from a special page only to the existing visible base grid, never to a special or hidden page', async () => {
    const layout: LauncherLayout = { ...initial, homePageId: 'home', pages: [
      { ...initial.pages[0], hidden: true },
      { id: 'receiver', label: 'Principale visibile', kind: 'widgets', placements: { tablet: {} } },
      { id: 'house', label: 'Casa 3D', kind: 'casa3d', placements: { tablet: {} } },
    ] };
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    const view = render(app()); await ready(); act(() => latest?.goToPageId('house')); await ready();
    scrollHome(view.container); await screen.findByRole('dialog', { name: 'Aggiungi un widget' });
    const tile = document.querySelector<HTMLElement>('button[data-widget-type="tavano"]')!;
    const targetPage = Number(tile.closest<HTMLElement>('[data-catalog-page]')?.dataset.catalogPage);
    for (let current = 0; current < targetPage; current++) fireEvent.keyDown(screen.getByLabelText('Pagine del catalogo'), { key: 'ArrowRight' });
    fireEvent.click(tile);
    await screen.findByRole('dialog', { name: 'Tavano' });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi alla Home' }));
    const add = await screen.findByRole('button', { name: 'Conferma' }, { timeout: 5000 });
    expect(screen.getByRole('dialog', { name: 'Aggiungi Tavano' })).toBeInTheDocument();
    expect(Object.keys(latest!.layout.pages.find((page) => page.id === 'receiver')!.placements.tablet!)).toHaveLength(0);
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    await waitFor(() => expect(Object.keys(latest!.layout.pages.find((page) => page.id === 'receiver')!.placements.tablet!)).toHaveLength(1));
    expect(latest!.layout.pages.find((page) => page.id === 'house')!.placements.tablet).toEqual({});
    expect(latest!.layout.pages.find((page) => page.id === 'home')!.placements.tablet).toEqual({});
  });

  it.each(['light', 'plug', 'fan'])('tapping %s creates only an inert preview until Confirm and Cancel writes nothing', async (type) => {
    const view = render(app()); await ready(); const before = JSON.stringify(latest?.layout);
    scrollHome(view.container); await screen.findByRole('dialog', { name: 'Aggiungi un widget' });
    const tile = document.querySelector<HTMLElement>(`button[data-widget-type="${type}"]`)!;
    const targetPage = Number(tile.closest<HTMLElement>('[data-catalog-page]')?.dataset.catalogPage);
    for (let current = 0; current < targetPage; current++) fireEvent.keyDown(screen.getByLabelText('Pagine del catalogo'), { key: 'ArrowRight' });
    fireEvent.click(tile);
    const confirm = await screen.findByRole('button', { name: 'Conferma' }, { timeout: 5000 });
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(document.querySelector('[data-pending-widget-preview]')).toHaveAttribute('inert');
    expect(JSON.stringify(latest?.layout)).toBe(before); expect(latest?.editMode).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Conferma' })).toBeNull());
    expect(JSON.stringify(latest?.layout)).toBe(before);
  });

  it.each([{ type: 'rileva', title: 'Trova dispositivi' }, { type: 'tavano', title: 'Tavano' }])('opens $title directly without creating a utility widget', async ({ type, title }) => {
    const view = render(app()); await ready(); const before = JSON.stringify(latest?.layout);
    scrollHome(view.container); await screen.findByRole('dialog', { name: 'Aggiungi un widget' });
    fireEvent.click(document.querySelector<HTMLElement>(`button[data-widget-type="${type}"]`)!);
    await screen.findByRole('dialog', { name: title });
    expect(screen.queryByRole('button', { name: 'Conferma' })).toBeNull();
    expect(JSON.stringify(latest?.layout)).toBe(before);
    expect(screen.getByRole('button', { name: 'Aggiungi alla Home' })).toBeInTheDocument();
  });

  it('discards an unconfirmed preview when the confirmed profile usage is lost', async () => {
    const view = render(app()); await ready(); const before = JSON.stringify(latest?.layout);
    scrollHome(view.container); await screen.findByRole('dialog', { name: 'Aggiungi un widget' });
    fireEvent.click(document.querySelector<HTMLElement>('button[data-widget-type="light"]')!);
    await screen.findByRole('button', { name: 'Conferma' }, { timeout: 5000 });
    live.usage = 'blocked'; view.rerender(app());
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Conferma' })).toBeNull());
    expect(JSON.stringify(latest?.layout)).toBe(before);
  });

});
