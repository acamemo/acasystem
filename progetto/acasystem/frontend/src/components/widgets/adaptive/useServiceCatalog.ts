import { useEffect, useState } from 'react';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import type { ServiceCatalog } from './operationalProfile';

const requests = new WeakMap<object, Promise<ServiceCatalog>>();
export function useServiceCatalog() {
  const { conn, services: provided } = useWidgetRuntime();
  const [result, setResult] = useState<{ conn: object; services: ServiceCatalog } | null>(null);
  useEffect(() => {
    if (provided || !conn || typeof conn.sendMessagePromise !== 'function') return;
    let active = true;
    let request = requests.get(conn);
    if (!request) {
      request = conn
        .sendMessagePromise<unknown>({ type: 'get_services' })
        .then((value) =>
          value && typeof value === 'object' && !Array.isArray(value)
            ? (value as ServiceCatalog)
            : {}
        );
      requests.set(conn, request);
    }
    request
      .then((services) => {
        if (active) setResult({ conn, services });
      })
      .catch(() => {
        requests.delete(conn);
        if (active) setResult({ conn, services: {} });
      });
    return () => {
      active = false;
    };
  }, [conn, provided]);
  return provided ?? (result?.conn === conn ? result.services : null);
}
