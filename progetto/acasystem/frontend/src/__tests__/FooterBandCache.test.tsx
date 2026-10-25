import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyFooterBand,
  bandSide,
  fitBand,
  useFooterBand,
  type BandDensity,
  type BandGroups,
  type BandMemory,
  type BandMeasures,
} from '@/templates/app-shell/footerBand';

/**
 * REP-20261013-002, stage 2 (ADR-0013): the footer band measures two bars, the edit bar and the
 * status bar, and remembers what it measured. Showing one bar and hiding the other over the same
 * key must not read the layout again; a change that can alter a width must. jsdom has no layout:
 * the widths are stubbed and every read of the layout (getBoundingClientRect, getComputedStyle)
 * is counted, as in the Lag tests.
 */

const EDIT: Record<BandDensity, BandGroups> = {
  text: { actions: 126, end: 201 },
  short: { actions: 52, end: 129 },
  icons: { actions: 52, end: 129 },
};
const STATUS: Record<BandDensity, BandGroups> = {
  text: { actions: 250, end: 300 },
  short: { actions: 200, end: 260 },
  icons: { actions: 150, end: 200 },
};
const NOTE = 40; // a note instead of «+ Widget»: narrower at every density

const reads = { rect: 0, style: 0, client: 0 };
/** --aca-band-room on the band at every read of a width: a measure must not see a room left over. */
const roomAtRead: string[] = [];
let barWidth = 1000;

/** Widths of the groups follow the density written on their bar, as the CSS would. */
function widthOf(element: Element): number {
  if (element.classList.contains('aca-indicator__track')) return 120;
  if (element.classList.contains('aca-indicator')) return 300;
  const group = element.closest<HTMLElement>('[data-band-group]');
  const bar = group?.closest<HTMLElement>('[data-band-bar]');
  if (!group || !bar) return 0;
  const density = (bar.dataset.bandDensity ?? 'text') as BandDensity;
  const sizes = bar.dataset.bandBar === 'status' ? STATUS : EDIT;
  const start = group.dataset.bandGroup === 'start';
  if (start && group.querySelector('.note')) return NOTE;
  return start ? sizes[density].actions : sizes[density].end;
}

beforeEach(() => {
  reads.rect = 0;
  reads.style = 0;
  reads.client = 0;
  roomAtRead.length = 0;
  barWidth = 1000;
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    // Reading it forces the style and the layout of the page: counted as a read of the layout.
    if (this.classList.contains('aca-shell__footer')) reads.client += 1;
    return this.classList.contains('aca-shell__footer') ? barWidth : 0;
  });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    reads.rect += 1;
    roomAtRead.push(
      document
        .querySelector<HTMLElement>('.aca-shell__footer')
        ?.style.getPropertyValue('--aca-band-room') ?? ''
    );
    return { width: widthOf(this) } as DOMRect;
  });
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
    reads.style += 1;
    const values: Record<string, string> = element.classList.contains('aca-shell__footer')
      ? {
          paddingLeft: '0px',
          paddingRight: '0px',
          columnGap: '16px',
          '--aca-band-rows': '1',
          '--aca-band-label-gap': '1.5rem',
        }
      : element.classList.contains('aca-indicator')
        ? { '--aca-label-min': '5rem' }
        : { fontSize: '16px', columnGap: '16px' };
    return {
      ...values,
      getPropertyValue: (name: string) => values[name] ?? '',
    } as unknown as CSSStyleDeclaration;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

/**
 * A band with both bars, as LauncherScreen will mount them: the status bar (clock, connection,
 * chips) and the edit bar, one hidden by a class and `inert`, an indicator of five stops.
 */
function mountBand(visible: 'status' | 'edit' = 'status') {
  const footer = document.createElement('footer');
  footer.className = 'aca-shell__footer';
  footer.innerHTML =
    '<div class="aca-status-bar" data-band-bar="status" data-band-key="ok">' +
    '<div data-band-group="start"><time data-band-clock>12:00</time>' +
    '<span class="connection">Sincronizzato</span></div>' +
    '<div data-band-group="end"><div data-band-flex><span class="chip">Mattia</span></div>' +
    '<button type="button">Modifica</button></div></div>' +
    '<div class="aca-edit-toolbar" data-band-bar="edit">' +
    '<div class="aca-edit-toolbar__group" data-band-group="start"><button type="button">Widget</button></div>' +
    '<div class="aca-edit-toolbar__group" data-band-group="end"><button type="button">Fine</button></div></div>' +
    `<div class="aca-indicator"><div class="aca-indicator__track">${'<span class="aca-indicator__dot"></span>'.repeat(5)}</div>` +
    '<span class="aca-indicator__label">Casa</span></div>';
  document.body.append(footer);
  const status = footer.querySelector<HTMLElement>('[data-band-bar="status"]')!;
  const edit = footer.querySelector<HTMLElement>('[data-band-bar="edit"]')!;
  const show = (bar: HTMLElement, shown: boolean) => {
    bar.classList.toggle(
      `${bar === status ? 'aca-status-bar' : 'aca-edit-toolbar'}--hidden`,
      !shown
    );
    if (shown) bar.removeAttribute('inert');
    else bar.setAttribute('inert', '');
  };
  show(status, visible === 'status');
  show(edit, visible === 'edit');
  /** Edit mode on or off: one bar comes, the other goes. */
  const swap = (to: 'status' | 'edit') => {
    show(status, to === 'status');
    show(edit, to === 'edit');
  };
  const hook = renderHook(() => {
    useFooterBand({ current: footer });
  });
  return { footer, status, edit, swap, hook };
}

/**
 * Lets the observers deliver their records and the measure that waits for the next frame run
 * (REP-20261019-002, N5): the callbacks of the hook come first in the frame, ahead of this one.
 */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const flush = () =>
  act(async () => {
    await Promise.resolve();
    await nextFrame();
  });

/** Fake ResizeObserver: the test says which elements changed size. */
function fakeResizeObserver() {
  const instances: Array<{ callback: ResizeObserverCallback; observed: Set<Element> }> = [];
  class Fake {
    callback: ResizeObserverCallback;
    observed = new Set<Element>();
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      instances.push(this);
    }
    observe(element: Element) {
      this.observed.add(element);
    }
    unobserve(element: Element) {
      this.observed.delete(element);
    }
    disconnect() {
      this.observed.clear();
    }
  }
  vi.stubGlobal('ResizeObserver', Fake);
  /** The elements the groups' observer watches. */
  const watching = () => instances.flatMap((one) => Array.from(one.observed));
  /** Delivers a size to the groups' observer (the one that watches a part of a group). */
  const resize = (element: Element, size: number) =>
    act(async () => {
      const observer = instances.find((one) => one.observed.has(element));
      observer?.callback(
        [{ target: element, contentRect: { width: size } } as unknown as ResizeObserverEntry],
        observer as unknown as ResizeObserver
      );
      await Promise.resolve();
    });
  return { resize, watching };
}

const total = () => reads.rect + reads.style;
const resetReads = () => {
  reads.rect = 0;
  reads.style = 0;
  reads.client = 0;
};

describe('fitBand: opzioni per barra', () => {
  const groups = {
    text: { actions: 150, end: 150 },
    short: { actions: 100, end: 100 },
    icons: { actions: 50, end: 50 },
  };
  const measures: BandMeasures = {
    width: 600,
    rows: 1,
    gap: 16,
    groupGap: 16,
    indicator: 224,
    labelMin: 80,
    labelGap: 24,
    groups,
  };

  it('la barra della modifica tiene il nome della pagina, quella di stato no', () => {
    // Each side has (600 - 224 - 32) / 2 = 172 px. The edit bar needs its end group, the gap and
    // the minimum of the name (150 + 24 + 80 = 254 at «text»); the status bar only its pill.
    expect(fitBand(measures).density).toBe('icons');
    expect(fitBand(measures, { keepsName: true })).toEqual(fitBand(measures));
    expect(fitBand(measures, { keepsName: false })).toEqual({
      density: 'text',
      room: null,
      end: 150,
    });
  });

  it('bandSide: metà di quel che lascia l’indicatore, nulla su due righe', () => {
    expect(bandSide(measures, fitBand(measures, { keepsName: false }))).toBe(172);
    expect(bandSide({ ...measures, rows: 2 }, fitBand({ ...measures, rows: 2 }))).toBeNull();
    // An indicator that was made narrower leaves the pills what they measured, not less: with
    // 168 px of room (below the 224 of the widest name) each side is the 50 px of the icons
    // (REP-20261013-002, review of stage 3, round 2).
    const narrow = { ...measures, width: 300 };
    const fit = fitBand(narrow, { keepsName: false });
    expect(fit).toMatchObject({ density: 'icons', room: 168 });
    expect(bandSide(narrow, fit)).toBe(50);
    expect(bandSide(narrow, fit)).toBeGreaterThanOrEqual(groups.icons.actions);
    expect(bandSide(narrow, fit)).toBeGreaterThanOrEqual(groups.icons.end);
  });

  it('bandSide: la scanalatura non scende sotto il suo minimo, le pillole cedono il resto', () => {
    // The pills of 100 px leave the groove 68 px, but five stops of 28 px and the padding are
    // 148: the groove keeps them and the pills share what is around it.
    const wide = {
      ...measures,
      width: 300,
      groups: { ...groups, icons: { actions: 100, end: 60 } },
    };
    const fit = fitBand(wide, { keepsName: false });
    expect(fit).toMatchObject({ density: 'icons', room: 68 });
    expect(bandSide(wide, fit)).toBe(100);
    expect(bandSide({ ...wide, indicatorMin: 148 }, fit)).toBe(60);
  });
});

describe('applyFooterBand con la barra di stato', () => {
  it('misura la barra visibile e scrive la densità su di essa, non sulla fascia', () => {
    const { footer, status, edit } = mountBand('status');
    // Both bars are marked; the hidden edit bar takes no room and keeps no density.
    expect(footer.dataset.bandDensity).toBeUndefined();
    expect(status.dataset.bandDensity).toBe('text');
    expect(edit.dataset.bandDensity).toBeUndefined();
    // The indicator is measured with the widest name (14 rem): (1000 - 224 - 32) / 2 = 372.
    // The side is written on the bar, not on the band (review of stage 3).
    expect(status.style.getPropertyValue('--aca-band-side')).toBe('372px');
    expect(footer.style.getPropertyValue('--aca-band-side')).toBe('');
    expect(footer.style.getPropertyValue('--aca-band-room')).toBe('');
    expect(footer.style.getPropertyValue('--aca-band-end')).toBe('');
    expect(footer.dataset.bandMeasure).toBeUndefined();
  });

  it('con la barra di modifica la densità è anche sulla fascia e non c’è --aca-band-side', () => {
    const { footer, status, edit, swap } = mountBand('status');
    swap('edit');
    applyFooterBand(footer, { key: '' });
    expect(edit.dataset.bandDensity).toBe('text');
    expect(footer.dataset.bandDensity).toBe('text');
    expect(edit.style.getPropertyValue('--aca-band-side')).toBe('');
    // The bar that went keeps its density and its side while it sinks: its pills are still
    // on screen and must not grow under the indicator (review of stage 3).
    expect(status.dataset.bandDensity).toBe('text');
    expect(status.style.getPropertyValue('--aca-band-side')).toBe('372px');
  });

  it('sulla copertina (nessuna barra) la barra di stato che scende conserva il proprio lato', async () => {
    const { footer, status, swap, hook } = mountBand('status');
    await flush();
    expect(status.style.getPropertyValue('--aca-band-side')).toBe('372px');
    // The cover and the view of the pages: neither bar is shown, and the pills are still going.
    status.classList.add('aca-status-bar--hidden');
    status.setAttribute('inert', '');
    await flush();
    applyFooterBand(footer, { key: '' });
    expect(status.style.getPropertyValue('--aca-band-side')).toBe('372px');
    // Back on a page: it is measured again.
    swap('status');
    await flush();
    expect(status.style.getPropertyValue('--aca-band-side')).toBe('372px');
    hook.unmount();
  });

  it('la barra che esce non cambia densità sotto quella che arriva', async () => {
    // At 900 px the edit bar fits «short» and the status bar «text».
    barWidth = 900;
    const { footer, status, edit, swap } = mountBand('status');
    await flush();
    const before = status.dataset.bandDensity;
    swap('edit');
    await flush();
    expect(edit.dataset.bandDensity).toBe('short');
    expect(footer.dataset.bandDensity).toBe('short');
    expect(status.dataset.bandDensity).toBe(before);
  });
});

describe('la fascia ricorda quel che ha misurato (REP-20261013-002, tappa 2)', () => {
  it('mostrare e nascondere le barre con la stessa chiave non legge il layout', async () => {
    const { swap, footer, status, hook } = mountBand('status');
    await flush();
    swap('edit');
    await flush();
    swap('status');
    await flush();

    // Every key is known now: the swaps are applied from memory.
    resetReads();
    swap('edit');
    await flush();
    expect(footer.dataset.bandDensity).toBe('text');
    swap('status');
    await flush();
    swap('edit');
    await flush();
    swap('status');
    await flush();
    expect(reads.rect).toBe(0);
    expect(reads.style).toBe(0);
    expect(status.style.getPropertyValue('--aca-band-side')).toBe('372px');

    hook.unmount();
  });

  it('una larghezza nuova rimisura', async () => {
    const { swap, hook } = mountBand('status');
    await flush();
    swap('edit');
    await flush();
    resetReads();
    barWidth = 900;
    swap('status');
    await flush();
    expect(reads.rect).toBeGreaterThan(0);
    expect(reads.style).toBeGreaterThan(0);
    hook.unmount();
  });

  it('la nota al posto di «+ Widget» (e viceversa) rimisura la barra di modifica', async () => {
    const { edit, swap, footer, hook } = mountBand('edit');
    await flush();
    expect(footer.dataset.bandDensity).toBe('text');
    const start = edit.querySelector<HTMLElement>('[data-band-group="start"]')!;

    reads.rect = 0;
    start.replaceChildren(Object.assign(document.createElement('span'), { className: 'note' }));
    await flush();
    expect(reads.rect).toBeGreaterThan(0);

    reads.rect = 0;
    start.replaceChildren(document.createElement('button'));
    await flush();
    expect(reads.rect).toBeGreaterThan(0);

    // Changed while the bar is hidden: nothing is read until it comes back, and then it is
    // measured again, because its fits were dropped.
    swap('status');
    await flush();
    resetReads();
    start.replaceChildren(Object.assign(document.createElement('span'), { className: 'note' }));
    await flush();
    expect(total()).toBe(0);
    swap('edit');
    await flush();
    expect(reads.rect).toBeGreaterThan(0);
    hook.unmount();
  });

  it('il testo della connessione che cambia di larghezza rimisura; lo stesso no', async () => {
    const observer = fakeResizeObserver();
    const { status, hook } = mountBand('status');
    await flush();
    const start = status.querySelector<HTMLElement>('.connection')!;

    // The first observation of a part is its size at the measure.
    resetReads();
    await observer.resize(start, 280);
    expect(total()).toBe(0);
    // The same size again: nothing changed.
    await observer.resize(start, 280);
    expect(total()).toBe(0);
    // «Non raggiungibile» becomes «Sessione scaduta»: same phase, another width.
    await observer.resize(start, 310);
    expect(reads.rect).toBeGreaterThan(0);
    hook.unmount();
  });

  it('una fase diversa della connessione (data-band-key) ha la sua misura', async () => {
    const { status, footer, hook } = mountBand('status');
    await flush();
    const memory = { key: '' };
    applyFooterBand(footer, memory);
    resetReads();
    applyFooterBand(footer, memory);
    expect(total()).toBe(0);

    status.dataset.bandKey = 'offline';
    applyFooterBand(footer, memory);
    expect(reads.rect).toBeGreaterThan(0);
    // The first phase is still remembered.
    status.dataset.bandKey = 'ok';
    resetReads();
    applyFooterBand(footer, memory);
    expect(total()).toBe(0);
    hook.unmount();
  });

  it('i chip e l’orologio non fanno misurare, la barra visibile sì', async () => {
    const { footer, status, hook } = mountBand('status');
    await flush();
    resetReads();

    footer.querySelector('[data-band-flex]')!.append(document.createElement('span'));
    footer.querySelector('.chip')!.classList.add('is-active');
    footer.querySelector('[data-band-clock]')!.append(document.createElement('i'));
    await flush();
    expect(total()).toBe(0);

    // The connection is another matter: what it is made of can change the width of its pill.
    status.querySelector('.connection')!.append(document.createElement('b'));
    await flush();
    expect(reads.rect).toBeGreaterThan(0);
    hook.unmount();
  });

  it('la misura non vede il room dell’ultima misura', async () => {
    const { footer, hook } = mountBand('status');
    await flush();
    // A room left on the band by the last measure narrows the indicator: it is taken off first.
    footer.style.setProperty('--aca-band-room', '90px');
    barWidth = 900;
    roomAtRead.length = 0;
    applyFooterBand(footer, { key: '' });
    expect(roomAtRead.length).toBeGreaterThan(0);
    expect(roomAtRead.every((room) => room === '')).toBe(true);
    hook.unmount();
  });

  it('la barra di modifica ha una misura per ogni nome di pagina', async () => {
    const { footer, edit, swap, hook } = mountBand('edit');
    await flush();
    const memory = { key: '' };
    const label = footer.querySelector('.aca-indicator__label')!;
    applyFooterBand(footer, memory);
    resetReads();
    applyFooterBand(footer, memory);
    expect(total()).toBe(0);

    // Another page, another name under the indicator: the fit of the other is not reused.
    label.textContent = 'Soggiorno e cucina principale';
    applyFooterBand(footer, memory);
    expect(reads.rect).toBeGreaterThan(0);
    label.textContent = 'Casa';
    resetReads();
    applyFooterBand(footer, memory);
    expect(total()).toBe(0);

    // The status bar measures the widest name: the page does not matter to it.
    swap('status');
    applyFooterBand(footer, memory);
    label.textContent = 'Musica';
    resetReads();
    applyFooterBand(footer, memory);
    expect(total()).toBe(0);
    expect(edit.dataset.bandBar).toBe('edit');
    hook.unmount();
  });

  it('un fit in memoria più ricco del minimo della chiave non si riusa', async () => {
    const { footer, edit, hook } = mountBand('edit');
    await flush();
    const memory: BandMemory = { key: '' };
    applyFooterBand(footer, memory);
    expect(edit.dataset.bandDensity).toBe('text');

    // A leaner density was chosen at this width and number of pages (another page, a longer
    // name): the page whose fit is remembered richer does not take it back.
    memory.floor = 'short';
    applyFooterBand(footer, memory);
    expect(edit.dataset.bandDensity).toBe('short');
    expect(memory.floor).toBe('short');
    hook.unmount();
  });

  it('la nota di una pagina speciale non si osserva: segue la colonna, non il suo testo', async () => {
    const observer = fakeResizeObserver();
    const { edit, hook } = mountBand('edit');
    await flush();
    const start = edit.querySelector<HTMLElement>('[data-band-group="start"]')!;
    expect(observer.watching()).toContain(start.querySelector('button'));

    start.replaceChildren(Object.assign(document.createElement('span'), { className: 'note' }));
    start.firstElementChild?.setAttribute('data-band-flex', '');
    await flush();
    const note = start.querySelector('.note');
    expect(note).not.toBeNull();
    expect(observer.watching()).not.toContain(note);
    hook.unmount();
  });

  it('la fascia osserva le parti misurate, non i chip né l’orologio', async () => {
    const observer = fakeResizeObserver();
    const { status, edit, hook } = mountBand('status');
    await flush();
    const watched = observer.watching();
    expect(watched).toContain(status.querySelector('.connection'));
    expect(watched).toContain(edit.querySelector('button'));
    expect(watched).not.toContain(status.querySelector('[data-band-flex]'));
    expect(watched).not.toContain(status.querySelector('[data-band-clock]'));
    expect(watched).not.toContain(status.querySelector('[data-band-group]'));
    hook.unmount();
  });

  it('quel che la fascia scrive non è un cambio di contenuto: nessuna seconda misura', async () => {
    const observer = fakeResizeObserver();
    barWidth = 900;
    const { edit, swap, hook } = mountBand('status');
    await flush();
    const widget = edit.querySelector<HTMLElement>('button')!;

    // The first delivery is the size at the measure.
    await observer.resize(widget, 90);
    // Edit mode: the band writes another density, and the widths follow it (the observer says
    // so after the write, as the browser does). It is not a change of content.
    swap('edit');
    await flush();
    expect(edit.dataset.bandDensity).toBe('short');
    resetReads();
    await observer.resize(widget, 52);
    expect(total()).toBe(0);
    // A change of content afterwards still measures.
    await observer.resize(widget, 60);
    expect(reads.rect).toBeGreaterThan(0);
    hook.unmount();
  });

  it('i nuovi caratteri (loadingdone) fanno dimenticare tutto', async () => {
    const fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() });
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
    try {
      const { hook } = mountBand('status');
      await flush();
      reads.rect = 0;
      await act(async () => {
        fonts.dispatchEvent(new Event('loadingdone'));
        await Promise.resolve();
      });
      expect(reads.rect).toBeGreaterThan(0);
      hook.unmount();
    } finally {
      Reflect.deleteProperty(document, 'fonts');
    }
  });
});

describe('la fascia misura nel fotogramma dopo il cambio, non nel suo microtask (REP-20261019-002, N5)', () => {
  /** Frames the test runs by hand: the ones the hook asks for, in the order it asked. */
  function manualFrames() {
    const queue = new Map<number, FrameRequestCallback>();
    let next = 1;
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      queue.set(next, callback);
      return next++;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      queue.delete(id);
    });
    return {
      request,
      cancel,
      pending: () => queue.size,
      run: () =>
        act(async () => {
          const callbacks = [...queue.values()];
          queue.clear();
          for (const callback of callbacks) callback(performance.now());
          await Promise.resolve();
        }),
    };
  }

  it('il cambio di barra non legge il layout nel microtask: la densità cambia nel fotogramma, prima di disegnare', async () => {
    // At 900 px the edit bar fits «short», the status bar «text».
    barWidth = 900;
    const { swap, edit, footer, hook } = mountBand('status');
    await flush();
    swap('edit');
    await flush();
    swap('status');
    await flush();
    expect(footer.dataset.bandDensity).toBeUndefined();

    const frames = manualFrames();
    resetReads();
    swap('edit');
    await act(async () => void (await Promise.resolve()));
    // The click's own task: nothing read, nothing written, one frame asked for.
    expect(reads.client).toBe(0);
    expect(total()).toBe(0);
    expect(footer.dataset.bandDensity).toBeUndefined();
    expect(frames.pending()).toBe(1);

    // The frame is the first one drawn with the new bar: the band is fitted ahead of it.
    await frames.run();
    expect(footer.dataset.bandDensity).toBe('short');
    expect(edit.dataset.bandDensity).toBe('short');
    hook.unmount();
  });

  it('varie modifiche dello stesso compito sono una sola misura', async () => {
    const { swap, footer, hook } = mountBand('status');
    await flush();
    const frames = manualFrames();
    swap('edit');
    footer.querySelector('.aca-indicator__label')!.textContent = 'Soggiorno';
    swap('status');
    swap('edit');
    await act(async () => void (await Promise.resolve()));
    expect(frames.pending()).toBe(1);
    await frames.run();
    expect(footer.dataset.bandDensity).toBe('text');
    expect(frames.pending()).toBe(0);
    hook.unmount();
  });

  it('un cambio di classe che lascia visibile la stessa barra non misura né legge il layout', async () => {
    const { footer, status, hook } = mountBand('status');
    await flush();
    const frames = manualFrames();
    resetReads();
    status.classList.add('is-busy');
    status.classList.remove('is-busy');
    status.classList.add('aca-status-bar--pulse');
    await act(async () => void (await Promise.resolve()));
    expect(frames.pending()).toBe(0);
    await frames.run();
    expect(reads.client).toBe(0);
    expect(total()).toBe(0);
    expect(footer.dataset.bandDensity).toBeUndefined();
    hook.unmount();
  });

  it('un cambio di contenuto di una barra visibile misura nel fotogramma', async () => {
    const { edit, footer, hook } = mountBand('edit');
    await flush();
    const frames = manualFrames();
    resetReads();
    const start = edit.querySelector<HTMLElement>('[data-band-group="start"]')!;
    start.replaceChildren(Object.assign(document.createElement('span'), { className: 'note' }));
    await act(async () => void (await Promise.resolve()));
    expect(total()).toBe(0);
    expect(frames.pending()).toBe(1);
    await frames.run();
    expect(reads.rect).toBeGreaterThan(0);
    expect(footer.dataset.bandDensity).toBe('text');
    hook.unmount();
  });

  it('una misura immediata (larghezza, caratteri) prende il posto di quella che attendeva', async () => {
    const observer = fakeResizeObserver();
    const { swap, edit, hook } = mountBand('status');
    await flush();
    const widget = edit.querySelector<HTMLElement>('button')!;
    await observer.resize(widget, 90);

    const frames = manualFrames();
    swap('edit');
    await act(async () => void (await Promise.resolve()));
    expect(frames.pending()).toBe(1);
    // The text of a part changes width in the same frame: measured at once, before paint.
    await observer.resize(widget, 60);
    expect(frames.pending()).toBe(0);
    expect(frames.cancel).toHaveBeenCalled();
    resetReads();
    await frames.run();
    expect(total()).toBe(0);
    hook.unmount();
  });

  it('smontata la fascia, il fotogramma in attesa è annullato', async () => {
    const { swap, hook } = mountBand('status');
    await flush();
    const frames = manualFrames();
    swap('edit');
    await act(async () => void (await Promise.resolve()));
    expect(frames.pending()).toBe(1);
    hook.unmount();
    expect(frames.pending()).toBe(0);
  });

  it('senza fotogrammi (requestAnimationFrame assente) misura subito, come prima', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const { swap, edit, hook } = mountBand('status');
    await act(async () => void (await Promise.resolve()));
    swap('edit');
    await act(async () => void (await Promise.resolve()));
    expect(edit.dataset.bandDensity).toBe('text');
    hook.unmount();
  });
});
