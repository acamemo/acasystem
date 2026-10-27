import { Body, Console, type ConsoleOrigin } from '@/components/primitives';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ErrorBoundary } from './ErrorBoundary';
import { categoryDeviceId } from '../sheets/categoryPages';
import type { DefinitionResolver, DetailsTarget } from './DetailsSheet';

/**
 * Full-screen console of a widget whose definition has one (`Console`), in place of the sheet. The
 * definition gives only the content; the console (back arrow, title, Android Back, Escape, swipe
 * down, the flight from the widget) is the kit's. It stays mounted with a null target so the
 * console can shrink back into the widget.
 */
export function WidgetConsole({
  target,
  origin,
  onClose,
  resolve = findWidgetDefinition,
}: {
  target: DetailsTarget | null;
  origin?: ConsoleOrigin;
  onClose: () => void;
  resolve?: DefinitionResolver;
}) {
  const definition = target ? resolve(target.widgetId, target.settings) : undefined;
  const Content = definition?.Console;
  return (
    <Console
      open={Boolean(target && Content)}
      onClose={onClose}
      title={target?.title ?? 'Dettagli'}
      origin={origin}
    >
      {target && Content && (
        <ErrorBoundary
          resetKey={`${target.settingsKey}|${definition?.type ?? ''}`}
          label={`console ${target.widgetId}`}
          fallback={
            <Body size="sm" tone="muted">
              Non è stato possibile mostrare i dettagli di questo widget.
            </Body>
          }
        >
          <Content
            id={categoryDeviceId(target.widgetId, target.settings)}
            settingsKey={target.settingsKey}
            settings={target.settings}
            onClose={onClose}
          />
        </ErrorBoundary>
      )}
    </Console>
  );
}
