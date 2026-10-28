/** Entry of the Acasystem app, loaded by index.html (REP-20261006-001, wave 3). */
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
// Kit 2 skin (ADR-0011): remove this line to bring back the Metallo look.
import '@/themes/kit2/index.css';
import { ToastHost } from '@/components/system/toast/ToastHost';
import { ConfigProvider } from '@/hooks/context/ConfigContext';
import { PageProvider } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { AppErrorBoundary } from '@/templates/app-shell/AppErrorBoundary';
import { isChunkLoadError, reloadForChunkErrorOnce } from '@/utils/launcher/chunkReload';
import { App } from '@/app';
import { isDemoHash, normalizeDemoPath, resolveDemoMode } from '@/routes/mockupRoutes';
import { applyAppearance, readAppearance } from '@/utils/appearance';

// localhost:3002/mockup (or the old /ui-kit, /kit, /ui) typed without the hash: the demo address.
if (typeof window !== 'undefined') normalizeDemoPath();

// Demo mode (REP-20261028-005): the same app on a simulated Home Assistant, decided before it mounts.
const demo = typeof window !== 'undefined' && resolveDemoMode();
const DemoOverlay = demo ? lazy(() => import('@/pages/mockup/DemoOverlay')) : null;

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) reloadForChunkErrorOnce();
  });

  // The demo address typed inside the app: reload, so the demo starts with its own storage.
  if (!demo) {
    window.addEventListener('hashchange', () => {
      if (isDemoHash(window.location.hash) && resolveDemoMode()) window.location.reload();
    });
  }

  // Service worker for PWA installability, as before (not in the demo: it keeps the network out).
  if (!demo && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => undefined);
    });
  }
}

async function start() {
  // The simulated Home Assistant and the in-memory storage, before any provider reads the storage.
  if (demo) (await import('@/utils/mockup/demoMode')).enterDemo();

  // Theme and accent of this device before the first paint, so the app never flashes the wrong theme.
  if (typeof document !== 'undefined') applyAppearance(readAppearance());

  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <AppErrorBoundary>
          <ToastProvider>
            <HashRouter>
              <ConfigProvider>
                <PageProvider>
                  <App />
                </PageProvider>
              </ConfigProvider>
            </HashRouter>
            <ToastHost />
            {DemoOverlay && (
              <Suspense fallback={null}>
                <DemoOverlay />
              </Suspense>
            )}
          </ToastProvider>
        </AppErrorBoundary>
      </StrictMode>
    );
  }
}

void start();
