/** Entry of the Acasystem app, loaded by index.html (REP-20261006-001, wave 3). */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
import { ToastHost } from '@/components/system/toast/ToastHost';
import { ConfigProvider } from '@/hooks/context/ConfigContext';
import { PageProvider } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { AppErrorBoundary } from '@/templates/app-shell/AppErrorBoundary';
import { isChunkLoadError, reloadForChunkErrorOnce } from '@/utils/launcher/chunkReload';
import { App } from '@/app';

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
