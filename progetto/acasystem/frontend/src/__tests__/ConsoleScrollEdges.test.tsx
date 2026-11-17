import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Console, ConsoleColumns } from '@/components/primitives';

type AreaSize = { viewport: number; content: number };
let sizes: WeakMap<Element, AreaSize>;
let layout: HTMLStyleElement;

class ControlledResizeObserver {
  static instances: ControlledResizeObserver[] = [];
  readonly observed = new Set<Element>();
  readonly disconnect = vi.fn(() => this.observed.clear());
  constructor(private readonly callback: ResizeObserverCallback) {
    ControlledResizeObserver.instances.push(this);
  }
  observe = (target: Element) => { this.observed.add(target); };
  unobserve = (target: Element) => { this.observed.delete(target); };
  static resize(target: Element) {
    act(() => {
      for (const observer of this.instances) {
        if (observer.observed.has(target)) observer.callback([], observer as unknown as ResizeObserver);
      }
    });
  }
}

function renderPanel(children: ReactNode) {
  return <Console open onClose={() => undefined} title="Temperatura soggiorno">{children}</Console>;
}

const bodyArea = () => document.querySelector<HTMLElement>('.aca-console__body')!;
const frame = (area: HTMLElement) => area.parentElement!;
const setSize = (area: Element, viewport: number, content: number) => sizes.set(area, { viewport, content });

// jsdom has no layout or media-query layout engine: supply native scroll metrics and the
// active scroll owner. Browser QA covers the actual responsive CSS and the glass material.
beforeEach(() => {
  sizes = new WeakMap();
  ControlledResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', ControlledResizeObserver);
  vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function (this: Element) {
    return sizes.get(this)?.viewport ?? 200;
  });
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
    return sizes.get(this)?.content ?? 200;
  });
  layout = document.createElement('style');
  layout.textContent = '.aca-console__body { overflow-y: auto; } .aca-console-column { overflow-y: visible; }';
  document.head.append(layout);
});

afterEach(() => {
  cleanup();
  layout.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Console scroll boundary covers', () => {
  it('follows the top, middle and bottom without moving the scroll position', () => {
    render(renderPanel(<p>Contenuto lungo</p>));
    const area = bodyArea();
    setSize(area, 200, 700);
    ControlledResizeObserver.resize(area);
    expect(frame(area)).not.toHaveAttribute('data-scroll-start');
    expect(frame(area)).toHaveAttribute('data-scroll-end', 'true');

    area.scrollTop = 123;
    fireEvent.scroll(area);
    expect(frame(area)).toHaveAttribute('data-scroll-start', 'true');
    expect(frame(area)).toHaveAttribute('data-scroll-end', 'true');
    expect(area.scrollTop).toBe(123);

    area.scrollTop = 500;
    fireEvent.scroll(area);
    expect(frame(area)).toHaveAttribute('data-scroll-start', 'true');
    expect(frame(area)).not.toHaveAttribute('data-scroll-end');
    expect(area.scrollTop).toBe(500);

    area.scrollTop = 0;
    fireEvent.scroll(area);
    expect(frame(area)).not.toHaveAttribute('data-scroll-start');
    expect(frame(area)).toHaveAttribute('data-scroll-end', 'true');
  });

  it('keeps fitting content uncovered and responds to asynchronous growth and viewport resize', () => {
    render(renderPanel(<section><p>Valori ricevuti</p></section>));
    const area = bodyArea(), content = area.firstElementChild!;
    expect(frame(area)).not.toHaveAttribute('data-scroll-start');
    expect(frame(area)).not.toHaveAttribute('data-scroll-end');

    setSize(area, 200, 450);
    ControlledResizeObserver.resize(content);
    expect(frame(area)).toHaveAttribute('data-scroll-end', 'true');

    setSize(area, 500, 450);
    fireEvent(window, new Event('resize'));
    expect(frame(area)).not.toHaveAttribute('data-scroll-start');
    expect(frame(area)).not.toHaveAttribute('data-scroll-end');
  });

  it('ignores the hidden desktop body and tracks each scrollable column independently', () => {
    render(renderPanel(<ConsoleColumns main={<p>Principale</p>} side={<p>Secondaria</p>} />));
    const area = bodyArea();
    const [main, side] = [...document.querySelectorAll<HTMLElement>('.aca-console-column')];
    layout.textContent = '.aca-console__body { overflow-y: hidden; } .aca-console-column { overflow-y: auto; }';
    setSize(area, 200, 1000);
    setSize(main, 200, 600);
    setSize(side, 200, 200);
    fireEvent(window, new Event('resize'));
    expect(frame(area)).not.toHaveAttribute('data-scroll-start');
    expect(frame(area)).not.toHaveAttribute('data-scroll-end');
    expect(frame(main)).toHaveAttribute('data-scroll-end', 'true');
    expect(frame(side)).not.toHaveAttribute('data-scroll-end');

    main.scrollTop = 70;
    fireEvent.scroll(main);
    expect(frame(main)).toHaveAttribute('data-scroll-start', 'true');
    expect(frame(main)).toHaveAttribute('data-scroll-end', 'true');
    expect(frame(side)).not.toHaveAttribute('data-scroll-start');
    expect(side.scrollTop).toBe(0);
  });

  it('preserves focused controls and the same scroll port when the content updates', () => {
    const content = (label: string) => <section><input aria-label="Soglia" /><p>{label}</p></section>;
    const view = render(renderPanel(content('Primo valore')));
    const area = bodyArea(), input = screen.getByRole('textbox', { name: 'Soglia' });
    setSize(area, 200, 450);
    area.scrollTop = 250;
    fireEvent.scroll(area);
    input.focus();
    expect(frame(area)).not.toHaveAttribute('data-scroll-end');

    setSize(area, 200, 700);
    view.rerender(renderPanel(content('Valore aggiornato')));
    expect(bodyArea()).toBe(area);
    expect(area.scrollTop).toBe(250);
    expect(input).toHaveFocus();
    expect(frame(area)).toHaveAttribute('data-scroll-start', 'true');
    expect(frame(area)).toHaveAttribute('data-scroll-end', 'true');
  });

  it('disconnects measurements and removes the resize listener when the window unmounts', () => {
    const add = vi.spyOn(window, 'addEventListener'), remove = vi.spyOn(window, 'removeEventListener');
    const view = render(renderPanel(<p>Contenuto</p>));
    const area = bodyArea(), observers = [...ControlledResizeObserver.instances];
    expect(observers.some((observer) => observer.observed.has(area))).toBe(true);
    const handlers = add.mock.calls.filter(([name]) => name === 'resize').map(([, callback]) => callback);
    expect(handlers.length).toBeGreaterThan(0);
    view.unmount();
    expect(observers.every((observer) => observer.disconnect.mock.calls.length === 1)).toBe(true);
    for (const handler of handlers) expect(remove).toHaveBeenCalledWith('resize', handler);
  });
});
