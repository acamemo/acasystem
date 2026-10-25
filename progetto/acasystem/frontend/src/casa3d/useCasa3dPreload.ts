/**
 * Asks the browser to fetch and compile the Casa 3D code (modulepreload) once the page is on
 * screen or next to it; nothing is run and no renderer is created. Errors are ignored here: the
 * page that really needs the bundle shows its own message.
 */
import { useEffect } from 'react';
import { preloadCasa3d } from './loader';

export function useCasa3dPreload(near: boolean): void {
  useEffect(() => {
    if (!near) return;
    preloadCasa3d().catch(() => undefined);
  }, [near]);
}
