import {
  useEffect,
  memo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Caption, Surface } from '@/components/primitives';
import { ResizeHandle } from '@/components/system/edit/ResizeHandle';
import { WidgetEditControls } from '@/components/system/edit/WidgetEditControls';
import { WidgetUnavailable } from '@/components/system/launcher/LauncherStates';
import type { CellRect } from '@/@types/launcher';
import { describeRect } from '@/utils/launcher/names';
import { ErrorBoundary } from './ErrorBoundary';
import { useLauncherUi } from './LauncherUiContext';

export interface WidgetHostProps {
  pageId: string;
  widgetId: string;
  /** Where the widget is drawn (its placement, or the preview while another one is dragged). */
  rect: CellRect;
  /** Its saved placement on the page. */
  placement: CellRect;
  /** Position in the page, to vary the edit-mode wiggle. */
  order: number;
  dragging?: boolean;
}

type CellStyle = CSSProperties &
  Record<'--aca-lx' | '--aca-ly' | '--aca-lw' | '--aca-lh' | '--aca-wiggle-delay', string>;

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
 * corner controls and the keyboard alternative (frecce, Maiusc + frecce, Invio, Esc).
 */
export const WidgetHost = memo(function WidgetHost({
  pageId,
  widgetId,
  rect,
  placement,
  order,
  dragging = false,
}: WidgetHostProps) {
  const ui = useLauncherUi();
  const { controller } = ui;
  const editMode = controller.editMode;
  const settingsKey = controller.settingsKeyFor(pageId, widgetId);
  const settings = controller.settingsFor(pageId, widgetId);
  const definition = ui.findDefinition(widgetId, settings);
  const name = ui.widgetName(pageId, widgetId);
  const hidden = ui.isWidgetHidden(pageId, widgetId);
  const rejected = ui.rejectedId === widgetId;
  const mode =
    ui.keyboardMode?.pageId === pageId && ui.keyboardMode.widgetId === widgetId
      ? ui.keyboardMode.mode
      : null;

  const handleRef = useRef<HTMLButtonElement | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const removeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (editMode && ui.takeFocusRequest(pageId, widgetId)) handleRef.current?.focus();
  });

  if (!editMode && hidden) return null;

  const style: CellStyle = {
    '--aca-lx': String(rect.x),
    '--aca-ly': String(rect.y),
    '--aca-lw': String(rect.w),
    '--aca-lh': String(rect.h),
    '--aca-wiggle-delay': `${-((order * 97) % 260)}ms`,
  };

  const startDrag = (kind: 'move' | 'resize', event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !boxRef.current) return;
    if (kind === 'resize') event.stopPropagation();
    const box = boxRef.current.getBoundingClientRect();
    ui.beginDrag({
      mode: kind,
      widgetId,
      label: name,
      pageId,
      origin: placement,
      box: { left: box.left, top: box.top, width: box.width, height: box.height },
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && mode) {
      event.preventDefault();
      event.stopPropagation();
      ui.setKeyboardMode(null);
      ui.announce('Fine dello spostamento da tastiera.');
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && !mode) {
      event.preventDefault();
      removeRef.current?.click();
      return;
    }
    const delta = ARROWS[event.key];
    if (!delta) return;
    event.preventDefault();
    const [dx, dy] = delta;
    ui.stepWidget(
      pageId,
      widgetId,
      event.shiftKey || mode === 'resize' ? 'resize' : 'move',
      dx,
      dy
    );
  };

  const classes = [
    'aca-launcher-widget',
    editMode && 'is-editing',
    hidden && 'is-hidden',
    dragging && 'is-dragging',
    mode && 'is-keyboard',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={boxRef} className={classes} style={style} data-widget-id={widgetId}>
      <Frame
        frameless={definition?.frameless === true}
        rejected={rejected}
        inert={editMode || undefined}
      >
        <ErrorBoundary
          resetKey={`${settingsKey}|${definition?.type ?? 'none'}`}
          label={`widget ${widgetId}`}
          fallback={<WidgetUnavailable reason="error" name={name} compact={rect.w * rect.h < 2} />}
        >
          {definition ? (
            <definition.Widget
              id={widgetId}
              settingsKey={settingsKey}
              settings={settings}
              size={{ w: rect.w, h: rect.h }}
              editMode={editMode}
            />
          ) : (
            <WidgetUnavailable reason="missing" name={name} compact={rect.w * rect.h < 2} />
          )}
        </ErrorBoundary>
      </Frame>

      {editMode && (
        <>
          <WidgetEditControls
            name={name}
            handle={(trigger) => (
              <button
                {...trigger}
                ref={(node: HTMLButtonElement | null) => {
                  trigger.ref(node);
                  handleRef.current = node;
                }}
                type="button"
                className="aca-launcher-widget__handle"
                aria-label={`${name}, ${describeRect(placement)}${hidden ? ', nascosto' : ''}`}
                aria-describedby={EDIT_HELP_ID}
                aria-haspopup="dialog"
                onPointerDown={(event) => startDrag('move', event)}
                onClick={(event) => {
                  // The release of a drag is not a tap: no menu.
                  if (ui.justDropped()) {
                    event.preventDefault();
                    return;
                  }
                  trigger.onClick?.();
                }}
                onKeyDown={onKeyDown}
              />
            )}
            removeRef={(node) => {
              removeRef.current = node;
            }}
            onMove={() => {
              ui.setKeyboardMode({ pageId, widgetId, mode: 'move' });
              handleRef.current?.focus();
              ui.announce('Usa le frecce per spostare il widget. Esc per terminare.');
            }}
            onResize={() => {
              ui.setKeyboardMode({ pageId, widgetId, mode: 'resize' });
              handleRef.current?.focus();
              ui.announce('Usa le frecce per cambiare la dimensione. Esc per terminare.');
            }}
            onSettings={() => ui.openWidgetSettings(pageId, widgetId)}
            onRemove={() => {
              ui.removeWidget(pageId, widgetId);
              ui.announce(`${name} rimosso dalla pagina.`);
            }}
          />
          {hidden && (
            <Caption tone="ink" className="aca-launcher-widget__badge">
              Nascosto
            </Caption>
          )}
          <ResizeHandle onPointerDown={(event) => startDrag('resize', event)} />
        </>
      )}
    </div>
  );
});
