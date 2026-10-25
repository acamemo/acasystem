import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PageIndicator } from '@/components/system/page-indicator/PageIndicator';
import { StatusBar, type StatusBarProps } from '@/components/system/status-bar/StatusBar';
import { AppShell } from '@/templates/app-shell/AppShell';
import { BAND_DENSITIES, type BandDensity } from '@/templates/app-shell/footerBand';
import type { StatusChip } from '@/utils/launcher/statusChips';

/**
 * REP-20261013-002, stage 3 (ADR-0013): the status bar in the footer band. jsdom computes no
 * layout: the structure is checked on the DOM, with the measures of the band simulated, and the
 * rules that keep the grid from jumping on the style sheets read from disk (the geometry in
 * Chromium is in the report).
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
  })) {
    css[key] = fs.readFileSync(path, 'utf8');
  }
});

afterEach(() => {
  cleanup();
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

const chips: StatusChip[] = [
  { id: 'a', kind: 'person', label: 'Mario', detail: 'A casa', icon: 'profile', tone: 'active' },
];

const barProps: StatusBarProps = {
  time: new Date(2026, 9, 13, 9, 5),
  connection: { phase: 'connected', label: 'Collegato' },
  chips: [],
  onEdit: () => undefined,
  onOpenSystem: () => undefined,
};

const shell = (props: Partial<StatusBarProps> = {}, editMode = false) => (
  <AppShell
    editMode={editMode}
    footer={
      <>
        <StatusBar {...barProps} {...props} />
        <PageIndicator labels={['Casa', 'Luci', 'Clima']} index={1} onChange={() => undefined} />
      </>
    }
  >
    <div />
  </AppShell>
);

describe('struttura della barra nella fascia', () => {
  it('è un gruppo «Stato e comandi» con due pillole: a sinistra ora, connessione e Sistema', () => {
    render(shell({ updateCount: 1 }));
    const bar = screen.getByRole('group', { name: 'Stato e comandi' });
    expect(bar.tagName).toBe('DIV');
    expect(bar.parentElement).toHaveClass('aca-shell__footer');
    const start = bar.querySelector<HTMLElement>('[data-band-group="start"]')!;
    const end = bar.querySelector<HTMLElement>('[data-band-group="end"]')!;
    expect(Array.from(bar.children)).toEqual([start, end]);

    // The clock, big, in a <time>; the connection speaks; Sistema is the gear with its dot.
    expect(start.querySelector('time')).toHaveAttribute('datetime', '09:05');
    expect(start.querySelector('[data-band-clock]')).toHaveClass('aca-type--display-sm');
    expect(within(start).getByRole('status')).toHaveTextContent('Sincronizzato');
    const system = within(start).getByRole('button', { name: /^Sistema/ });
    expect(system).toHaveAccessibleName('Sistema, 1 aggiornamento disponibile');
    expect(system).toHaveClass('aca-bar-button');
    expect(start.querySelector('.aca-status-bar__system .aca-badge')).not.toBeNull();

    // «Modifica» at the end, with the pencil and its name, where «Fine» takes its place later.
    const edit = within(end).getByRole('button', { name: 'Modifica' });
    expect(edit).toHaveAttribute('data-launcher-edit');
    expect(edit).toHaveTextContent('Modifica');
    expect(edit.querySelector('svg')).not.toBeNull();
    expect(within(end).queryByRole('button', { name: /^Sistema/ })).toBeNull();
  });

  it('i chip stanno nella pillola di destra, in una riga che la fascia non misura', () => {
    render(shell({ chips }));
    const end = document.querySelector('[data-band-group="end"]')!;
    const list = within(end as HTMLElement).getByRole('list', { name: 'Stato della casa' });
    expect(list).toHaveAttribute('data-band-flex');
    // Before «Modifica», which keeps the end of the band.
    const last = end.lastElementChild;
    expect(last).toBe(screen.getByRole('button', { name: 'Modifica' }).closest('button'));
    expect(end.firstElementChild).toBe(list);
  });

  it('senza chip l’elenco resta montato ma nascosto, e la fase della connessione è la chiave della misura', () => {
    const { rerender } = render(shell());
    // Mounted (a chip that comes is a change inside it, not of the bar) but out of the tree.
    expect(screen.queryByRole('list', { name: 'Stato della casa' })).toBeNull();
    const list = document.querySelector('.aca-status-bar__chips')!;
    expect(list).toHaveAttribute('hidden');
    expect(list).toHaveAttribute('data-band-flex');
    expect(rule('status', '.aca-status-bar__chips[hidden]')).toMatch(/display:\s*none/);
    const bar = document.querySelector('.aca-status-bar')!;
    expect(bar).toHaveAttribute('data-band-key', 'connected');
    rerender(shell({ connection: { phase: 'error', label: 'Sessione scaduta' } }));
    expect(bar).toHaveAttribute('data-band-key', 'error');
  });

  it('il tocco con il puntatore passa il clic a chi lo guarda (il tempo di guardia è di chi lo usa)', () => {
    const onEdit = vi.fn();
    render(shell({ onEdit }));
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }), { detail: 1 });
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit.mock.calls[0]?.[0]).toMatchObject({ detail: 1 });
  });
});

describe('connessione a ogni densità', () => {
  it.each(BAND_DENSITIES)('«%s»: role=status e il testo restano nel DOM', (density) => {
    render(shell());
    const bar = document.querySelector<HTMLElement>('.aca-status-bar')!;
    bar.dataset.bandDensity = density;
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Sincronizzato');
    expect(status.querySelector('.aca-connection__label')).not.toBeNull();
  });

  it('le fasi anomale restano sempre scritte, a ogni densità', () => {
    // Only «Sincronizzato» gives way (sr-only): no rule hides the label of another phase.
    const text = uncommented('status');
    for (const [, selector = '', body = ''] of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/clip-path:\s*inset\(50%\)/.test(body)) continue;
      expect(selector, selector).toMatch(/\.aca-connection--connected\s+\.aca-connection__label/);
      expect(selector, selector).toMatch(/\.aca-status-bar/);
    }
    expect(text).not.toMatch(/\.aca-connection__label\s*\{[^}]*display:\s*none/);
    expect(text).not.toMatch(/\.aca-connection--(error|connecting|reconnecting)[^{]*\{[^}]*clip/);
  });

  it('la fascia misura la parola di una fase anomala a poche lettere, e la pillola la contiene', () => {
    // Measured with a few letters (3em) the pill does not make «Modifica» or the stops give way
    // for a long word; and the word has no minimum width of its own, which would draw it under
    // the gear when the pill is short (WCAG 1.4.1; REP-20261013-002, review of stage 3, round 2).
    const flat = uncommented('status').replace(/\s+/g, ' ');
    expect(flat).toContain(
      '[data-band-measure] .aca-status-bar .aca-connection:not(.aca-connection--connected) .aca-connection__label { max-width: 3em; }'
    );
    const label = rule('status', '.aca-status-bar .aca-connection__label');
    expect(label).toMatch(/min-width:\s*0/);
    expect(label).toMatch(/overflow:\s*hidden/);
    expect(label).toMatch(/text-overflow:\s*ellipsis/);
    expect(flat).not.toMatch(/\.aca-connection__label \{[^}]*min-width:\s*3em/);
  });

  it('«Sincronizzato» in sr-only vale solo dentro la fascia: in Sistema resta scritto', () => {
    const text = uncommented('status');
    const selectors = [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , body]) => /clip-path:\s*inset\(50%\)/.test(body ?? ''))
      .map(([, selector]) => (selector ?? '').trim());
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector.startsWith('.aca-status-bar')).toBe(true);
    // The plain rule of the component (used by Sistema → Collegamento) hides nothing.
    expect(rule('status', '.aca-connection')).not.toMatch(/clip|display:\s*none/);
  });

  it('sul telefono (sotto 40rem) «Modifica» è solo l’icona, con il nome in aria-label e title', () => {
    render(shell());
    const edit = screen.getByRole('button', { name: 'Modifica' });
    expect(edit).toHaveAttribute('title', 'Modifica');
    const phone = /@media \(max-width: 639px\) \{([\s\S]*?)\n {2}\}\n/.exec(uncommented('status'));
    expect(phone?.[1]).toMatch(/\.aca-status-bar__edit-text\s*\{\s*display:\s*none/);
    const icons = rule(
      'status',
      ".aca-status-bar[data-band-density='icons'] .aca-status-bar__edit-text"
    );
    expect(icons).toMatch(/display:\s*none/);
  });
});

describe('sul telefono la pillola di destra non esce da sé', () => {
  it('la colonna di destra ha come minimo il contenuto della pillola, non meno', () => {
    // Padding, chip row at its padding, gap and the 44 px button (80 px at the usual tokens).
    // Not min-content, which counts for every chip of a row that scrolls.
    const phone = /@media \(max-width: 639px\) \{([\s\S]*?)\n {2}\}\n/.exec(
      uncommented('status')
    )?.[1];
    const columns = /grid-template-columns:\s*auto\s+minmax\(\s*calc\(([^;]*?)\),\s*1fr\s*\);/.exec(
      phone ?? ''
    )?.[1];
    expect(columns).toMatch(/--aca-control-height/);
    expect(columns).toMatch(/--aca-bar-gap/);
    expect(columns).toMatch(/2 \*\s+var\(--aca-space-2\)/);
    expect(phone).not.toMatch(/min-content/);
  });
});

describe('la fascia misura la barra di stato', () => {
  /** A band of `width` px with the status bar shown: the pills measure what the density says. */
  function measured(width: number) {
    const natural: Record<BandDensity, { start: number; end: number }> = {
      text: { start: 296, end: 138 },
      short: { start: 190, end: 138 },
      icons: { start: 190, end: 52 },
    };
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
      return this.classList.contains('aca-shell__footer') ? width : 0;
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const density = (this.closest<HTMLElement>('.aca-status-bar')?.dataset.bandDensity ??
        'text') as BandDensity;
      if (this.classList.contains('aca-status-bar__start'))
        return { width: natural[density].start } as DOMRect;
      if (this.classList.contains('aca-status-bar__end'))
        return { width: natural[density].end } as DOMRect;
      if (this.classList.contains('aca-indicator')) return { width: 404 } as DOMRect;
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
          : element.classList.contains('aca-indicator__track')
            ? { '--aca-ball': '1.75rem', '--aca-pad': '0.25rem' }
            : { fontSize: '16px', columnGap: '16px' };
      return {
        ...values,
        getPropertyValue: (name: string) => values[name] ?? '',
      } as unknown as CSSStyleDeclaration;
    });
  }
  const flush = () =>
    act(async () => {
      await Promise.resolve();
    });

  it('con posto: densità «text» sulla barra, niente sulla fascia, lato per le pillole', async () => {
    measured(1224);
    try {
      render(shell());
      await flush();
      const footer = document.querySelector<HTMLElement>('.aca-shell__footer')!;
      const bar = document.querySelector<HTMLElement>('.aca-status-bar')!;
      expect(bar.dataset.bandDensity).toBe('text');
      expect(footer.dataset.bandDensity).toBeUndefined();
      // (1224 - 404 - 2 × 16) / 2: what each side leaves the pill next to the indicator.
      expect(bar.style.getPropertyValue('--aca-band-side')).toBe('394px');
      expect(footer.style.getPropertyValue('--aca-band-room')).toBe('');
      expect(footer.style.getPropertyValue('--aca-band-end')).toBe('');
    } finally {
      Reflect.deleteProperty(document, 'fonts');
    }
  });

  it('con poco posto: solo icone, l’indicatore si stringe e la pillola prende il resto', async () => {
    measured(700);
    try {
      render(shell({ chips }));
      await flush();
      const footer = document.querySelector<HTMLElement>('.aca-shell__footer')!;
      const bar = document.querySelector<HTMLElement>('.aca-status-bar')!;
      expect(bar.dataset.bandDensity).toBe('icons');
      expect(footer.style.getPropertyValue('--aca-band-room')).toBe('288px');
      expect(bar.style.getPropertyValue('--aca-band-side')).toBe('190px');
      // The chips and the clock are not measured parts: they take what the pill leaves.
      expect(footer.style.getPropertyValue('--aca-band-end')).toBe('');
    } finally {
      Reflect.deleteProperty(document, 'fonts');
    }
  });

  it('senza posto per le pillole la scanalatura tiene il suo minimo e le pillole cedono il resto', async () => {
    // 400 px: the icons need 190 px per side, the groove would get none. Its three stops are 92 px
    // at their narrowest (28 px each and the padding): the pills share the rest, and never go
    // under the groove (REP-20261013-002, review of stage 3, round 2).
    measured(400);
    try {
      render(shell());
      await flush();
      const footer = document.querySelector<HTMLElement>('.aca-shell__footer')!;
      const bar = document.querySelector<HTMLElement>('.aca-status-bar')!;
      expect(bar.dataset.bandDensity).toBe('icons');
      expect(footer.style.getPropertyValue('--aca-band-room')).toBe('0px');
      // (400 - 92 - 2 × 16) / 2, not the 184 that a groove of nothing would leave.
      expect(bar.style.getPropertyValue('--aca-band-side')).toBe('138px');
    } finally {
      Reflect.deleteProperty(document, 'fonts');
    }
  });

  it('il primo chip che compare e l’ultimo che sparisce non fanno rimisurare la fascia', async () => {
    measured(1224);
    try {
      const { rerender } = render(shell());
      await flush();
      const reads = vi.spyOn(Element.prototype, 'getBoundingClientRect');
      const before = reads.mock.calls.length;
      rerender(shell({ chips }));
      await flush();
      expect(screen.getByRole('list', { name: 'Stato della casa' })).toBeInTheDocument();
      rerender(shell());
      await flush();
      expect(reads.mock.calls.length).toBe(before);
    } finally {
      Reflect.deleteProperty(document, 'fonts');
    }
  });

  it('nascosta (copertina, modifica) non toglie posto all’indicatore', async () => {
    measured(700);
    try {
      render(shell({ hidden: true }));
      await flush();
      const footer = document.querySelector<HTMLElement>('.aca-shell__footer')!;
      const bar = document.querySelector<HTMLElement>('.aca-status-bar')!;
      expect(footer.style.getPropertyValue('--aca-band-room')).toBe('');
      expect(bar.style.getPropertyValue('--aca-band-side')).toBe('');
      expect(footer.dataset.bandDensity).toBeUndefined();
    } finally {
      Reflect.deleteProperty(document, 'fonts');
    }
  });
});

describe('la griglia non salta tra gli stati', () => {
  it('la barra non è nel flusso del frame: sopra le pagine non c’è nessuna fascia', () => {
    const { container } = render(shell());
    const frame = container.querySelector('.aca-shell')!;
    // Only the pages and the footer (and a notice, when there is one) are in the flow.
    expect(Array.from(frame.children).map((child) => child.tagName)).toEqual(['MAIN', 'FOOTER']);
    expect(container.querySelector('.aca-shell > .aca-status-bar')).toBeNull();
    // The bands around the pages are the safe areas and the room of the gear (ADR-0016).
    expect(rule('shell', '.aca-shell')).toMatch(
      /--aca-shell-head:\s*calc\(env\(safe-area-inset-top, 0px\) \+ var\(--aca-gear-room\)\);/
    );
  });

  it('un chip che compare non cambia l’area delle pagine né la fascia', () => {
    const { container, rerender } = render(shell());
    const main = container.querySelector('main')!;
    const footer = container.querySelector('footer')!;
    const before = [main.outerHTML, footer.className, footer.getAttribute('style')];
    const frame = container.querySelector('.aca-shell')!;
    const children = frame.children.length;

    rerender(shell({ chips }));
    expect(screen.getByRole('list', { name: 'Stato della casa' })).toBeInTheDocument();
    expect([main.outerHTML, footer.className, footer.getAttribute('style')]).toEqual(before);
    expect(frame.children.length).toBe(children);
    // The chip is inside the bar, which is absolute in the bar: it sizes nothing around it.
    expect(footer.contains(screen.getByRole('list', { name: 'Stato della casa' }))).toBe(true);
    expect(rule('status', '.aca-status-bar')).toMatch(/position:\s*absolute/);
  });

  it('il frame è lo stesso in vista normale e in modifica: cambiano la barra e una classe', () => {
    const { container, rerender } = render(shell());
    const main = container.querySelector('main')!;
    const footer = container.querySelector('footer')!;
    const html = main.outerHTML;
    rerender(shell({ hidden: true }, true));
    expect(container.querySelector('.aca-shell')).toHaveClass('is-editing');
    expect(main.outerHTML).toBe(html);
    expect(container.querySelector('footer')).toBe(footer);
    expect(footer.getAttribute('style')).toBeNull();
  });

  it('nascondere la barra non cambia la geometria: sposta e dissolve soltanto', () => {
    const hidden = rule('status', '.aca-status-bar--hidden > .aca-status-bar__pill');
    expect(hidden).toMatch(/transform:\s*translateY\(/);
    expect(hidden).toMatch(/opacity:\s*0/);
    expect(hidden).toMatch(/pointer-events:\s*none/);
    expect(hidden).not.toMatch(
      /(^|;|\s)(width|height|margin|padding|display|position|top|left|right|bottom|inset|grid[a-z-]*)\s*:/
    );
    // The band of the bars keeps its height whatever the bar does.
    expect(rule('shell', '.aca-shell__footer')).toMatch(/height:\s*var\(--aca-bars-foot\)/);
    expect(uncommented('shell')).not.toMatch(/status-bar[^{]*\{[^}]*(?:height|margin|padding)/);
  });
});

describe('scambio con la barra della modifica (superato da ADR-0016)', () => {
  it('la barra della modifica non aspetta più la barra di stato: non condividono un angolo', () => {
    // Whitespace squashed: the style sheets are wrapped by the formatter.
    const flat = (file: string) => uncommented(file).replace(/\s+/g, ' ');
    expect(flat('edit')).not.toContain(
      '.aca-shell.is-editing .aca-edit-toolbar:not(.aca-edit-toolbar--hidden) > .aca-edit-toolbar__group'
    );
    expect(uncommented('edit')).not.toMatch(/transition:\s*opacity 120ms linear 120ms;/);
    // The ones that sink wait for nothing.
    expect(rule('status', '.aca-status-bar--hidden > .aca-status-bar__pill')).not.toMatch(
      /transition-delay/
    );
  });

  it('con il movimento ridotto solo dissolvenza di 120 ms', () => {
    const block =
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.aca-status-bar__pill,[\s\S]*?\n {2}\}/;
    const reduced = block.exec(uncommented('status'))?.[0] ?? '';
    expect(reduced).not.toMatch(/translate/);
    expect(reduced).toMatch(/transition:\s*opacity 120ms linear;/);
  });

  it('lo strato (will-change) è delle pillole, non della radice', () => {
    expect(rule('status', '.aca-status-bar__pill')).toMatch(/will-change:\s*transform, opacity/);
    expect(rule('status', '.aca-status-bar')).not.toMatch(/will-change/);
  });
});
