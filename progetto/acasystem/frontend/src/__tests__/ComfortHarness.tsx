/**
 * Test harness of the comfort widgets (B3): renders a WidgetDefinition's Widget or Details
 * inside a fixture runtime, with a fake HA connection when the widget reads from HA.
 */
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { Connection } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { HaMessage } from '@/@types/ha';
import type { CellSize, WidgetDefinition, WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';

export interface WidgetCase {
  id: string;
  settings?: CardSettings;
  size?: CellSize;
  editMode?: boolean;
  runtime?: Partial<WidgetRuntime>;
}

export function widgetElement(definition: WidgetDefinition, options: WidgetCase): ReactElement {
  const { id, settings = {}, size = definition.sizes.default, editMode = false } = options;
  const runtime = createFixtureRuntime({ editMode, ...options.runtime });
  const { Widget } = definition;
  return (
    <WidgetRuntimeProvider value={runtime}>
      <Widget
        id={id}
        settingsKey={`home::${id}`}
        settings={settings}
        size={size}
        editMode={editMode}
      />
    </WidgetRuntimeProvider>
  );
}

export function renderWidget(definition: WidgetDefinition, options: WidgetCase) {
  const view = render(widgetElement(definition, options));
  return {
    ...view,
    update: (next: WidgetCase) => view.rerender(widgetElement(definition, next)),
  };
}

export function detailsElement(
  definition: WidgetDefinition,
  options: WidgetCase & { onClose?: () => void }
): ReactElement {
  const { id, settings = {}, onClose = () => undefined } = options;
  const runtime = createFixtureRuntime(options.runtime);
  const Details = definition.Details;
  if (!Details) throw new Error(`${definition.type} has no Details`);
  return (
    <WidgetRuntimeProvider value={runtime}>
      <Details id={id} settingsKey={`home::${id}`} settings={settings} onClose={onClose} />
    </WidgetRuntimeProvider>
  );
}

export function renderDetails(
  definition: WidgetDefinition,
  options: WidgetCase & { onClose?: () => void }
) {
  const view = render(detailsElement(definition, options));
  return {
    ...view,
    update: (next: WidgetCase & { onClose?: () => void }) =>
      view.rerender(detailsElement(definition, next)),
  };
}

/** Fake HA connection: every message goes to `handler`, recorded by the returned mock. */
export function fakeConnection(handler: (message: HaMessage) => unknown) {
  const sendMessagePromise = vi.fn(async (message: HaMessage) => handler(message));
  const conn = { sendMessagePromise } as unknown as Connection;
  return { conn, sendMessagePromise };
}

/** callService mock that resolves (or rejects with `error`). */
export function serviceMock(error?: Error) {
  return vi.fn(async (_domain: string, _service: string, _data?: Record<string, unknown>) => {
    if (error) throw error;
    return undefined;
  });
}
