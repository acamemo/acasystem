import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Body, Caption, Display, Icon, Surface } from '@/components/primitives';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import type { AddWidgetType } from '@/domain/launcher/catalog';
import { catalogPreviewExamples, catalogPreviewRuntime } from './widgetCatalogPreviewData';
import './widgetCatalogPreview.css';

const AdaptivePreview = lazy(() => import('@/components/widgets/adaptive/AdaptiveCategoryWidget')
  .then((module) => ({ default: module.AdaptiveCategoryWidget })));
const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 240;

/** Demonstrations only; none of the utility, camera, calendar or weather loaders are mounted. */
function Presentation({ item }: { item: AddWidgetType }) {
  if (item.type === 'tavano') return <div className="aca-widget-catalog-preview__example">
    <Body>Tavano</Body>
    {['Configurazione salvata', 'Comando accettato', 'Profilo aggiornato'].map((label) =>
      <div className="aca-widget-catalog-preview__activity" key={label}>
        <span className="aca-widget-catalog-preview__avatar">A</span><Caption>{label}</Caption>
      </div>)}
  </div>;
  if (item.type === 'todo') return <div className="aca-widget-catalog-preview__example">
    <Body>Attività</Body>{['Controllare le luci', 'Annaffiare le piante', 'Preparare la casa'].map((label, index) =>
      <div className="aca-widget-catalog-preview__activity" key={label}>
        <span className="aca-widget-catalog-preview__task">{index === 0 && <Icon name="done" size="sm" />}</span><Caption>{label}</Caption>
      </div>)}
  </div>;
  if (item.type === 'cover_clock') return <div className="aca-widget-catalog-preview__center">
    <Icon name="clock" size="lg" /><Display>10:09</Display><Caption>Orologio</Caption>
  </div>;
  if (item.type === 'calendar' || item.type === 'cover_calendar') return <div className="aca-widget-catalog-preview__center">
    <Caption>Lunedì</Caption><Display>15</Display><Body>Giugno</Body>
    {item.type === 'calendar' && <Caption>18:00 · Promemoria</Caption>}
  </div>;
  if (item.type === 'weather' || item.type === 'cover_weather') return <div className="aca-widget-catalog-preview__center">
    <Icon name="weather" size="lg" /><Display>23°</Display><Caption>Sereno</Caption>
  </div>;
  return <div className="aca-widget-catalog-preview__center">
    <Icon name={item.icon} size="lg" />
    <Body>{item.type === 'camera' ? 'Ingresso' : item.type === 'zigbee' ? 'Rete Zigbee' : item.label}</Body>
    <Caption>{item.type === 'camera' ? 'Videocamera' : item.type === 'zigbee' ? '12 dispositivi collegati' : '3 dispositivi disponibili'}</Caption>
  </div>;
}

/** Runs only after the real content below Suspense has committed, never for its icon fallback. */
function ContentCommitted({ onCommit }: { onCommit: (ready: boolean) => void }) {
  useLayoutEffect(() => { onCommit(true); return () => onCommit(false); }, [onCommit]);
  return null;
}

/** A stable, inert visual sibling of the parent's accessible selection button. */
export function WidgetCatalogPreview({ item, height, eager = false, onReady }: {
  item: AddWidgetType; height?: number; eager?: boolean; onReady?: (ready: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [observed, setVisible] = useState(false);
  const visible = eager || observed;
  const [scale, setScale] = useState<number | null>(null);
  const [committedType, setCommittedType] = useState<string | null>(null);
  const contentCommitted = useCallback((ready: boolean) => {
    setCommittedType((previous) => ready ? item.type : previous === item.type ? null : previous);
  }, [item.type]);
  const ready = visible && scale !== null && committedType === item.type;
  useLayoutEffect(() => {
    if (!onReady) return undefined;
    onReady(ready);
    return () => onReady(false);
  }, [onReady, ready]);
  useEffect(() => {
    const node = host.current;
    if (!node || visible) return undefined;
    if (typeof IntersectionObserver !== 'function') { setVisible(true); return undefined; }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setVisible(true); observer.disconnect();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  useLayoutEffect(() => {
    const node = host.current;
    if (!visible || !node) return undefined;
    const measure = () => {
      const width = node.clientWidth;
      const availableHeight = node.clientHeight;
      setScale(width > 0 && availableHeight > 0 ? Math.min(width / PREVIEW_WIDTH, availableHeight / PREVIEW_HEIGHT) : null);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [visible, height]);
  const example = catalogPreviewExamples[item.type];
  return <div ref={host} className="aca-widget-catalog-preview" style={height === undefined ? undefined : { height }} aria-hidden="true" inert>
    {(!visible || scale === null) && <div className="aca-widget-catalog-preview__placeholder"><Icon name={item.icon} size="lg" /></div>}
    <div className="aca-widget-catalog-preview__canvas" data-preview-canvas=""
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, marginLeft: -PREVIEW_WIDTH / 2, marginTop: -PREVIEW_HEIGHT / 2,
        transform: `scale(${scale ?? 1})`, visibility: scale === null ? 'hidden' : undefined }}>
    <Surface className="aca-widget-catalog-preview__surface" contentClassName="aca-widget-catalog-preview__content">
      {!visible ? <Icon name={item.icon} size="lg" /> : example ?
        <WidgetRuntimeProvider value={catalogPreviewRuntime}>
          <PageVisibilityContext.Provider value={false}>
            <Suspense fallback={<Icon name={item.icon} size="lg" />}>
              <AdaptivePreview type={item.type} entityId={example.entityId} settings={example.settings}
                id={`catalogue-${item.type}`} settingsKey={`catalogue-${item.type}`} size={{ w: 2, h: 2 }} editMode />
              {onReady && <ContentCommitted onCommit={contentCommitted} />}
            </Suspense>
          </PageVisibilityContext.Provider>
        </WidgetRuntimeProvider> : <><Presentation item={item} />
          {onReady && <ContentCommitted onCommit={contentCommitted} />}</>}
    </Surface>
    </div>
  </div>;
}
