import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Body, Caption, Icon, Surface, type IconName } from '@/components/primitives';
import type { DragFlight, DragSession } from '@/hooks/launcher/useWidgetDrag';
import { afterTransition } from '@/utils/launcher/motion';

/** How long each flight takes after the release (--aca-dur-fly, -fly-back and -exit-sm, tokens.css). */
export const FLIGHT_MS: Record<DragFlight['kind'], number> = {
  land: 200,
  return: 240,
  remove: 160,
};

/**
 * Custom properties the grid writes on itself (WidgetGrid.tsx) that the copy needs outside it
 * (cell size and gaps). The radius of the cell comes from the stylesheet, from the same cell
 * (launcher.css, `.aca-drag-ghost`), so no style is read to hand it over (ISSUE-109, R3).
 */
const GRID_VARS = ['--aca-cell', '--aca-gap-x', '--aca-gap-y'] as const;

function findWidget(pageId: string, widgetId: string): HTMLElement | null {
  const page = Array.from(document.querySelectorAll<HTMLElement>('[data-launcher-page]')).find(
    (element) => element.dataset.launcherPage === pageId
  );
  return (
    Array.from(page?.querySelectorAll<HTMLElement>('[data-widget-id]') ?? []).find(
      (element) => element.dataset.widgetId === widgetId
    ) ?? null
  );
}

/**
 * Floating copy of the dragged widget, under the pointer (it can travel to another page).
 * Moving, it is a static copy of the widget itself, lifted (REP-20261007-027); adding from the
 * tray, it is the tile of the widget type. Resizing draws the widget live in the grid instead.
 * Over the trash of the widget bar it shrinks around the finger (REP-20261008-001). Released, it
 * flies on (`session.flight`): into its cell, back to the one it left, or away over the trash; at the
 * end of the flight `onFlightEnd` takes the copy away, and commits what was not committed at the
 * release (the refusal, the removal): a drop into a cell is committed before the flight
 * (REP-20261023-006, K6b).
 */
export function DragGhost({
  session,
  icon,
  onFlightEnd,
}: {
  session: DragSession;
  icon?: IconName;
  onFlightEnd?: () => void;
}) {
  const copyRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const { mode, widgetId, sourcePageId } = session;

  // A copy of the widget's frame, inert: the real widget stays hidden in its cell meanwhile.
  useLayoutEffect(() => {
    const host = copyRef.current;
    const ghost = ghostRef.current;
    if (mode !== 'move' || !host || !ghost) return undefined;
    const source = findWidget(sourcePageId, widgetId);
    const frame = source?.querySelector<HTMLElement>(
      ':scope > .aca-launcher-widget__frame, :scope > .aca-launcher-widget__bare'
    );
    if (!source || !frame) return undefined;
    // Read from the inline style of the grid, which asks the browser for no style or layout:
    // getComputedStyle here recalculated the whole document inside the lift (ISSUE-109, R3).
    const grid = source.closest<HTMLElement>('.aca-launcher-grid');
    for (const name of GRID_VARS) {
      const value = grid?.style.getPropertyValue(name);
      if (value) ghost.style.setProperty(name, value);
    }
    const copy = frame.cloneNode(true) as HTMLElement;
    copy.setAttribute('inert', '');
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    host.replaceChildren(copy);
    ghost.classList.add('has-copy');
    return () => {
      host.replaceChildren();
      ghost.classList.remove('has-copy');
    };
  }, [mode, widgetId, sourcePageId]);

  // The end of the flight: the transform (or scale) of the copy, or a cap of its time plus two
  // frames (the copy over the trash does not travel, so it has no event of its own). The cap counts
  // from the real start of the transition too (`fromRun`): the transition is born a restyle after
  // this effect, and a cap counted from here fired the commit of the release (a restyle of 1269
  // elements, 130-143 ms) at +270-279 ms with the copy still on screen, before it had landed
  // (tracing of 2026-10-24). A drop into a cell is committed at the release since 2026-10-25
  // (K6b), so the end of the flight only shows the widget under the copy and takes the copy away:
  // the swap that was approved.
  const flight = session.flight;
  const flightKind = flight?.kind;
  const flightEnd = useRef(onFlightEnd);
  useEffect(() => {
    flightEnd.current = onFlightEnd;
  });
  useEffect(() => {
    if (!flightKind) return undefined;
    return afterTransition(
      ghostRef.current,
      ['transform', 'scale'],
      FLIGHT_MS[flightKind],
      () => {
        // A copy that lands is hidden with the swap that shows the widget, in the same frame; the
        // session that unmounts it ends a frame later (useWidgetDrag, flightEnded, W2).
        if (flightKind === 'land') ghostRef.current?.classList.add('is-landed');
        flightEnd.current?.();
      },
      { fromRun: true }
    );
  }, [flightKind]);

  if (mode === 'resize') return null;
  const flies = flight !== undefined && flight.kind !== 'remove';
  const style: CSSProperties & Record<'--aca-grab-x' | '--aca-grab-y', string> = {
    '--aca-grab-x': `${session.offset.x}px`,
    '--aca-grab-y': `${session.offset.y}px`,
    width: `${session.box.width}px`,
    height: `${session.box.height}px`,
    transform: flies
      ? `translate3d(${flight.x}px, ${flight.y}px, 0)`
      : `translate3d(${session.pointer.x - session.offset.x}px, ${
          session.pointer.y - session.offset.y
        }px, 0)`,
    scale: flies ? flight.scale : undefined,
  };
  const target = session.target;
  const hint = flies
    ? null
    : session.removing
      ? 'Rilascia per rimuovere'
      : target
        ? target.stackOn
          ? 'Rilascia per fare una pila'
          : target.valid
            ? `Colonna ${target.rect.x + 1}, riga ${target.rect.y + 1}`
            : 'Non c’è spazio qui'
        : null;
  return (
    <div
      ref={ghostRef}
      className={[
        'aca-drag-ghost',
        `aca-drag-ghost--${mode}`,
        target && !target.valid && 'is-invalid',
        session.lifted && 'is-lifting',
        session.removing && 'is-removing',
        flight && 'is-flying',
        flight && `is-flying--${flight.kind}`,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-hidden="true"
    >
      <div ref={copyRef} className="aca-drag-ghost__copy" />
      <Surface
        error={target ? !target.valid : false}
        className="aca-m--fill aca-drag-ghost__frame"
        contentClassName="aca-drag-ghost__layer"
      >
        <div className="aca-drag-ghost__content">
          {icon && <Icon name={icon} size="lg" />}
          <Body as="span" size="sm" tone="ink" className="aca-drag-ghost__name">
            {session.label}
          </Body>
        </div>
      </Surface>
      {hint && (
        <Caption
          tone={!session.removing && target?.valid ? 'muted' : 'danger'}
          className="aca-drag-ghost__hint"
        >
          {hint}
        </Caption>
      )}
    </div>
  );
}
