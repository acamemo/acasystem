import { createRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomDrawer, type BottomDrawerInteraction } from '@/components/primitives';

function Harness({ allow = true, visible = true, catalog = true, headerHidden = false, onClosed = () => undefined, onPresented, onSelected = () => undefined }: {
  allow?: boolean; visible?: boolean; catalog?: boolean; headerHidden?: boolean; onClosed?: () => void; onPresented?: (open: boolean) => void; onSelected?: () => void;
}) {
  const [open, setOpen] = useState(false);
  // A test-only controller; the product opens from Home scroll, not from this button.
  return <><button>Fuori dal catalogo</button><button className="test-catalog-opener" hidden={!visible}
    onClick={() => { if (allow && visible) setOpen(true); }}>Apri catalogo</button>
    <BottomDrawer open={open} title="Catalogo widget" headerHidden={headerHidden} onOpenChange={onPresented}
      onClose={() => { setOpen(false); onClosed(); }}>
      <div {...(catalog ? { 'data-drawer-swipe': '' } : {})}><button onClick={onSelected}>Seleziona sensore</button><p>Spazio passivo</p></div>
      <button onClick={onSelected}>Comando esterno</button>
      <input aria-label="Nome del widget" />
    </BottomDrawer>
  </>;
}
const trigger = () => screen.getByRole('button', { name: 'Apri catalogo' });
function PreparedHarness({ bridge, ready = true, request = () => true, report = () => undefined, gestureMode = 'drag' }: {
  bridge: ReturnType<typeof createRef<BottomDrawerInteraction | null>>; ready?: boolean;
  request?: () => boolean; report?: (progress: number | null, immediate: boolean) => void; gestureMode?: 'drag' | 'reveal';
}) {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Home</button><BottomDrawer open={open} onClose={() => setOpen(false)} title="Catalogo pronto"
    interactionRef={bridge} interactionReady={ready} onProgress={report} {...{ gestureMode }}
    onRequestOpen={() => { if (!request()) return false; setOpen(true); return true; }}>
    <div data-drawer-swipe=""><button>Scegli luce</button></div>
  </BottomDrawer></>;
}
const panel = () => document.querySelector<HTMLElement>('.aca-bottom-drawer')!;
const pointer = (node: Element, kind: 'down' | 'move' | 'up' | 'cancel', y: number, id = 4, x = 0, pointerType = 'mouse') => {
  const event = { pointerId: id, pointerType, isPrimary: true, button: 0, clientY: y, clientX: x };
  if (kind === 'down') fireEvent.pointerDown(node, event);
  if (kind === 'move') fireEvent.pointerMove(node, event);
  if (kind === 'up') fireEvent.pointerUp(node, event);
  if (kind === 'cancel') fireEvent.pointerCancel(node, event);
};


const wheel = (node: Element, deltaY: number, options: WheelEventInit = {}) => {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY, ...options });
  fireEvent(node, event); return event;
};


const transition = (node: Element, kind: 'transitionrun' | 'transitionend' | 'transitioncancel', propertyName = 'transform') => {
  const event = new Event(kind, { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  fireEvent(node, event);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined);
  const measure = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this.classList.contains('aca-bottom-drawer')
      ? { x: 0, y: 0, top: 0, left: 0, right: 360, bottom: 600, width: 360, height: 600, toJSON: () => ({}) }
      : measure.call(this);
  });
});
afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Bottom drawer interaction', () => {

  it('reveals autonomously after downward intent without painting partial positions or closing on a cancelled short gesture', () => {
    const bridge = createRef<BottomDrawerInteraction | null>(), report = vi.fn();
    render(<PreparedHarness bridge={bridge} gestureMode="reveal" report={report} />);
    fireEvent.click(screen.getByRole('button', { name: 'Home' })); act(() => vi.advanceTimersByTime(280));
    const tile = screen.getByRole('button', { name: 'Scegli luce' });
    pointer(tile, 'down', 100); pointer(tile, 'move', 120);
    expect(panel().style.transform).toBe(''); expect(panel()).not.toHaveAttribute('data-drawer-moving');
    pointer(tile, 'cancel', 120); act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    pointer(tile, 'down', 100); pointer(tile, 'move', 124);
    expect(panel().style.transform).toBe('translateY(100%)');
    expect(panel()).toHaveAttribute('data-drawer-moving');
    expect(report.mock.calls.some(([progress, immediate]) => progress !== null && immediate === true)).toBe(false);
    act(() => vi.advanceTimersByTime(199)); expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1)); expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes reveal on inverse wheel intent immediately instead of moving partially or waiting for idle', () => {
    const bridge = createRef<BottomDrawerInteraction | null>(), report = vi.fn();
    render(<PreparedHarness bridge={bridge} gestureMode="reveal" report={report} />);
    fireEvent.click(screen.getByRole('button', { name: 'Home' })); act(() => vi.advanceTimersByTime(280));
    const body = document.querySelector('.aca-bottom-drawer__body')!;
    expect(wheel(body, -20).defaultPrevented).toBe(true);expect(panel().style.transform).toBe('');
    expect(wheel(body, -4).defaultPrevented).toBe(true);expect(panel().style.transform).toBe('translateY(100%)');
    expect(report.mock.calls.some(([progress, immediate]) => progress !== null && immediate === true)).toBe(false);
    act(() => vi.advanceTimersByTime(200));expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([{ deltaY: -2, deltaMode: 1 }, { deltaY: -0.04, deltaMode: 2 }])('normalizes reveal wheel units and requests only one close per opening ($deltaMode)', (options) => {
    const closed = vi.fn();
    render(<BottomDrawer open gestureMode="reveal" title="Catalogo" onClose={closed}><div data-drawer-swipe=""><p>Catalogo</p></div></BottomDrawer>);
    Object.defineProperty(panel(), 'clientHeight', { configurable: true, value: 600 });
    const body = document.querySelector('.aca-bottom-drawer__body')!;
    wheel(body, options.deltaY, { deltaMode: options.deltaMode });
    expect(closed).toHaveBeenCalledOnce();
    wheel(body, -100);wheel(body, -100);act(() => vi.advanceTimersByTime(500));
    expect(closed).toHaveBeenCalledOnce();
    expect(panel().style.transform).toBe('');
  });

  it('preserves horizontal, modified, native field and nested-scroll input in reveal mode', () => {
    const closed = vi.fn();
    render(<BottomDrawer open gestureMode="reveal" title="Catalogo" onClose={closed}>
      <div data-drawer-swipe=""><button>Tipo luce</button><input aria-label="Ricerca" />
        <div data-testid="native-scroll" style={{ overflowY: 'auto' }}><p>Elenco</p></div></div>
    </BottomDrawer>);
    const tile = screen.getByRole('button', { name: 'Tipo luce' });
    expect(wheel(tile, -100, { deltaX: 150 }).defaultPrevented).toBe(false);
    expect(wheel(tile, -100, { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(wheel(tile, -100, { shiftKey: true }).defaultPrevented).toBe(false);
    expect(wheel(screen.getByRole('textbox'), -100).defaultPrevented).toBe(false);
    const scroll = screen.getByTestId('native-scroll');
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 100 });
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 200 });
    expect(wheel(scroll, -100).defaultPrevented).toBe(false);
    pointer(tile, 'down', 100, 4, 100);pointer(tile, 'move', 160, 4, 160);pointer(tile, 'up', 160, 4, 160);
    expect(closed).not.toHaveBeenCalled();expect(panel().style.transform).toBe('');
  });

  it('releases the visual motion flag after a short reveal intent overlaps the entry transition', () => {
    const bridge = createRef<BottomDrawerInteraction | null>();
    render(<PreparedHarness bridge={bridge} gestureMode="reveal" />);
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    const tile = screen.getByRole('button', { name: 'Scegli luce' });
    pointer(tile, 'down', 100);pointer(tile, 'move', 112);
    transition(panel(), 'transitionend');
    expect(panel()).toHaveAttribute('data-drawer-moving');
    pointer(tile, 'cancel', 112);act(() => vi.advanceTimersByTime(34));
    expect(panel()).not.toHaveAttribute('data-drawer-moving');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps a prepared catalog nonmodal and follows held progress without committing an opening', () => {
    const bridge = createRef<BottomDrawerInteraction | null>(), report = vi.fn(), request = vi.fn(() => true);
    const view = render(<PreparedHarness bridge={bridge} request={request} report={report} />);
    const home = screen.getByRole('button', { name: 'Home' }); home.focus();
    expect(bridge.current?.ready).toBe(true); expect(bridge.current?.height).toBe(600);
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.documentElement.style.overflow).not.toBe('hidden');
    expect(panel().closest('.aca-bottom-drawer-overlay--preview')).not.toBeNull();
    act(() => { expect(bridge.current?.begin()).toBe(true); bridge.current?.update(0.1); });
    expect(panel().style.transform).toBe('translateY(540px)'); expect(bridge.current?.progress).toBeCloseTo(0.1);
    act(() => vi.advanceTimersByTime(1000));
    expect(panel().style.transform).toBe('translateY(540px)'); expect(home).toHaveFocus();
    expect(request).not.toHaveBeenCalled(); expect(window.history.pushState).not.toHaveBeenCalled();
    expect(document.querySelector('.aca-bottom-drawer__body')).toHaveAttribute('inert');
    act(() => bridge.current?.cancel()); expect(panel().style.transform).toBe('translateY(100%)');
    expect(panel().style.transitionDuration).toBe('200ms'); expect(document.querySelector<HTMLElement>('.aca-bottom-drawer-scene')!.style.transitionDuration).toBe('200ms');
    act(() => vi.advanceTimersByTime(200)); expect(report).toHaveBeenLastCalledWith(null, false);
    expect(window.history.pushState).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).toBeNull();
    view.unmount(); expect(bridge.current).toBeNull();
  });

  it('commits focus and one history entry only on release, retaining the committed exit before becoming a preview again', () => {
    const bridge = createRef<BottomDrawerInteraction | null>(), request = vi.fn(() => true);
    render(<PreparedHarness bridge={bridge} request={request} />);
    act(() => { bridge.current?.begin(); bridge.current?.update(0.25); });
    expect(screen.queryByRole('dialog')).toBeNull(); expect(window.history.pushState).not.toHaveBeenCalled();
    act(() => { bridge.current?.finish(-0.6); bridge.current?.finish(-0.6); });
    expect(request).toHaveBeenCalledOnce(); expect(window.history.pushState).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', { name: 'Catalogo pronto' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Catalogo pronto' })).toHaveFocus();
    act(() => vi.advanceTimersByTime(280));
    expect(panel()).not.toHaveAttribute('data-drawer-moving');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(panel()).toHaveAttribute('data-drawer-moving');
    expect(screen.getByRole('dialog', { name: 'Catalogo pronto' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(199)); expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1)); expect(screen.queryByRole('dialog')).toBeNull();
    expect(panel().isConnected).toBe(true); expect(panel().style.transform).toBe('translateY(100%)');
    expect(document.documentElement.style.overflow).not.toBe('hidden');
  });

  it('refuses unready and zero-size previews, handles rejected opening, and regrabs from the actual painted position', () => {
    const bridge = createRef<BottomDrawerInteraction | null>(), request = vi.fn(() => false);
    const view = render(<PreparedHarness bridge={bridge} ready={false} request={request} />);
    act(() => expect(bridge.current?.begin()).toBe(false));
    view.rerender(<PreparedHarness bridge={bridge} request={request} />);
    Object.defineProperty(panel(), 'getBoundingClientRect', { configurable: true, value: () => ({ width: 360, height: 0 }) });
    act(() => expect(bridge.current?.begin()).toBe(false)); Reflect.deleteProperty(panel(), 'getBoundingClientRect');
    act(() => { bridge.current?.begin(); bridge.current?.update(0.4); bridge.current?.finish(-1); });
    expect(request).toHaveBeenCalledOnce(); expect(window.history.pushState).not.toHaveBeenCalled();
    panel().style.transform = 'matrix(1, 0, 0, 1, 0, 240)';
    expect(bridge.current?.progress).toBeCloseTo(0.6);
    act(() => { bridge.current?.begin(); bridge.current?.update(0.7); });
    expect(panel().style.transform).toBe('translateY(180px)');
    act(() => bridge.current?.cancel()); act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it('tracks inverse wheel deltas continuously, can reverse them and commits only after the burst ends', () => {
    const closed = vi.fn(); render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const header = document.querySelector('.aca-bottom-drawer__header')!;
    wheel(header, -100); expect(panel().style.transform).toBe('translateY(100px)');
    act(() => vi.advanceTimersByTime(200)); expect(closed).not.toHaveBeenCalled();
    wheel(header, 80); expect(panel().style.transform).toBe('translateY(20px)');
    act(() => vi.advanceTimersByTime(240)); expect(closed).not.toHaveBeenCalled(); expect(panel().style.transform).toBe('');
    wheel(header, -100); expect(closed).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(240)); expect(closed).toHaveBeenCalledOnce();
  });

  it('opens without close buttons, focuses its title and restores focus after Escape', () => {
    render(<Harness />);
    const opener = trigger(); opener.focus(); fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Catalogo widget' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Chiudi catalogo/ })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Catalogo widget' })).toHaveFocus();
    screen.getByRole('textbox', { name: 'Nome del widget' }).focus(); fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Seleziona sensore' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('can omit the visual header while retaining a labelled dialog and programmatic title focus', () => {
    const view = render(<Harness headerHidden />); fireEvent.click(trigger());
    const dialog = screen.getByRole('dialog', { name: 'Catalogo widget' });
    const title = screen.getByRole('heading', { name: 'Catalogo widget' });
    expect(dialog.querySelector('header')).toBeNull(); expect(dialog.querySelector('.aca-bottom-drawer-grip')).toBeNull();
    expect(title).toHaveClass('aca-visually-hidden', 'sr-only');
    expect(dialog).toHaveAttribute('aria-labelledby', title.id); expect(title).toHaveFocus();
    view.rerender(<Harness />);
    expect(dialog.querySelector('.aca-bottom-drawer__header')).toContainElement(screen.getByRole('heading', { name: 'Catalogo widget' }));
    expect(dialog.querySelector('.aca-bottom-drawer-grip')).not.toBeNull();
  });

  it('does not open when the existing page guard refuses, or when Home is unavailable', () => {
    const view = render(<Harness allow={false} />);
    fireEvent.click(trigger());
    expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(<Harness visible={false} />);
    expect(screen.queryByRole('button', { name: 'Apri catalogo' })).toBeNull();
    const hidden = document.querySelector('.test-catalog-opener')!;
    fireEvent.click(hidden);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reports only committed DOM and reports closure before the retained exit unmounts', () => {
    const reports: { open: boolean; connected: boolean }[] = [];
    const presented = (open: boolean) => reports.push({ open, connected: Boolean(panel()?.isConnected) });
    render(<Harness onPresented={presented} />);
    expect(reports.some((value) => value.open)).toBe(false);
    fireEvent.click(trigger());
    expect(reports.at(-1)).toEqual({ open: true, connected: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(reports.at(-1)?.open).toBe(false);
    expect(panel()?.isConnected).toBe(true);
    expect(panel()?.closest('[inert]')).not.toBeNull();
  });

  it('closes with a 56px downward swipe from a passive tile, leaving form scrolling alone', () => {
    const closed = vi.fn();
    render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const body = document.querySelector('.aca-bottom-drawer__body')!;
    pointer(body, 'down', 650); pointer(body, 'move', 50); pointer(body, 'up', 50);
    expect(closed).not.toHaveBeenCalled();
    const tile = screen.getByRole('button', { name: 'Seleziona sensore' });
    pointer(tile, 'down', 40); pointer(tile, 'move', 100);
    expect(panel().style.transform).toBe('translateY(60px)');
    fireEvent.lostPointerCapture(tile, { pointerId: 4, clientY: 100 }); // Implicit child capture transfers to the panel.
    expect(panel().style.transform).toBe('translateY(60px)');
    act(() => vi.advanceTimersByTime(1000)); // Distance alone closes, even without flick velocity.
    pointer(tile, 'up', 100);
    expect(closed).toHaveBeenCalledOnce();
  });

  it('ignores a second pointer and cancels a close gesture back to the same open window', () => {
    const closed = vi.fn();
    render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const window = panel(), handle = document.querySelector('.aca-bottom-drawer__header')!;
    pointer(handle, 'down', 100);
    pointer(handle, 'move', 700, 8);
    expect(window.style.transform).toBe('');
    pointer(handle, 'move', 200);
    expect(window.style.transform).toBe('translateY(100px)');
    pointer(handle, 'cancel', 200);
    expect(closed).not.toHaveBeenCalled();
    expect(panel()).toBe(window);
    expect(window.style.transform).toBe('');
  });

  it('keeps taps as selection and lets horizontal swipes reach the native catalog without closing', () => {
    const closed = vi.fn(), selected = vi.fn();
    render(<Harness onClosed={closed} onSelected={selected} />); fireEvent.click(trigger());
    const tile = screen.getByRole('button', { name: 'Seleziona sensore' });
    const capture = vi.fn(); panel().setPointerCapture = capture;
    pointer(tile, 'down', 100); pointer(tile, 'up', 100); fireEvent.click(tile, { detail: 1 });
    expect(selected).toHaveBeenCalledOnce(); expect(capture).not.toHaveBeenCalled();
    pointer(tile, 'down', 100, 5, 200); pointer(tile, 'move', 103, 5, 50); pointer(tile, 'up', 103, 5, 50);
    fireEvent.click(tile, { detail: 1, pointerId: 5 });
    expect(panel().style.transform).toBe(''); expect(capture).not.toHaveBeenCalled();
    expect(selected).toHaveBeenCalledOnce(); expect(closed).not.toHaveBeenCalled();
    pointer(tile, 'down', 100, 6, 100); pointer(tile, 'move', 160, 6, 160); pointer(tile, 'up', 160, 6, 160);
    fireEvent.click(tile, { detail: 1, pointerId: 6 });
    expect(capture).not.toHaveBeenCalled(); expect(closed).not.toHaveBeenCalled();
    expect(selected).toHaveBeenCalledOnce();
  });

  it('does not select a tile after a short cancelled swipe or a long-held close gesture', () => {
    const closed = vi.fn(), selected = vi.fn();
    render(<Harness onClosed={closed} onSelected={selected} />); fireEvent.click(trigger());
    const tile = screen.getByRole('button', { name: 'Seleziona sensore' });
    pointer(tile, 'down', 100); pointer(tile, 'move', 112);
    act(() => vi.advanceTimersByTime(1000)); pointer(tile, 'up', 112); fireEvent.click(tile, { detail: 1 });
    expect(closed).not.toHaveBeenCalled(); expect(selected).not.toHaveBeenCalled();
    pointer(tile, 'down', 100); pointer(tile, 'move', 200);
    act(() => vi.advanceTimersByTime(1200));
    expect(closed).not.toHaveBeenCalled();
    pointer(tile, 'up', 200); fireEvent.click(tile, { detail: 1 });
    expect(closed).toHaveBeenCalledOnce(); expect(selected).not.toHaveBeenCalled();
  });

  it('resets a dragged panel when a second finger arrives and preserves fields and vertical scroll owners', () => {
    const closed = vi.fn(); render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const title = document.querySelector('.aca-bottom-drawer__header')!;
    pointer(title, 'down', 50); pointer(title, 'move', 80);
    fireEvent.pointerDown(title, { pointerId: 6, isPrimary: false, pointerType: 'touch', clientY: 90 });
    expect(panel().style.transform).toBe(''); pointer(title, 'up', 600);
    const input = screen.getByRole('textbox', { name: 'Nome del widget' });
    pointer(input, 'down', 50); pointer(input, 'move', 650); pointer(input, 'up', 650);
    const scroll = screen.getByText('Spazio passivo'); scroll.style.overflowY = 'auto';
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 300 });
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 100 });
    pointer(scroll, 'down', 50); pointer(scroll, 'move', 650); pointer(scroll, 'up', 650);
    expect(closed).not.toHaveBeenCalled(); expect(panel().style.transform).toBe('');
  });

  it('requests only one history traversal for repeated closes before popstate and cleanup', () => {
    let state: unknown = {};
    vi.spyOn(window.history, 'state', 'get').mockImplementation(() => state);
    vi.mocked(window.history.pushState).mockImplementation((value) => { state = value; });
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const view = render(<Harness />); fireEvent.click(trigger());
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(back).toHaveBeenCalledOnce();
    view.unmount(); act(() => vi.runOnlyPendingTimers());
    expect(back).toHaveBeenCalledOnce();
  });

  it('handles browser Back and removes its listener and scroll lock when disposed', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const closed = vi.fn();
    const view = render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    expect(document.documentElement.style.overflow).toBe('hidden');
    fireEvent(window, new PopStateEvent('popstate'));
    expect(closed).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(200));
    expect(document.documentElement.style.overflow).not.toBe('hidden');
    expect(remove.mock.calls.some(([name]) => name === 'popstate')).toBe(true);
    view.unmount();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('closes through inverse trackpad input on passive header and padding, retaining the existing exit', () => {
    const closed = vi.fn(), presented = vi.fn();
    const view = render(<Harness onClosed={closed} onPresented={presented} />); fireEvent.click(trigger());
    const header = document.querySelector('.aca-bottom-drawer__header')!;
    const body = document.querySelector('.aca-bottom-drawer__body')!;
    expect(wheel(header, -20).defaultPrevented).toBe(true);
    view.rerender(<Harness onClosed={closed} onPresented={presented} />); // A render does not discard this physical burst.
    expect(wheel(body, -20).defaultPrevented).toBe(true);
    expect(wheel(header, -20).defaultPrevented).toBe(true);
    expect(closed).not.toHaveBeenCalled(); expect(panel().style.transform).toBe('translateY(60px)');
    act(() => vi.advanceTimersByTime(240));
    expect(closed).toHaveBeenCalledOnce(); expect(presented).toHaveBeenLastCalledWith(false);
    const retained = panel();
    expect(retained.isConnected).toBe(true); expect(retained.closest('[data-panel-state="exiting"]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(199)); expect(retained.isConnected).toBe(true);
    act(() => vi.advanceTimersByTime(1)); expect(retained.isConnected).toBe(false);
    fireEvent.click(trigger()); wheel(document.querySelector('.aca-bottom-drawer__body')!, -60); act(() => vi.advanceTimersByTime(240));
    expect(closed).toHaveBeenCalledTimes(2); // A new opening starts a fresh burst.
  });

  it('preserves forward, horizontal, shifted and pinch wheel input, controls and real vertical scrollers', () => {
    const closed = vi.fn(); render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const header = document.querySelector('.aca-bottom-drawer__header')!;
    for (const options of [{ deltaY: 80 }, { deltaY: -80, deltaX: 100 }, { deltaY: -80, ctrlKey: true }, { deltaY: -80, shiftKey: true }]) {
      expect(wheel(header, options.deltaY, options).defaultPrevented).toBe(false);
    }
    for (const target of [screen.getByRole('textbox'), screen.getByRole('button', { name: 'Comando esterno' })]) {
      expect(wheel(target, -80).defaultPrevented).toBe(false);
    }
    const scroll = screen.getByText('Spazio passivo'); scroll.style.overflowY = 'auto';
    Object.defineProperties(scroll, { clientHeight: { value: 100 }, scrollHeight: { value: 300 } });
    expect(wheel(scroll, -80).defaultPrevented).toBe(false);
    scroll.scrollTop = 200; expect(wheel(scroll, -80).defaultPrevented).toBe(false);
    expect(closed).not.toHaveBeenCalled();
    expect(wheel(header, -4, { deltaMode: 1 }).defaultPrevented).toBe(true);
    act(() => vi.advanceTimersByTime(240));
    expect(closed).toHaveBeenCalledOnce();
  });

  it('resets an expired burst and leaves the entity form alone until the catalog is shown again', () => {
    const closed = vi.fn(); const view = render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    let header = document.querySelector('.aca-bottom-drawer__header')!;
    wheel(header, -30); act(() => vi.advanceTimersByTime(241));
    wheel(header, -20); expect(closed).not.toHaveBeenCalled();
    view.rerender(<Harness catalog={false} onClosed={closed} />);
    expect(wheel(header, -80).defaultPrevented).toBe(false);
    expect(wheel(document.querySelector('.aca-bottom-drawer__body')!, -80).defaultPrevented).toBe(false);
    expect(closed).not.toHaveBeenCalled();
    view.rerender(<Harness onClosed={closed} />);
    header = document.querySelector('.aca-bottom-drawer__header')!;
    expect(wheel(header, -1, { deltaMode: 2 }).defaultPrevented).toBe(true);
    act(() => vi.advanceTimersByTime(240));
    expect(closed).toHaveBeenCalledOnce();
  });

  it('coalesces an inverse wheel burst through the existing asynchronous history close', () => {
    let state: unknown = {};
    vi.spyOn(window.history, 'state', 'get').mockImplementation(() => state);
    vi.mocked(window.history.pushState).mockImplementation((value) => { state = value; });
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const view = render(<Harness />); fireEvent.click(trigger());
    const header = document.querySelector('.aca-bottom-drawer__header')!;
    wheel(header, -80); wheel(header, -80); act(() => vi.advanceTimersByTime(240)); fireEvent.keyDown(document, { key: 'Escape' });
    expect(back).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(241)); wheel(header, -80);
    expect(back).toHaveBeenCalledOnce();
    view.unmount(); act(() => vi.runOnlyPendingTimers()); expect(back).toHaveBeenCalledOnce();
  });

  it('defers wheel while a pointer owns the panel and cleans up the listener with reduced motion and teardown', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => true,
    }));
    const closed = vi.fn(); const view = render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const header = document.querySelector('.aca-bottom-drawer__header')!;
    const retained = panel();
    pointer(header, 'down', 50); expect(wheel(header, -80, { buttons: 1 }).defaultPrevented).toBe(false);
    expect(closed).not.toHaveBeenCalled(); pointer(header, 'cancel', 50);
    expect(wheel(header, -80).defaultPrevented).toBe(true);
    act(() => vi.advanceTimersByTime(240)); act(() => vi.advanceTimersByTime(0)); expect(retained.isConnected).toBe(false);
    expect(wheel(header, -80).defaultPrevented).toBe(false);
    fireEvent.click(trigger()); const staleHeader = document.querySelector('.aca-bottom-drawer__header')!;
    view.unmount(); expect(wheel(staleHeader, -80).defaultPrevented).toBe(false);
    expect(closed).toHaveBeenCalledOnce();
  });

  it.each(['pointerUp', 'pointerCancel'] as const)('releases only the matching stationary pointer on global %s', (end) => {
    const closed = vi.fn(); render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const header = document.querySelector('.aca-bottom-drawer__header')!;
    pointer(header, 'down', 50, 4, 100, 'touch');
    fireEvent[end](document.body, { pointerId: 9, pointerType: 'touch', isPrimary: false });
    expect(wheel(header, -80).defaultPrevented).toBe(false); expect(closed).not.toHaveBeenCalled();
    fireEvent[end](document.body, { pointerId: 4, pointerType: 'touch', isPrimary: true });
    expect(wheel(header, -80).defaultPrevented).toBe(true); act(() => vi.advanceTimersByTime(240)); expect(closed).toHaveBeenCalledOnce();
  });

  it('discards a stationary touch candidate on window blur', () => {
    const closed = vi.fn(); render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const header = document.querySelector('.aca-bottom-drawer__header')!;
    pointer(header, 'down', 50, 4, 100, 'touch'); fireEvent.blur(window);
    expect(wheel(header, -80).defaultPrevented).toBe(true); act(() => vi.advanceTimersByTime(240)); expect(closed).toHaveBeenCalledOnce();
  });

  it('recovers a released mouse candidate without an up or blur event', () => {
    const closed = vi.fn(); render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const header = document.querySelector('.aca-bottom-drawer__header')!;
    pointer(header, 'down', 50, 4, 100, 'mouse');
    expect(wheel(header, -20, { buttons: 0 }).defaultPrevented).toBe(true);
    expect(closed).not.toHaveBeenCalled();
    expect(wheel(header, -40, { buttons: 0 }).defaultPrevented).toBe(true); act(() => vi.advanceTimersByTime(240)); expect(closed).toHaveBeenCalledOnce();
  });

  it('keeps held mouse buttons, concurrent touch and actual dragged panels protected from wheel recovery', () => {
    const closed = vi.fn(); render(<Harness onClosed={closed} />); fireEvent.click(trigger());
    const header = document.querySelector('.aca-bottom-drawer__header')!;
    pointer(header, 'down', 50, 4, 100, 'mouse');
    expect(wheel(header, -80, { buttons: 1 }).defaultPrevented).toBe(false);
    pointer(header, 'cancel', 50);
    pointer(header, 'down', 50, 5, 100, 'touch');
    expect(wheel(header, -80, { buttons: 0 }).defaultPrevented).toBe(false);
    pointer(header, 'cancel', 50, 5);
    pointer(header, 'down', 50, 6, 100, 'mouse'); pointer(header, 'move', 70, 6, 100);
    expect(panel().style.transform).toBe('translateY(20px)');
    fireEvent.blur(window); fireEvent.pointerUp(document.body, { pointerId: 6, pointerType: 'mouse' });
    expect(wheel(header, -80, { buttons: 0 }).defaultPrevented).toBe(false);
    expect(panel().style.transform).toBe('translateY(20px)'); expect(closed).not.toHaveBeenCalled();
    pointer(header, 'cancel', 70, 6, 100);
    expect(wheel(header, -80, { buttons: 0 }).defaultPrevented).toBe(true); act(() => vi.advanceTimersByTime(240)); expect(closed).toHaveBeenCalledOnce();
  });

  it('repeats fifteen wheel openings and closings through the browser history API without a stale cycle', async () => {
    vi.mocked(window.history.pushState).mockRestore();
    const closed = vi.fn(); render(<Harness headerHidden onClosed={closed} />);
    for (let cycle = 0; cycle < 15; cycle++) {
      fireEvent.click(trigger()); expect(screen.getByRole('dialog', { name: 'Catalogo widget' })).toBeInTheDocument();
      expect(window.history.state?.acaBottomDrawer).toMatch(/^bottom-drawer-/);
      wheel(document.querySelector('.aca-bottom-drawer__body')!, -80);
      await act(async () => { await vi.advanceTimersByTimeAsync(260); });
      act(() => vi.advanceTimersByTime(200));
      expect(screen.queryByRole('dialog')).toBeNull(); expect(window.history.state?.acaBottomDrawer).toBeUndefined();
      expect(closed).toHaveBeenCalledTimes(cycle + 1);
    }
  });

  it('marks vertical painting immediately and settles a cancelled or zero-distance return without transitionend', () => {
    const closed = vi.fn(); render(<Harness headerHidden onClosed={closed} />); fireEvent.click(trigger());
    const window = panel(), tile = screen.getByRole('button', { name: 'Seleziona sensore' });
    Object.defineProperty(window, 'getAnimations', { configurable: true, value: () => [] });
    act(() => vi.advanceTimersByTime(34));
    expect(window).not.toHaveAttribute('data-drawer-moving');
    pointer(tile, 'down', 100); pointer(tile, 'move', 130);
    expect(window).toHaveAttribute('data-drawer-moving'); expect(window.style.transform).toBe('translateY(30px)');
    pointer(tile, 'move', 100); pointer(tile, 'up', 100);
    act(() => vi.advanceTimersByTime(34));
    expect(window).not.toHaveAttribute('data-drawer-moving'); expect(closed).not.toHaveBeenCalled();
    pointer(tile, 'down', 100); pointer(tile, 'move', 130); pointer(tile, 'cancel', 130);
    act(() => vi.advanceTimersByTime(34));
    expect(window).not.toHaveAttribute('data-drawer-moving'); expect(window.style.transform).toBe('');
  });

  it('keeps the entry flag through pending transforms and ignores child or unrelated transition events', () => {
    render(<Harness headerHidden />); fireEvent.click(trigger());
    const window = panel(), tile = screen.getByRole('button', { name: 'Seleziona sensore' });
    let animations = [{ transitionProperty: 'transform', pending: true, playState: 'idle' }];
    Object.defineProperty(window, 'getAnimations', { configurable: true, value: () => animations });
    expect(window).toHaveAttribute('data-drawer-moving');
    act(() => vi.advanceTimersByTime(34)); expect(window).toHaveAttribute('data-drawer-moving');
    animations = [];
    transition(tile, 'transitionend'); transition(window, 'transitionend', 'opacity');
    act(() => vi.advanceTimersByTime(34)); expect(window).toHaveAttribute('data-drawer-moving');
    transition(window, 'transitionend');
    act(() => vi.advanceTimersByTime(34)); expect(window).not.toHaveAttribute('data-drawer-moving');
    pointer(tile, 'down', 100); pointer(tile, 'move', 130);
    transition(window, 'transitioncancel');
    act(() => vi.advanceTimersByTime(34)); expect(window).toHaveAttribute('data-drawer-moving');
    pointer(tile, 'cancel', 130);
    act(() => vi.advanceTimersByTime(34)); expect(window).not.toHaveAttribute('data-drawer-moving');
  });

  it('settles reduced-motion returns immediately without losing the flag of a direct drag', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => true,
    }));
    const closed = vi.fn(); render(<Harness headerHidden onClosed={closed} />); fireEvent.click(trigger());
    const window = panel(), tile = screen.getByRole('button', { name: 'Seleziona sensore' });
    expect(window).not.toHaveAttribute('data-drawer-moving');
    pointer(tile, 'down', 100); pointer(tile, 'move', 130);
    expect(window).toHaveAttribute('data-drawer-moving');
    transition(window, 'transitioncancel'); expect(window).toHaveAttribute('data-drawer-moving');
    pointer(tile, 'cancel', 130);
    expect(window).not.toHaveAttribute('data-drawer-moving'); expect(closed).not.toHaveBeenCalled();
  });

  it('settles after a drag returned to zero is reset by a second pointer', () => {
    render(<Harness headerHidden />); fireEvent.click(trigger());
    const window = panel(), tile = screen.getByRole('button', { name: 'Seleziona sensore' });
    Object.defineProperty(window, 'getAnimations', { configurable: true, value: () => [] });
    pointer(tile, 'down', 100); pointer(tile, 'move', 130);
    act(() => vi.advanceTimersByTime(34)); // The previous check saw a recognised drag and has already returned.
    pointer(tile, 'move', 100);
    fireEvent.pointerDown(tile, { pointerId: 8, isPrimary: false, pointerType: 'touch', clientY: 100 });
    act(() => vi.advanceTimersByTime(34));
    expect(window).not.toHaveAttribute('data-drawer-moving'); expect(window.style.transform).toBe('');
    expect(wheel(tile, -80).defaultPrevented).toBe(true); // The catalog remains usable.
  });

});
