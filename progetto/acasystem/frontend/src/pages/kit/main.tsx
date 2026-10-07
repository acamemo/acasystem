import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
import './kit.css';
import KitPage from './KitPage';

// Development-only gallery of the «Metallo» kit (ADR-0006); not part of the production build.
const root = document.getElementById('kit');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <KitPage />
    </StrictMode>
  );
}
