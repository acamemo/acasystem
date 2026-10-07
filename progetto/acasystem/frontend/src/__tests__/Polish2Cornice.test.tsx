import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  COVER_SETTING_LABEL,
  COVER_SETTING_SHORT_LABEL,
  EditToolbar,
} from '@/components/system/edit/EditToolbar';
import { PageIndicator } from '@/components/system/page-indicator/PageIndicator';
import { AppShell } from '@/templates/app-shell/AppShell';
import {
  applyFooterBand,
  fitBand,
  lengthToPx,
  type BandDensity,
  type BandGroups,
  type BandMeasures,
  type BandMemory,
} from '@/templates/app-shell/footerBand';

/**
 * REP-20261007-001, secondo giro, corsia cornice: V-01 (barra di modifica e indicatore non si
 * sovrappongono mai), V-02 (fascia a una riga dove c'è spazio), V-05 (minimo leggibile del nome
 * della pagina), V-06 (nome visibile breve dell'interruttore della copertina sul telefono), R-05
 * (strati con nome), R-06 (valori della scala e larghezza ricavata dalla struttura), R-07
 * (commento del margine). jsdom non calcola il layout: la scelta è verificata sulla funzione pura
 * con le larghezze misurate in Chromium (resoconto della corsia) e sul DOM con misure simulate.
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
    edit: 'src/components/system/edit/edit.css',
    indicator: 'src/components/system/page-indicator/pageIndicator.css',
  })) {
    css[key] = fs.readFileSync(path, 'utf8');
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

const uncommented = (file: string) => (css[file] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');

/** Body of the first rule whose selector is exactly `selector` (comments ignored). */
function rule(file: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(uncommented(file))?.[1] ?? ''
  );
}

/** Widths measured in Chromium on launcher.html (px), first round and this round. */
const MEASURED: Record<BandDensity, BandGroups> = {
  text: { actions: 475, cover: 256 },
  short: { actions: 148, cover: 153 },
  icons: { actions: 148, cover: 116 },
};
const GAP = 16; // --aca-space-4, column gap of the band
const LABEL_GAP = 24; // --aca-space-5, between the page name and the cover setting
const LABEL_MIN = 80; // --aca-label-min, 5rem
const STOP = 44; // --aca-control-height
const BALL = 28; // --aca-ball, the narrowest stop
const PAD = 8; // two --aca-space-1

const gutter = (viewport: number) => Math.min(28, Math.max(16, viewport * 0.025));
const indicatorWidth = (entries: number, step: number) => entries * step + PAD;

function oneRow(viewport: number, pages: number, overrides: Partial<BandMeasures> = {}) {
  const width = viewport - 2 * gutter(viewport);
  const entries = pages + 1; // the cover too
  const measures: BandMeasures = {
    width,
    rows: 1,
    gap: GAP,
    groupGap: GAP,
    indicator: Math.min(indicatorWidth(entries, STOP), width - 2 * (LABEL_MIN + GAP)),
    labelMin: LABEL_MIN,
    labelGap: LABEL_GAP,
    groups: MEASURED,
    ...overrides,
  };
  return { measures, entries, fit: fitBand(measures) };
}

describe('V-01, V-05: barra di modifica e indicatore sulla stessa riga', () => {
  const cases: Array<[number, number, BandDensity, boolean]> = [
    // viewport, pages, density, indicator narrowed
    [1100, 4, 'short', false],
    [1100, 8, 'short', false],
    [1100, 12, 'icons', true],
    [1280, 4, 'text', false],
    [1280, 8, 'short', false],
    [1280, 12, 'short', false],
    [1536, 4, 'text', false],
    [1536, 8, 'text', false],
    [1536, 12, 'short', false],
    [1920, 4, 'text', false],
    [1920, 8, 'text', false],
    [1920, 12, 'text', false],
  ];

  it.each(cases)(
    'a %ipx con %i pagine sceglie «%s» e non sovrappone mai i gruppi alla scanalatura',
    (viewport, pages, density, narrowed) => {
      const { measures, entries, fit } = oneRow(viewport, pages);
      expect(fit.density).toBe(density);
      expect(fit.room !== null).toBe(narrowed);
      // The indicator the CSS draws: stops between the ball and 44 px, within the room.
      const step =
        fit.room === null
          ? (measures.indicator - PAD) / entries
          : Math.max(BALL, Math.min(STOP, (fit.room - PAD) / entries));
      const indicator = indicatorWidth(entries, step);
      const side = (measures.width - indicator - 2 * GAP) / 2;
      // Start side: the actions never reach the groove.
      expect(side).toBeGreaterThanOrEqual(MEASURED[fit.density].actions);
      // End side: the page name keeps its readable minimum before the cover setting.
      expect(fit.end).toBe(Math.ceil(MEASURED[fit.density].cover + LABEL_GAP));
      expect(side - (fit.end ?? 0)).toBeGreaterThanOrEqual(LABEL_MIN);
    }
  );

  it('riduce prima la scanalatura e solo al minimo della sfera lascia scendere il nome', () => {
    // 700 px wide screen with 12 pages: even the icons need the stops at their minimum.
    const { fit } = oneRow(700, 12);
    expect(fit.density).toBe('icons');
    expect(fit.room).toBe(
      Math.floor(700 - 2 * gutter(700) - 2 * GAP - 2 * (116 + LABEL_GAP + LABEL_MIN))
    );
    // The room is smaller than 13 stops of the ball: the CSS keeps the ball size (max()).
    expect(fit.room ?? 0).toBeLessThan(indicatorWidth(13, BALL));
    expect(rule('indicator', '.aca-indicator__track')).toMatch(
      /--aca-step:\s*max\(\s*var\(--aca-ball\),/
    );
  });

  it('non torna a una densità più ricca alla stessa larghezza e con le stesse pagine', () => {
    // The cover has fewer actions (one button and a note): alone it would fit «text».
    const cover: Record<BandDensity, BandGroups> = {
      text: { actions: 286, cover: 256 },
      short: { actions: 132, cover: 153 },
      icons: { actions: 132, cover: 116 },
    };
    expect(oneRow(1536, 12, { groups: cover }).fit.density).toBe('text');
    expect(oneRow(1536, 12, { groups: cover, floor: 'short' }).fit.density).toBe('short');
    expect(oneRow(1536, 12, { floor: 'icons' }).fit.density).toBe('icons');
  });
});

describe('V-02, V-06: barra di modifica su una riga propria (telefono verticale)', () => {
  const twoRows = (width: number, groups: Record<BandDensity, BandGroups>): BandMeasures => ({
    width,
    rows: 2,
    gap: 0,
    groupGap: GAP,
    indicator: 0,
    labelMin: LABEL_MIN,
    labelGap: LABEL_GAP,
    groups,
  });
  const coverPage: Record<BandDensity, BandGroups> = {
    // «Nuova pagina» and the note at its minimum (5rem).
    text: { actions: 158 + 8 + 80, cover: 256 },
    short: { actions: 44 + 8 + 80, cover: 153 },
    icons: { actions: 44 + 8 + 80, cover: 116 },
  };

  it('sulla copertina a 360, 375 e 390 px l’interruttore ha il nome breve visibile', () => {
    for (const viewport of [360, 375, 390]) {
      expect(fitBand(twoRows(viewport - 32, coverPage))).toEqual({
        density: 'short',
        room: null,
        end: null,
      });
    }
    expect(fitBand(twoRows(390 - 32, MEASURED)).density).toBe('short');
  });

  it('sotto la larghezza minima ripiega sulle sole icone', () => {
    expect(fitBand(twoRows(320 - 32, MEASURED)).density).toBe('icons');
  });

  it('la fascia è a una riga da 40rem (telefoni orizzontali) e a due righe sotto', () => {
    const shell = uncommented('shell');
    expect(rule('shell', '.aca-shell__footer')).toMatch(/--aca-band-rows:\s*2;/);
    expect(shell).toMatch(
      /@media \(min-width: 40rem\) \{\s*\.aca-shell__footer \{[^}]*--aca-band-rows:\s*1;/
    );
    expect(shell).not.toMatch(/48rem|75rem/);
    // The move controls follow the band: two rows only below 40rem.
    expect(uncommented('edit')).toMatch(
      /@media \(max-width: 39\.99rem\) \{\s*\.aca-widget-position \{/
    );
    expect(uncommented('edit')).not.toMatch(/47\.99rem|74\.99rem/);
  });
});

describe('V-01: le colonne laterali non scendono sotto il contenuto', () => {
  it('usa minmax(min-content, 1fr) ai lati e lascia cedere la colonna dell’indicatore', () => {
    const wide = /@media \(min-width: 40rem\) \{\s*\.aca-shell__footer \{([^}]*)\}/.exec(
      uncommented('shell')
    )?.[1];
    expect(wide).toMatch(
      /grid-template-columns:\s*minmax\(min-content, 1fr\) minmax\(0, auto\) minmax\(min-content, 1fr\);/
    );
    // The band is the container of the indicator: track and name are sized on it.
    expect(rule('shell', '.aca-shell__footer')).toMatch(/container-type:\s*inline-size;/);
    const track = rule('indicator', '.aca-indicator__track');
    expect(track).toMatch(
      /--aca-room:\s*var\(\s*--aca-band-room,\s*calc\(100cqw - 2 \* \(var\(--aca-label-min\) \+ var\(--aca-space-4\)\)\)\s*\)/
    );
    expect(track).toMatch(
      /calc\(\(var\(--aca-room\) - 2 \* var\(--aca-pad\)\) \/ var\(--aca-steps\)\)/
    );
  });

  it('le densità sostituiscono la soglia fissa di 75rem e si misurano con i gruppi interi', () => {
    expect(
      rule(
        'edit',
        ":is([data-band-density='short'], [data-band-density='icons']) .aca-edit-toolbar__text"
      )
    ).toMatch(/display:\s*none/);
    expect(rule('edit', "[data-band-density='short'] .aca-edit-toolbar__short")).toMatch(
      /display:\s*inline/
    );
    expect(rule('edit', "[data-band-density='short'] .aca-edit-toolbar__cover-icon")).toMatch(
      /display:\s*none/
    );
    expect(rule('edit', '.aca-edit-toolbar__short')).toMatch(/display:\s*none/);
    const measure = rule('edit', '[data-band-measure] .aca-edit-toolbar__group');
    expect(measure).toMatch(/flex:\s*none/);
    expect(measure).toMatch(/width:\s*max-content/);
    expect(rule('edit', '[data-band-measure] .aca-edit-toolbar__note')).toMatch(
      /max-width:\s*var\(--aca-note-min\)/
    );
  });
});

describe('V-06: interruttore della copertina con un nome visibile breve', () => {
  const props = {
    onAddWidget: () => undefined,
    onPageSettings: () => undefined,
    onNewPage: () => undefined,
    coverEnabled: true,
    onCoverChange: () => undefined,
  };

  it('mostra «Copertina» accanto all’interruttore, separato dalla nota', () => {
    render(<EditToolbar {...props} canAddWidget={false} canEditPage={false} />);
    const bar = screen.getByRole('group', { name: 'Modifica della disposizione' });
    const cover = bar.querySelector('.aca-edit-toolbar__cover');
    const short = cover?.querySelector('.aca-edit-toolbar__short');
    expect(short).toHaveTextContent(COVER_SETTING_SHORT_LABEL);
    expect(short).toHaveAttribute('aria-hidden', 'true');
    // The visible short name belongs to the switch group, not to the note's group.
    expect(bar.querySelector('.aca-edit-toolbar__actions')).toHaveTextContent(
      'La copertina non contiene widget'
    );
    expect(cover).not.toHaveTextContent('La copertina non contiene widget');
    // WCAG 2.5.3: the accessible name contains the visible name.
    const toggle = within(bar).getByRole('switch', { name: COVER_SETTING_LABEL });
    expect(COVER_SETTING_LABEL.toLowerCase()).toContain(COVER_SETTING_SHORT_LABEL.toLowerCase());
    expect(toggle).toBeInTheDocument();
  });
});

describe('R-05, R-06, R-07: strati, scala e commenti', () => {
  it('la × e il pomello usano lo strato di modifica della griglia, non numeri', () => {
    expect(rule('edit', '.aca-widget-edit__remove.aca-m')).toMatch(
      /z-index:\s*var\(--aca-layer-edit\);/
    );
    expect(rule('edit', '.aca-resize-handle')).toMatch(/z-index:\s*var\(--aca-layer-edit\);/);
    expect(uncommented('edit')).not.toMatch(/z-index:\s*\d/);
  });

  it('l’etichetta usa i passi della scala e il minimo leggibile, senza 100vw', () => {
    const label = rule('indicator', '.aca-indicator__label');
    expect(label).toMatch(/left:\s*calc\(100% \+ var\(--aca-space-4\)\);/);
    expect(rule('indicator', '.aca-indicator')).toMatch(/--aca-label-min:\s*5rem;/);
    // The first-round estimates: (100vw - 12rem) for the stops, 1rem and 1.5rem for the name.
    expect(uncommented('indicator')).not.toMatch(/100vw|[\s(]12rem|[\s-]1\.5rem|100% \+ 1rem/);
  });

  it('il commento della × cita il margine attuale della pagina', () => {
    expect(css.edit).not.toMatch(/keeps 0\.75rem around the grid/);
    expect(css.edit).toMatch(/--aca-launcher-edge-room \(1\.5rem\)/);
  });
});

describe('footerBand: misura e applicazione sul DOM', () => {
  it('converte rem e px', () => {
    expect(lengthToPx('1.5rem', 16)).toBe(24);
    expect(lengthToPx(' 24px ', 16)).toBe(24);
    expect(lengthToPx('', 16)).toBe(0);
  });

  /** A band with stubbed layout: the group widths follow data-band-density. */
  function stubbedBand(contentWidth: number, entries: number) {
    const footer = document.createElement('footer');
    footer.className = 'aca-shell__footer';
    footer.innerHTML = `
      <div class="aca-edit-toolbar">
        <div class="aca-edit-toolbar__group aca-edit-toolbar__actions"></div>
        <div class="aca-edit-toolbar__group aca-edit-toolbar__cover"></div>
      </div>
      <div class="aca-indicator">${'<span class="aca-indicator__dot"></span>'.repeat(entries)}</div>`;
    document.body.appendChild(footer);
    const density = () => (footer.dataset.bandDensity ?? 'text') as BandDensity;
    const measured = new Map<Element | null, () => number>([
      [footer.querySelector('.aca-edit-toolbar__actions'), () => MEASURED[density()].actions],
      [footer.querySelector('.aca-edit-toolbar__cover'), () => MEASURED[density()].cover],
      [footer.querySelector('.aca-indicator'), () => indicatorWidth(entries, STOP)],
    ]);
    for (const [element, width] of measured) {
      if (element)
        Object.defineProperty(element, 'getBoundingClientRect', {
          configurable: true,
          value: () => ({ width: width() }) as DOMRect,
        });
    }
    Object.defineProperty(footer, 'clientWidth', { configurable: true, value: contentWidth });
    const styles = new Map<Element | null, Record<string, string>>([
      [
        footer,
        {
          paddingLeft: '0px',
          paddingRight: '0px',
          columnGap: '16px',
          '--aca-band-rows': '1',
          '--aca-band-label-gap': '1.5rem',
        },
      ],
      [footer.querySelector('.aca-edit-toolbar'), { columnGap: '16px' }],
      [footer.querySelector('.aca-indicator'), { '--aca-label-min': '5rem' }],
      [document.documentElement, { fontSize: '16px' }],
    ]);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
      const values = styles.get(element) ?? {};
      return {
        ...values,
        getPropertyValue: (name: string) => values[name] ?? '',
      } as unknown as CSSStyleDeclaration;
    });
    return footer;
  }

  it('sceglie la densità e scrive la stanza dell’indicatore e la fine del nome', () => {
    const memory: BandMemory = { key: '' };
    // 1100 px with 12 pages: icons and a narrower indicator.
    const footer = stubbedBand(1045, 13);
    applyFooterBand(footer, memory);
    expect(footer.dataset.bandDensity).toBe('icons');
    expect(footer.dataset.bandMeasure).toBeUndefined();
    expect(footer.style.getPropertyValue('--aca-band-room')).toBe('573px');
    expect(footer.style.getPropertyValue('--aca-band-end')).toBe('140px');
    expect(memory).toEqual({ key: '1:1045:13', floor: 'icons' });
    footer.remove();
  });

  it('a 1280 px con 4 pagine mostra i testi senza restringere l’indicatore', () => {
    const footer = stubbedBand(1224, 5);
    applyFooterBand(footer, { key: '' });
    expect(footer.dataset.bandDensity).toBe('text');
    expect(footer.style.getPropertyValue('--aca-band-room')).toBe('');
    expect(footer.style.getPropertyValue('--aca-band-end')).toBe('280px');
    footer.remove();
  });

  it('senza barra di modifica, o senza layout, non lascia nulla sulla fascia', () => {
    const footer = stubbedBand(1224, 5);
    footer.querySelector('.aca-edit-toolbar')?.remove();
    footer.dataset.bandDensity = 'icons';
    footer.style.setProperty('--aca-band-room', '10px');
    applyFooterBand(footer, { key: '' });
    expect(footer.dataset.bandDensity).toBeUndefined();
    expect(footer.style.getPropertyValue('--aca-band-room')).toBe('');
    footer.remove();

    const empty = stubbedBand(0, 5);
    applyFooterBand(empty, { key: '' });
    expect(empty.dataset.bandDensity).toBeUndefined();
    empty.remove();
  });

  it('AppShell riadatta la fascia quando entra ed esce la barra di modifica', async () => {
    let indicatorPx = 404;
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
      return this.classList.contains('aca-shell__footer') ? 1224 : 0;
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const band = this.closest<HTMLElement>('.aca-shell__footer');
      const density = (band?.dataset.bandDensity ?? 'text') as BandDensity;
      if (this.classList.contains('aca-edit-toolbar__actions'))
        return { width: MEASURED[density].actions } as DOMRect;
      if (this.classList.contains('aca-edit-toolbar__cover'))
        return { width: MEASURED[density].cover } as DOMRect;
      if (this.classList.contains('aca-indicator')) return { width: indicatorPx } as DOMRect;
      return { width: 0 } as DOMRect;
    });
    const fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() });
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
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
    const labels = [
      'Copertina',
      'Casa',
      'Luci',
      'Clima',
      'Studio',
      'Bagno',
      'Cucina',
      'Garage',
      'Orto',
    ];
    const shell = (editing: boolean, onCover = false) => (
      <AppShell
        statusBar={<header />}
        editMode={editing}
        footer={
          <>
            {editing && (
              <EditToolbar
                onAddWidget={() => undefined}
                onPageSettings={() => undefined}
                onNewPage={() => undefined}
                canAddWidget={!onCover}
                canEditPage={!onCover}
                coverEnabled
                onCoverChange={() => undefined}
              />
            )}
            <PageIndicator labels={labels} index={1} onChange={() => undefined} />
          </>
        }
      >
        <div />
      </AppShell>
    );
    const flush = () =>
      act(async () => {
        await Promise.resolve();
      });
    try {
      const { container, rerender } = render(shell(true));
      await flush();
      const footer = container.querySelector<HTMLElement>('.aca-shell__footer');
      // 1280 px with 8 pages: «short» (first round: «Aggiungi widget» under the groove).
      expect(footer?.dataset.bandDensity).toBe('short');
      expect(footer?.style.getPropertyValue('--aca-band-end')).toBe('177px');
      rerender(shell(false));
      await flush();
      expect(footer?.dataset.bandDensity).toBeUndefined();
      expect(footer?.style.getPropertyValue('--aca-band-end')).toBe('');

      // Back in edit mode at the same width and pages: the leaner density is remembered, even
      // where the richer one would now fit (a page with fewer actions, swiping in edit mode).
      rerender(shell(true));
      await flush();
      indicatorPx = 228;
      rerender(shell(true, true));
      await flush();
      expect(footer?.dataset.bandDensity).toBe('short');
      // New fonts change every width: the band forgets and measures again.
      await act(async () => {
        fonts.dispatchEvent(new Event('loadingdone'));
        await Promise.resolve();
      });
      expect(footer?.dataset.bandDensity).toBe('text');
    } finally {
      Reflect.deleteProperty(document, 'fonts');
    }
  });
});
