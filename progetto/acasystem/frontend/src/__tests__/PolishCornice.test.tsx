import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { EditToolbar } from '@/components/system/edit/EditToolbar';
import { WidgetActionBar } from '@/components/system/edit/WidgetActionBar';
import { PageIndicator } from '@/components/system/page-indicator/PageIndicator';
import { StatusBar, overflowEdges } from '@/components/system/status-bar/StatusBar';
import type { StatusChip } from '@/utils/launcher/statusChips';

/**
 * REP-20261007-001, corsia cornice: fascia del piè di pagina costante, barra di modifica, «×» di
 * rimozione, barra di stato e indicatore di pagina. jsdom non calcola il layout: il
 * comportamento si verifica sul DOM e le regole che garantiscono la geometria sui CSS letti dal
 * disco (le misure reali sono nel resoconto della corsia, prese con Playwright).
 */

const css: Record<string, string> = {};

beforeAll(async () => {
  // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  for (const [key, path] of Object.entries({
    shell: 'src/templates/app-shell/appShell.css',
    status: 'src/components/system/status-bar/statusBar.css',
    edit: 'src/components/system/edit/edit.css',
    indicator: 'src/components/system/page-indicator/pageIndicator.css',
    kit: 'src/themes/acasystem/components.css',
  })) {
    css[key] = fs.readFileSync(path, 'utf8');
  }
});

/** Body of the first rule whose selector is exactly `selector` (comments ignored). */
function rule(file: string, selector: string): string {
  const source = (css[file] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';
}

const toolbarProps = {
  onAddWidget: () => undefined,
  onPages: () => undefined,
  onDone: () => undefined,
};

describe('fascia del piè di pagina (L-01, B-04, K05)', () => {
  it('ha un’altezza fissa che non dipende dalla modalità modifica (ADR-0016)', () => {
    const footer = rule('shell', '.aca-shell__footer');
    // The bars lie over the pages in a band of their own (--aca-bars-foot); the band the pager
    // reaches under is the safe area (--aca-shell-foot).
    expect(footer).toMatch(/height:\s*var\(--aca-bars-foot\)/);
    expect(rule('shell', '.aca-shell')).toMatch(
      /--aca-bars-foot:\s*calc\(\s*var\(--aca-float-height\) \+ var\(--aca-space-2\) \+ var\(--aca-space-3\)/
    );
    // One row of the frame controls at every width, with no row for the indicator.
    expect(footer).toMatch(/grid-template-rows:\s*var\(--aca-float-height\);/);
    expect(footer).toMatch(/padding:\s*var\(--aca-space-2\) var\(--aca-gutter\)/);
    // No rule of the frame changes the band with the edit state.
    expect(css.shell).not.toMatch(/is-editing[^{]*\{[^}]*height/);
  });

  it('la barra di modifica ha tutta la riga; i comandi a frecce non ci sono più', () => {
    // The on-screen move controls were removed (REP-20261008-001): no rule of theirs is left.
    expect(css.shell).not.toMatch(/\.aca-widget-position/);
    // Whatever the bar is, it takes the one cell of the band; its groups go to the two ends.
    expect(rule('shell', '.aca-shell__footer > *')).toMatch(/grid-column:\s*1;/);
    expect(rule('edit', '.aca-edit-toolbar')).toMatch(/justify-content:\s*space-between/);
  });
});

describe('barra di modifica (L-07, B-09, K08, L-20, L-21)', () => {
  it('ha «+ Widget», «Pagine» (control, stessa taglia) e «Fine» (primaria, con testo; REP-20261009-004)', () => {
    const onPages = vi.fn();
    const onDone = vi.fn();
    render(<EditToolbar {...toolbarProps} canAddWidget onPages={onPages} onDone={onDone} />);
    const bar = screen.getByRole('group', { name: 'Modifica della disposizione' });
    const buttons = within(bar).getAllByRole('button');
    // REP-20261007-019: short visible texts, contained in the accessible names (WCAG 2.5.3).
    expect(
      buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent)
    ).toEqual(['Aggiungi widget', 'Modifica le pagine', 'Fine']);
    expect(buttons.map((button) => button.textContent)).toEqual(['Widget', 'Pagine', 'Fine']);
    for (const button of buttons.slice(0, 2)) {
      expect(button).toHaveClass('aca-m--md', 'aca-frame-pill', 'aca-edit-toolbar__button');
      expect(button).not.toHaveClass('aca-m--primary');
      // Icon-only on narrow screens: the name stays in aria-label and title.
      expect(button.getAttribute('title')).toBe(button.getAttribute('aria-label'));
    }
    expect(screen.getByRole('button', { name: 'Aggiungi widget' })).toHaveAttribute(
      'data-launcher-add'
    );
    // «Fine» is the one orange action and keeps its text at every density: it does not take the
    // icon-only look of the footer band.
    expect(buttons[2]).toHaveClass('aca-m--primary', 'aca-m--md', 'aca-frame-pill');
    expect(buttons[2]).not.toHaveClass('aca-edit-toolbar__button');
    // Two groups: «+ Widget» at the start, «Pagine» and «Fine» at the end; no switch is left.
    expect(bar.querySelectorAll(':scope > .aca-edit-toolbar__group')).toHaveLength(2);
    expect(bar.querySelector(':scope > .aca-edit-toolbar__pages')).toContainElement(buttons[1]);
    expect(bar.querySelector(':scope > .aca-edit-toolbar__pages')).toContainElement(buttons[2]);
    expect(within(bar).queryByRole('switch')).toBeNull();
    fireEvent.click(buttons[1]);
    expect(onPages).toHaveBeenCalledTimes(1);
    fireEvent.click(buttons[2]);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('su una pagina speciale spiega perché manca «+ Widget» invece di mostrarlo disabilitato', () => {
    render(<EditToolbar {...toolbarProps} canAddWidget={false} />);
    const bar = screen.getByRole('group', { name: 'Modifica della disposizione' });
    expect(
      within(bar)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label') ?? b.textContent)
    ).toEqual(['Modifica le pagine', 'Fine']);
    expect(bar.querySelector('button:disabled')).toBeNull();
    expect(screen.getByText('Questa pagina non contiene widget')).toBeInTheDocument();
  });

  it('i pulsanti stanno a 44 px e la copertina non ha più regole nella barra', () => {
    expect(rule('edit', '.aca-frame-pill.aca-m--pill')).toMatch(
      /--aca-pad:\s*calc\(\(var\(--aca-control-height\) - 1\.25em\) \/ 2\) 1\.25em/
    );
    expect(css.edit).not.toMatch(/aca-edit-toolbar__(cover|short|toggle)/);
    // The bar of the pages has icons without words (REP-20261009-002), and its reasons never
    // reach the bar of the widget, which shares the classes of the overview bar.
    const edit = (css.edit ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(edit).not.toMatch(/aca-page-overview__text/);
    expect(edit).not.toMatch(/\.aca-page-overview \.aca-bar-button:disabled/);
  });
});

describe('barra del widget selezionato, al posto di «×» e del menu (REP-20261007-029)', () => {
  function renderBar(onRemove = vi.fn(), changed = false) {
    render(
      <WidgetActionBar
        hidden={false}
        name="Luce cucina"
        changed={changed}
        onDone={() => undefined}
        onUndo={() => undefined}
        onRemove={onRemove}
      />
    );
    return onRemove;
  }

  it('la cornice di presa del widget selezionato esce di 2 rem oltre il widget (REP-20261008-001)', () => {
    expect(rule('edit', '.aca-resize-frame')).toMatch(/--aca-resize-out:\s*2rem/);
    expect(rule('edit', '.aca-resize-frame')).toMatch(/--aca-resize-in:\s*min\(1rem, 16%\)/);
  });

  it('il cestino rimuove subito, senza conferma (come Android, REP-20261007-031)', () => {
    const onRemove = renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Luce cucina' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('«Annulla» è attivo solo dopo una modifica; la barra ha solo Rimuovi, Annulla e Fine', () => {
    renderBar(vi.fn(), false);
    const bar = screen.getByRole('toolbar', { name: 'Modifica Luce cucina' });
    expect(within(bar).getByRole('button', { name: 'Annulla' })).toBeDisabled();
    // U3: no settings (double tap on the widget) and no arrows (REP-20261008-001).
    expect(
      within(bar)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent)
    ).toEqual(['Rimuovi Luce cucina', 'Annulla', 'Fine']);
    expect(bar.querySelector('[data-widget-action="settings"]')).toBeNull();
    expect(bar.querySelector('[data-widget-action="move"]')).toBeNull();
    expect(bar.querySelector('[data-widget-action="resize"]')).toBeNull();
  });
});

const chips: StatusChip[] = [
  { id: 'a', kind: 'person', label: 'Mario', detail: 'A casa', icon: 'profile', tone: 'active' },
  { id: 'b', kind: 'person', label: 'Giulia', detail: 'Lavoro', icon: 'profile', tone: 'neutral' },
];

function renderBar(overrides: Partial<Parameters<typeof StatusBar>[0]> = {}) {
  return render(
    <StatusBar
      time={new Date(2026, 9, 7, 9, 5)}
      connection={{ phase: 'connected', label: 'Collegato' }}
      chips={chips}
      onEdit={() => undefined}
      onOpenSystem={() => undefined}
      updateCount={2}
      {...overrides}
    />
  );
}

describe('barra di stato (L-14, K22, L-15, K20, K25, K09)', () => {
  it('ha un’altezza fissa e pulsanti da 44 px; «Modifica» non diventa «Fine» (REP-20261009-004, D1)', () => {
    renderBar();
    // «Modifica» is the pencil with its name, at the height of the frame controls (44 px) like
    // «Pagine» of the edit bar; Sistema is an icon button of the kit (REP-20261013-002).
    const edit = screen.getByRole('button', { name: 'Modifica' });
    expect(edit).toHaveClass('aca-frame-pill');
    expect(edit).toHaveTextContent('Modifica');
    expect(rule('edit', '.aca-frame-pill.aca-m--pill')).toMatch(/--aca-pad:\s*calc\(/);
    expect(screen.getByRole('button', { name: /^Sistema/ })).toHaveClass('aca-bar-button');
    expect(screen.queryByRole('button', { name: 'Fine' })).toBeNull();
    // Kit component since REP-20261007-024 (also sheets, modals, Sistema).
    expect(rule('kit', '.aca-bar-button')).toMatch(/height:\s*var\(--aca-control-height\)/);
    // Two floating pills (REP-20261007-014), as high as the groups of the edit bar, with the
    // same raised look; the root is absolute in the band and takes no pointer.
    const bar = rule('status', '.aca-status-bar');
    expect(bar).toMatch(/position:\s*absolute/);
    expect(bar).toMatch(/pointer-events:\s*none/);
    const pill = rule('status', '.aca-status-bar__pill');
    expect(pill).toMatch(/height:\s*var\(--aca-float-height\)/);
    expect(pill).toMatch(/padding:\s*var\(--aca-space-1\)/);
    expect(pill).toMatch(/box-shadow:\s*var\(--aca-socket-shadow\)/);
    expect(pill).not.toMatch(/min-height/);
    // The morph of the pencil into «Fine» went with «Fine» (it is in the edit bar).
    expect(css.status).not.toMatch(/aca-edit-toggle/);
  });

  it('sulla copertina tiene il posto dell’ora, invisibile e muto', () => {
    const { container } = renderBar({ time: null });
    expect(container.querySelector('time')).toBeNull();
    const reserved = container.querySelector('.aca-status-bar__time--reserved');
    expect(reserved).toHaveAttribute('aria-hidden', 'true');
    expect(reserved).toHaveClass('aca-status-bar__time');
    expect(rule('status', '.aca-status-bar__time--reserved')).toMatch(/visibility:\s*hidden/);
  });

  it('il pallino degli aggiornamenti è blu (informazione), non rosso', () => {
    const { container } = renderBar();
    expect(container.querySelector('.aca-status-bar__system .aca-badge')).not.toBeNull();
    expect(rule('status', '.aca-status-bar__system')).toMatch(/--aca-badge:\s*var\(--aca-blue\)/);
  });

  it('sfuma il lato delle chip che non entrano', () => {
    expect(overflowEdges({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 })).toBe('');
    expect(overflowEdges({ scrollLeft: 0, scrollWidth: 500, clientWidth: 300 })).toBe('end');
    expect(overflowEdges({ scrollLeft: 100, scrollWidth: 500, clientWidth: 300 })).toBe(
      'start end'
    );
    expect(overflowEdges({ scrollLeft: 200, scrollWidth: 500, clientWidth: 300 })).toBe('start');

    renderBar();
    const list = screen.getByRole('list', { name: 'Stato della casa' });
    expect(list).not.toHaveAttribute('data-overflow');
    Object.defineProperty(list, 'scrollWidth', { configurable: true, value: 500 });
    Object.defineProperty(list, 'clientWidth', { configurable: true, value: 300 });
    act(() => {
      fireEvent.scroll(list);
    });
    expect(list).toHaveAttribute('data-overflow', 'end');
    act(() => {
      list.scrollLeft = 200;
      fireEvent.scroll(list);
    });
    expect(list).toHaveAttribute('data-overflow', 'start');
    expect(rule('status', ".aca-status-bar__chips[data-overflow='end']")).toMatch(/mask-image/);
  });
});

describe('indicatore di pagina (L-18, K10, K11)', () => {
  it('con una pagina mostra solo il nome, senza scanalatura', () => {
    const { container } = render(
      <PageIndicator labels={['Principale']} index={0} onChange={() => undefined} />
    );
    expect(container.querySelector('.aca-indicator__track')).toBeNull();
    expect(container.querySelector('.aca-indicator')).toHaveClass('aca-indicator--single');
    expect(screen.getByText('Principale')).not.toHaveAttribute('aria-hidden');
  });

  it('con due pagine ha una tacca per pagina sopra la sfera e passi da 44 px', () => {
    const { container } = render(
      <PageIndicator labels={['Copertina', 'Principale']} index={1} onChange={() => undefined} />
    );
    expect(container.querySelectorAll('.aca-indicator__dot')).toHaveLength(2);
    expect(screen.getByRole('slider', { name: 'Pagina' })).toHaveAttribute(
      'aria-valuetext',
      'Pagina 2 di 2: Principale'
    );
    const track = rule('indicator', '.aca-indicator__track');
    // A minimum length (no switch-like pill) and at least 44 px per page.
    expect(track).toMatch(/--aca-track-min:\s*8rem/);
    expect(track).toMatch(
      /max\(var\(--aca-control-height\), calc\(var\(--aca-track-min\) \/ var\(--aca-steps\)\)\)/
    );
    expect(rule('indicator', '.aca-indicator__dot')).toMatch(/z-index:\s*1/);
    expect(rule('indicator', '.aca-indicator__content')).toMatch(
      /height:\s*calc\(var\(--aca-control-height\) - 2 \* var\(--aca-pad\)\)/
    );
    // The name sits under the groove (REP-20261007-012): centred, so the groove does not move.
    expect(rule('indicator', '.aca-indicator')).toMatch(/flex-direction:\s*column/);
  });

  it('il nome della pagina sta sotto la scanalatura e non supera la banda', () => {
    // REP-20261007-012: one centred line under the groove, bounded by the band (100cqw).
    expect(rule('indicator', '.aca-indicator__label')).toMatch(/max-width:\s*min\(14rem, 100cqw\)/);
    expect(rule('indicator', '.aca-indicator__label')).not.toMatch(/position:\s*absolute/);
    expect(css.shell).not.toMatch(/--aca-band-end:\s*[\d.]+rem/);
  });
});
