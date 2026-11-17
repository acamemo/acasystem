import { sensorProductBinding, multimediaProductBinding } from '@/utils/devices/productBinding';
import { useLayoutEffect } from 'react';
import { Body, Console, ConsoleColumns } from '@/components/primitives';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ErrorBoundary } from './ErrorBoundary';
import { categoryDeviceId } from '@/domain/launcher/categoryPages';
import { isProductDeviceBinding } from '../../../../contracts/productDevice';
import { WidgetDetailsContent, type DefinitionResolver, type DetailsTarget } from './DetailsSheet';
import './widgetConsole.css';

/**
 * Shared full-screen view of a widget's existing Console or Details. The
 * definition gives only the content; the console (back arrow, title, Android Back, Escape, swipe
 * down and the centered window transition) is the kit's. It stays mounted with a null target
 * so the window can complete its exit.
 */
export function WidgetConsole({
  target,
  onClose,
  onOpenChange,
  resolve = findWidgetDefinition,
}: {
  target: DetailsTarget | null;
  onClose: () => void;
  /** Actual loaded screen presence, so Home never fades while a lazy chunk is still loading. */
  onOpenChange?: (open: boolean) => void;
  resolve?: DefinitionResolver;
}) {
  const definition = target ? resolve(target.widgetId, target.settings) : undefined;
  const Content = definition?.Console;
  const open = Boolean(target && (Content || definition?.Details));
  useLayoutEffect(() => {
    onOpenChange?.(open);
    return () => onOpenChange?.(false);
  }, [open, onOpenChange]);
  return (
    <Console
      open={open}
      onClose={onClose}
      title={target?.title ?? 'Dettagli'}
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
      {target && !Content && definition?.Details && (
        <ConsoleColumns main={<div className="widget-console-details">
          {!definition.detailsWithoutLabel && definition.label !== target.title
            && !(sensorProductBinding(target.settings) || multimediaProductBinding(target.settings) || isProductDeviceBinding(target.settings.productDevice) && ['light', 'plug', 'climate', 'cover', 'fan', 'lock', 'alarm', 'camera', 'vacuum', 'mower'].includes(target.settings.productDevice.family)
              && target.settings.productDevice.primaryEntityId === categoryDeviceId(target.widgetId, target.settings)) && (
            <Body size="sm" tone="muted">{definition.label}</Body>
          )}
          <WidgetDetailsContent target={target} definition={definition} onClose={onClose} />
        </div>} />
      )}
    </Console>
  );
}
