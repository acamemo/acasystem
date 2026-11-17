import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HOLD_DELAY_MS,
  HOLD_INTERVAL_MS,
  useHoldRepeat,
} from '@/components/widgets/media/hooks/useHoldRepeat';

/** A key that repeats while it is held: the press sends at once, then every 150 ms after 400 ms. */

function Key({ onFire, disabled = false }: { onFire: () => void; disabled?: boolean }) {
  const hold = useHoldRepeat(onFire, { disabled });
  return (
    <button type="button" disabled={disabled} {...hold}>
      Tasto
    </button>
  );
}

const setup = (disabled = false) => {
  const onFire = vi.fn();
  const view = render(<Key onFire={onFire} disabled={disabled} />);
  return { onFire, key: screen.getByRole('button', { name: 'Tasto' }), ...view };
};

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useHoldRepeat', () => {
  it('has the documented pace', () => {
    expect(HOLD_DELAY_MS).toBe(400);
    expect(HOLD_INTERVAL_MS).toBe(150);
  });

  it('a single tap sends one command, not two (the click after the press is the same tap)', () => {
    const { onFire, key } = setup();
    fireEvent.pointerDown(key);
    expect(onFire).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(key);
    fireEvent.click(key);
    wait(1000);
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('holding for a second sends the press and four repeats', () => {
    const { onFire, key } = setup();
    fireEvent.pointerDown(key);
    wait(HOLD_DELAY_MS);
    expect(onFire).toHaveBeenCalledTimes(1);
    wait(1000 - HOLD_DELAY_MS);
    expect(onFire).toHaveBeenCalledTimes(5);
    fireEvent.pointerUp(key);
    fireEvent.click(key);
    wait(1000);
    expect(onFire).toHaveBeenCalledTimes(5);
  });

  it.each([
    ['pointercancel', (key: HTMLElement) => fireEvent.pointerCancel(key)],
    ['lostpointercapture', (key: HTMLElement) => fireEvent.lostPointerCapture(key)],
    ['blur', (key: HTMLElement) => fireEvent.blur(key)],
    ['pointerup', (key: HTMLElement) => fireEvent.pointerUp(key)],
  ])('%s stops the repeat', (_name, stop) => {
    const { onFire, key } = setup();
    fireEvent.pointerDown(key);
    wait(700);
    const sent = onFire.mock.calls.length;
    expect(sent).toBeGreaterThan(1);
    stop(key);
    wait(2000);
    expect(onFire).toHaveBeenCalledTimes(sent);
  });

  it('unmounting while held stops it', () => {
    const { onFire, key, unmount } = setup();
    fireEvent.pointerDown(key);
    wait(700);
    const sent = onFire.mock.calls.length;
    unmount();
    wait(2000);
    expect(onFire).toHaveBeenCalledTimes(sent);
  });

  it('Enter held repeats like a pointer; the key repeat of the system is ignored', () => {
    const { onFire, key } = setup();
    fireEvent.keyDown(key, { key: 'Enter' });
    expect(onFire).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(key, { key: 'Enter', repeat: true });
    fireEvent.keyDown(key, { key: 'Enter', repeat: true });
    expect(onFire).toHaveBeenCalledTimes(1);
    wait(1000);
    expect(onFire).toHaveBeenCalledTimes(5);
    fireEvent.keyUp(key, { key: 'Enter' });
    wait(1000);
    expect(onFire).toHaveBeenCalledTimes(5);
  });

  it('a click that no press came before (assistive technology) sends once', () => {
    const { onFire, key } = setup();
    fireEvent.click(key);
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('a disabled key sends nothing', () => {
    const { onFire, key } = setup(true);
    fireEvent.pointerDown(key);
    fireEvent.keyDown(key, { key: 'Enter' });
    wait(1000);
    expect(onFire).not.toHaveBeenCalled();
  });

  it('becoming disabled in the middle of a hold stops it', () => {
    const onFire = vi.fn();
    const { rerender } = render(<Key onFire={onFire} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Tasto' }));
    wait(700);
    const sent = onFire.mock.calls.length;
    rerender(<Key onFire={onFire} disabled />);
    wait(2000);
    expect(onFire).toHaveBeenCalledTimes(sent);
  });
});
