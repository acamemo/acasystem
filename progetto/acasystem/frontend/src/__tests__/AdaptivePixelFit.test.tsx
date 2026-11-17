import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { adaptiveFixtureServices } from '@/utils/fixtures/adaptiveData';
import { createFixtureRuntime, fixtureEntity } from '@/utils/fixtures/runtime';
import type { CardSettings } from '@/@types/dashboard';

const observers: TestObserver[] = [];
class TestObserver {
  target: Element | null = null;
  options?: ResizeObserverOptions;
  disconnect = vi.fn();
  constructor(readonly callback: ResizeObserverCallback) { observers.push(this); }
  observe(target: Element, options?: ResizeObserverOptions) { this.target = target; this.options = options; }
  unobserve() {}
}
function mount(settings: CardSettings = {}, size = { w: 2, h: 2 }) {
  const saveCardSetting = vi.fn();
  const runtime = createFixtureRuntime({ conn: {} as never, services: adaptiveFixtureServices,
    entities: { 'light.salotto': fixtureEntity('light.salotto', 'on', { friendly_name: 'Luce soggiorno', brightness: 128, supported_color_modes: ['brightness'] }) }, saveCardSetting });
  const view = render(<WidgetRuntimeProvider value={runtime}><AdaptiveCategoryWidget type="light" entityId="light.salotto" settings={settings} size={size} editMode={false} /></WidgetRuntimeProvider>);
  const card = view.container.querySelector('article')!;
  const observer = observers.find((candidate) => candidate.target === card)!;
  const resize = (width: number, height: number, padding = 24) => act(() => observer.callback([
    { target: card, contentRect: { width: width - padding, height: height - padding },
      borderBoxSize: [{ inlineSize: width, blockSize: height }] } as unknown as ResizeObserverEntry,
  ], observer as unknown as ResizeObserver));
  return { ...view, card, observer, resize, saveCardSetting };
}

describe('presentazione compatta da spazio fisico disponibile', () => {
  beforeEach(() => { observers.length = 0; vi.stubGlobal('ResizeObserver', TestObserver); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('fits the first measured layout before an observer callback can expose partial content', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('aca-adaptive-widget') ? 120 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('aca-adaptive-widget') ? 140 : 0;
    });
    const view = mount();
    // No resize callback has run: the initial physical box already limits the complete card.
    expect(view.card).toHaveAttribute('data-tier', 'standard');
    expect(screen.getByRole('button', { name: 'Accensione luce' })).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: /Luminosità/ })).toBeNull();
    expect(view.saveCardSetting).not.toHaveBeenCalled();
  });

  it('si restringe e si riallarga senza perdere nome accessibile o fermare l’osservazione', () => {
    const view = mount();
    view.resize(160, 160);
    expect(view.card).toHaveAttribute('data-tier', 'standard');
    expect(screen.getByRole('heading', { name: 'Luce soggiorno' })).toBeInTheDocument();
    view.resize(80, 80);
    expect(view.card).toHaveAttribute('data-tier', 'compact');
    expect(view.card).toHaveAttribute('data-pixel-compact', 'true');
    expect(screen.getByRole('button', { name: 'Accensione luce: Luce soggiorno' })).toBeInTheDocument();
    expect(view.card).toHaveAttribute('aria-label', 'Luce soggiorno');
    expect(screen.queryByRole('heading')).toBeNull();
    // Content padding can change in compact mode; only the stable border box selects the tier.
    view.resize(80, 80, 4);
    expect(view.card).toHaveAttribute('data-tier', 'compact');
    expect(view.observer.disconnect).not.toHaveBeenCalled();
    expect(view.observer.options).toEqual({ box: 'border-box' });
    view.resize(160, 160);
    expect(view.card).toHaveAttribute('data-tier', 'standard');
    expect(screen.getByRole('button', { name: 'Accensione luce' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Luce soggiorno' })).toBeInTheDocument();
    expect(view.saveCardSetting).not.toHaveBeenCalled();
  });

  it('conserva ordine e controlli scelti durante la riduzione temporanea', () => {
    const settings: CardSettings = { adaptiveControls: { order: ['brightness', 'power'], visible: ['brightness', 'power'] } };
    const original = JSON.stringify(settings);
    const view = mount(settings);
    view.resize(320, 200);
    expect(screen.getByRole('slider', { name: /Luminosità/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accensione luce' })).toBeInTheDocument();
    view.resize(80, 80);
    expect(screen.getByRole('slider', { name: /Luminosità.*Luce soggiorno/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accensione luce/ })).toBeNull();
    view.resize(320, 200);
    expect(screen.getByRole('button', { name: 'Accensione luce' })).toBeInTheDocument();
    expect(JSON.stringify(settings)).toBe(original);
    expect(view.saveCardSetting).not.toHaveBeenCalled();
  });

  it('mantiene la presentazione delle schede già compatte per dimensione logica', () => {
    const view = mount({}, { w: 1, h: 1 });
    view.resize(80, 80);
    expect(view.card).toHaveAttribute('data-tier', 'compact');
    expect(view.card).not.toHaveAttribute('data-pixel-compact');
    expect(screen.getByRole('button', { name: 'Accensione luce: Luce soggiorno' })).toBeInTheDocument();
  });
});
