/**
 * Loads the Casa 3D bundle for a component (ADR-0014): `loading` until the entry is imported and
 * the elements are defined, `error` with a readable message otherwise. A new `attempt` retries.
 */
import { useEffect, useState } from 'react';
import { loadCasa3d, type LoadedCasa3d } from './loader';

export type Casa3dLoadState =
  | { status: 'loading' }
  | { status: 'ready'; loaded: LoadedCasa3d }
  | { status: 'error'; message: string };

export function useCasa3dBundle(attempt: number): Casa3dLoadState {
  const [state, setState] = useState<Casa3dLoadState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadCasa3d().then(
      (loaded) => {
        if (!cancelled) setState({ status: 'ready', loaded });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Casa 3D non si è caricata.',
          });
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return state;
}
