/** Entry of the Acasystem app, loaded by index.html (REP-20261006-001, wave 3). */
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@/styles/index.css';
import '@/design/index.css';
import { ToastHost } from '@/components/system/toast/ToastHost';
import { ConfigProvider } from '@/hooks/context/ConfigContext';
import { PageProvider } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { AppErrorBoundary } from '@/templates/app-shell/AppErrorBoundary';
import { isChunkLoadError, reloadForChunkErrorOnce } from '@/utils/launcher/chunkReload';
import { App } from '@/app';
import { isDemoHash, normalizeDemoPath, resolveDemoMode } from '@/routes/mockupRoutes';
import { applyAppearance, readAppearance } from '@/utils/appearance';
import { captureWebPairing } from '@/api/webPairing';
import { Body, Button, Spinner } from '@/components/primitives';
import { prepareStartupUpdates } from '@/utils/startupUpdates';

const initialPairingHref = typeof window !== 'undefined' ? window.location.href : '';
const initialPairing = typeof window !== 'undefined' ? captureWebPairing(window.location, window.history) : null;

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
    const reactRoot = createRoot(root);
    const reload = () => {
      // Il link gia validato viene ricatturato dal nuovo main: nessun invito perso o salvato su disco.
      if (initialPairing?.kind === 'ready') window.history.replaceState(window.history.state, '', initialPairingHref);
      window.location.reload();
    };
    const loading = (text: string) => reactRoot.render(<main className="aca-connect"><Spinner /><Body role="status">{text}</Body></main>);
    const mount = () => reactRoot.render(
      <StrictMode>
        <AppErrorBoundary>
          <ToastProvider>
            <HashRouter>
              <ConfigProvider>
                <PageProvider>
                  <App initialPairing={initialPairing} />
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
    const proceed = async () => {
      if (!demo) loading('Verifica degli aggiornamenti…');
      const result = await prepareStartupUpdates({ demo, appVersion: __APP_VERSION__, userAgent: navigator.userAgent,
        onUpdating: () => loading('Aggiornamento di Acasystem in corso…') });
      if (result.kind === 'reload') {
        const key = 'aca-startup-update-reload';
        try {
          if (sessionStorage.getItem(key) !== result.version) {
            sessionStorage.setItem(key, result.version);
            reload();
            return;
          }
        } catch { /* Storage non disponibile: mostrare una ripresa esplicita, senza loop di reload. */ }
      }
      if (result.kind !== 'ready') {
        const message = result.kind === 'updating' ? 'La centrale sta ancora aggiornando Acasystem. Attendi un momento e riprova.'
          : result.kind === 'reload' ? 'La nuova interfaccia non è ancora disponibile. Chiudi e riapri ACA, oppure riprova.'
            : 'La centrale non risponde ancora. Controlla il collegamento e riprova.';
        reactRoot.render(<main className="aca-connect"><Body role="status">{message}</Body><Button variant="primary" onClick={result.kind === 'reload' ? reload : () => void proceed()}>{result.kind === 'reload' ? 'Ricarica' : 'Riprova'}</Button></main>);
        return;
      }
      mount();
    };
    await proceed();
  }
}

void start();
