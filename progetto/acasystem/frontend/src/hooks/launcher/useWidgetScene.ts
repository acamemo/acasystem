import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { afterTransition } from '@/utils/launcher/motion';
import { SHEET_IN_MS, SHEET_OUT_MS, SHEET_REDUCED_MS } from '@/components/primitives/components/Sheet';

/** The existing Home fade, shared by the actually committed widget and catalog windows. */
export function useWidgetScene(reduced: boolean) {
  const [phase, setPhase] = useState<'closed' | 'open' | 'returning'>('closed');
  const sceneRef = useRef<HTMLDivElement>(null);
  const owners = useRef(new Set<'widget' | 'catalog' | 'discovery' | 'tavano' | 'destination'>());
  const sourceFocus = useRef<HTMLElement | null>(null);
  const catalogProgress = useRef<number | null>(null);
  const previousInert = useRef<boolean | null>(null);
  const present = useCallback((owner: 'widget' | 'catalog' | 'discovery' | 'tavano' | 'destination', open: boolean) => {
    const previous = owners.current.size;
    if (open) owners.current.add(owner);
    else owners.current.delete(owner);
    if (owners.current.size && !previous) {
      const active = document.activeElement;
      if (!sourceFocus.current && active instanceof HTMLElement
        && !active.closest('.aca-console-overlay, .aca-bottom-drawer-overlay')) sourceFocus.current = active;
    }
    setPhase((current) => owners.current.size ? 'open' : current === 'open' ? 'returning' : current);
  }, []);
  const onWidgetOpenChange = useCallback((open: boolean) => present('widget', open), [present]);
  const onCatalogOpenChange = useCallback((open: boolean) => present('catalog', open), [present]);
  const onDiscoveryOpenChange = useCallback((open: boolean) => present('discovery', open), [present]);
  const onTavanoOpenChange = useCallback((open: boolean) => present('tavano', open), [present]);
  const onDestinationOpenChange = useCallback((open: boolean) => present('destination', open), [present]);
  const onCatalogProgress = useCallback((progress: number | null, immediate: boolean) => {
    const host = sceneRef.current;
    const shell = host?.querySelector<HTMLElement>(':scope > .aca-shell');
    if (!host || !shell) return;
    if (progress === null) {
      const target = catalogProgress.current;
      catalogProgress.current = null;
      if (target !== null) {
        if (target >= 1) owners.current.add('catalog');
        else if (target <= 0) owners.current.delete('catalog');
        setPhase(owners.current.size ? 'open' : 'closed');
      }
      host.removeAttribute('data-catalog-gesture');
      shell.style.removeProperty('opacity'); shell.style.removeProperty('transition');
      shell.style.removeProperty('pointer-events');
      if (previousInert.current === false) shell.removeAttribute('inert');
      previousInert.current = null;
      if (!owners.current.size) {
        if (sourceFocus.current?.isConnected && document.activeElement === document.body) sourceFocus.current.focus({ preventScroll: true });
        sourceFocus.current = null;
      }
      return;
    }
    if (catalogProgress.current === null && !sourceFocus.current && document.activeElement instanceof HTMLElement) {
      sourceFocus.current = document.activeElement;
    }
    if (previousInert.current === null) previousInert.current = shell.hasAttribute('inert');
    shell.setAttribute('inert', '');
    catalogProgress.current = progress;
    host.setAttribute('data-catalog-gesture', '');
    const duration = reduced ? 0 : progress >= 1 ? SHEET_IN_MS : SHEET_OUT_MS;
    shell.style.transition = immediate ? 'none' : 'opacity ' + duration + 'ms var(--aca-motion-ease-out, ease-out)';
    shell.style.opacity = String(1 - progress);
    shell.style.pointerEvents = 'none';
  }, [reduced]);
  useLayoutEffect(() => {
    if (phase !== 'closed') return;
    const source = sourceFocus.current;
    sourceFocus.current = null;
    const active = document.activeElement;
    if (source?.isConnected && (active === document.body || active?.closest('[data-panel-state="exiting"]'))) {
      source.focus({ preventScroll: true });
    }
  }, [phase]);
  useEffect(() => {
    if (phase !== 'returning') return undefined;
    return afterTransition(sceneRef.current?.querySelector('.aca-shell') ?? null, ['opacity'],
      reduced ? SHEET_REDUCED_MS : SHEET_OUT_MS,
      () => { if (!owners.current.size) setPhase('closed'); }, { fromRun: true });
  }, [phase, reduced]);
  return { phase, sceneRef, onWidgetOpenChange, onCatalogOpenChange, onDiscoveryOpenChange, onTavanoOpenChange, onDestinationOpenChange, onCatalogProgress };
}
