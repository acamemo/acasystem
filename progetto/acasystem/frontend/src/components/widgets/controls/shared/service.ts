import type { ServiceData } from '@/@types/ha';
import type { WidgetRuntime } from '@/@types/launcher';

/**
 * Calls a Home Assistant service and always returns a promise: a synchronous throw becomes a
 * rejection, so the requested state can report it as an error.
 */
export function callSafely(
  runtime: Pick<WidgetRuntime, 'callService'>,
  domain: string,
  service: string,
  data: ServiceData
): Promise<unknown> {
  return new Promise<unknown>((resolve) => {
    resolve(runtime.callService(domain, service, data));
  });
}

/** Fire-and-forget variant for commands without a tracked request; failures are swallowed. */
export function callQuietly(
  runtime: Pick<WidgetRuntime, 'callService'>,
  domain: string,
  service: string,
  data: ServiceData
): void {
  callSafely(runtime, domain, service, data).catch(() => undefined);
}
