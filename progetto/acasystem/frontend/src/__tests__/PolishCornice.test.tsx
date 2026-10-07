import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Icon } from '@/components/primitives';
import { COVER_SETTING_LABEL, EditToolbar } from '@/components/system/edit/EditToolbar';
import { WidgetEditControls } from '@/components/system/edit/WidgetEditControls';
import { WidgetPositionControls } from '@/components/system/edit/WidgetPositionControls';
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
  onPageSettings: () => undefined,
  onNewPage: () => undefined,
  coverEnabled: true,
  onCoverChange: () => undefined,
};

describe('fascia del piè di pagina (L-01, B-04, K05)', () => {
  it('ha un’altezza fissa che non dipende dalla modalità modifica', () => {
    const footer = rule('shell', '.aca-shell__footer');
    expect(footer).toMatch(/height:\s*calc\(/);
    expect(footer).toMatch(
      /grid-template-rows:\s*var\(--aca-control-height\) var\(--aca-control-height\)/
    );
    expect(footer).toMatch(/padding:\s*var\(--aca-space-2\) var\(--aca-gutter\)/);
    // No rule of the frame changes the band with the edit state.
    expect(css.shell).not.toMatch(/is-editing[^{]*\{[^}]*height/);
    // Where there is room (from 40rem since the second round, V-02): one row of the frame
    // controls, still a fixed height.
    const shell = (css.shell ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
    const wide = /@media \(min-width: 40rem\) \{\s*\.aca-shell__footer \{([^}]*)\}/.exec(
      shell
    )?.[1];
    expect(wide).toMatch(/grid-template-rows:\s*var\(--aca-control-height\);/);
    expect(wide).toMatch(/height:\s*calc\(\s*var\(--aca-control-height\)/);
    // In that single row the edit bar shares the row of the indicator (no implicit second row
    // outside the band).
    const media = /@media \(min-width: 40rem\) \{([\s\S]*?)\n {2}\}/.exec(shell)?.[1] ?? '';
    expect(media).toMatch(
      /\.aca-shell__footer > :not\(\.aca-indicator\),\s*\.aca-shell__footer > \.aca-widget-position \{\s*grid-row: 1;/
    );
  });

  it('i comandi di spostamento prendono la fascia e nascondono l’indicatore senza spostarlo', () => {
    expect(
      rule('shell', '.aca-shell__footer:has(> .aca-widget-position) > .aca-indicator')
    ).toMatch(/visibility:\s*hidden/);
    expect(rule('shell', '.aca-shell__footer > .aca-edit-toolbar')).toMatch(
      /grid-template-columns:\s*subgrid/
    );
  });
});

describe('barra di modifica (L-07, B-09, K08, L-20, L-21)', () => {
  it('mette prima l’azione sempre disponibile e usa la variante control alla stessa taglia', () => {
    render(<EditToolbar {...toolbarProps} canAddWidget canEditPage />);
    const bar = screen.getByRole('group', { name: 'Modifica della disposizione' });
    const buttons = within(bar).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Nuova pagina',
      'Pagina',
      'Aggiungi widget',
    ]);
    for (const button of buttons) {
      expect(button).toHaveClass('aca-m--md', 'aca-frame-pill', 'aca-edit-toolbar__button');
      expect(button).not.toHaveClass('aca-m--primary');
      // Icon-only on narrow screens: the name stays in aria-label and title.
      expect(button.getAttribute('title')).toBe(button.getAttribute('aria-label'));
    }
    expect(screen.getByRole('button', { name: 'Aggiungi widget' })).toHaveAttribute(
      'data-launcher-add'
    );
    // Two groups: actions at the start, the cover setting at the end.
    expect(bar.querySelectorAll(':scope > .aca-edit-toolbar__group')).toHaveLength(2);
  });

  it('sulla copertina spiega perché mancano le azioni invece di mostrarle disabilitate', () => {
    const { rerender } = render(
      <EditToolbar {...toolbarProps} canAddWidget={false} canEditPage={false} />
    );
    const bar = screen.getByRole('group', { name: 'Modifica della disposizione' });
    expect(
      within(bar)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label'))
    ).toEqual(['Nuova pagina']);
    expect(bar.querySelector('button:disabled')).toBeNull();
    expect(screen.getByText('La copertina non contiene widget')).toBeInTheDocument();

    rerender(<EditToolbar {...toolbarProps} canAddWidget={false} canEditPage />);
    expect(
      within(bar)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label'))
    ).toEqual(['Nuova pagina', 'Pagina']);
    expect(screen.getByText('Questa pagina non contiene widget')).toBeInTheDocument();
  });

  it('chiama l’interruttore «Mostra copertina» e lo porta a 44 px', () => {
    const onCoverChange = vi.fn();
    render(
      <EditToolbar
        {...toolbarProps}
        canAddWidget
        canEditPage
        coverEnabled={false}
        onCoverChange={onCoverChange}
      />
    );
    const toggle = screen.getByRole('switch', { name: COVER_SETTING_LABEL });
    expect(COVER_SETTING_LABEL).toBe('Mostra copertina');
    expect(toggle).toHaveAttribute('title', 'Mostra copertina');
    fireEvent.click(toggle);
    expect(onCoverChange).toHaveBeenCalledWith(true);
    expect(rule('edit', '.aca-edit-toolbar__toggle.aca-m')).toMatch(
      /font-size:\s*calc\(var\(--aca-control-height\) \/ 2\.25\)/
    );
    expect(rule('edit', '.aca-frame-pill.aca-m--pill')).toMatch(
      /--aca-pad:\s*calc\(\(var\(--aca-control-height\) - 1\.25em\) \/ 2\) 1\.25em/
    );
  });

  it('i comandi di spostamento hanno «Fatto» non arancione e la freccia su con la sua icona', () => {
    const { container } = render(
      <WidgetPositionControls
        name="Luce"
        mode="move"
        onStep={() => undefined}
        onPage={() => undefined}
        onDone={() => undefined}
      />
    );
    const done = screen.getByRole('button', { name: 'Fatto' });
    expect(done).not.toHaveClass('aca-m--primary');
    expect(done).toHaveClass('aca-frame-pill');
    const up = screen.getByRole('button', { name: 'Sposta in alto' });
    expect(up.querySelector('svg')?.getAttribute('style') ?? '').not.toMatch(/rotate/);
    const { container: reference } = render(<Icon name="chevronUp" size="md" />);
    expect(up.querySelector('svg')?.innerHTML).toBe(reference.querySelector('svg')?.innerHTML);
    expect(container.querySelector('.aca-widget-position__name')).toHaveTextContent('Sposta Luce');
  });
});

describe('«×» di rimozione e menu del widget (L-06, K06, B-11, K21, K24)', () => {
  function renderControls(onRemove = vi.fn()) {
    render(
      <WidgetEditControls
        name="Luce cucina"
        handle={(props) => <button {...props} type="button" aria-label="Luce cucina" />}
        onMove={() => undefined}
        onResize={() => undefined}
        onSettings={() => undefined}
        onRemove={onRemove}
      />
    );
    return onRemove;
  }

  it('il pomello è piccolo, centrato sullo spigolo, con area di tocco di 44 px', () => {
    renderControls();
    const remove = screen.getByRole('button', { name: 'Rimuovi Luce cucina' });
    expect(remove).toHaveClass('aca-widget-edit__remove', 'aca-m--circle', 'aca-m--md');
    const knob = rule('edit', '.aca-widget-edit__remove.aca-m');
    expect(knob).toMatch(/--aca-dim:\s*var\(--aca-space-5\)/);
    expect(knob).toMatch(/top:\s*calc\(var\(--aca-dim\) \/ -2\)/);
    expect(knob).toMatch(/left:\s*calc\(var\(--aca-dim\) \/ -2\)/);
    expect(rule('edit', '.aca-widget-edit__remove::before')).toMatch(
      /inset:\s*calc\(\(var\(--aca-dim\) - var\(--aca-control-height\)\) \/ 2\)/
    );
  });

  it('conferma con «Rimuovi» nella variante danger, alla taglia dei controlli', () => {
    const onRemove = renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Luce cucina' }));
    const confirm = screen.getByRole('dialog', { name: 'Conferma la rimozione di Luce cucina' });
    const remove = within(confirm).getByRole('button', { name: 'Rimuovi' });
    expect(remove).toHaveClass('aca-m--danger', 'aca-frame-pill', 'aca-m--md');
    expect(remove).not.toHaveClass('aca-m--primary');
    expect(within(confirm).getByRole('button', { name: 'Annulla' })).toHaveClass('aca-frame-pill');
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('«Sposta» e «Ridimensiona» hanno icone proprie, diverse da «Nuova pagina»', () => {
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Luce cucina' }));
    const menu = screen.getByRole('dialog', { name: 'Azioni per Luce cucina' });
    const svg = (name: string) =>
      within(menu).getByRole('button', { name }).querySelector('svg')?.innerHTML;
    const iconOf = (name: 'move' | 'resize' | 'grid' | 'chevronRight') =>
      render(<Icon name={name} size="md" />).container.querySelector('svg')?.innerHTML;
    expect(svg('Sposta')).toBe(iconOf('move'));
    expect(svg('Ridimensiona')).toBe(iconOf('resize'));
    expect(svg('Sposta')).not.toBe(iconOf('grid'));
    expect(svg('Ridimensiona')).not.toBe(iconOf('chevronRight'));
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
      editMode={false}
      onToggleEdit={() => undefined}
      onOpenSystem={() => undefined}
      updateCount={2}
      {...overrides}
    />
  );
}

describe('barra di stato (L-14, K22, L-15, K20, K25, K09)', () => {
  it('ha un’altezza fissa e pulsanti circolari da 44 px; «Fine» è alto quanto loro', () => {
    const { rerender } = renderBar();
    expect(screen.getByRole('button', { name: 'Modifica' })).toHaveClass(
      'aca-m--circle',
      'aca-m--md'
    );
    expect(screen.getByRole('button', { name: /^Sistema/ })).toHaveClass(
      'aca-m--circle',
      'aca-m--md'
    );
    rerender(
      <StatusBar
        time={null}
        connection={{ phase: 'connected', label: 'Collegato' }}
        chips={chips}
        editMode
        onToggleEdit={() => undefined}
        onOpenSystem={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: 'Fine' })).toHaveClass(
      'aca-m--primary',
      'aca-m--md',
      'aca-status-bar__done-button'
    );
    const bar = rule('status', '.aca-status-bar');
    expect(bar).toMatch(/grid-template-rows:\s*var\(--aca-control-height\);/);
    expect(bar).toMatch(/padding:\s*var\(--aca-space-2\) var\(--aca-gutter\)/);
    expect(bar).not.toMatch(/min-height/);
    expect(rule('status', '.aca-status-bar__done-button.aca-m--pill')).toMatch(
      /--aca-pad:\s*calc\(\(var\(--aca-control-height\) - 1\.25em\) \/ 2\) 1\.25em/
    );
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
    // The label stays out of the flow (DES-8): the groove does not move while swiping.
    expect(rule('indicator', '.aca-indicator__label')).toMatch(/position:\s*absolute/);
  });

  it('in modifica il nome della pagina si ferma prima dell’impostazione della copertina', () => {
    // Second round (R-06): the room comes from the band (100cqw) and from the measured end of
    // the edit bar (--aca-band-end, footerBand.ts), not from a width estimated by hand.
    expect(rule('indicator', '.aca-indicator__label')).toMatch(
      /max-width:\s*min\(\s*14rem,\s*calc\(\(100cqw - 100%\) \/ 2 - var\(--aca-space-4\) - var\(--aca-band-end, 0px\)\)\s*\)/
    );
    expect(css.shell).not.toMatch(/--aca-band-end:\s*[\d.]+rem/);
  });
});
