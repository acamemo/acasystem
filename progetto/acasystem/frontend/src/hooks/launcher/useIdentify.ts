import { useCallback, useEffect, useRef, useState } from 'react';
import { useOptionalWidgetRuntime } from './WidgetRuntimeContext';
import type { IdentifyAction } from '@/utils/devices/identify';

export type IdentifyStatus = 'idle' | 'sending' | 'sent' | 'failed';

/**
 * «Fai lampeggiare»: runs the service of an `IdentifyAction` through the live connection of the
 * launcher, like any command of a widget. Without a launcher (a preview) nothing is offered.
 */
export function useIdentify(action: IdentifyAction | null): {
  available: boolean;
  status: IdentifyStatus;
  run: () => void;
} {
  const runtime = useOptionalWidgetRuntime();
  const callService = runtime?.callService;
  const [status, setStatus] = useState<IdentifyStatus>('idle');
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Another device: the answer of the previous one does not belong here.
  const key = action ? `${action.domain}.${action.service}:${action.entityId}` : '';
  useEffect(() => {
    setStatus('idle');
  }, [key]);

  const run = useCallback(() => {
    if (!action || !callService) return;
    setStatus('sending');
    callService(action.domain, action.service, action.data).then(
      () => {
        if (aliveRef.current) setStatus('sent');
      },
      () => {
        if (aliveRef.current) setStatus('failed');
      }
    );
  }, [action, callService]);

  return { available: action !== null && callService !== undefined, status, run };
}
