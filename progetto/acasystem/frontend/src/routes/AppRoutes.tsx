import { lazy, Suspense, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/primitives';
import { CASA_PLAN_ROUTE, CASA_ROUTE, casaOpenState, isCasaPath } from '@/casa3d/casaNav';
import { CASA3D_OPENER_ATTRIBUTE, Casa3dHouseContext } from '@/casa3d/houseContext';
import { ConnectPage } from '@/pages/connect';
import { LauncherPage } from '@/pages/launcher/LauncherPage';
import { SystemPage } from '@/pages/system';
import { afterNextFrame } from '@/utils/launcher/afterFrame';

/**
 * Hash routes of the app: the launcher (default), the Sistema page, the house (Casa 3D, ADR-0014 R1:
 * `#/casa`, and `#/casa/piantina` for the editor of the plan to come) and the UI kit preview.
 */
export const ROUTES = {
  launcher: '/',
  system: '/sistema',
  casa: CASA_ROUTE,
  casaPlan: CASA_PLAN_ROUTE,
  uiKit: '/ui-kit',
  // Development only (ISSUE-091): the address is not even in the production bundle.
  casa3dProva: import.meta.env.DEV ? '/casa3d-prova' : '',
} as const;

// Prototypes in preview (REP-20261007-004), loaded only when the page is opened.
const UiKitPage = lazy(() => import('@/pages/ui-kit/UiKitPage'));
// The house at full screen (ADR-0014, R1): the launcher's bundle carries only the route.
const CasaScreen = lazy(() => import('@/casa3d/CasaScreen'));
// Development page of Casa 3D (ADR-0014, T3): not linked anywhere, reached by its address only,
// and left out of the production build (the DEV check lets the bundler drop the import).
const Casa3dProva = import.meta.env.DEV ? lazy(() => import('@/casa3d/Casa3dProva')) : null;

export interface AppRoutesProps {
  /** No Home Assistant connection configured yet: only the connection page is shown. */
  showConnect: boolean;
  onConnected: () => void;
}

/**
 * Routing of the new app. The launcher stays mounted (hidden) while Sistema or the house are open,
 * so the page shown, edit mode, popup triggers and settings sync carry on as with the legacy
 * panels; Sistema is drawn inside the launcher's provider, so the cover switch and the profiles act
 * on the same layout. The house (`#/casa`) is a screen of the same kind, and whoever opens it (the
 * Casa 3D page, Sistema) gets the focus back on leaving. Old links such as `#/page/home` land on
 * the launcher.
 */
export function AppRoutes({ showConnect, onConnected }: AppRoutesProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const inSystem = location.pathname === ROUTES.system;
  const inCasa = isCasaPath(location.pathname);
  const systemTrigger = useRef<HTMLElement | null>(null);
  const wasInSystem = useRef(inSystem);
  const openSystem = useCallback(() => {
    systemTrigger.current =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : document.querySelector<HTMLElement>('button[aria-label^="Sistema"]');
    navigate(ROUTES.system);
  }, [navigate]);
  const closeSystem = useCallback(() => navigate(ROUTES.launcher), [navigate]);

  // The house: opened by a button of the launcher page or of Sistema, which gets the focus back.
  const casaTrigger = useRef<HTMLElement | null>(null);
  const wasInCasa = useRef(inCasa);
  const openCasa = useCallback(
    (trigger?: HTMLElement | null) => {
      casaTrigger.current =
        trigger ??
        (document.activeElement instanceof HTMLElement && document.activeElement !== document.body
          ? document.activeElement
          : null);
      navigate(ROUTES.casa, { state: casaOpenState() });
    },
    [navigate]
  );
  const house = useMemo(() => ({ open: openCasa }), [openCasa]);
  useLayoutEffect(() => {
    if (wasInCasa.current && !inCasa && !showConnect) {
      // The button may be gone (Sistema is built again): then the one on the screen that came back.
      const trigger = casaTrigger.current?.isConnected
        ? casaTrigger.current
        : Array.from(document.querySelectorAll<HTMLElement>(`[${CASA3D_OPENER_ATTRIBUTE}]`)).find(
            (button) => !button.closest('[hidden]')
          );
      trigger?.focus({ preventScroll: true });
      casaTrigger.current = null;
    }
    wasInCasa.current = inCasa;
  }, [inCasa, showConnect]);

  // The focus comes back to the gear in the frame after the next one (ISSUE-109, R7): in the layout
  // effect its `focus()` forced the style of the whole launcher inside the commit of the return
  // (303 ms on the Tab M11). A visit to Sistema or the house that begins before it cancels it.
  const returnFocus = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    if (inSystem || inCasa || showConnect) {
      returnFocus.current?.();
      returnFocus.current = null;
    }
    if (wasInSystem.current && !inSystem && !inCasa && !showConnect) {
      const trigger = systemTrigger.current?.isConnected
        ? systemTrigger.current
        : document.querySelector<HTMLElement>('button[aria-label^="Sistema"]');
      systemTrigger.current = null;
      returnFocus.current?.();
      returnFocus.current = afterNextFrame(() => {
        returnFocus.current = null;
        // The gear may have gone in the two frames (Sistema built again): the one on the screen.
        const target = trigger?.isConnected
          ? trigger
          : document.querySelector<HTMLElement>('button[aria-label^="Sistema"]');
        target?.focus({ preventScroll: true });
      });
    }
    wasInSystem.current = inSystem;
  }, [inSystem, inCasa, showConnect]);
  useLayoutEffect(
    () => () => {
      returnFocus.current?.();
      returnFocus.current = null;
    },
    []
  );

  // The UI kit page shows static prototypes: no connection or launcher needed.
  if (location.pathname === ROUTES.uiKit || location.pathname === '/kit') {
    return (
      <div className="aca-app-root">
        <Suspense fallback={null}>
          <UiKitPage />
        </Suspense>
      </div>
    );
  }

  if (showConnect) {
    return (
      <div className="aca-app-root">
        <ConnectPage onConnected={onConnected} />
      </div>
    );
  }

  // The Casa 3D development page needs the Home Assistant connection, so it comes after the connection page.
  if (import.meta.env.DEV && Casa3dProva && location.pathname === ROUTES.casa3dProva) {
    return (
      <div className="aca-app-root">
        <Suspense fallback={null}>
          <Casa3dProva onClose={closeSystem} />
        </Suspense>
      </div>
    );
  }

  const overlay = inSystem ? (
    <SystemPage onClose={closeSystem} />
  ) : inCasa ? (
    <Suspense fallback={<Skeleton variant="panel" rows={2} label="Caricamento della casa…" />}>
      <CasaScreen onOpenSystem={openSystem} />
    </Suspense>
  ) : null;

  return (
    <Casa3dHouseContext.Provider value={house}>
      <div className="aca-app-root">
        <LauncherPage onOpenSystem={openSystem} overlay={overlay} overlayStaged={inSystem} />
        <Routes>
          <Route path={ROUTES.launcher} element={null} />
          <Route path={ROUTES.system} element={null} />
          <Route path={ROUTES.casa} element={null} />
          <Route path={ROUTES.casaPlan} element={null} />
          <Route path={ROUTES.uiKit} element={null} />
          <Route path="*" element={<Navigate to={ROUTES.launcher} replace />} />
        </Routes>
      </div>
    </Casa3dHouseContext.Provider>
  );
}
