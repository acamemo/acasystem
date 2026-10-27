import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Console, ConsoleColumns } from '@/components/primitives';

/**
 * The full-screen console: focus and Tab trap, the ways to close it (button, Escape, Android Back,
 * a swipe down from the header), its entry in the history and the flight from the widget.
 */

const origin = { top: 20, left: 10, width: 200, height: 100 };

function reducedMotion(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

function Harness({ onClosed }: { onClosed?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Apri
      </button>
      <Console
        open={open}
        onClose={() => {
          setOpen(false);
          onClosed?.();
        }}
        title="Salotto"
        origin={origin}
        actions={<button type="button">Azione</button>}
      >
        <button type="button">Primo</button>
        <button type="button">Ultimo</button>
      </Console>
    </>
  );
}

const entry = () => (window.history.state as { acaConsole?: string } | null)?.acaConsole;

/** Lets the history of jsdom answer (it traverses in a task of its own) and the exit finish. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 30)));

function swipe(header: Element, from: number, to: number, ms = 400) {
  const now = vi.spyOn(performance, 'now');
  now.mockReturnValue(1000);
  fireEvent.pointerDown(header, { pointerId: 3, isPrimary: true, clientY: from });
  fireEvent.pointerMove(header, { pointerId: 3, isPrimary: true, clientY: (from + to) / 2 });
  now.mockReturnValue(1000 + ms);
  fireEvent.pointerMove(header, { pointerId: 3, isPrimary: true, clientY: to });
  fireEvent.pointerUp(header, { pointerId: 3, isPrimary: true, clientY: to });
}

beforeEach(() => {
  reducedMotion(false);
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await settle();
});

describe('Console', () => {
  it('is a modal dialog named by its title, with the focus inside and Tab kept in', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog', { name: 'Salotto' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.contains(document.activeElement)).toBe(true);
    const last = screen.getByRole('button', { name: 'Ultimo' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chiudi' }));
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('closes with Escape', async () => {
    const closed = vi.fn();
    render(<Harness onClosed={closed} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    await settle();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('takes one entry in the history and the back button goes back through it', async () => {
    const back = vi.spyOn(window.history, 'back');
    const closed = vi.fn();
    render(<Harness onClosed={closed} />);
    expect(entry()).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(back).toHaveBeenCalledTimes(1);
    await settle();
    expect(closed).toHaveBeenCalledTimes(1);
    expect(entry()).toBeUndefined();
  });

  it('closes on Android Back (popstate) and does not go back a second time', async () => {
    const closed = vi.fn();
    render(<Harness onClosed={closed} />);
    const back = vi.spyOn(window.history, 'back');
    window.history.back();
    await settle();
    expect(closed).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('takes its entry off when the owner closes it without going back', async () => {
    const view = render(<Console open onClose={() => undefined} title="A" />);
    expect(entry()).toBeTruthy();
    view.rerender(<Console open={false} onClose={() => undefined} title="A" />);
    await settle();
    expect(entry()).toBeUndefined();
  });

  it('flies from the rectangle of the widget and keeps the panel for its exit', async () => {
    render(<Harness />);
    const panel = document.querySelector<HTMLElement>('.aca-console');
    expect(panel?.style.getPropertyValue('--aca-console-from')).toBe(
      `translate(10px, 20px) scale(${200 / window.innerWidth}, ${100 / window.innerHeight})`
    );
    // Where nothing moves the content is there at once.
    expect(panel).toHaveAttribute('data-arrived');
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('scales from the centre without an origin', () => {
    render(<Console open onClose={() => undefined} title="A" />);
    const panel = document.querySelector<HTMLElement>('.aca-console');
    expect(panel?.style.getPropertyValue('--aca-console-from')).toBe('scale(0.94)');
  });

  it('sets no transform with reduced motion', () => {
    reducedMotion(true);
    render(<Harness />);
    const panel = document.querySelector<HTMLElement>('.aca-console');
    expect(panel?.getAttribute('style') ?? '').not.toMatch(/transform|aca-console-from/);
  });

  it('closes with a swipe down from the header beyond a quarter of the screen', async () => {
    const closed = vi.fn();
    render(<Harness onClosed={closed} />);
    const header = document.querySelector('.aca-console__header') as Element;
    swipe(header, 50, 50 + window.innerHeight * 0.4);
    // It follows the finger and stays where it was left while the console leaves.
    expect(document.querySelector<HTMLElement>('.aca-console__sheet')?.style.transform).toMatch(
      /^translateY\(/
    );
    await settle();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('closes with a quick short flick', async () => {
    const closed = vi.fn();
    render(<Harness onClosed={closed} />);
    swipe(document.querySelector('.aca-console__header') as Element, 50, 130, 60);
    await settle();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('springs back from a short slow swipe', async () => {
    const closed = vi.fn();
    render(<Harness onClosed={closed} />);
    swipe(document.querySelector('.aca-console__header') as Element, 50, 110, 800);
    await settle();
    expect(closed).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLElement>('.aca-console__sheet')?.style.transform).toBe('');
  });

  it('ignores a swipe that starts on a button of the header', async () => {
    const closed = vi.fn();
    render(<Harness onClosed={closed} />);
    swipe(screen.getByRole('button', { name: 'Azione' }), 50, 600, 100);
    await settle();
    expect(closed).not.toHaveBeenCalled();
  });
});

describe('ConsoleColumns', () => {
  it('puts main and side in their own columns', () => {
    render(<ConsoleColumns main={<p>Principale</p>} side={<p>Laterale</p>} />);
    const columns = document.querySelectorAll('.aca-console-column');
    expect(columns).toHaveLength(2);
    expect(columns[0]).toHaveTextContent('Principale');
    expect(columns[1]).toHaveTextContent('Laterale');
  });
});
