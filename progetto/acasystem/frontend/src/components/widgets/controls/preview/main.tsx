// Development-only page of the control widgets preview (preview-controls.html, port 5176).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
import ControlsPreview from './ControlsPreview';

const root = document.getElementById('anteprima');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ControlsPreview />
    </StrictMode>
  );
}
