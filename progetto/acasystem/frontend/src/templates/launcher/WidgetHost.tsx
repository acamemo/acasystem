import {
  useEffect,
  memo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Caption, Surface } from '@/components/primitives';
import {
  ResizeFrame,
  edgeFromPoint,
  type FrameSide,
  type HandleEdge,
} from '@/components/system/edit/ResizeHandle';
import { WidgetUnavailable } from '@/components/system/launcher/LauncherStates';
import type { CellRect } from '@/@types/launcher';
import { useRejected, type WidgetEntering } from '@/hooks/launcher/useLauncherSelection';
import { useResizeShape } from '@/hooks/launcher/useResizeShape';
import { describeRect } from '@/utils/launcher/names';
import { ErrorBoundary } from './ErrorBoundary';
import { useLauncherUi } from './LauncherUiContext';
import { StackView } from './StackView';
import { CategoryWidgetContent } from './CategoryWidgetContent';

export interface WidgetHostProps {
  pageId: string;
  widgetId: string;
  /** Where the widget is drawn (its placement, or the preview while another one is dragged). */
  rect: CellRect;
  /** Its saved placement on the page. */
  placement: CellRect;
  /** Being moved (hidden: the floating copy follows the pointer) or resized (drawn live). */
  dragging?: 'move' | 'resize' | false;
  /** Selected in edit mode: every resize handle, and a tap opens the menu. */
  selected?: boolean;
  /**
   * Held before it lifts (REP-20261008-001): it shrinks to --aca-hold-scale meanwhile. Since G5
   * a widget lifts at once, so nothing sets it; the plumbing goes with the cleanup of C4.
   */
  pressing?: boolean;
  /** Just dropped by the pointer: drawn in place at once. */
  landing?: boolean;
  /** A dragged widget is held over its middle: dropped, the two make a stack. */
  stackTarget?: boolean;
  /** Resizing to a size that is refused: the shape is drawn in the colour of the error. */
  shapeInvalid?: boolean;
  /** Removed from its bar: shrinks and fades; the removal is committed after (D-M10). */
  exiting?: boolean;
  /** Just added or put back: comes in once `go` (D-M10, D-M11). */
  entering?: WidgetEntering | null;
}

type CellStyle = CSSProperties &
  Record<'--aca-lx' | '--aca-ly' | '--aca-lw' | '--aca-lh', string> &
  Partial<Record<'--aca-widget-glass', string>>;

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export const EDIT_HELP_ID = 'aca-launcher-edit-help';

/**
 * Kit frame around a widget. It is static: it gives press feedback only when the widget's
 * details opener (`[data-widget-open]`) is hovered or pressed (launcher.css), never for the
 * widget's own commands. Frameless widgets (the spacer) get a plain box.
 */
function Frame({
  frameless,
  rejected,
  inert,
  children,
}: {
  frameless: boolean;
  rejected: boolean;
  inert: true | undefined;
  children: ReactNode;
}) {
  if (frameless) {
    return (
      <div className="aca-launcher-widget__bare" inert={inert}>
        {children}
      </div>
    );
  }
  return (
    <Surface
      behavior="static"
      error={rejected}
      className="aca-launcher-widget__frame aca-m--fill"
      contentClassName="aca-launcher-widget__content"
      inert={inert}
    >
      {children}
    </Surface>
  );
}

/**
 * A widget on a launcher page: finds its definition, draws it in the kit frame with an error
 * boundary (or a calm «Widget non disponibile»), and in edit mode adds the drag surface, the
 * grip frame of the selected widget and the keyboard alternative (frecce, Maiusc + frecce,
 * Invio, Canc). In edit mode the finger on the widget moves it at once, a tap selects it and a
 * second tap on the selected one opens its settings (ADR-0016, G5). Out of edit mode a tap acts
 * at once, on a command, on the area that opens the details or, on a widget not yet linked, on
 * «Collega»: no wait for a second tap, no settings (ADR-0016, D-7). A press and hold on its body
 * (never on a command) enters edit mode with the widget lifted: LauncherScreen (liftWidget).
 */
export const WidgetHost = memo(function WidgetHost({
  pageId,
  widgetId,
  rect,
  placement,
  dragging = false,
  selected = false,
  landing = false,
  stackTarget = false,
  pressing = false,
  shapeInvalid = false,
  exiting = false,
  entering = null,
}: WidgetHostProps) {
  const ui = useLauncherUi();
  const { controller } = ui;
  const editMode = controller.editMode;
  const settingsKey = controller.settingsKeyFor(pageId, widgetId);
  const settings = controller.settingsFor(pageId, widgetId);
  const definition = ui.findDefinition(widgetId, settings);
  /** A stack of widgets in this place (REP-20261007-037). */
  const stack = controller.layout.stacks?.[widgetId];
  // A stack of widgets that draw their own card (the cover ones) adds no frame around them.
  const stackFrameless =
    stack?.ids.every(
      (id) => ui.findDefinition(id, controller.settingsFor(pageId, id))?.frameless === true
    ) ?? false;
  const name = ui.widgetName(pageId, widgetId);
  const hidden = ui.isWidgetHidden(pageId, widgetId);
  const rejected = useRejected(ui.selection, widgetId);

  const handleRef = useRef<HTMLButtonElement | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // The shape of a resize (REP-20261023-006, D-M6): a flat dashed cell instead of the widget.
  // It comes up at the first change of cell, not at the first pixels, and stays to the end of the
  // gesture: a small move on a dot that changes nothing leaves the face of the widget alone.
  const resizeChanged =
    dragging === 'resize' &&
    (rect.x !== placement.x ||
      rect.y !== placement.y ||
      rect.w !== placement.w ||
      rect.h !== placement.h);
  const [shaping, setShaping] = useState(false);
  const nextShaping = dragging === 'resize' && (shaping || resizeChanged);
  if (nextShaping !== shaping) setShaping(nextShaping);
  const shape = useResizeShape(shaping, boxRef);
  /**
   * A pointer pressed the handle and its click has not come yet: that click is a tap. A click
   * without it comes from Invio, Spazio or a screen reader (not measured in time: a slow tap or
   * a press held still is still a tap, U2).
   */
  const pointerPressed = useRef(false);
  useEffect(() => {
    if (editMode && ui.takeFocusRequest(pageId, widgetId)) handleRef.current?.focus();
  });
  if (!editMode && hidden) return null;

  // The box waits at its saved size until the content has gone (shape.holding); the content is
  // given the saved size while the browser skips it, and the final one when it is back.
  const drawn = shape.holding ? placement : rect;
  const contentRect = shape.skipped ? placement : rect;
  const style: CellStyle = {
    '--aca-lx': String(drawn.x),
    '--aca-ly': String(drawn.y),
    '--aca-lw': String(drawn.w),
    '--aca-lh': String(drawn.h),
  };

  const startDrag = (
    kind: 'move' | 'resize',
    event: PointerEvent<HTMLElement>,
    edge?: HandleEdge
  ) => {
    if (event.button !== 0 || !boxRef.current) return;
    if (kind === 'resize') event.stopPropagation();
    const box = boxRef.current.getBoundingClientRect();
    ui.beginDrag({
      mode: kind,
      edge,
      widgetId,
      label: name,
      pageId,
      origin: placement,
      box: { left: box.left, top: box.top, width: box.width, height: box.height },
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      // No hold (ADR-0016, G5): the drag starts after a few pixels, selected or not.
    });
  };

  // The axes the widget can be resized along, within the grid of its page (as resizeRect):
  // its grip frame offers only those.
  const sizes = controller.sizesFor(pageId, widgetId);
  const grid = controller.gridFor(pageId);
  const free = (min: number, max: number, cells: number) =>
    Math.min(max, cells) > Math.min(min, cells);
  const axes = {
    x: free(sizes?.min.w ?? 1, sizes?.max.w ?? grid.w, grid.w),
    y: free(sizes?.min.h ?? 1, sizes?.max.h ?? grid.h, grid.h),
  };
  const startResize = (side: FrameSide, event: PointerEvent<HTMLSpanElement>) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    startDrag(
      'resize',
      event,
      edgeFromPoint(side, { x: event.clientX, y: event.clientY }, box, axes)
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    // A key comes next: a press of the pointer left without its click no longer counts.
    pointerPressed.current = false;
    // While the widget leaves it keeps the focus (a screen reader keeps its place) but takes no
    // command: it is not inert, which would drop the focus on the body until the removal.
    if (exiting && event.key !== 'Tab') {
      event.preventDefault();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      ui.requestRemove(pageId, widgetId);
      return;
    }
    // Tab from the selected widget reaches its bar first (Rimuovi, Annulla, Conferma).
    if (event.key === 'Tab' && !event.shiftKey && selected) {
      event.preventDefault();
      ui.focusWidgetBar();
      return;
    }
    const delta = ARROWS[event.key];
    if (!delta) return;
    event.preventDefault();
    const [dx, dy] = delta;
    ui.stepWidget(pageId, widgetId, event.shiftKey ? 'resize' : 'move', dx, dy);
  };

  // Aspetto of the widget (REP-20261007-036): without the frame, or see-through.
  const unframed = settings.appearanceFrame === false;
  const glass = typeof settings.appearanceOpacity === 'number' ? settings.appearanceOpacity : 0;
  if (glass > 0) style['--aca-widget-glass'] = `${100 - glass}%`;

  const classes = [
    'aca-launcher-widget',
    glass > 0 && !unframed && 'has-glass',
    editMode && 'is-editing',
    hidden && 'is-hidden',
    dragging === 'move' && 'is-dragging',
    dragging === 'resize' && 'is-resizing',
    shape.shaped && 'is-shaped',
    shape.skipped && 'is-skipped',
    shape.shaped && shapeInvalid && 'is-shape-invalid',
    selected && 'is-selected',
    landing && 'is-landing',
    stackTarget && 'is-stack-target',
    pressing && 'is-pressing',
    exiting && 'is-exiting',
    entering && 'is-entering',
    entering?.go && 'is-go',
    entering && `is-${entering.mode}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={boxRef} className={classes} style={style} data-widget-id={widgetId}>
      <Frame
        frameless={definition?.frameless === true || unframed || stackFrameless}
        rejected={rejected}
        inert={editMode || undefined}
      >
        <ErrorBoundary
          resetKey={`${settingsKey}|${definition?.type ?? 'none'}`}
          label={`widget ${widgetId}`}
          fallback={
            <WidgetUnavailable
              reason="error"
              name={name}
              compact={contentRect.w * contentRect.h < 2}
            />
          }
        >
          {stack ? (
            <StackView
              pageId={pageId}
              ids={stack.ids}
              rotate={stack.rotate === true}
              size={{ w: contentRect.w, h: contentRect.h }}
              editMode={editMode}
            />
          ) : definition && settings.categoryWidgetType ? (
            <CategoryWidgetContent
              definition={definition}
              id={widgetId}
              settingsKey={settingsKey}
              settings={settings}
              size={{ w: contentRect.w, h: contentRect.h }}
              editMode={editMode}
              onConfigure={() => ui.openWidgetSettings(pageId, widgetId)}
            />
          ) : definition ? (
            <definition.Widget
              id={widgetId}
              settingsKey={settingsKey}
              settings={settings}
              size={{ w: contentRect.w, h: contentRect.h }}
              editMode={editMode}
            />
          ) : (
            <WidgetUnavailable
              reason="missing"
              name={name}
              compact={contentRect.w * contentRect.h < 2}
            />
          )}
        </ErrorBoundary>
      </Frame>

      {editMode && (
        <>
          {/*
           * The whole widget is its handle: the finger on it moves it at once (selected or not);
           * a tap selects it (the top bar rises and the bar of the widget takes the place of the
           * indicator, REP-20261007-029); a second tap on the selected widget, or Invio, opens
           * its settings; one tap on a widget not yet linked opens «Collega» (ADR-0016, G4, G5).
           */}
          <button
            ref={handleRef}
            type="button"
            className="aca-launcher-widget__handle"
            aria-label={`${name}, ${describeRect(placement)}${hidden ? ', nascosto' : ''}`}
            aria-describedby={EDIT_HELP_ID}
            aria-pressed={selected}
            onPointerDown={(event) => {
              pointerPressed.current = true;
              startDrag('move', event);
            }}
            onPointerCancel={() => {
              pointerPressed.current = false;
            }}
            // The finger lifts the widget: no menu of the browser on the press.
            onContextMenu={(event) => event.preventDefault()}
            onFocus={() => {
              // Keyboard: the widget reached with Tab is the selected one.
              if (document.documentElement.dataset.acaInput === 'keyboard') {
                ui.select(pageId, widgetId);
              }
            }}
            onClick={(event) => {
              const fromPointer = pointerPressed.current;
              pointerPressed.current = false;
              // The release of a drag is not a tap.
              if (ui.justDropped()) {
                event.preventDefault();
                return;
              }
              if (selected && !fromPointer) {
                ui.openWidgetSettings(pageId, widgetId);
                return;
              }
              ui.tapWidget(pageId, widgetId, selected);
            }}
            onKeyDown={onKeyDown}
          />
          {hidden && (
            <Caption tone="ink" className="aca-launcher-widget__badge">
              Nascosto
            </Caption>
          )}
          {stackTarget && (
            <Caption tone="ink" className="aca-launcher-widget__stack-badge">
              {stack ? 'Aggiungi alla pila' : 'Crea pila'}
            </Caption>
          )}
          {selected && <ResizeFrame axes={axes} onPointerDown={startResize} />}
        </>
      )}
    </div>
  );
});
