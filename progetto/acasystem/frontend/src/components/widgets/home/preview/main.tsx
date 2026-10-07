import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
import './preview.css';
import { HomePreview } from './HomePreview';

// Development-only preview of the comfort widgets (preview-home.html); not in the production build.
const root = document.getElementById('preview');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <HomePreview />
    </StrictMode>
  );
}
