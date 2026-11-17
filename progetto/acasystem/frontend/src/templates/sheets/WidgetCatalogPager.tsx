import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Body, Spinner } from '@/components/primitives';
import { ADD_WIDGET_GROUPS, type AddWidgetType } from '@/domain/launcher/catalog';
import { useReducedMotion } from '@/hooks/launcher/useViewport';

interface Geometry { columns: number; rows: number; preview: number }
interface CatalogPage { key: string; group: string; label: string; items: readonly AddWidgetType[] }

/** A finite set of complete cards per viewport; the entity form remains a separate vertical view. */
export function WidgetCatalogPager({ items, renderTile, initialAnchorType, onReadyChange }: {
  items: readonly AddWidgetType[];
  renderTile: (item: AddWidgetType, previewHeight: number, previewReady: boolean, onPreviewReady?: (ready: boolean) => void) => ReactNode;
  initialAnchorType?: string | null;
  onReadyChange?: (ready: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [measured, setMeasured] = useState(false);
  const [previewReadiness, setPreviewReadiness] = useState<Record<string, boolean>>({});
  const readinessCallbacks = useRef(new Map<string, (ready: boolean) => void>());
  const readySink = useRef(onReadyChange); readySink.current = onReadyChange;
  const previewCallback = (type: string) => {
    let callback = readinessCallbacks.current.get(type);
    if (!callback) {
      callback = (ready) => setPreviewReadiness((previous) => previous[type] === ready
        ? previous : { ...previous, [type]: ready });
      readinessCallbacks.current.set(type, callback);
    }
    return callback;
  };
  const geometryRef = useRef<Geometry | null>(null);
  const pendingTarget = useRef<number | null>(null);
  const previewedPages = useRef(new Set<string>());
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0); indexRef.current = index;
  const anchor = useRef(initialAnchorType ?? null);
  const focusAfterLayout = useRef<string | null>(initialAnchorType ?? null);
  const reduced = useReducedMotion();
  const capacity = (geometry?.columns ?? 1) * (geometry?.rows ?? 1);
  const pages = useMemo(() => {
    const result: CatalogPage[] = [];
    for (const { group, label } of ADD_WIDGET_GROUPS) {
      const tools = group === 'devices' ? items.filter((item) => item.activation === 'open-tool') : [];
      const members = [...tools, ...items.filter((item) => item.activation !== 'open-tool'
        && (item.group === group || group === 'devices' && item.group === 'find'))];
      for (let start = 0; start < members.length; start += capacity) {
        const membersOnPage = members.slice(start, start + capacity);
        result.push({ key: group + ':' + membersOnPage.map((item) => item.type).join('|'), group, label, items: membersOnPage });
      }
    }
    return result;
  }, [items, capacity]);
  const currentReady = Boolean(measured && geometry && pages[index]?.items.length
    && pages[index].items.every((item) => previewReadiness[item.type]));
  useLayoutEffect(() => { onReadyChange?.(currentReady); }, [onReadyChange, currentReady]);
  useLayoutEffect(() => () => readySink.current?.(false), []);

  // Warm only the current page and its immediate neighbours, then retain their isolated previews.
  for (const page of pages.slice(Math.max(0, index - 1), index + 2)) previewedPages.current.add(page.key);

  const measure = useCallback(() => {
    const region = viewport.current;
    if (!region) return;
    const width = region.clientWidth || region.getBoundingClientRect().width;
    const height = region.clientHeight || region.getBoundingClientRect().height;
    if (!(width > 0 && height > 0)) { setMeasured(false); return; }
    setMeasured(true);
    const grid = region.querySelector<HTMLElement>('.aca-widget-catalog__grid');
    const gap = grid ? parseFloat(getComputedStyle(grid).gap) || 16 : 16;
    const usableHeight = height;
    const captions = [...region.querySelectorAll<HTMLElement>('.aca-catalog-type__caption')];
    const captionHeight = Math.max(72, ...captions.map((node) => node.getBoundingClientRect().height));
    const mobile = width < 600;
    const columns = Math.max(1, Math.min(4, Math.floor((width + gap) / ((mobile ? 132 : 220) + gap))));
    const rows = Math.max(1, Math.min(2, Math.floor((usableHeight + gap) / (captionHeight + (mobile ? 72 : 112) + gap))));
    const preview = Math.max(0, (usableHeight - (rows - 1) * gap) / rows - captionHeight);
    const focused = document.activeElement instanceof HTMLElement && host.current?.contains(document.activeElement)
      ? document.activeElement.dataset.widgetType : undefined;
    const previous = geometryRef.current;
    if (previous?.columns === columns && previous.rows === rows && Math.abs(previous.preview - preview) < 0.5) return;
    if (previous) focusAfterLayout.current = focused ?? null;
    geometryRef.current = { columns, rows, preview };
    setGeometry(geometryRef.current);
  }, []);

  useLayoutEffect(() => {
    const region = viewport.current;
    if (!region) return undefined;
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(region);
    region.querySelectorAll('.aca-catalog-type__caption').forEach((node) => observer?.observe(node));
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [pages, measure]);

  useLayoutEffect(() => {
    if (!geometry || !viewport.current) return;
    const target = anchor.current ? pages.findIndex((page) => page.items.some((item) => item.type === anchor.current)) : indexRef.current;
    const next = Math.max(0, Math.min(pages.length - 1, target < 0 ? indexRef.current : target));
    pendingTarget.current = null;
    indexRef.current = next; setIndex(next);
    viewport.current.scrollLeft = next * viewport.current.clientWidth;
  }, [pages, geometry]);

  useLayoutEffect(() => {
    const focusType = focusAfterLayout.current;
    if (!geometry || !focusType || !viewport.current) return;
    const target = [...viewport.current.querySelectorAll<HTMLElement>('[data-widget-type]')]
      .find((node) => node.dataset.widgetType === focusType);
    if (!target || target.closest('[inert]')) return;
    focusAfterLayout.current = null;
    target.focus({ preventScroll: true });
  }, [index, pages, geometry]);

  const go = (next: number, keyboard = false) => {
    const region = viewport.current;
    if (!region || next < 0 || next >= pages.length || next === indexRef.current) return;
    anchor.current = pages[next].items[0]?.type ?? null;
    pendingTarget.current = next;
    indexRef.current = next; setIndex(next);
    region.scrollTo?.({ left: next * region.clientWidth, behavior: reduced ? 'instant' : 'smooth' });
    if (keyboard) {
      requestAnimationFrame(() => {
        region.querySelector<HTMLElement>(`[data-catalog-page="${next}"] [data-widget-type]`)?.focus({ preventScroll: true });
      });
    }
  };

  return <div ref={host} className="aca-widget-catalog" data-drawer-swipe="true" role="group" aria-label="Tipi di widget"
    data-columns={geometry?.columns} data-rows={geometry?.rows} data-items-per-page={capacity} aria-busy={!geometry || !measured}>
    {!geometry && <div className="aca-widget-catalog__loading"><Spinner label="Preparazione dei widget" /></div>}
    <div ref={viewport} className="aca-widget-catalog__pages" tabIndex={0} aria-label="Pagine del catalogo"
      style={{ visibility: geometry && measured ? undefined : 'hidden' }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' || event.altKey || event.ctrlKey || event.metaKey) return;
        if ((event.target as Element).closest('input, select, textarea, [role="slider"]')) return;
        event.preventDefault(); go(indexRef.current + (event.key === 'ArrowRight' ? 1 : -1), true);
      }}
      onPointerDown={() => { pendingTarget.current = null; }}
      onWheel={() => { pendingTarget.current = null; }}
      onScrollEnd={() => {
        const region = viewport.current;
        if (!region?.clientWidth) return;
        if (pendingTarget.current !== null && Math.abs(region.scrollLeft - pendingTarget.current * region.clientWidth) > 1) return;
        pendingTarget.current = null;
        const next = Math.max(0, Math.min(pages.length - 1, Math.round(region.scrollLeft / region.clientWidth)));
        anchor.current = pages[next].items[0]?.type ?? null;
        indexRef.current = next; setIndex(next);
      }}
      onScroll={() => {
        const region = viewport.current;
        if (!region?.clientWidth) return;
        if (pendingTarget.current !== null) {
          if (Math.abs(region.scrollLeft - pendingTarget.current * region.clientWidth) > 1) return;
          pendingTarget.current = null;
        }
        const next = Math.max(0, Math.min(pages.length - 1, Math.round(region.scrollLeft / region.clientWidth)));
        if (next !== indexRef.current) {
          anchor.current = pages[next].items[0]?.type ?? null;
          indexRef.current = next; setIndex(next);
        }
      }}>
      <div className="aca-widget-catalog__track" style={{ width: `${pages.length * 100}%` }}>
        <div className="aca-widget-catalog__snap-anchors" aria-hidden="true">
          {pages.map((page) => <span key={page.key} className="aca-widget-catalog__snap-anchor" style={{ flexBasis: `${100 / pages.length}%` }} />)}
        </div>
        <div className="aca-widget-catalog__stage" style={{ width: `${100 / pages.length}%` }}>
      {pages.map((page, pageIndex) => <section key={`${page.group}-${pageIndex}`} className="aca-widget-catalog__page"
        data-catalog-page={pageIndex} inert={pageIndex !== index || undefined} aria-hidden={pageIndex !== index || undefined}
        aria-label={page.label}>
        <div className="aca-widget-catalog__grid" style={{ gridTemplateColumns: `repeat(${geometry?.columns ?? 1}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${geometry?.rows ?? 1}, minmax(0, 1fr))` }}>
          {page.items.map((item) => renderTile(item, geometry?.preview ?? 0, previewedPages.current.has(page.key), onReadyChange ? previewCallback(item.type) : undefined))}
        </div>
      </section>)}
        </div>
      </div>
    </div>
    <Body className="aca-widget-catalog__navigation aca-visually-hidden sr-only" size="sm" role="status" aria-live="polite">Pagina {index + 1} di {pages.length}</Body>
  </div>;
}
