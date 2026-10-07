import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
import './preview.css';
import PreviewMedia from './PreviewMedia';

// Development-only gallery of the media widgets (preview-media.html); not in the production build.
const root = document.getElementById('preview');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PreviewMedia />
    </StrictMode>
  );
}
