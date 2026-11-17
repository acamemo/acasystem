import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WidgetRuntime } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import type { ServiceCatalog } from './operationalProfile';

const EMPTY_CATALOG: ServiceCatalog = {};
const requests = new WeakMap<object, Promise<ServiceCatalog>>();
/** The same catalog request can start before widgets mount, without reading their context. */
export function useRuntimeServiceCatalogState({
  conn,
  services: provided,
}: Pick<WidgetRuntime, 'conn' | 'services'>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ conn: object; attempt: number; services: ServiceCatalog | null; error: string } | null>(null);
  const retry = useCallback(() => {
    if (conn) requests.delete(conn);
    setAttempt((value) => value + 1);
  }, [conn]);
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
            : Promise.reject(new Error('Catalogo comandi non valido.'))
        );
      requests.set(conn, request);
    }
    request
      .then((services) => {
        if (active) setResult({ conn, attempt, services, error: '' });
      })
      .catch(() => {
        if (requests.get(conn) === request) requests.delete(conn);
        if (active) setResult({ conn, attempt, services: null, error: 'Non riesco a caricare i comandi.' });
      });
    return () => {
      active = false;
    };
  }, [conn, provided, attempt]);
  const current = result?.conn === conn && result.attempt === attempt ? result : null;
  const services = provided ?? current?.services ?? null;
  const status = provided ? 'ready' : !conn || typeof conn.sendMessagePromise !== 'function' ? 'idle'
    : current?.error ? 'error' : services !== null ? 'ready' : 'loading';
  return useMemo(() => ({ status, services, error: current?.error ?? '', retry }),
    [status, services, current?.error, retry]);
}

export function useRuntimeServiceCatalog(input: Pick<WidgetRuntime, 'conn' | 'services'>) {
  const result = useRuntimeServiceCatalogState(input);
  return result.status === 'error' ? EMPTY_CATALOG : result.services;
}

export function useServiceCatalog() {
  return useRuntimeServiceCatalog(useWidgetRuntime());
}
