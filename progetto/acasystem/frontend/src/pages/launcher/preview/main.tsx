import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
import { ToastHost } from '@/components/system/toast/ToastHost';
import { PageProvider } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { PreviewApp } from './PreviewApp';
import {
  previewCardSettings,
  previewPageSettings,
  previewPagesConfig,
  previewPills,
} from './previewFixtures';
import './preview.css';

/**
 * Seeds the legacy configuration of the preview (this dev origin only) on the first visit or
 * with `?reset=1`; the launcher then migrates it like a real installation.
 */
function seedPreviewStorage() {
  const reset = new URLSearchParams(window.location.search).get('reset') === '1';
  try {
    if (!reset && localStorage.getItem('tunet_pages_config')) return;
    localStorage.setItem('tunet_pages_config', JSON.stringify(previewPagesConfig));
    localStorage.setItem('tunet_page_settings', JSON.stringify(previewPageSettings));
    localStorage.setItem('tunet_card_settings', JSON.stringify(previewCardSettings));
    localStorage.setItem('tunet_status_pills_config', JSON.stringify(previewPills));
    localStorage.removeItem(LAUNCHER_LAYOUT_STORAGE_KEY);
  } catch {
    // Storage unavailable: the preview starts from the defaults.
  }
}

// Development-only preview of the launcher with fixtures (launcher.html); not in the build.
const root = document.getElementById('launcher');
if (root) {
  seedPreviewStorage();
  createRoot(root).render(
    <StrictMode>
      <ToastProvider>
        <PageProvider>
          <PreviewApp />
        </PageProvider>
        <ToastHost />
      </ToastProvider>
    </StrictMode>
  );
}
