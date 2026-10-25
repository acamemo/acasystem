/**
 * The focus that moves to the frame after the next one (ISSUE-109, R7): the helper runs its
 * callback on the second animation frame, never on the first, can be cancelled at either, and
 * falls back to a timer where there are no animation frames.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { afterNextFrame } from '@/utils/launcher/afterFrame';

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
    pending: () => queue.size,
    run: () => {
      const callbacks = [...queue.values()];
      queue.clear();
      for (const callback of callbacks) callback(performance.now());
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('afterNextFrame', () => {
  it('runs on the second frame, not on the first', () => {
    const frames = manualFrames();
    const callback = vi.fn();
    afterNextFrame(callback);
    expect(callback).not.toHaveBeenCalled();
    frames.run();
    expect(callback).not.toHaveBeenCalled();
    expect(frames.pending()).toBe(1);
    frames.run();
    expect(callback).toHaveBeenCalledOnce();
    expect(frames.pending()).toBe(0);
  });

  it('can be cancelled before the first frame and between the two', () => {
    const frames = manualFrames();
    const early = vi.fn();
    afterNextFrame(early)();
    expect(frames.pending()).toBe(0);
    frames.run();
    expect(early).not.toHaveBeenCalled();

    const late = vi.fn();
    const cancel = afterNextFrame(late);
    frames.run();
    cancel();
    expect(frames.pending()).toBe(0);
    frames.run();
    expect(late).not.toHaveBeenCalled();
  });

  it('without animation frames a timer of two frames stands in, and it can be cancelled', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', undefined);
    const callback = vi.fn();
    afterNextFrame(callback);
    vi.advanceTimersByTime(31);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();

    const cancelled = vi.fn();
    afterNextFrame(cancelled)();
    vi.advanceTimersByTime(100);
    expect(cancelled).not.toHaveBeenCalled();
  });
});
