import type { ReactNode } from 'react';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeStartupProvider } from '@/hooks/startup/HomeStartupContext';
import { useHomeStartupAssets } from '@/hooks/startup/useHomeStartupAssets';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

const images: TestImage[] = [];
let cachedImage = false;
class TestImage {
  src = '';
  complete = cachedImage;
  naturalWidth = cachedImage ? 100 : 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoded = deferred<void>();
  decode = vi.fn(() => this.decoded.promise);
  constructor() { images.push(this); }
  load() { this.complete = true; this.naturalWidth = 100; this.onload?.(); }
}

const fontLoad = vi.fn<(font: string, text?: string) => Promise<FontFace[]>>();
let opaque = false;
let photoConfigured = true;
let home: HTMLElement;
let originalFonts: PropertyDescriptor | undefined;
const wrapper = ({ children }: { children: ReactNode }) => (
  <HomeStartupProvider eligible identityManaged={false}>{children}</HomeStartupProvider>
);
const flush = () => act(async () => { await Promise.resolve(); });
const decode = (image: TestImage) => act(async () => {
  image.decoded.resolve(undefined);
  await image.decoded.promise;
});

beforeEach(() => {
  vi.useFakeTimers();
  images.length = 0; cachedImage = false; opaque = false; photoConfigured = true;
  fontLoad.mockReset().mockResolvedValue([]);
  originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
  Object.defineProperty(document, 'fonts', { configurable: true, value: { load: fontLoad } });
  vi.stubGlobal('Image', TestImage);
  home = document.createElement('div');
  home.innerHTML = '<section class="aca-pager__page is-current"><h2 data-weight="500">È già pronta: Łódź</h2><span>Casa</span></section><section class="aca-pager__page"><span data-weight="300">Ж future page</span></section>';
  document.body.append(home);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((node, pseudo) => ({
    display: node === document.body && pseudo ? opaque ? 'none' : 'block' : 'block',
    visibility: 'visible',
    fontStyle: 'normal', fontSize: '16px',
    fontWeight: (node as HTMLElement).dataset?.weight || '400',
    fontFamily: document.documentElement.hasAttribute('data-aca-home-font-fallback') ? 'system-ui' : 'Inter',
    backgroundImage: 'linear-gradient(black, black), url("http://localhost/landscape.webp")',
    getPropertyValue: (name: string) => name === '--aca-white-photo' && photoConfigured ? 'url("./landscape.webp")' : 'none',
  }) as CSSStyleDeclaration);
});

afterEach(() => {
  cleanup(); home.remove();
  if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
  else Reflect.deleteProperty(document, 'fonts');
  document.documentElement.removeAttribute('data-aca-home-font-fallback');
  document.documentElement.removeAttribute('data-aca-home-photo-fallback');
  vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers();
});

describe('risorse iniziali della Home', () => {
  it('non prepara un box assente o una route non Home, poi parte sul contenuto presente', async () => {
    const view = renderHook(({ element, eligible }) => useHomeStartupAssets(element, 'profile', eligible), {
      initialProps: { element: null as HTMLElement | null, eligible: true }, wrapper,
    });
    act(() => vi.advanceTimersByTime(4000));
    expect(fontLoad).not.toHaveBeenCalled(); expect(images).toHaveLength(0);
    view.rerender({ element: home, eligible: false });
    expect(fontLoad).not.toHaveBeenCalled(); expect(images).toHaveLength(0);
    expect(view.result.current.ready).toBe(false);
    view.rerender({ element: home, eligible: true });
    await flush();
    expect(fontLoad).toHaveBeenCalled(); expect(images).toHaveLength(1);
    expect(view.result.current.ready).toBe(false);
  });

  it('prepara pesi e glifi effettivi della pagina corrente, escludendo quella futura', async () => {
    photoConfigured = false;
    const view = renderHook(() => useHomeStartupAssets(home, 'profile', true), { wrapper });
    await flush();
    const heading = fontLoad.mock.calls.find(([font]) => font.includes('500'));
    expect(heading).toBeDefined();
    for (const glyph of ['È', 'à', 'Ł', 'ó', 'ź']) expect(heading?.[1]).toContain(glyph);
    expect(fontLoad.mock.calls.some(([font]) => font.includes('300'))).toBe(false);
    expect(fontLoad.mock.calls.map(([, text]) => text).join('')).not.toContain('Ж');
    expect(view.result.current.ready).toBe(true);
  });

  it.each([false, true])('attende la decodifica della fotografia anche con cache=%s', async (cached) => {
    cachedImage = cached;
    const view = renderHook(() => useHomeStartupAssets(home, 'profile', true), { wrapper });
    await flush();
    const image = images[0]!;
    expect(image.src).toBe('http://localhost/landscape.webp');
    if (!cached) {
      expect(image.decode).not.toHaveBeenCalled();
      act(() => image.load());
    }
    expect(image.decode).toHaveBeenCalledTimes(1);
    expect(view.result.current.ready).toBe(false);
    await decode(image);
    expect(view.result.current).toMatchObject({ ready: true, fontFallback: false, photoFallback: false });
  });

  it.each(['opaque', 'no-photo'] as const)('non richiede la fotografia se non è visibile: %s', async (mode) => {
    opaque = mode === 'opaque'; photoConfigured = mode !== 'no-photo';
    const view = renderHook(() => useHomeStartupAssets(home, 'profile', true), { wrapper });
    await flush();
    expect(images).toHaveLength(0);
    expect(view.result.current).toMatchObject({ ready: true, photoFallback: false });
    expect(document.documentElement).not.toHaveAttribute('data-aca-home-photo-fallback');
  });

  it('dopo tre secondi applica fallback reali e ignora risoluzioni tardive', async () => {
    const fonts = deferred<FontFace[]>(); fontLoad.mockReturnValue(fonts.promise);
    const view = renderHook(() => useHomeStartupAssets(home, 'profile', true), { wrapper });
    act(() => images[0]!.load());
    act(() => vi.advanceTimersByTime(2999));
    expect(view.result.current.ready).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(view.result.current).toMatchObject({ ready: true, fontFallback: true, photoFallback: true });
    expect(document.documentElement).toHaveAttribute('data-aca-home-font-fallback');
    expect(document.documentElement).toHaveAttribute('data-aca-home-photo-fallback');
    await act(async () => { fonts.resolve([]); await fonts.promise; });
    await decode(images[0]!);
    expect(view.result.current).toMatchObject({ ready: true, fontFallback: true, photoFallback: true });
    expect(document.documentElement).toHaveAttribute('data-aca-home-photo-fallback');
  });

  it('conclude gli errori noti senza aspettare la soglia', async () => {
    fontLoad.mockRejectedValue(new Error('Font non disponibile'));
    const view = renderHook(() => useHomeStartupAssets(home, 'profile', true), { wrapper });
    act(() => images[0]!.onerror?.());
    await flush();
    expect(view.result.current).toMatchObject({ ready: true, fontFallback: true, photoFallback: true });
    expect(document.documentElement).toHaveAttribute('data-aca-home-font-fallback');
    fontLoad.mockResolvedValue([]);
    act(() => view.result.current.retry());
    act(() => images[1]!.load());
    await act(async () => {
      images[1]!.decoded.reject(new Error('Bitmap non decodificabile'));
      await images[1]!.decoded.promise.catch(() => undefined);
    });
    expect(view.result.current).toMatchObject({ ready: true, fontFallback: false, photoFallback: true });
  });

  it('un cambio di scope non accetta decode o readiness del precedente', async () => {
    const view = renderHook(({ scope }) => useHomeStartupAssets(home, scope, true), {
      initialProps: { scope: 'first' }, wrapper,
    });
    act(() => images[0]!.load());
    view.rerender({ scope: 'second' });
    expect(view.result.current.ready).toBe(false);
    await decode(images[0]!);
    expect(view.result.current.ready).toBe(false);
    act(() => images[1]!.load()); await decode(images[1]!);
    expect(view.result.current.ready).toBe(true);
    view.rerender({ scope: 'third' });
    expect(view.result.current.ready).toBe(false);
  });

  it('Riprova rimuove il fallback e attende il nuovo risultato', async () => {
    const view = renderHook(() => useHomeStartupAssets(home, 'profile', true), { wrapper });
    await flush(); act(() => vi.advanceTimersByTime(3000));
    expect(view.result.current.photoFallback).toBe(true);
    act(() => view.result.current.retry());
    expect(view.result.current.ready).toBe(false);
    expect(document.documentElement).not.toHaveAttribute('data-aca-home-photo-fallback');
    expect(images).toHaveLength(2);
    act(() => images[1]!.load()); await decode(images[1]!);
    expect(view.result.current).toMatchObject({ ready: true, fontFallback: false, photoFallback: false });
  });

  it('conserva il fallback accettato fra Home, Sistema e nuova Home nello stesso accesso', async () => {
    const pendingFonts = deferred<FontFace[]>(); fontLoad.mockReturnValue(pendingFonts.promise);
    function Probe() {
      const value = useHomeStartupAssets(home, 'profile', true);
      return <output data-testid="assets">{value.ready ? 'ready' : 'pending'}</output>;
    }
    const visit = (eligible: boolean) => <HomeStartupProvider eligible={eligible} identityManaged={false}>
      {eligible ? <Probe /> : <p>Sistema</p>}
    </HomeStartupProvider>;
    const view = render(visit(true));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByTestId('assets')).toHaveTextContent('ready');
    const calls = fontLoad.mock.calls.length;
    view.rerender(visit(false));
    expect(document.documentElement).toHaveAttribute('data-aca-home-font-fallback');
    view.rerender(visit(true));
    await flush();
    expect(screen.getByTestId('assets')).toHaveTextContent('ready');
    expect(fontLoad).toHaveBeenCalledTimes(calls); expect(images).toHaveLength(1);
    expect(document.documentElement).toHaveAttribute('data-aca-home-photo-fallback');
  });

  it('una nuova identità pulisce gli attributi e non eredita completamenti vecchi', async () => {
    const first = renderHook(() => useHomeStartupAssets(home, 'first-user', true), { wrapper });
    act(() => images[0]!.load());
    act(() => vi.advanceTimersByTime(3000));
    expect(document.documentElement).toHaveAttribute('data-aca-home-photo-fallback');
    first.unmount();
    expect(document.documentElement).not.toHaveAttribute('data-aca-home-photo-fallback');
    const second = renderHook(() => useHomeStartupAssets(home, 'second-user', true), { wrapper });
    await decode(images[0]!);
    expect(second.result.current.ready).toBe(false);
    expect(document.documentElement).not.toHaveAttribute('data-aca-home-photo-fallback');
    act(() => images[1]!.load()); await decode(images[1]!);
    expect(second.result.current).toMatchObject({ ready: true, photoFallback: false });
  });
});
