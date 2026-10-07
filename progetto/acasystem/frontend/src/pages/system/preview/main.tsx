import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
import { PageProvider } from '@/hooks/context/PageContext';
import { previewCardSettings, previewPagesConfig, previewPills } from './fixtures';
import { PreviewSystem } from './PreviewSystem';
import './preview.css';

/** Seeds the legacy configuration of this dev origin on the first visit or with `?reset=1`. */
function seedPreviewStorage() {
  const reset = new URLSearchParams(window.location.search).get('reset') === '1';
  try {
    if (!reset && localStorage.getItem('tunet_pages_config')) return;
    localStorage.setItem('tunet_pages_config', JSON.stringify(previewPagesConfig));
    localStorage.setItem('tunet_card_settings', JSON.stringify(previewCardSettings));
    localStorage.setItem('tunet_status_pills_config', JSON.stringify(previewPills));
    localStorage.setItem('tunet_header_title', 'Casa');
  } catch {
    // Storage unavailable: the preview starts from the defaults.
  }
}

// Development-only preview of the system sheets and pages (preview-system.html); not in the build.
const root = document.getElementById('preview');
if (root) {
  seedPreviewStorage();
  createRoot(root).render(
    <StrictMode>
      <PageProvider>
        <PreviewSystem />
      </PageProvider>
    </StrictMode>
  );
}
