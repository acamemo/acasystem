import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SystemGear } from '@/components/system/status-bar/SystemGear';
import { AppRoutes } from '@/routes/AppRoutes';
import { SystemLayout } from '@/pages/system/SystemLayout';

// The real gear: Sistema is the gear at the top right of the launcher (ADR-0016, C1).
vi.mock('@/pages/launcher/LauncherPage', () => ({
  LauncherPage: ({ overlay, onOpenSystem }: { overlay?: ReactNode; onOpenSystem: () => void }) => (
    <>
      <div hidden={Boolean(overlay)}>
        <SystemGear onOpenSystem={onOpenSystem} updateCount={2} />
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
  it('focuses the page title on opening and restores the launcher trigger on closing', async () => {
    render(
      <MemoryRouter>
        <AppRoutes showConnect={false} onConnected={() => undefined} />
      </MemoryRouter>
    );
    const trigger = screen.getByRole('button', { name: /^Sistema/ });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('heading', { level: 1, name: 'Sistema' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Torna al launcher' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('puts the focus back on the gear even when it had left the gear', async () => {
    render(
      <MemoryRouter>
        <AppRoutes showConnect={false} onConnected={() => undefined} />
      </MemoryRouter>
    );
    // Opened with the focus elsewhere (a click that did not focus): the name «Sistema…» finds it.
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(screen.getByRole('button', { name: /^Sistema/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Torna al launcher' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Sistema/ })).toHaveFocus());
  });

  describe('the return waits for the frame after the next one (ISSUE-109, R7)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    /** The frames the page asks for, run by hand. */
    function manualFrames() {
      const queue = new Map<number, FrameRequestCallback>();
      let next = 1;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        queue.set(next, callback);
        return next++;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
        queue.delete(id);
      });
      return {
        run: () =>
          act(() => {
            const callbacks = [...queue.values()];
            queue.clear();
            for (const callback of callbacks) callback(performance.now());
          }),
      };
    }

    const renderRoutes = () =>
      render(
        <MemoryRouter>
          <AppRoutes showConnect={false} onConnected={() => undefined} />
        </MemoryRouter>
      );

    it('not in the commit that closes Sistema, nor in the first frame; in the second', () => {
      const frames = manualFrames();
      renderRoutes();
      const trigger = screen.getByRole('button', { name: /^Sistema/ });
      trigger.focus();
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole('button', { name: 'Torna al launcher' }));
      expect(trigger).not.toHaveFocus();
      frames.run();
      expect(trigger).not.toHaveFocus();
      frames.run();
      expect(trigger).toHaveFocus();
    });

    it('Sistema opened again before the focus came back is not given it back', () => {
      const frames = manualFrames();
      renderRoutes();
      const trigger = screen.getByRole('button', { name: /^Sistema/ });
      trigger.focus();
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole('button', { name: 'Torna al launcher' }));
      fireEvent.click(screen.getByRole('button', { name: /^Sistema/ }));
      const title = screen.getByRole('heading', { level: 1, name: 'Sistema' });
      frames.run();
      frames.run();
      frames.run();
      expect(title).toHaveFocus();
    });

    it('leaves no frame behind when the app goes away', () => {
      const frames = manualFrames();
      const { unmount } = renderRoutes();
      const trigger = screen.getByRole('button', { name: /^Sistema/ });
      trigger.focus();
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole('button', { name: 'Torna al launcher' }));
      unmount();
      expect(() => {
        frames.run();
        frames.run();
      }).not.toThrow();
    });
  });
});
