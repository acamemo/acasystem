import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADD_WIDGET_TYPES } from '@/domain/launcher/catalog';
import { WidgetCatalogPager } from '@/templates/sheets/WidgetCatalogPager';

let width = 1200, height = 680, caption = 72;
const observers: { callback: ResizeObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = [];
const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');

function catalog(anchor?: string) {
  return <><button>Controllo esterno</button><WidgetCatalogPager items={ADD_WIDGET_TYPES} initialAnchorType={anchor}
    renderTile={(item, previewHeight, previewReady) => <article key={item.type}>
      {previewReady && <div data-preview-height={previewHeight} data-preview-type={item.type} />}
      <button data-widget-type={item.type}><span className="aca-catalog-type__caption">{item.label}</span></button>
    </article>} /></>;
}
const region = () => screen.getByRole('group', { name: 'Tipi di widget' });
const current = () => document.querySelector<HTMLElement>('[data-catalog-page]:not([inert])')!;
const resize = () => act(() => observers.forEach((observer) => observer.callback([], {} as ResizeObserver)));

beforeEach(() => {
  width = 1200; height = 680; caption = 72; observers.length = 0;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const w = this.classList.contains('aca-widget-catalog__pages') ? width : 0;
    const h = this.classList.contains('aca-widget-catalog__pages') ? height
      : this.classList.contains('aca-catalog-type__caption') ? caption : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({}) };
  });
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    return this.classList.contains('aca-widget-catalog__pages') ? width : 0;
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: function (this: HTMLElement, options: ScrollToOptions) {
    this.scrollLeft = options.left ?? 0;
  } });
  vi.stubGlobal('ResizeObserver', class {
    disconnect = vi.fn(); observe = vi.fn(); unobserve = vi.fn();
    constructor(callback: ResizeObserverCallback) { observers.push({ callback, disconnect: this.disconnect }); }
  });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
});

describe('Horizontal widget catalog', () => {
  it.each([
    { w: 1800, h: 720, c: 72, columns: 4, rows: 2 },
    { w: 350, h: 620, c: 88, columns: 2, rows: 2 },
    { w: 280, h: 300, c: 104, columns: 2, rows: 1 },
  ])('fits whole-card pages at $w×$h without using a vertical type list', ({ w, h, c, columns, rows }) => {
    width = w; height = h; caption = c; render(catalog());
    expect(region()).toHaveAttribute('data-columns', String(columns));
    expect(region()).toHaveAttribute('data-rows', String(rows));
    expect(current().querySelectorAll('[data-widget-type]').length).toBeLessThanOrEqual(columns * rows);
    expect(document.querySelectorAll('[data-widget-type]')).toHaveLength(ADD_WIDGET_TYPES.length);
    expect(current().querySelector('[data-widget-type]')).toHaveAttribute('data-widget-type', 'rileva');
    expect([...document.querySelectorAll('[data-widget-type]')].slice(0, 2).map(node => (node as HTMLElement).dataset.widgetType)).toEqual(['rileva', 'tavano']);
    expect(document.querySelectorAll('[data-widget-type="tavano"]')).toHaveLength(1);
    for (const node of current().querySelectorAll<HTMLElement>('[data-preview-height]')) {
      expect(Number(node.dataset.previewHeight)).toBeGreaterThan(0);
      expect((Number(node.dataset.previewHeight) + c) * rows + 16 * (rows - 1)).toBeCloseTo(h, 1);
    }
  });

  it('has no navigation buttons and moves through native horizontal scrolling and arrows', () => {
    render(catalog());
    expect(current()).toHaveAccessibleName('Dispositivi');
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/^Pagina 1 di /);
    expect(screen.queryByRole('button', { name: 'Pagina precedente' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pagina successiva' })).toBeNull();
    fireEvent.keyDown(screen.getByLabelText('Pagine del catalogo'), { key: 'ArrowRight' });
    expect(current()).toHaveAttribute('data-catalog-page', '1');
    const pages = screen.getByLabelText('Pagine del catalogo');
    fireEvent.pointerDown(pages); // Native user pan supersedes the pending programmatic scroll.
    pages.scrollLeft = width * 2; fireEvent.scroll(pages);
    expect(current()).toHaveAttribute('data-catalog-page', '2');
    fireEvent.keyDown(pages, { key: 'ArrowLeft' });
    expect(current()).toHaveAttribute('data-catalog-page', '1');
    expect([...document.querySelectorAll('[data-catalog-page]')].filter((node) => !node.hasAttribute('inert'))).toHaveLength(1);
  });

  it('keeps rapid page requests ordered while native smooth scrolling reports intermediate positions', () => {
    render(catalog());
    const pages = screen.getByLabelText('Pagine del catalogo');
    const scroll = vi.spyOn(pages, 'scrollTo').mockImplementation(() => undefined);
    fireEvent.keyDown(screen.getByLabelText('Pagine del catalogo'), { key: 'ArrowRight' });
    expect(current()).toHaveAttribute('data-catalog-page', '1');
    pages.scrollLeft = width / 4; fireEvent.scroll(pages);
    fireEvent(pages, new Event('scrollend', { bubbles: true })); // An earlier smooth request can finish after the new one starts.
    expect(current()).toHaveAttribute('data-catalog-page', '1');
    fireEvent.keyDown(screen.getByLabelText('Pagine del catalogo'), { key: 'ArrowRight' });
    expect(current()).toHaveAttribute('data-catalog-page', '2');
    expect(scroll.mock.calls.map(([value]) => (value as ScrollToOptions).left)).toEqual([width, width * 2]);
    pages.scrollLeft = width; fireEvent.scroll(pages);
    fireEvent(pages, new Event('scrollend', { bubbles: true }));
    expect(current()).toHaveAttribute('data-catalog-page', '2');
    pages.scrollLeft = width * 2; fireEvent.scroll(pages);
    expect(current()).toHaveAttribute('data-catalog-page', '2');
    fireEvent.pointerDown(pages);
    pages.scrollLeft = 0; fireEvent.scroll(pages);
    expect(current()).toHaveAttribute('data-catalog-page', '0');
  });

  it('keeps the visual stage inside the native scroll owner and defers unseen distant previews', () => {
    render(catalog());
    const pages = screen.getByLabelText('Pagine del catalogo');
    const track = pages.querySelector('.aca-widget-catalog__track')!;
    const stage = track.querySelector('.aca-widget-catalog__stage')!;
    const sections = [...stage.querySelectorAll<HTMLElement>('[data-catalog-page]')];
    expect(track.parentElement).toBe(pages); expect(stage.parentElement).toBe(track);
    expect(track.querySelectorAll('.aca-widget-catalog__snap-anchor')).toHaveLength(sections.length);
    expect(document.querySelectorAll('[data-widget-type]')).toHaveLength(ADD_WIDGET_TYPES.length);
    expect(document.querySelectorAll('[data-preview-type]').length).toBeLessThan(ADD_WIDGET_TYPES.length);
    const distant = sections.at(-1)!.querySelector<HTMLElement>('[data-widget-type]')!.dataset.widgetType;
    expect(stage.querySelector(`[data-preview-type="${distant}"]`)).toBeNull();
    for (let page = 1; page < sections.length; page++) fireEvent.keyDown(pages, { key: 'ArrowRight' });
    expect(current()).toBe(sections.at(-1));
    expect(stage.querySelector(`[data-preview-type="${distant}"]`)).not.toBeNull();
    expect(sections.filter((section) => !section.hasAttribute('inert'))).toHaveLength(1);
  });

  it('positions and focuses the selected type when returning from its form', () => {
    render(catalog('climate'));
    const selected = document.querySelector<HTMLElement>('[data-widget-type="climate"]')!;
    expect(current().contains(selected)).toBe(true);
    expect(selected).toHaveFocus();
  });

  it('reflows on actual viewport/caption changes while preserving the anchor and outside focus', () => {
    render(catalog());
    fireEvent.keyDown(screen.getByLabelText('Pagine del catalogo'), { key: 'ArrowRight' });
    const active = current().querySelector<HTMLElement>('[data-widget-type]')!;
    const anchor = active.dataset.widgetType;
    active.focus(); resize(); // A no-op observer delivery must not retain a future focus claim.
    const outside = screen.getByRole('button', { name: 'Controllo esterno' }); outside.focus();
    width = 280; height = 300; caption = 104; resize();
    expect(current().querySelector(`[data-widget-type="${anchor}"]`)).not.toBeNull();
    expect(outside).toHaveFocus();
    const before = Number(current().querySelector<HTMLElement>('[data-preview-height]')!.dataset.previewHeight);
    caption = 136; resize();
    expect(Number(current().querySelector<HTMLElement>('[data-preview-height]')!.dataset.previewHeight)).toBeLessThan(before);
    expect(outside).toHaveFocus();
  });

  it('disconnects measurements and its resize listener when leaving the type catalog', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = render(catalog()); view.unmount();
    expect(observers.every((observer) => observer.disconnect.mock.calls.length === 1)).toBe(true);
    expect(remove.mock.calls.some(([name]) => name === 'resize')).toBe(true);
  });

  it('requires each current preview commit in addition to positive geometry, without accepting neighbouring pages', () => {
    const readiness = new Map<string, (ready: boolean) => void>();
    const onReady = vi.fn();
    const view = render(<WidgetCatalogPager items={ADD_WIDGET_TYPES} onReadyChange={onReady}
      renderTile={(entry, _height, prepared, onPreviewReady) => {
        if (prepared && onPreviewReady) readiness.set(entry.type, onPreviewReady);
        return <article key={entry.type}><button data-widget-type={entry.type}>
          <span className="aca-catalog-type__caption">{entry.label}</span></button></article>;
      }} />);
    expect(region()).toHaveAttribute('aria-busy', 'false');
    expect(onReady).toHaveBeenLastCalledWith(false);
    const currentTypes = [...current().querySelectorAll<HTMLElement>('[data-widget-type]')].map((node) => node.dataset.widgetType!);
    const neighbour = [...readiness.keys()].find((type) => !currentTypes.includes(type))!;
    act(() => readiness.get(neighbour)!(true));
    expect(onReady).not.toHaveBeenCalledWith(true);
    act(() => currentTypes.slice(1).forEach((type) => readiness.get(type)!(true)));
    expect(onReady).not.toHaveBeenCalledWith(true);
    act(() => readiness.get(currentTypes[0])!(true));
    expect(onReady).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(screen.getByLabelText('Pagine del catalogo'), { key: 'ArrowRight' });
    expect(onReady).toHaveBeenLastCalledWith(false);
    act(() => current().querySelectorAll<HTMLElement>('[data-widget-type]').forEach((node) => readiness.get(node.dataset.widgetType!)!(true)));
    expect(onReady).toHaveBeenLastCalledWith(true);
    const callback = readiness.get(neighbour);
    const w = width; height = 0; width = 0; resize();
    expect(onReady).toHaveBeenLastCalledWith(false);
    expect(region()).toHaveAttribute('aria-busy', 'true');
    width = w; height = 680; resize();
    expect(onReady).toHaveBeenLastCalledWith(true);
    expect(readiness.get(neighbour)).toBe(callback);
    view.unmount();
    expect(onReady).toHaveBeenLastCalledWith(false);
  });

});
