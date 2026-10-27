import { Body, Sheet } from '@/components/primitives';
import { findWidgetDefinition } from '@/components/widgets/registry';
import type { CardSettings } from '@/@types/dashboard';
import type { WidgetDefinition } from '@/@types/launcher';
import { ErrorBoundary } from './ErrorBoundary';
import { categoryDeviceId } from '../sheets/categoryPages';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';

export type DefinitionResolver = (
  widgetId: string,
  settings: CardSettings
) => WidgetDefinition | undefined;

export interface DetailsTarget {
  widgetId: string;
  pageId: string;
  settingsKey: string;
  settings: CardSettings;
  title: string;
}

/** True when the widget has a details view the launcher can open. */
export function hasDetails(
  widgetId: string,
  settings: CardSettings = {},
  resolve: DefinitionResolver = findWidgetDefinition
): boolean {
  const definition = resolve(widgetId, settings);
  return Boolean(definition?.Details || definition?.Console);
}

/**
 * Bottom sheet with a widget's details. The definition gives only the content; the sheet
 * (title, close, focus, Escape, backdrop) is the kit's.
 */
export function DetailsSheet({
  target,
  onClose,
  resolve = findWidgetDefinition,
}: {
  target: DetailsTarget | null;
  onClose: () => void;
  resolve?: DefinitionResolver;
}) {
  const definition = target ? resolve(target.widgetId, target.settings) : undefined;
  const Details = definition?.Details;
  return (
    <Sheet
      open={Boolean(target && Details)}
      onClose={onClose}
      title={target?.title ?? 'Dettagli'}
      description={
        definition?.detailsWithoutLabel || definition?.label === target?.title
          ? undefined
          : definition?.label
      }
    >
      {target && Details && (
        <ErrorBoundary
          resetKey={`${target.settingsKey}|${definition?.type ?? ''}`}
          label={`details ${target.widgetId}`}
          fallback={
            <Body size="sm" tone="muted">
              Non è stato possibile mostrare i dettagli di questo widget.
            </Body>
          }
        >
          {Boolean(target.settings.categoryWidgetType) &&
            !['lock', 'alarm'].includes(String(target.settings.categoryWidgetType)) && (
              <AdaptiveCategoryWidget
                id={target.widgetId}
                entityId={categoryDeviceId(target.widgetId, target.settings)}
                type={String(target.settings.categoryWidgetType)}
                settingsKey={target.settingsKey}
                settings={target.settings}
                size={{ w: 4, h: 4 }}
                editMode={false}
                detailsMode
              />
            )}
          <Details
            id={categoryDeviceId(target.widgetId, target.settings)}
            settingsKey={target.settingsKey}
            settings={target.settings}
            onClose={onClose}
          />
        </ErrorBoundary>
      )}
    </Sheet>
  );
}
