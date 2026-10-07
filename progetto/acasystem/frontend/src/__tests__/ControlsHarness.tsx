/** Shared helpers of the Controls* tests (B2): fixture runtime, HA updates, a fake connection. */
import type { ReactElement } from 'react';
import { act, render } from '@testing-library/react';
import { vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { Connection } from '@/@types/ha';
import type { WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities } from '@/utils/fixtures/runtime';

export type CallServiceMock = ReturnType<typeof vi.fn<WidgetRuntime['callService']>>;

export function serviceMock(
  impl: WidgetRuntime['callService'] = async () => undefined
): CallServiceMock {
  return vi.fn<WidgetRuntime['callService']>(impl);
}

/** Connection whose history and statistics requests answer with `respond` (empty by default). */
export function fakeConnection(respond: (message: { type: string }) => unknown = () => ({})) {
  const sendMessagePromise = vi.fn(async (message: { type: string }) => respond(message));
  return { conn: { sendMessagePromise } as unknown as Connection, sendMessagePromise };
}

export function renderWithRuntime(ui: ReactElement, overrides: Partial<WidgetRuntime> = {}) {
  let runtime = createFixtureRuntime(overrides);
  const wrap = () => <WidgetRuntimeProvider value={runtime}>{ui}</WidgetRuntimeProvider>;
  const utils = render(wrap());
  return {
    ...utils,
    get runtime() {
      return runtime;
    },
    /** Simulates an update from Home Assistant (new entities, connection, flags). */
    update(patch: Partial<WidgetRuntime>) {
      runtime = { ...runtime, ...patch };
      act(() => {
        utils.rerender(wrap());
      });
    },
    /** Replaces the given entities, as a state_changed event would. */
    setEntities(list: HassEntity[]) {
      this.update({ entities: { ...runtime.entities, ...fixtureEntities(list) } });
    },
  };
}

/** Lets rejected service calls and resolved fetches settle. */
export async function flush() {
  await act(async () => {
    for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
  });
}
