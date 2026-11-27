import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADD_WIDGET_TYPES } from '@/domain/launcher/catalog';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetCatalogPreview } from '@/templates/sheets/WidgetCatalogPreview';
import { catalogPreviewRuntime, catalogPreviewExamples } from '@/templates/sheets/widgetCatalogPreviewData';
const suspendedPreview = vi.hoisted(() => ({ promise: null as Promise<void> | null }));
vi.mock('@/components/widgets/adaptive/AdaptiveCategoryWidget', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/widgets/adaptive/AdaptiveCategoryWidget')>();
  return { ...actual, AdaptiveCategoryWidget: (props: Parameters<typeof actual.AdaptiveCategoryWidget>[0]) => {
    if (suspendedPreview.promise) throw suspendedPreview.promise;
    return <actual.AdaptiveCategoryWidget {...props} />;
  } };
});
let previewCSS = '';
beforeAll(async () => {
  await import('@/components/widgets/adaptive/AdaptiveCategoryWidget');
  const specifier = 'node:fs';
  const fs = await import(/* @vite-ignore */ specifier) as { readFileSync: (path: string, encoding: 'utf8') => string };
  previewCSS = fs.readFileSync('src/templates/sheets/widgetCatalogPreview.css', 'utf8');
});

class VisibilityObserver {
  static instances: VisibilityObserver[] = [];
  target: Element | null = null;
  readonly disconnect = vi.fn();
  constructor(private readonly callback: IntersectionObserverCallback) { VisibilityObserver.instances.push(this); }
  observe = (target: Element) => { this.target = target; };
  show() { this.callback([{ isIntersecting: true, target: this.target } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
}
class SizeObserver {
  static instances: SizeObserver[] = [];
  target: Element | null = null;
  readonly disconnect = vi.fn();
  constructor(private readonly callback: ResizeObserverCallback) { SizeObserver.instances.push(this); }
  observe = (target: Element) => { this.target = target; };
  resize() { this.callback([], this as unknown as ResizeObserver); }
}
let widths: WeakMap<Element, number>;
let heights: WeakMap<Element, number>;
let style: HTMLStyleElement;
const item = (type: string) => ADD_WIDGET_TYPES.find((entry) => entry.type === type)!;
const reveal = () => act(() => VisibilityObserver.instances.forEach((observer) => observer.show()));
async function adaptiveReady(container: HTMLElement, count = 1) {
  await act(async () => { await vi.dynamicImportSettled(); });
  await waitFor(() => expect(container.querySelectorAll('.aca-adaptive-widget, .aca-cell-tile, .aca-adaptive-spacer, .product-plug, .product-climate, .product-cover, .product-mower, .product-vacuum, .product-camera, .product-alarm, .product-lock, .product-fan, .product-tv, .product-media, .product-sensor, .energy-widget')).toHaveLength(count));
}

beforeEach(() => {
  suspendedPreview.promise = null;
  VisibilityObserver.instances = [];
  SizeObserver.instances = [];
  widths = new WeakMap();
  heights = new WeakMap();
  vi.stubGlobal('IntersectionObserver', VisibilityObserver);
  vi.stubGlobal('ResizeObserver', SizeObserver);
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    return widths.get(this) ?? (this.classList.contains('aca-widget-catalog-preview') ? 320 : 0);
  });
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function (this: Element) {
    return heights.get(this) ?? (this.classList.contains('aca-widget-catalog-preview')
      ? ((this as HTMLElement).style.height ? parseFloat((this as HTMLElement).style.height) : 240) : 0);
  });
  style = document.createElement('style'); style.textContent = previewCSS; document.head.append(style);
});
afterEach(() => { suspendedPreview.promise = null; cleanup(); style.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('isolated widget catalogue previews', () => {
  it('keeps an offscreen card unmounted until its first visibility and disconnects its observer', async () => {
    const view = render(<WidgetCatalogPreview item={item('light')} />);
    expect(view.container.querySelector('.aca-adaptive-widget, .aca-cell-tile')).toBeNull();
    expect(view.container.querySelector('.aca-widget-catalog-preview__placeholder')).toBeVisible();
    const observer = VisibilityObserver.instances[0]!;
    expect(observer.target).toBe(view.container.querySelector('.aca-widget-catalog-preview'));
    act(() => observer.show());
    await adaptiveReady(view.container);
    expect(view.container.querySelector('.aca-widget-catalog-preview__placeholder')).toBeNull();
    expect(observer.disconnect).toHaveBeenCalled();
    expect(view.container.textContent).toContain('Luce soggiorno');
    expect(view.container.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(view.container.textContent).not.toContain('Dispositivo non disponibile');
    view.unmount();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('is decorative and inert while the parent alone owns accessible selection', async () => {
    const view = render(<><WidgetCatalogPreview item={item('fan')} /><button>Aggiungi ventilatore</button></>);
    reveal(); await adaptiveReady(view.container);
    const preview = view.container.querySelector('.aca-widget-catalog-preview');
    expect(preview).toHaveAttribute('aria-hidden', 'true');
    expect(preview).toHaveAttribute('inert');
    expect(screen.getAllByRole('button')).toEqual([screen.getByRole('button', { name: 'Aggiungi ventilatore' })]);
  });

  it('does not inherit entities, services, settings or callbacks from the current account', async () => {
    const callService = vi.fn(), sendMessagePromise = vi.fn(), getEntityImageUrl = vi.fn(), saveCardSetting = vi.fn(), openDetails = vi.fn();
    const hostile = { ...catalogPreviewRuntime, entities: {
      'light.catalogue': { ...catalogPreviewRuntime.entities['light.catalogue']!, attributes: { friendly_name: 'PRIVATE ACCOUNT ENTITY' } },
    }, conn: { sendMessagePromise } as never, callService, getEntityImageUrl, saveCardSetting, openDetails,
    cardSettings: { 'catalogue-light': { heading: 'PRIVATE PROFILE' } }, customNames: { 'light.catalogue': 'PRIVATE NAME' } };
    const view = render(<WidgetRuntimeProvider value={hostile}><WidgetCatalogPreview item={item('light')} /></WidgetRuntimeProvider>);
    reveal(); await adaptiveReady(view.container);
    expect(view.container.textContent).toContain('Luce soggiorno');
    expect(view.container.textContent).not.toMatch(/PRIVATE/);
    for (const callback of [callService, sendMessagePromise, getEntityImageUrl, saveCardSetting, openDetails]) expect(callback).not.toHaveBeenCalled();
  });

  it('renders the entire catalogue without network, media, commands, writes or activity events', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('Preview must not fetch'));
    const socket = vi.fn(function () { throw new Error('Preview must not open a socket'); });
    vi.stubGlobal('fetch', fetch); vi.stubGlobal('WebSocket', socket);
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const callService = vi.spyOn(catalogPreviewRuntime, 'callService');
    const save = vi.spyOn(catalogPreviewRuntime, 'saveCardSetting');
    const open = vi.spyOn(catalogPreviewRuntime, 'openDetails');
    const image = vi.spyOn(catalogPreviewRuntime, 'getEntityImageUrl');
    const activity = vi.fn(); window.addEventListener('acasystem:activity-changed', activity);
    const view = render(<>{ADD_WIDGET_TYPES.map((entry) => <WidgetCatalogPreview key={entry.type} item={entry} eager />)}</>);
    reveal(); await adaptiveReady(view.container, Object.keys(catalogPreviewExamples).length);
    await act(async () => { await Promise.resolve(); });
    expect(view.container.querySelectorAll('.aca-widget-catalog-preview')).toHaveLength(ADD_WIDGET_TYPES.length);
    expect(view.container.textContent).not.toMatch(/Dispositivo non disponibile|Non riesco|Caricamento/);
    expect(view.container.querySelectorAll('img, video, audio, iframe')).toHaveLength(0);
    expect(view.container.querySelectorAll('.uikwa-chart')).toHaveLength(0);
    for (const status of view.container.querySelectorAll<HTMLElement>('.aca-adaptive-widget__controls-wrap > [role="status"]')) {
      expect(status).not.toBeVisible();
    }
    for (const button of view.container.querySelectorAll('button')) fireEvent.click(button);
    for (const callback of [fetch, socket, storage, callService, save, open, image, activity]) expect(callback).not.toHaveBeenCalled();
    window.removeEventListener('acasystem:activity-changed', activity);
  });

  it('uses static utility examples instead of mounting their backend-connected widgets', () => {
    const view = render(<>{['tavano', 'rileva', 'zigbee', 'camera', 'todo'].map((type) => <WidgetCatalogPreview key={type} item={item(type)} />)}</>);
    reveal();
    expect(view.container.textContent).toContain('Configurazione salvata');
    expect(view.container.textContent).toContain('Comando accettato');
    expect(view.container.textContent).toContain('Profilo aggiornato');
    expect(view.container.querySelectorAll('.aca-widget-catalog-preview__avatar')).toHaveLength(3);
    expect(view.container.querySelectorAll('.aca-widget-catalog-preview__task [data-icon="done"]')).toHaveLength(1);
    expect(view.container.textContent).toContain('12 dispositivi collegati');
    expect(view.container.querySelectorAll('img, video, canvas')).toHaveLength(0);
  });

  it('disconnects a never-visible card when the catalogue closes', () => {
    const view = render(<WidgetCatalogPreview item={item('light')} />);
    const observer = VisibilityObserver.instances[0]!;
    view.unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it('retains a usable demonstration when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const view = render(<WidgetCatalogPreview item={item('cover')} />);
    await adaptiveReady(view.container);
    expect(view.container.textContent).toContain('Tapparella');
    expect(view.container.querySelector('.aca-widget-catalog-preview')).toHaveAttribute('inert');
  });

  it('scales the entire fixed-size widget canvas to its frame instead of clipping its controls', async () => {
    const view = render(<WidgetCatalogPreview item={item('light')} />);
    const frame = view.container.querySelector('.aca-widget-catalog-preview')!;
    widths.set(frame, 240);
    reveal(); await adaptiveReady(view.container);
    const canvas = view.container.querySelector('[data-preview-canvas]');
    expect(canvas).toHaveStyle({ width: '320px', height: '240px', transform: 'scale(0.75)' });
    const face = view.container.querySelector('.aca-widget-catalog-preview__surface > .aca-m__outer > .aca-m__face')!;
    expect(getComputedStyle(face).height).toBe('100%');
    expect(getComputedStyle(view.container.querySelector('.aca-widget-catalog-preview__content')!).overflow).not.toBe('hidden');
    widths.set(frame, 160);
    act(() => SizeObserver.instances.find((observer) => observer.target === frame)!.resize());
    expect(canvas).toHaveStyle({ transform: 'scale(0.5)' });
  });

  it('contains and centers the complete canvas in short page slots using both available dimensions', async () => {
    const view = render(<WidgetCatalogPreview item={item('light')} height={84} />);
    const frame = view.container.querySelector<HTMLElement>('.aca-widget-catalog-preview')!;
    reveal(); await adaptiveReady(view.container);
    const canvas = view.container.querySelector<HTMLElement>('[data-preview-canvas]')!;
    expect(frame).toHaveStyle({ height: '84px' });
    expect(canvas).toHaveStyle({ transform: 'scale(0.35)', marginLeft: '-160px', marginTop: '-120px' });
    expect(getComputedStyle(canvas).inset).toBe('50% auto auto 50%');

    widths.set(frame, 120);
    view.rerender(<WidgetCatalogPreview item={item('light')} height={140} />);
    expect(canvas).toHaveStyle({ transform: 'scale(0.375)' });
    expect(view.container.querySelector('.aca-widget-catalog-preview')).toBe(frame);

    heights.set(frame, 0);
    act(() => SizeObserver.instances.find((observer) => observer.target === frame)!.resize());
    expect(canvas).toHaveStyle({ visibility: 'hidden' });
    expect(view.container.querySelector('.aca-widget-catalog-preview__placeholder')).toBeVisible();
  });

  it('prepares an eager demonstration offscreen without waiting for IntersectionObserver', async () => {
    const ready = vi.fn();
    const view = render(<WidgetCatalogPreview item={item('light')} eager onReady={ready} />);
    expect(VisibilityObserver.instances).toHaveLength(0);
    await adaptiveReady(view.container);
    expect(ready).toHaveBeenLastCalledWith(true);
    expect(view.container.querySelector('.aca-widget-catalog-preview')).toHaveAttribute('inert');
    view.unmount();
    expect(ready).toHaveBeenLastCalledWith(false);
  });

  it('withholds readiness for zero geometry and revokes it when a prepared frame collapses', () => {
    const ready = vi.fn();
    const view = render(<WidgetCatalogPreview item={item('tavano')} height={0} eager onReady={ready} />);
    expect(ready).not.toHaveBeenCalledWith(true);
    const frame = view.container.querySelector('.aca-widget-catalog-preview')!;
    view.rerender(<WidgetCatalogPreview item={item('tavano')} height={120} eager onReady={ready} />);
    expect(ready).toHaveBeenLastCalledWith(true);
    heights.set(frame, 0);
    act(() => SizeObserver.instances.find((observer) => observer.target === frame && !observer.disconnect.mock.calls.length)!.resize());
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(view.container.querySelector('[data-preview-canvas]')).toHaveStyle({ visibility: 'hidden' });
    heights.set(frame, 120);
    act(() => SizeObserver.instances.find((observer) => observer.target === frame && !observer.disconnect.mock.calls.length)!.resize());
    expect(ready).toHaveBeenLastCalledWith(true);
  });

  it('does not accept the Suspense icon as a ready widget and waits for actual content commit', async () => {
    let release!: () => void;
    suspendedPreview.promise = new Promise<void>((resolve) => { release = resolve; });
    const ready = vi.fn();
    const view = render(<WidgetCatalogPreview item={item('fan')} eager onReady={ready} />);
    await act(async () => { await vi.dynamicImportSettled(); });
    expect(view.container.querySelector('.aca-adaptive-widget, .aca-cell-tile')).toBeNull();
    expect(ready).not.toHaveBeenCalledWith(true);
    await act(async () => { suspendedPreview.promise = null; release(); });
    await adaptiveReady(view.container);
    expect(view.container.textContent).toContain('Ventilatore');
    expect(ready).toHaveBeenLastCalledWith(true);
  });

});
