import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenCommands } from '@/components/system/launcher/ScreenCommands';
import { EditHint } from '@/components/system/edit/EditHint';
import { PageIndicator } from '@/components/system/page-indicator/PageIndicator';
import { SystemGear, systemGearLabel } from '@/components/system/status-bar/SystemGear';
import {
  EDIT_HINT_DELAY_MS,
  EDIT_HINT_KEY,
  EDIT_HINT_MS,
  useEditHint,
} from '@/hooks/launcher/useEditHint';
import { PAGE_FLASH_MS, usePageFlash } from '@/hooks/launcher/usePageFlash';

/**
 * ADR-0016, C1-C3: the gear of Sistema, the commands with no face, the indicator shown for a
 * moment after a page change and the hint of the first time. The screen that puts them together
 * is tested with the launcher (LauncherScreen.test.tsx).
 */

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('the gear of Sistema (C1)', () => {
  it('is named Sistema, and says what its dot is for', () => {
    expect(systemGearLabel(0, false)).toBe('Sistema');
    expect(systemGearLabel(1, false)).toBe('Sistema, 1 aggiornamento disponibile');
    expect(systemGearLabel(3, false)).toBe('Sistema, 3 aggiornamenti disponibili');
    expect(systemGearLabel(0, true)).toBe('Sistema, problema di connessione');
    expect(systemGearLabel(2, true)).toBe(
      'Sistema, problema di connessione, 2 aggiornamenti disponibili'
    );
  });

  it('opens Sistema with a tap and has no dot when nothing waits there', () => {
    const open = vi.fn();
    const { container } = render(<SystemGear onOpenSystem={open} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sistema' }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.aca-badge')).toBeNull();
    expect(container.querySelector('.aca-system-gear')).not.toHaveClass('aca-system-gear--problem');
  });

  it('carries a dot for updates, a red one for a connection problem, and takes no touch while dragging', () => {
    const { container, rerender } = render(<SystemGear onOpenSystem={vi.fn()} updateCount={2} />);
    expect(container.querySelector('.aca-badge')).not.toBeNull();
    expect(container.querySelector('.aca-system-gear')).not.toHaveClass('aca-system-gear--problem');
    rerender(<SystemGear onOpenSystem={vi.fn()} updateCount={2} connectionProblem />);
    expect(container.querySelector('.aca-system-gear')).toHaveClass('aca-system-gear--problem');
    expect(
      screen.getByRole('button', {
        name: 'Sistema, problema di connessione, 2 aggiornamenti disponibili',
      })
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.aca-badge')).toHaveLength(1);
    rerender(<SystemGear onOpenSystem={vi.fn()} inert />);
    expect(container.querySelector('.aca-system-gear')).toHaveAttribute('inert');
  });
});

describe('the commands with no face (C3)', () => {
  const props = {
    canGoBack: true,
    canGoForward: true,
    onEdit: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
  };

  it('are three buttons in a group, each with its name, and call what they say', () => {
    const onEdit = vi.fn();
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<ScreenCommands {...props} onEdit={onEdit} onPrevious={onPrevious} onNext={onNext} />);
    const group = screen.getByRole('group', { name: 'Comandi della schermata' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Modifica la disposizione', 'Pagina precedente', 'Pagina successiva']);
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pagina precedente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pagina successiva' }));
    expect([onEdit, onPrevious, onNext].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('cannot go past the first and the last page, and are out of the way when hidden', () => {
    const { container, rerender } = render(
      <ScreenCommands {...props} canGoBack={false} canGoForward />
    );
    expect(screen.getByRole('button', { name: 'Pagina precedente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pagina successiva' })).toBeEnabled();
    rerender(<ScreenCommands {...props} canGoBack canGoForward={false} />);
    expect(screen.getByRole('button', { name: 'Pagina successiva' })).toBeDisabled();
    expect(container.querySelector('.aca-screen-commands')).not.toHaveAttribute('inert');
    rerender(<ScreenCommands {...props} hidden />);
    const group = container.querySelector('.aca-screen-commands');
    expect(group).toHaveAttribute('inert');
    expect(group).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('the indicator as a cue (C2)', () => {
  const labels = ['Copertina', 'Casa', 'Luci'];

  it('passive: it takes no touch, says nothing and cannot be focused', () => {
    const { container } = render(
      <PageIndicator labels={labels} index={1} onChange={vi.fn()} passive />
    );
    const root = container.querySelector('.aca-indicator');
    expect(root).toHaveClass('aca-indicator--passive');
    expect(root).not.toHaveClass('aca-indicator--hidden');
    expect(root).toHaveAttribute('inert');
    expect(root).toHaveAttribute('aria-hidden', 'true');
  });

  it('hidden wins over passive; neither: a slider that changes the page', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <PageIndicator labels={labels} index={1} onChange={onChange} hidden passive />
    );
    expect(container.querySelector('.aca-indicator')).toHaveClass('aca-indicator--hidden');
    expect(container.querySelector('.aca-indicator')).not.toHaveClass('aca-indicator--passive');
    rerender(<PageIndicator labels={labels} index={1} onChange={onChange} />);
    const slider = screen.getByRole('slider', { name: 'Pagina' });
    fireEvent.change(slider, { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('usePageFlash (C2)', () => {
  beforeEach(() => vi.useFakeTimers());

  it('is false at the start, true for two seconds after a change, then false', () => {
    const { result, rerender } = renderHook(({ page, off }) => usePageFlash(page, off), {
      initialProps: { page: 'a', off: false },
    });
    expect(result.current).toBe(false);
    rerender({ page: 'b', off: false });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(PAGE_FLASH_MS - 1);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('a new change restarts the two seconds, and a change while suppressed shows nothing', () => {
    const { result, rerender } = renderHook(({ page, off }) => usePageFlash(page, off), {
      initialProps: { page: 'a', off: false },
    });
    rerender({ page: 'b', off: false });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    rerender({ page: 'c', off: false });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(false);
    // Edit mode or the overview: the indicator or the cards already say it.
    rerender({ page: 'd', off: true });
    expect(result.current).toBe(false);
  });

  it('leaving a timer running when the screen goes does not set a state afterwards', () => {
    const { rerender, unmount } = renderHook(({ page }) => usePageFlash(page, false), {
      initialProps: { page: 'a' },
    });
    rerender({ page: 'b' });
    unmount();
    expect(() => vi.advanceTimersByTime(PAGE_FLASH_MS)).not.toThrow();
  });
});

describe('useEditHint (C3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  it('shows once, a moment after the screen is in use, and is remembered on this device', () => {
    const { result } = renderHook(() => useEditHint(true));
    expect(result.current.shown).toBe(false);
    act(() => {
      vi.advanceTimersByTime(EDIT_HINT_DELAY_MS);
    });
    expect(result.current.shown).toBe(true);
    expect(localStorage.getItem(EDIT_HINT_KEY)).toBe('1');
    act(() => result.current.dismiss());
    expect(result.current.shown).toBe(false);
    // The next start of the screen on this device: nothing.
    const again = renderHook(() => useEditHint(true));
    act(() => {
      vi.advanceTimersByTime(EDIT_HINT_DELAY_MS + 100);
    });
    expect(again.result.current.shown).toBe(false);
  });

  it('leaves by itself after a while, and does not come back', () => {
    const { result, rerender } = renderHook(({ on }) => useEditHint(on), {
      initialProps: { on: true },
    });
    act(() => {
      vi.advanceTimersByTime(EDIT_HINT_DELAY_MS);
    });
    expect(result.current.shown).toBe(true);
    act(() => {
      vi.advanceTimersByTime(EDIT_HINT_MS);
    });
    expect(result.current.shown).toBe(false);
    rerender({ on: false });
    rerender({ on: true });
    act(() => {
      vi.advanceTimersByTime(EDIT_HINT_DELAY_MS + 100);
    });
    expect(result.current.shown).toBe(false);
  });

  it('does not show while it is not enabled (edit mode, locked, Sistema open) and goes when it stops being', () => {
    const { result, rerender } = renderHook(({ on }) => useEditHint(on), {
      initialProps: { on: false },
    });
    act(() => {
      vi.advanceTimersByTime(EDIT_HINT_DELAY_MS * 2);
    });
    expect(result.current.shown).toBe(false);
    expect(localStorage.getItem(EDIT_HINT_KEY)).toBeNull();
    rerender({ on: true });
    act(() => {
      vi.advanceTimersByTime(EDIT_HINT_DELAY_MS);
    });
    expect(result.current.shown).toBe(true);
    // Edit mode opens: the hint has done its job.
    rerender({ on: false });
    expect(result.current.shown).toBe(false);
  });

  it('works with the storage blocked: it shows, and may come again at the next start', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useEditHint(true));
    act(() => {
      vi.advanceTimersByTime(EDIT_HINT_DELAY_MS);
    });
    expect(result.current.shown).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('the hint of the first time (C3)', () => {
  it('says how to edit, can be closed, and is not a live region', () => {
    const onDismiss = vi.fn();
    const { container, rerender } = render(
      <EditHint
        shown={false}
        text="Tieni premuto uno spazio vuoto per modificare le pagine."
        onDismiss={onDismiss}
      />
    );
    expect(container.querySelector('.aca-hint')).toHaveAttribute('inert');
    rerender(
      <EditHint
        shown
        text="Tieni premuto uno spazio vuoto per modificare le pagine."
        onDismiss={onDismiss}
      />
    );
    const note = screen.getByRole('note', { name: 'Suggerimento' });
    expect(note).toHaveTextContent('Tieni premuto uno spazio vuoto per modificare le pagine.');
    expect(note).not.toHaveAttribute('inert');
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ho capito' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
