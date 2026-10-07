import { useCallback, useLayoutEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ConnectPage } from '@/pages/connect';
import { LauncherPage } from '@/pages/launcher/LauncherPage';
import { SystemPage } from '@/pages/system';

/** Hash routes of the app: the launcher (default) and the Sistema page. */
export const ROUTES = {
  launcher: '/',
  system: '/sistema',
} as const;

export interface AppRoutesProps {
  /** No Home Assistant connection configured yet: only the connection page is shown. */
  showConnect: boolean;
  onConnected: () => void;
}

/**
 * Routing of the new app. The launcher stays mounted (hidden) while Sistema is open, so the
 * page shown, edit mode, popup triggers and settings sync carry on as with the legacy panels;
 * Sistema is drawn inside the launcher's provider, so the cover switch and the profiles act on
 * the same layout. Old links such as `#/page/home` land on the launcher.
 */
export function AppRoutes({ showConnect, onConnected }: AppRoutesProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const inSystem = location.pathname === ROUTES.system;
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
  useLayoutEffect(() => {
    if (wasInSystem.current && !inSystem && !showConnect) {
      const trigger = systemTrigger.current?.isConnected
        ? systemTrigger.current
        : document.querySelector<HTMLElement>('button[aria-label^="Sistema"]');
      trigger?.focus({ preventScroll: true });
      systemTrigger.current = null;
    }
    wasInSystem.current = inSystem;
  }, [inSystem, showConnect]);

  if (showConnect) {
    return (
      <div className="aca-app-root">
        <ConnectPage onConnected={onConnected} />
      </div>
    );
  }

  return (
    <div className="aca-app-root">
      <LauncherPage
        onOpenSystem={openSystem}
        overlay={inSystem ? <SystemPage onClose={closeSystem} /> : null}
      />
      <Routes>
        <Route path={ROUTES.launcher} element={null} />
        <Route path={ROUTES.system} element={null} />
        <Route path="*" element={<Navigate to={ROUTES.launcher} replace />} />
      </Routes>
    </div>
  );
}
