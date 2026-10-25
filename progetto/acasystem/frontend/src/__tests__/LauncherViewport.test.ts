/**
 * The class of the screen while a name is typed (REP-20261008-001, B.4): the on-screen keyboard
 * can shrink the viewport, and a new class would at once store new placements for it, so the
 * class stays as it was while a text field has the focus.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDeviceClass } from '@/hooks/launcher/useViewport';

const resize = (width: number, height: number) =>
  act(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
    window.dispatchEvent(new Event('resize'));
  });

afterEach(() => {
  document.body.innerHTML = '';
  resize(1024, 768);
});

describe('useDeviceClass', () => {
  it('keeps the class while a text field has the focus, and follows the screen again after', () => {
    resize(1280, 800);
    const { result } = renderHook(() => useDeviceClass());
    expect(result.current).toBe('tablet');

    const field = document.createElement('input');
    document.body.append(field);
    act(() => field.focus());
    // The keyboard takes half of the height: the short side drops under 600 px.
    resize(1280, 420);
    expect(result.current).toBe('tablet');

    act(() => field.blur());
    expect(result.current).toBe('phoneLandscape');
  });

  it('the focus going from one text field to another keeps the class', () => {
    resize(1280, 800);
    const { result } = renderHook(() => useDeviceClass());
    const first = document.createElement('input');
    const second = document.createElement('input');
    document.body.append(first, second);
    act(() => first.focus());
    resize(1280, 420);
    // The first field is left for the second: the keyboard stays up.
    act(() => {
      first.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: second }));
    });
    expect(result.current).toBe('tablet');
  });

  it('a switch or a button with the focus does not hold the class', () => {
    resize(1280, 800);
    const { result } = renderHook(() => useDeviceClass());
    const button = document.createElement('button');
    document.body.append(button);
    act(() => button.focus());
    resize(1280, 420);
    expect(result.current).toBe('phoneLandscape');
  });
});
