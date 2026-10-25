import { useEffect, useRef, useState } from 'react';
import type { CellSize } from '@/@types/launcher';
import { WidgetUnavailable } from '@/components/system/launcher/LauncherStates';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { ErrorBoundary } from './ErrorBoundary';
import { useLauncherUi } from './LauncherUiContext';
import { CategoryWidgetContent } from './CategoryWidgetContent';

/** Seconds between two widgets when the stack turns by itself. */
const ROTATE_MS = 10000;

/** One widget of a stack, drawn like a widget of the grid (without its own frame). */
function StackMember({
  pageId,
  widgetId,
  size,
  editMode,
}: {
  pageId: string;
  widgetId: string;
  size: CellSize;
  editMode: boolean;
}) {
  const ui = useLauncherUi();
  const settingsKey = ui.controller.settingsKeyFor(pageId, widgetId);
  const settings = ui.controller.settingsFor(pageId, widgetId);
  const definition = ui.findDefinition(widgetId, settings);
  const name = ui.widgetName(pageId, widgetId);
  return (
    <ErrorBoundary
      resetKey={`${settingsKey}|${definition?.type ?? 'none'}`}
      label={`widget ${widgetId}`}
      fallback={<WidgetUnavailable reason="error" name={name} compact={size.w * size.h < 2} />}
    >
      {definition && settings.categoryWidgetType ? (
        <CategoryWidgetContent
          definition={definition}
          id={widgetId}
          settingsKey={settingsKey}
          settings={settings}
          size={size}
          editMode={editMode}
          onConfigure={() => ui.openWidgetSettings(pageId, widgetId)}
        />
      ) : definition ? (
        <definition.Widget
          id={widgetId}
          settingsKey={settingsKey}
          settings={settings}
          size={size}
          editMode={editMode}
        />
      ) : (
        <WidgetUnavailable reason="missing" name={name} compact={size.w * size.h < 2} />
      )}
    </ErrorBoundary>
  );
}

/**
 * A stack of widgets (REP-20261007-037), as the stacks of One UI: one widget at a time in the
 * same place, swiped sideways (scroll snap, kept inside the stack), with dots below; with
 * `rotate` it turns to the next one every ten seconds while the page is shown.
 */
export function StackView({
  pageId,
  ids,
  rotate,
  size,
  editMode,
}: {
  pageId: string;
  ids: readonly string[];
  rotate: boolean;
  size: CellSize;
  editMode: boolean;
}) {
  const visible = usePageVisible();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = ids.length;

  useEffect(() => {
    if (!rotate || !visible || editMode || count < 2) return undefined;
    const timer = setInterval(() => {
      const element = track.current;
      if (!element || element.clientWidth === 0) return;
      const next = (Math.round(element.scrollLeft / element.clientWidth) + 1) % count;
      element.scrollTo?.({ left: next * element.clientWidth, behavior: 'smooth' });
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotate, visible, editMode, count]);

  return (
    <div className="aca-stack">
      <div
        ref={track}
        className="aca-stack__track"
        data-no-long-press={editMode ? undefined : true}
        onScroll={(event) => {
          const element = event.currentTarget;
          if (element.clientWidth > 0) {
            setIndex(Math.round(element.scrollLeft / element.clientWidth));
          }
        }}
      >
        {ids.map((id, position) => (
          <div
            key={id}
            className="aca-stack__item"
            aria-hidden={position !== index || undefined}
            inert={position !== index || undefined}
          >
            <StackMember pageId={pageId} widgetId={id} size={size} editMode={editMode} />
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="aca-stack__dots" aria-hidden="true">
          {ids.map((id, position) => (
            <span
              key={id}
              className={position === index ? 'aca-stack__dot is-current' : 'aca-stack__dot'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
