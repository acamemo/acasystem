/** Entry of the Acasystem app, loaded by index.html (REP-20261006-001, wave 3). */
import { StrictMode } from 'react';
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
import { applyAppearance, readAppearance } from '@/utils/appearance';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) reloadForChunkErrorOnce();
  });

  // Service worker for PWA installability, as before.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => undefined);
    });
  }
}

// localhost:3002/ui-kit (or /kit, /ui) typed without the hash: open the UI kit page.
if (
  typeof window !== 'undefined' &&
  ['/ui-kit', '/kit', '/ui'].includes(window.location.pathname.replace(/\/$/, ''))
) {
  window.history.replaceState(null, '', '/#/ui-kit');
}

// Theme and accent of this device before the first paint, so the app never flashes the wrong theme.
if (typeof document !== 'undefined') applyAppearance(readAppearance());

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <AppErrorBoundary>
        <ToastProvider>
          <ConfigProvider>
            <PageProvider>
              <HashRouter>
                <App />
              </HashRouter>
            </PageProvider>
          </ConfigProvider>
          <ToastHost />
        </ToastProvider>
      </AppErrorBoundary>
    </StrictMode>
  );
}
