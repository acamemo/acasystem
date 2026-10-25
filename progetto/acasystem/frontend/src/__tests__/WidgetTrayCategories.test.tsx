/**
 * Categories of the tray and the shape of each widget (REP-20261007-035), as the grouped
 * widget picker of Android.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetTray, type TrayItem } from '@/components/system/edit/WidgetTray';
import { ADD_WIDGET_TYPES, WIDGET_CATEGORIES, categoryOf } from '@/templates/sheets/catalog';

const items: TrayItem[] = [
  { type: 'light', label: 'Luce', icon: 'light', category: 'comandi', size: { w: 1, h: 1 } },
  { type: 'climate', label: 'Clima', icon: 'thermostat', category: 'clima', size: { w: 2, h: 2 } },
  { type: 'lock', label: 'Serratura', icon: 'lock', category: 'sicurezza', size: { w: 2, h: 1 } },
];

function renderTray() {
  render(
    <WidgetTray
      open
      items={items}
      categories={WIDGET_CATEGORIES}
      onTilePointerDown={vi.fn()}
      onPick={vi.fn()}
      onClose={vi.fn()}
    />
  );
  return within(screen.getByRole('group', { name: 'Tipi di widget' }));
}

const animated = vi.fn();
const running: Array<{ cancel: ReturnType<typeof vi.fn>; finished: Promise<void> }> = [];
const originalAnimate = HTMLElement.prototype.animate;

beforeEach(() => {
  running.length = 0;
  animated.mockReset().mockImplementation(() => {
    const animation = { cancel: vi.fn(), finished: new Promise<void>(() => {}) };
    running.push(animation);
    return animation;
  });
  HTMLElement.prototype.animate = animated;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false }))
  );
});

afterEach(() => {
  HTMLElement.prototype.animate = originalAnimate;
  vi.unstubAllGlobals();
});

describe('tray categories', () => {
  it('does not add after touch cancellation for scrolling; a fresh tap and keyboard still add', () => {
    const onPick = vi.fn();
    render(
      <WidgetTray
        open
        items={items}
        categories={WIDGET_CATEGORIES}
        onTilePointerDown={vi.fn()}
        onPick={onPick}
        onClose={vi.fn()}
      />
    );
    const tile = screen.getByRole('button', { name: /Luce/ });
    fireEvent.pointerDown(tile);
    fireEvent.pointerCancel(tile);
    fireEvent.click(tile, { detail: 1 });
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.click(tile, { detail: 0 });
    expect(onPick).toHaveBeenCalledOnce();
    fireEvent.pointerDown(tile);
    fireEvent.pointerUp(tile);
    fireEvent.click(tile, { detail: 1 });
    expect(onPick).toHaveBeenCalledTimes(2);
  });

  it('every type of the catalog belongs to a category', () => {
    const listed = WIDGET_CATEGORIES.flatMap((category) => [...category.types] as string[]);
    for (const type of ADD_WIDGET_TYPES) expect(listed, type.type).toContain(type.type);
    expect(categoryOf('climate')).toBe('clima');
  });

  it('a chip narrows the row; the search looks in every category', () => {
    const row = renderTray();
    expect(row.getAllByRole('button')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Clima e meteo' }));
    expect(row.getAllByRole('button').map((tile) => tile.textContent)).toEqual(['Clima2 × 2']);
    fireEvent.change(screen.getByLabelText('Cerca un tipo di widget'), {
      target: { value: 'serr' },
    });
    expect(row.getAllByRole('button').map((tile) => tile.textContent)).toEqual(['Serratura2 × 1']);
  });

  it('each tile shows the cells the widget takes', () => {
    const row = renderTray();
    const climate = row.getByRole('button', { name: /Clima/ });
    expect(climate.querySelectorAll('.aca-widget-tray__cell')).toHaveLength(4);
  });

  it('selects immediately and keeps outgoing tiles inaccessible during the fade', () => {
    const row = renderTray();
    const chip = screen.getByRole('button', { name: 'Clima e meteo' });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(row.getAllByRole('button')).toHaveLength(1);
    const ghosts = document.querySelectorAll<HTMLElement>('.aca-widget-tray__tile--exiting');
    expect(ghosts).toHaveLength(2);
    for (const ghost of ghosts) {
      expect(ghost).toHaveAttribute('aria-hidden', 'true');
      expect(ghost.inert).toBe(true);
      expect(ghost.tabIndex).toBe(-1);
    }
    expect(animated.mock.calls.map((call) => call[1].duration)).toEqual([220, 140, 140]);
  });

  it('cancels previous transitions on rapid choices and animates only the latest entries', () => {
    const row = renderTray();
    fireEvent.click(screen.getByRole('button', { name: 'Clima e meteo' }));
    const previous = [...running];
    fireEvent.click(screen.getByRole('button', { name: 'Sicurezza' }));
    for (const animation of previous) expect(animation.cancel).toHaveBeenCalledOnce();
    expect(row.getAllByRole('button').map((tile) => tile.textContent)).toEqual(['Serratura2 × 1']);
    expect(document.querySelectorAll('.aca-widget-tray__tile--exiting')).toHaveLength(1);
    expect(animated.mock.calls.at(-2)?.[1]).toMatchObject({ duration: 160, delay: 60 });
    const element = row
      .getByRole('button', { name: /Serratura/ })
      .closest('.aca-widget-tray__row')!;
    expect(element.scrollLeft).toBe(0);
  });

  it('cancels transitions for search and keeps empty results immediate', () => {
    const row = renderTray();
    fireEvent.click(screen.getByRole('button', { name: 'Clima e meteo' }));
    const previous = [...running];
    animated.mockClear();
    fireEvent.change(screen.getByLabelText('Cerca un tipo di widget'), {
      target: { value: 'inesistente' },
    });
    for (const animation of previous) expect(animation.cancel).toHaveBeenCalledOnce();
    expect(row.queryAllByRole('button')).toHaveLength(0);
    expect(row.getByText('Nessun tipo con questo nome.')).toBeInTheDocument();
    expect(document.querySelector('.aca-widget-tray__tile--exiting')).toBeNull();
    expect(animated).not.toHaveBeenCalled();
  });

  it('finishes visual motion before passing pointer down to the drag controller', () => {
    const onPick = vi.fn();
    const onTilePointerDown = vi.fn(() => {
      for (const animation of running) expect(animation.cancel).toHaveBeenCalled();
      expect(document.querySelector('.aca-widget-tray__tile--exiting')).toBeNull();
    });
    render(
      <WidgetTray
        open
        items={items}
        categories={WIDGET_CATEGORIES}
        onPick={onPick}
        onTilePointerDown={onTilePointerDown}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clima e meteo' }));
    const tile = screen.getByRole('button', { name: /Clima2/ });
    fireEvent.pointerDown(tile);
    expect(onTilePointerDown).toHaveBeenCalledOnce();
    fireEvent.click(tile);
    expect(onPick).toHaveBeenCalledWith(items[1]);
  });

  it('skips animation with reduced motion and still resets the horizontal scroll', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    );
    const row = renderTray();
    const container = row.getByRole('button', { name: /Clima2/ }).parentElement!;
    container.scrollLeft = 100;
    fireEvent.click(screen.getByRole('button', { name: 'Clima e meteo' }));
    expect(container.scrollLeft).toBe(0);
    expect(animated).not.toHaveBeenCalled();
  });

  it('cancels animations and removes ghosts on unmount', () => {
    const { unmount } = render(
      <WidgetTray
        open
        items={items}
        categories={WIDGET_CATEGORIES}
        onPick={vi.fn()}
        onTilePointerDown={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clima e meteo' }));
    unmount();
    for (const animation of running) expect(animation.cancel).toHaveBeenCalledOnce();
    expect(document.querySelector('.aca-widget-tray__tile--exiting')).toBeNull();
  });
});
