import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Body, Button, DialogShell, Surface } from '@/components/primitives';
import type { AddWidgetType } from '@/domain/launcher/catalog';
import type { PendingPlacement } from '@/domain/launcher/pendingPlacement';
import { WidgetCatalogPreview } from '../sheets/WidgetCatalogPreview';

/** The only added surface is an inert demonstration; the real widget is mounted after ACK. */
export function PendingWidgetPlacement({ item, plan, busy, error, onConfirm, onCancel, onRetry, preview, label }: {
  item: AddWidgetType; plan: PendingPlacement | null; busy: boolean; error: string;
  onConfirm: () => void; onCancel: () => void; onRetry: () => void;
  preview?: ReactNode; label?: string;
}) {
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const dock = useRef<HTMLDivElement>(null);
  const [dockAtTop, setDockAtTop] = useState(false);
  useLayoutEffect(() => {
    if (!plan) { setBox(null); return undefined; }
    const grid = [...document.querySelectorAll<HTMLElement>('[data-launcher-page]')]
      .find(page => page.dataset.launcherPage === plan.viewPageId)?.querySelector<HTMLElement>('.aca-launcher-grid');
    const measure = () => {
      if (!grid || grid.dataset.layoutReady !== 'true') { setBox(null); return; }
      const bounds = grid.getBoundingClientRect(), cell = parseFloat(grid.style.getPropertyValue('--aca-cell'));
      const gx = parseFloat(grid.style.getPropertyValue('--aca-gap-x')) || 0, gy = parseFloat(grid.style.getPropertyValue('--aca-gap-y')) || 0;
      const { x, y, w, h } = plan.rect;
      const next = { left: bounds.left + x * (cell + gx), top: bounds.top + y * (cell + gy),
        width: w * cell + (w - 1) * gx, height: h * cell + (h - 1) * gy };
      const visible = cell > 0 && next.left >= -1 && next.top >= -1 && next.left + next.width <= window.innerWidth + 1 && next.top + next.height <= window.innerHeight + 1;
      setBox(visible ? next : null);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (grid) observer?.observe(grid);
    window.addEventListener('resize', measure); document.addEventListener('scrollend', measure, true);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); document.removeEventListener('scrollend', measure, true); };
  }, [plan]);
  useLayoutEffect(() => {
    const node = dock.current;
    if (!node || !box) { setDockAtTop(false); return undefined; }
    const measure = () => {
      const bounds = node.getBoundingClientRect();
      const bottom = window.innerHeight - 16;
      const overlapsBottom = box.top < bottom && box.top + box.height > bottom - bounds.height
        && box.left < bounds.right && box.left + box.width > bounds.left;
      setDockAtTop(overlapsBottom);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(node); window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [box, error]);
  return createPortal(<DialogShell open titleId="aca-pending-widget-title" onClose={() => { if (!busy) onCancel(); }}
    overlayStyle={{ position: 'fixed', inset: 0, zIndex: 'var(--aca-z-sheet)' }} panelStyle={{ position: 'absolute', inset: 0 }}>
    {titleId => <>
      <span id={titleId} className="sr-only">Aggiungi {item.label}</span>
      {box && <div data-pending-widget-preview="" style={{ position: 'absolute', ...box, pointerEvents: 'none' }} aria-hidden="true" inert>
        {preview ?? <WidgetCatalogPreview item={item} eager height={box.height} />}
      </div>}
      <div ref={dock} data-pending-widget-actions="" style={{ position: 'absolute', ...(dockAtTop ? { top: 'max(1rem, env(safe-area-inset-top))' } : { bottom: 'max(1rem, env(safe-area-inset-bottom))' }), left: '50%', transform: 'translateX(-50%)', maxWidth: 'calc(100% - 2rem)' }}><Surface>
        <Body>{label ?? item.label}</Body>
        {(error || !plan) && <Body role="status">{error || 'Nessuno spazio disponibile.'}</Body>}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={onCancel} disabled={busy}>Annulla</Button>
          <Button variant="primary" disabled={busy || Boolean(plan && !box)} onClick={plan ? onConfirm : onRetry}>{busy ? 'Salvataggio…' : plan ? 'Conferma' : 'Riprova'}</Button>
        </div>
      </Surface></div>
    </>}
  </DialogShell>, document.body);
}
