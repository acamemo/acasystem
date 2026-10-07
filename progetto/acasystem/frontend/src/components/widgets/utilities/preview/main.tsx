import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
import PreviewPage from './PreviewPage';

// Development-only preview of the utility widgets (wave 2, B5); not part of the production build.
const root = document.getElementById('anteprima');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PreviewPage />
    </StrictMode>
  );
}
