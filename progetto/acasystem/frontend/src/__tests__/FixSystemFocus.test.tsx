import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/routes/AppRoutes';
import { SystemLayout } from '@/pages/system/SystemLayout';

vi.mock('@/pages/launcher/LauncherPage', () => ({
  LauncherPage: ({ overlay, onOpenSystem }: { overlay?: ReactNode; onOpenSystem: () => void }) => (
    <>
      <div hidden={Boolean(overlay)}>
        <button aria-label="Sistema" onClick={onOpenSystem}>
          Sistema
        </button>
      </div>
      {overlay}
    </>
  ),
}));
vi.mock('@/pages/system', () => ({
  SystemPage: ({ onClose }: { onClose: () => void }) => (
    <SystemLayout sections={[]} onClose={onClose} />
  ),
}));
vi.mock('@/pages/connect', () => ({ ConnectPage: () => <p>Collegamento</p> }));

describe('Sistema focus, A11Y-4', () => {
  it('focuses the page title on opening and restores the launcher trigger on closing', () => {
    render(
      <MemoryRouter>
        <AppRoutes showConnect={false} onConnected={() => undefined} />
      </MemoryRouter>
    );
    const trigger = screen.getByRole('button', { name: 'Sistema' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('heading', { level: 1, name: 'Sistema' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Torna al launcher' }));
    expect(trigger).toHaveFocus();
  });
});
