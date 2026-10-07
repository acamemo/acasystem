/** Test helpers of the utility widgets (B5): fixture runtime, fake HA connection. */
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import { vi } from 'vitest';
import type { WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';

export function renderWithRuntime(ui: ReactElement, overrides: Partial<WidgetRuntime> = {}) {
  let runtime = createFixtureRuntime(overrides);
  let current = ui;
  const result = render(<WidgetRuntimeProvider value={runtime}>{ui}</WidgetRuntimeProvider>);
  return {
    ...result,
    runtime,
    /** Re-renders with runtime changes (accumulated) and optionally another element. */
    update: (next: Partial<WidgetRuntime>, nextUi: ReactElement = current) => {
      runtime = { ...runtime, ...next };
      current = nextUi;
      result.rerender(<WidgetRuntimeProvider value={runtime}>{nextUi}</WidgetRuntimeProvider>);
    },
  };
}

type Handler = (message: Record<string, unknown>) => unknown;

/** Connection whose `sendMessagePromise` answers by message type. */
export function fakeConnection(handlers: Record<string, Handler>) {
  const sendMessagePromise = vi.fn(async (message: Record<string, unknown>) => {
    const handler = handlers[String(message.type)];
    if (!handler) throw new Error(`Unexpected message ${String(message.type)}`);
    return handler(message);
  });
  return { conn: { sendMessagePromise } as unknown as Connection, sendMessagePromise };
}
