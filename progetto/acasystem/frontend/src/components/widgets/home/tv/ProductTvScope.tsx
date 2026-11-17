import { useCallback, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { WidgetRuntime } from '@/@types/launcher';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { useWidgetRuntime, WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { productTvScope } from './productTvModel';

/** Scope only the new product; global identity, legacy grouping and transports stay unchanged. */
export function ProductTvScope({
  settings,
  binding,
  active,
  children,
}: {
  settings: CardSettings;
  binding: ProductDeviceBinding;
  active: string;
  children: (current: CardSettings) => ReactNode;
}) {
  const runtime = useWidgetRuntime(),
    visible = usePageVisible();
  const scoped = useMemo(
    () => productTvScope(settings, binding, active, runtime.entities),
    [settings, binding, active, runtime.entities]
  );
  const live = useRef({ visible, runtime });
  live.current = { visible, runtime };
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const callService = useCallback<WidgetRuntime['callService']>((domain, service, data) => {
    if (!mounted.current || !live.current.visible || live.current.runtime.conn?.connected === false)
      return Promise.reject(new Error('Schermata non attiva o collegamento non disponibile'));
    return live.current.runtime.callService(domain, service, data);
  }, []);
  return (
    <WidgetRuntimeProvider
      value={{
        ...runtime,
        entities: scoped.entities,
        callService,
        conn: visible ? runtime.conn : null,
      }}
    >
      {children(scoped.settings)}
    </WidgetRuntimeProvider>
  );
}
