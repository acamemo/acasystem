import { lazy, Suspense, useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomDrawer } from '@/components/primitives';
import { useWidgetScene } from '@/hooks/launcher/useWidgetScene';

const completion = vi.hoisted(() => ({ callbacks: [] as (() => void)[], cancel: vi.fn() }));
vi.mock('@/utils/launcher/motion', () => ({ afterTransition: (_element: unknown, _properties: unknown, _time: number, done: () => void) => {
  completion.callbacks.push(done); return completion.cancel;
} }));
beforeEach(() => { completion.callbacks.length = 0; completion.cancel.mockClear(); vi.useFakeTimers(); vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined); });
afterEach(() => { cleanup(); vi.runOnlyPendingTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Home widget/catalog scene owners', () => {
  it('keeps a direct tool in front while unrelated preloaded utilities are closed', () => {
    const scene = renderHook(() => useWidgetScene(false));
    act(() => scene.result.current.onDiscoveryOpenChange(true));
    act(() => scene.result.current.onTavanoOpenChange(false));
    act(() => scene.result.current.onDestinationOpenChange(false));
    expect(scene.result.current.phase).toBe('open');
    act(() => scene.result.current.onDiscoveryOpenChange(false));
    expect(scene.result.current.phase).toBe('returning');
  });
  it('keeps Home concealed until every committed owner has left', () => {
    const scene = renderHook(() => useWidgetScene(false));
    act(() => scene.result.current.onWidgetOpenChange(true));
    act(() => scene.result.current.onCatalogOpenChange(true));
    act(() => scene.result.current.onWidgetOpenChange(false));
    expect(scene.result.current.phase).toBe('open');
    act(() => scene.result.current.onCatalogOpenChange(false));
    expect(scene.result.current.phase).toBe('returning');
    act(() => completion.callbacks[0]());
    expect(scene.result.current.phase).toBe('closed');
  });

  it('ignores an old return completion while a new window owns the foreground', () => {
    const scene = renderHook(() => useWidgetScene(false));
    act(() => scene.result.current.onCatalogOpenChange(true));
    act(() => scene.result.current.onCatalogOpenChange(false));
    const old = completion.callbacks[0];
    act(() => scene.result.current.onWidgetOpenChange(true));
    act(() => old());
    expect(scene.result.current.phase).toBe('open');
    expect(completion.cancel).toHaveBeenCalled();
  });

  it('waits for a lazy panel real commit and starts the return as soon as that panel closes', async () => {
    let resolve!: (value: { default: typeof BottomDrawer }) => void;
    const pending = new Promise<{ default: typeof BottomDrawer }>((done) => { resolve = done; });
    const LazyDrawer = lazy(() => pending);
    function Harness() {
      const scene = useWidgetScene(false), [open, setOpen] = useState(false);
      return <><div ref={scene.sceneRef} data-testid="home" data-phase={scene.phase}><div className="aca-shell" />
        <button onClick={() => setOpen(true)}>Richiedi catalogo</button></div>
        <Suspense fallback={null}>{open && <LazyDrawer open title="Widget" onClose={() => setOpen(false)}
          onOpenChange={scene.onCatalogOpenChange}><p>Catalogo pronto</p></LazyDrawer>}</Suspense></>;
    }
    render(<Harness />); fireEvent.click(screen.getByRole('button', { name: 'Richiedi catalogo' }));
    expect(screen.getByTestId('home')).toHaveAttribute('data-phase', 'closed');
    expect(document.querySelector('.aca-bottom-drawer')).toBeNull();
    await act(async () => { resolve({ default: BottomDrawer }); await pending; });
    expect(screen.getByTestId('home')).toHaveAttribute('data-phase', 'open');
    expect(document.querySelector('.aca-bottom-drawer')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('home')).toHaveAttribute('data-phase', 'returning');
  });
});

describe('direct catalog progress shares the existing Home layer', () => {
  let current!: ReturnType<typeof useWidgetScene>;
  let renders = 0;
  function DirectHome() {
    current = useWidgetScene(false); renders++;
    const [draft, setDraft] = useState('bozza');
    return <div ref={current.sceneRef} data-widget-screen={current.phase}>
      <div className="aca-shell"><input aria-label="Bozza locale" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button>Primo widget</button><button>Secondo widget</button></div>
    </div>;
  }
  it('tracks opacity without rerendering or losing local contents while the finger holds', () => {
    renders = 0; render(<DirectHome />);
    fireEvent.change(screen.getByLabelText('Bozza locale'), { target: { value: 'conservata' } });
    const before = renders, shell = document.querySelector<HTMLElement>('.aca-shell')!;
    for (const progress of [0.02, 0.06, 0.15]) {
      act(() => current.onCatalogProgress(progress, true));
      expect(Number(shell.style.opacity)).toBeCloseTo(1 - progress);
      expect(shell.style.transition).toBe('none');
      expect(shell).toHaveAttribute('inert');
      expect(shell.parentElement).toHaveAttribute('data-catalog-gesture');
    }
    expect(renders).toBe(before); expect(screen.getByLabelText('Bozza locale')).toHaveValue('conservata');
    expect(current.phase).toBe('closed');
    act(() => current.onCatalogProgress(0, false)); act(() => current.onCatalogProgress(null, false));
    expect(shell.style.opacity).toBe(''); expect(shell.style.transition).toBe(''); expect(shell).not.toHaveAttribute('inert');
    expect(shell.parentElement).not.toHaveAttribute('data-catalog-gesture');
  });
  it('forgets a cancelled source and restores the actual source of the following committed gesture', () => {
    render(<DirectHome />); const first = screen.getByRole('button', { name: 'Primo widget' }), second = screen.getByRole('button', { name: 'Secondo widget' });
    first.focus(); act(() => current.onCatalogProgress(0.1, true));
    act(() => current.onCatalogProgress(0, false)); act(() => current.onCatalogProgress(null, false));
    second.focus(); act(() => current.onCatalogProgress(0.2, true));
    act(() => current.onCatalogProgress(1, false)); act(() => current.onCatalogOpenChange(true));
    act(() => current.onCatalogProgress(null, false)); expect(current.phase).toBe('open');
    second.blur(); act(() => current.onCatalogProgress(0, false)); act(() => current.onCatalogOpenChange(false));
    act(() => current.onCatalogProgress(null, false)); expect(current.phase).toBe('closed'); expect(second).toHaveFocus();
  });
  it('does not remove a different committed owner when an old preview completes', () => {
    render(<DirectHome />); act(() => current.onWidgetOpenChange(true));
    act(() => current.onCatalogProgress(0.2, true)); act(() => current.onCatalogProgress(0, false));
    act(() => current.onCatalogProgress(null, false)); expect(current.phase).toBe('open');
    expect(document.querySelector<HTMLElement>('.aca-shell')!.style.opacity).toBe('');
  });
});
