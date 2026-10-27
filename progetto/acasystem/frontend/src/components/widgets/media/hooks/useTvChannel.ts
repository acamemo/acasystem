import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { tvChannelCall } from '../model/tvRemote';
import type { TvKind, TvView } from '../model/tv';
import { useServiceActions } from './commands';

/** One channel up or down of a TV: whether it can, and how (see `tvChannelCall`). */
export function useTvChannel(kind: TvKind, view: TvView, remoteId: string) {
  const runtime = useWidgetRuntime();
  const actions = useServiceActions();
  const available = tvChannelCall(kind, view.entity, remoteId, 1) !== null;
  const step = (direction: 1 | -1) => {
    const call = tvChannelCall(kind, view.entity, remoteId, direction);
    if (!call) return;
    actions.run(`channel:${direction}`, () =>
      runtime.callService(call.domain, call.service, call.data)
    );
  };
  return {
    available,
    step,
    busy: { up: actions.busy === 'channel:1', down: actions.busy === 'channel:-1' },
    failed: actions.failed !== null,
  };
}
