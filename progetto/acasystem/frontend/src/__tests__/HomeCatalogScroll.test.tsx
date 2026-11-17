import { useRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BottomDrawerInteraction } from '@/components/primitives';
import { useHomeCatalogScroll } from '@/hooks/launcher/useHomeCatalogScroll';

const commands = 'button:not([data-widget-open], .aca-category-widget__tap), input, select, textarea, [role="button"], [role="slider"], [role="switch"]';
class InputPointer extends MouseEvent {
  pointerId: number; pointerType: string; isPrimary: boolean;
  constructor(type: string, init: PointerEventInit) {
    super(type, init); this.pointerId = init.pointerId ?? 3; this.pointerType = init.pointerType ?? 'touch'; this.isPrimary = init.isPrimary ?? true;
  }
}
let clock = 1000;
function interaction(ready = true) {
  let progress = 0;
  return {
    ready, height: 1000, get progress() { return progress; },
    begin: vi.fn(() => ready), update: vi.fn((next: number) => { progress = next; }),
    finish: vi.fn(), cancel: vi.fn(),
  } satisfies BottomDrawerInteraction;
}
function Harness({ active = true, owner, open = () => true, action = () => undefined, intent = () => undefined }: {
  active?: boolean; owner: BottomDrawerInteraction; open?: () => boolean; action?: () => void; intent?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null), bridge = useRef<BottomDrawerInteraction | null>(owner);
  useHomeCatalogScroll(ref, { active, onOpen: open, commandSelector: commands, interaction: bridge, onIntent: intent });
  return <><div ref={ref} data-testid="home">
    <div role="button" className="aca-launcher-widget__handle" data-testid="surface" onClick={action}>Scheda</div>
    <button data-widget-open onClick={action}>Apri dettagli</button>
    <button data-launcher-cell="0,0" onClick={action}>Cella libera</button>
    <button data-casa-opener onClick={action}>Apri la casa</button>
    <button onClick={action}>Comando</button><input aria-label="Valore" />
    <div role="slider" aria-label="Intensità" /><div role="switch" aria-label="Stato" />
    <div data-testid="scroll" style={{ overflowY: 'auto' }}><span>Lista nativa</span></div>
  </div><div data-testid="preview">Pannello fuori dalla Home</div></>;
}
const wheel = (target: Element, y: number, x = 0, mode = 0) => {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: y, deltaX: x, deltaMode: mode });
  fireEvent(target, event); return event;
};
const pointer = (target: Element, type: string, y: number, options: Partial<PointerEventInit> = {}) => {
  const event = new InputPointer(type, { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', isPrimary: true, button: 0, clientX: 100, clientY: y, ...options });
  fireEvent(target, event); return event;
};
const touch = (target: Element, type: string, y: number, second = false) => {
  const point = { identifier: 17, clientX: 100, clientY: y }, event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, { touches: { value: type === 'touchend' || type === 'touchcancel' ? [] : [point, ...(second ? [{ ...point, identifier: 18 }] : [])] }, changedTouches: { value: [point] } });
  fireEvent(target, event); return event;
};
beforeEach(() => { clock = 1000; vi.useFakeTimers(); vi.spyOn(performance, 'now').mockImplementation(() => clock); });
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Home catalog reveal intent', () => {
  it.each(['mouse', 'touch'])('opens once during the gesture, without waiting for release or a held position: %s', (pointerType) => {
    const owner = interaction(), open = vi.fn(() => true), action = vi.fn(), intent = vi.fn();
    render(<Harness owner={owner} open={open} action={action} intent={intent} />); const target = screen.getByTestId('surface');
    pointer(target, 'pointerdown', 500, { pointerType, buttons: 1 });
    pointer(document.body, 'pointermove', 490, { pointerType, buttons: 1 });
    expect(intent).toHaveBeenCalledOnce(); expect(open).not.toHaveBeenCalled();
    pointer(document.body, 'pointermove', 440, { pointerType, buttons: 1 });
    expect(open).toHaveBeenCalledOnce();
    act(() => { clock += 1000; vi.advanceTimersByTime(1000); });
    pointer(document.body, 'pointermove', 350, { pointerType, buttons: 1 });
    pointer(document.body, 'pointerup', 350, { pointerType });
    fireEvent.click(target, { detail: 1, clientX: 100, clientY: 350 });
    expect(open).toHaveBeenCalledOnce(); expect(action).not.toHaveBeenCalled();
    expect(owner.begin).not.toHaveBeenCalled(); expect(owner.update).not.toHaveBeenCalled(); expect(owner.finish).not.toHaveBeenCalled();
  });
  it('keeps the native touch owner across pointercancel and suppresses a long-held release tap', () => {
    const owner = interaction(), open = vi.fn(() => true), action = vi.fn();
    render(<Harness owner={owner} open={open} action={action} />); const target = screen.getByRole('button', { name: 'Cella libera' });
    pointer(target, 'pointerdown', 500); touch(target, 'touchstart', 500);
    touch(target, 'touchmove', 490); pointer(target, 'pointercancel', 490); touch(target, 'touchmove', 440);
    expect(open).toHaveBeenCalledOnce(); clock += 1200; touch(target, 'touchend', 440);
    pointer(target, 'click', 440, { detail: 1 });
    expect(open).toHaveBeenCalledOnce(); expect(action).not.toHaveBeenCalled(); expect(owner.finish).not.toHaveBeenCalled();
  });
  it('cancels a short gesture or multitouch before the trigger without reviving the old stream', () => {
    const owner = interaction(), open = vi.fn(() => true), action = vi.fn();
    render(<Harness owner={owner} open={open} action={action} />); const target = screen.getByTestId('surface');
    pointer(target, 'pointerdown', 500); pointer(target, 'pointermove', 490); pointer(target, 'pointercancel', 490);
    pointer(target, 'click', 490, { detail: 1 });
    touch(target, 'touchstart', 500); touch(target, 'touchmove', 490); touch(target, 'touchstart', 490, true);
    touch(target, 'touchmove', 350); touch(target, 'touchend', 350);
    expect(open).not.toHaveBeenCalled(); expect(action).not.toHaveBeenCalled(); expect(owner.begin).not.toHaveBeenCalled();
  });
  it('opens from a normalized wheel burst immediately, once, with no 240ms launch timer', () => {
    const owner = interaction(), open = vi.fn(() => true), intent = vi.fn();
    render(<Harness owner={owner} open={open} intent={intent} />); const target = screen.getByTestId('surface');
    wheel(target, 10); expect(intent).toHaveBeenCalledOnce(); expect(open).not.toHaveBeenCalled();
    expect(wheel(target, 20).defaultPrevented).toBe(true); expect(open).toHaveBeenCalledOnce();
    wheel(target, 100); act(() => vi.advanceTimersByTime(1000)); expect(open).toHaveBeenCalledOnce();
    clock += 241; wheel(target, 2, 0, 1); expect(open).toHaveBeenCalledTimes(2);
    clock += 241; wheel(target, 1, 0, 2); expect(open).toHaveBeenCalledTimes(3);
    expect(owner.begin).not.toHaveBeenCalled(); expect(owner.update).not.toHaveBeenCalled(); expect(owner.finish).not.toHaveBeenCalled();
  });
  it('discards reverse wheel accumulation before the trigger', () => {
    const owner = interaction(), open = vi.fn(() => true); render(<Harness owner={owner} open={open} />); const target = screen.getByTestId('surface');
    wheel(target, 15); wheel(target, -15); wheel(target, 15); expect(open).not.toHaveBeenCalled();
    wheel(target, 15); expect(open).toHaveBeenCalledOnce();
  });
  it('leaves commands, fields and nested scroll owners alone', () => {
    const owner = interaction(), open = vi.fn(() => true); render(<Harness owner={owner} open={open} />);
    Object.defineProperties(screen.getByTestId('scroll'), { clientHeight: { value: 100 }, scrollHeight: { value: 400 } });
    for (const target of [screen.getByRole('button', { name: 'Comando' }), screen.getByLabelText('Valore'), screen.getByRole('slider'), screen.getByRole('switch'), screen.getByText('Lista nativa')]) {
      expect(wheel(target, 100).defaultPrevented).toBe(false);
      pointer(target, 'pointerdown', 500); expect(pointer(target, 'pointermove', 350).defaultPrevented).toBe(false);
      touch(target, 'touchstart', 500); expect(touch(target, 'touchmove', 350).defaultPrevented).toBe(false); touch(target, 'touchend', 350);
    }
    expect(open).not.toHaveBeenCalled();
  });
  it('does not queue a cold gesture and preserves the explicit keyboard alternative', () => {
    const owner = interaction(false), open = vi.fn(() => true), action = vi.fn(); render(<Harness owner={owner} open={open} action={action} />); const target = screen.getByTestId('surface');
    expect(wheel(target, 100).defaultPrevented).toBe(false);
    pointer(target, 'pointerdown', 500); pointer(target, 'pointermove', 440); pointer(target, 'pointerup', 440); pointer(target, 'click', 440, { detail: 1 });
    expect(action).not.toHaveBeenCalled(); act(() => vi.advanceTimersByTime(1000));
    expect(owner.begin).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'PageDown' }); expect(open).toHaveBeenCalledOnce();
  });
  it('retains horizontal gestures, ordinary taps, pinch and shifted wheel', () => {
    const owner = interaction(), open = vi.fn(() => true), action = vi.fn(); render(<Harness owner={owner} open={open} action={action} />); const target = screen.getByRole('button', { name: 'Apri la casa' });
    pointer(target, 'pointerdown', 500); pointer(target, 'pointermove', 480, { clientX: 180 }); pointer(target, 'pointerup', 480, { clientX: 180 });
    wheel(target, 10, 100);
    for (const options of [{ ctrlKey: true }, { shiftKey: true }]) fireEvent(target, new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100, ...options }));
    expect(open).not.toHaveBeenCalled();
    pointer(target, 'pointerdown', 20); pointer(target, 'pointerup', 20); fireEvent.click(target, { detail: 1 }); expect(action).toHaveBeenCalledOnce();
  });
  it('recovers a lost stationary mouse-up for wheel, while held mouse and native touch retain ownership', () => {
    const owner = interaction(), open = vi.fn(() => true); render(<Harness owner={owner} open={open} />); const target = screen.getByTestId('surface');
    pointer(target, 'pointerdown', 500, { pointerType: 'mouse', buttons: 1 });
    fireEvent(target, new WheelEvent('wheel', { bubbles: true, deltaY: 80, buttons: 1 })); expect(open).not.toHaveBeenCalled();
    wheel(target, 30); expect(open).toHaveBeenCalledOnce();
    fireEvent.blur(window); open.mockClear(); clock += 241;
    pointer(target, 'pointerdown', 500); touch(target, 'touchstart', 500); touch(target, 'touchmove', 490);
    wheel(target, 30); expect(open).not.toHaveBeenCalled();
    touch(target, 'touchmove', 440); expect(open).toHaveBeenCalledOnce();
  });
  it('clears uncommitted candidates on disable, Escape, blur and unmount without deferred opening', () => {
    const owner = interaction(), open = vi.fn(() => true); const view = render(<Harness owner={owner} open={open} />); let target = screen.getByTestId('surface');
    pointer(target, 'pointerdown', 500); pointer(target, 'pointermove', 490);
    view.rerender(<Harness owner={owner} open={open} active={false} />); pointer(target, 'pointermove', 440); expect(open).not.toHaveBeenCalled();
    view.rerender(<Harness owner={owner} open={open} />); target = screen.getByTestId('surface');
    pointer(target, 'pointerdown', 500); pointer(target, 'pointermove', 490); fireEvent.keyDown(window, { key: 'Escape' }); pointer(target, 'pointermove', 440);
    pointer(target, 'pointerdown', 500); pointer(target, 'pointermove', 490); fireEvent.blur(window); pointer(target, 'pointermove', 440);
    wheel(target, 10); view.unmount(); act(() => vi.advanceTimersByTime(1000)); expect(open).not.toHaveBeenCalled();
  });
});
