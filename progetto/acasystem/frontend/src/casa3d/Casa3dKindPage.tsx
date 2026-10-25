/**
 * The page definition of the registry (PageKindDefinition): a thin wrapper that loads the shell
 * on demand, so the launcher's main bundle carries only these lines (ADR-0014, T4a).
 */
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/primitives';
import type { PageKindProps } from '@/@types/launcher';

const Casa3dPage = lazy(() => import('./Casa3dPage'));

export function Casa3dKindPage(props: PageKindProps) {
  return (
    <Suspense fallback={<Skeleton variant="panel" rows={2} label="Caricamento di Casa 3D…" />}>
      <Casa3dPage {...props} />
    </Suspense>
  );
}
