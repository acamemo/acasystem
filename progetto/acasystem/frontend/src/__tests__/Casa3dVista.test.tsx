import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Casa3dStats } from '@/casa3d/contract';
import Casa3dVista, { SLOW_FPS, SLOW_REPORTS, type Casa3dVistaHandle } from '@/casa3d/Casa3dVista';

/**
 * The 3D view inside the page (ADR-0014, T5): it hands the level to the element, makes the element
 * again for a new generation, passes on what the element reports about its drawing context and
 * tells the page when the drawing stays slow above Light. The bundle and Home Assistant are fakes.
 */

vi.mock('@/casa3d/useCasa3dBundle', () => ({
  useCasa3dBundle: () => ({ status: 'ready', loaded: { manifest: { version: 'prova' } } }),
}));
const hassCalls = vi.hoisted(() => ({ args: [] as unknown[][] }));
vi.mock('@/casa3d/useCasa3dHass', () => ({
  useCasa3dHass: (...args: unknown[]) => {
    hassCalls.args.push(args);
    return {
      hass: { language: 'it', areas: {}, devices: {}, entities: {}, user: { is_admin: true } },
      registriesLoaded: true,
      failed: [],
    };
  },
}));

// A stand-in for the Lit element: React 19 sets a property on a custom element only when it has one.
const VIEW_PROPERTIES = [
  'quality',
  'statsEvents',
  'holograms',
  'flows',
  'showEnergy',
  'weather',
  'trail',
  'cameraWall',
  'director',
  'voice',
  'floorThumbs',
  'clean',
  'cleanButton',
  'hass',
  'building',
  'packs',
  'floorId',
  'roomId',
  'panelOpen',
];
class FakeView extends HTMLElement {
  constructor() {
    super();
    for (const name of VIEW_PROPERTIES)
      Object.defineProperty(this, name, { value: undefined, writable: true });
  }
}
if (!customElements.get('fp3d-view3d')) customElements.define('fp3d-view3d', FakeView);

const building = { version: 1, floors: [{ id: 'piano', name: 'Piano', rooms: [] }] };

type ViewElement = HTMLElement & Record<string, unknown>;
const view = () => document.querySelector('fp3d-view3d') as ViewElement | null;

const stats = (fps: number, over: Partial<Casa3dStats> = {}): Casa3dStats => ({
  fps,
  busy: ['camera'],
  worstMs: 40,
  calls: 80,
  triangles: 9000,
  low: false,
  quality: 'medium',
  pixelRatio: 1.25,
  gpu: null,
  ...over,
});
const send = (type: string, detail: unknown) =>
  act(() => {
    view()?.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  });

afterEach(cleanup);

describe('Casa3dVista: quality and drawing context', () => {
  it('gives the element the level, and the statistics event only above Light', () => {
    const { rerender } = render(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
      />
    );
    expect(view()?.quality).toBe('light');
    expect(view()?.statsEvents).toBe(false);
    rerender(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="high"
      />
    );
    expect(view()?.quality).toBe('high');
    expect(view()?.statsEvents).toBe(true);
  });

  it('keeps the same element for a new level (the view changes it by itself)', () => {
    const { rerender } = render(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
      />
    );
    const first = view();
    rerender(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="medium"
      />
    );
    expect(view()).toBe(first);
  });

  it('makes the element again for a new generation', () => {
    const { rerender } = render(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
        generation={0}
      />
    );
    const first = view();
    rerender(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
        generation={1}
      />
    );
    expect(view()).not.toBe(first);
    expect(view()).not.toBeNull();
  });

  it('passes on the state of the drawing context', () => {
    const onContextState = vi.fn();
    render(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
        onContextState={onContextState}
      />
    );
    send('context-state', { state: 'lost' });
    send('context-state', { state: 'restored' });
    send('context-state', { state: 'failed' });
    expect(onContextState.mock.calls.map(([event]) => event.state)).toEqual([
      'lost',
      'restored',
      'failed',
    ]);
  });

  it('listens to the new element after a new generation', () => {
    const onContextState = vi.fn();
    const props = {
      building,
      paused: false,
      onReadyChange: () => undefined,
      onContextState,
    } as const;
    const { rerender } = render(<Casa3dVista {...props} quality="light" generation={0} />);
    rerender(<Casa3dVista {...props} quality="light" generation={1} />);
    send('context-state', { state: 'lost' });
    expect(onContextState).toHaveBeenCalledTimes(1);
  });

  it('tells the page once when the drawing stays slow for a while', () => {
    const onSlow = vi.fn();
    render(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="high"
        onSlow={onSlow}
      />
    );
    for (let i = 0; i < SLOW_REPORTS - 1; i += 1) send('stats', stats(SLOW_FPS - 5));
    expect(onSlow).not.toHaveBeenCalled();
    send('stats', stats(SLOW_FPS - 5));
    expect(onSlow).toHaveBeenCalledTimes(1);
    for (let i = 0; i < SLOW_REPORTS; i += 1) send('stats', stats(5));
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('offers Light again after a new level, even when the offer was waved away at the old one', () => {
    const onSlow = vi.fn();
    const props = { building, paused: false, onReadyChange: () => undefined, onSlow };
    const { rerender } = render(<Casa3dVista {...props} quality="medium" />);
    for (let i = 0; i < SLOW_REPORTS; i += 1) send('stats', stats(5));
    expect(onSlow).toHaveBeenCalledTimes(1);
    // the same level: no second offer
    for (let i = 0; i < SLOW_REPORTS; i += 1) send('stats', stats(5));
    expect(onSlow).toHaveBeenCalledTimes(1);
    rerender(<Casa3dVista {...props} quality="high" />);
    for (let i = 0; i < SLOW_REPORTS; i += 1) send('stats', stats(5));
    expect(onSlow).toHaveBeenCalledTimes(2);
  });

  it('a fast report in between starts the count again, and a resting picture counts for nothing', () => {
    const onSlow = vi.fn();
    render(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="medium"
        onSlow={onSlow}
      />
    );
    for (let i = 0; i < SLOW_REPORTS - 1; i += 1) send('stats', stats(10));
    send('stats', stats(45));
    for (let i = 0; i < SLOW_REPORTS - 1; i += 1) send('stats', stats(10));
    // at rest the frame rate is 0: neither slow nor fast
    for (let i = 0; i < 20; i += 1) send('stats', stats(0, { busy: [] }));
    expect(onSlow).not.toHaveBeenCalled();
    send('stats', stats(10));
    expect(onSlow).toHaveBeenCalledTimes(1);
  });
});

describe('Casa3dVista: the plan it draws and what the screen can ask of it', () => {
  it('hands the element the plan and the floor it is given, and the whole house by default', () => {
    const { rerender } = render(
      <Casa3dVista
        building={building}
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
      />
    );
    expect(view()?.building).toBe(building);
    expect(view()?.floorId).toBeNull();
    rerender(
      <Casa3dVista
        building={building}
        floorId="piano"
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
      />
    );
    expect(view()?.floorId).toBe('piano');
  });

  it('gives the adapter the plan as the host’s own, with its revision: the view never saves it', () => {
    hassCalls.args.length = 0;
    render(
      <Casa3dVista
        building={building}
        revision={7}
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
      />
    );
    const [plan, , planApi] = hassCalls.args.at(-1) ?? [];
    expect(plan).toEqual({ building, revision: 7 });
    expect(planApi).toBeUndefined();
  });

  it('puts the camera back with the element’s own resetView', () => {
    const handle = createRef<Casa3dVistaHandle>();
    render(
      <Casa3dVista
        building={building}
        handleRef={handle}
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
      />
    );
    const reset = vi.fn();
    (view() as ViewElement).resetView = reset;
    handle.current?.resetView();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('zooms from the keyboard as one turn of the wheel on the canvas: in with a negative delta, out with a positive one', () => {
    const handle = createRef<Casa3dVistaHandle>();
    render(
      <Casa3dVista
        building={building}
        handleRef={handle}
        paused={false}
        onReadyChange={() => undefined}
        quality="light"
      />
    );
    // there is no canvas yet: nothing to zoom
    expect(handle.current?.zoom(1)).toBe(false);
    const canvas = document.createElement('canvas');
    view()!.attachShadow({ mode: 'open' }).append(canvas);
    const wheels: number[] = [];
    canvas.addEventListener('wheel', (event) => {
      wheels.push((event as WheelEvent).deltaY);
      expect(event.cancelable).toBe(true);
    });
    expect(handle.current?.zoom(1)).toBe(true);
    expect(handle.current?.zoom(-1)).toBe(true);
    expect(wheels).toEqual([-120, 120]);
  });
});
