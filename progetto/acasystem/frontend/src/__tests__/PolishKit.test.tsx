import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/primitives';
import { TearCalendar } from '@/components/system/tear-calendar/TearCalendar';
import StateMatrix from '@/pages/kit/StateMatrix';
import { kitSurfaces, tokenRgb } from './kitColors';

/**
 * REP-20261007-001, corsia kit: K21 (variante danger del Button), K16/K19 (orologio della
 * copertina), K17 (data grande arancione), K18/L-13 (giorno della settimana), L-11/B-12
 * (copertina sul telefono orizzontale), L-12 (copertina che cresce con la pagina), B-02 (scala
 * delle spaziature). jsdom non calcola layout né container query: si verificano le regole CSS
 * che le garantiscono; le misure con Playwright sono nel resoconto della corsia.
 */
let tokens = '';
let material = '';
let tear = '';
let cover = '';

beforeAll(async () => {
  // Vitest empties CSS imports and the strict program has no Node types (see FixKitReview).
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  const read = (file: string) => fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  tokens = read('src/themes/acasystem/tokens.css');
  material = read('src/themes/acasystem/material.css');
  tear = read('src/components/system/tear-calendar/tearCalendar.css');
  cover = read('src/pages/cover/cover.css');
});

afterEach(cleanup);

/** Body of the first rule with exactly this selector (outside or inside an at-rule). */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[\\n{}])\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

/** Content of the at-rule block whose prelude starts with the given text. */
function block(css: string, prelude: string): string {
  const start = css.indexOf(prelude);
  if (start < 0) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return '';
}

function declaration(body: string, property: string): string {
  const escaped = property.replace(/[-]/g, '\\-');
  return new RegExp(`(?:^|[;\\s])${escaped}:\\s*([^;]+);`).exec(body)?.[1]?.trim() ?? '';
}

function token(name: string): string {
  return declaration(tokens, name);
}

/** Colour of a token, resolving aliases and the derived scales (kitColors). */
function color(name: string): number[] {
  return tokenRgb(tokens, name);
}

function contrast(a: number[], b: number[]): number {
  const lum = (rgb: number[]) =>
    rgb
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0);
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Faces, well and page of the kit: every metal surface text sits on. */
// Read lazily: the tokens are loaded in beforeAll.
const surfaces = () => kitSurfaces(tokens);

describe('K21: variante danger del Button', () => {
  it('è un pulsante del materiale con la propria classe, mai l’arancione di primary', () => {
    render(<Button variant="danger">Rimuovi</Button>);
    const button = screen.getByRole('button', { name: 'Rimuovi' });
    expect(button).toHaveClass(
      'aca-m',
      'aca-m--press',
      'aca-m--pill',
      'aca-m--lg',
      'aca-m--danger'
    );
    expect(button).not.toHaveClass('aca-m--primary');
    expect(screen.getByText('Rimuovi')).toHaveClass('aca-m__label');
  });

  it('copre caricamento e disabilitato come gli altri pulsanti', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button variant="danger" loading onClick={onClick}>
        Rimuovi
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Rimuovi' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    rerender(
      <Button variant="danger" disabled onClick={onClick}>
        Rimuovi
      </Button>
    );
    expect(button).toBeDisabled();
    rerender(
      <Button variant="danger" onClick={onClick}>
        Rimuovi
      </Button>
    );
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('cambia solo l’inchiostro: rosso ≥ 4,5:1 su ogni faccia, nessuna ombra né LED propri', () => {
    // Tone family of the composable kit, with the first kit's alias (ADR-0010).
    const flat = material.replace(/\s+/g, ' ');
    const tone = ':is(.aca-tone-danger, .aca-m--danger)';
    const content = rule(flat, `${tone} > .aca-m__outer > .aca-m__face > .aca-m__content`);
    const label = rule(
      flat,
      `${tone} > .aca-m__outer > .aca-m__face > .aca-m__content .aca-m__label`
    );
    expect(declaration(content, 'color')).toBe('var(--aca-danger-ink)');
    expect(declaration(label, 'background-image')).toBe('var(--aca-ink-danger)');
    expect(token('--aca-ink-danger')).toBe(
      'linear-gradient(var(--aca-danger-ink), var(--aca-danger-ink))'
    );
    for (const surface of surfaces()) {
      expect(contrast(color('--aca-danger-ink'), surface)).toBeGreaterThanOrEqual(4.5);
    }
    // Same number of shadow layers in every state: the variant declares no shadow, clip or LED.
    const danger = [...material.matchAll(/([^{}]*\.aca-m--danger[^{}]*)\{([^}]*)\}/g)];
    expect(danger).toHaveLength(2);
    for (const [, , body] of danger) {
      expect(body).not.toMatch(/box-shadow|clip-path|--aca-m-socket|--aca-led|opacity/);
    }
  });

  it('compare nella matrice degli stati con riposo, hover, click, focus, disabilitato e caricamento', () => {
    render(<StateMatrix />);
    const row = screen.getByRole('region', { name: 'Azione distruttiva' });
    const buttons = within(row).getAllByRole('button', { name: 'Rimuovi' });
    expect(buttons).toHaveLength(6);
    for (const button of buttons) expect(button).toHaveClass('aca-m--danger');
    expect(within(row).getAllByText('Non previsto')).toHaveLength(2);
    const cell = (state: string) =>
      row.querySelector(`[data-state="${state}"] button`) as HTMLButtonElement;
    expect(cell('hover')).toHaveClass('is-hover');
    expect(cell('active')).toHaveClass('is-active');
    expect(cell('focus')).toHaveClass('is-focus');
    expect(cell('disabled')).toBeDisabled();
    expect(cell('loading')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('K17: data grande della copertina arancione e leggibile', () => {
  it('usa l’inchiostro per testo grande, ≥ 3:1 su ogni faccia e più chiaro della variante 4,5:1', () => {
    expect(declaration(rule(tear, '.aca-tear__day.aca-type'), 'color')).toBe(
      'var(--aca-orange-ink-large)'
    );
    const large = color('--aca-orange-ink-large');
    for (const surface of surfaces()) expect(contrast(large, surface)).toBeGreaterThanOrEqual(3);
    const sum = (rgb: number[]) => rgb.reduce((total, v) => total + v, 0);
    expect(sum(large)).toBeGreaterThan(sum(color('--aca-orange-ink')));
  });

  it('resta testo grande (≥ 24 px) anche all’unità minima e nella disposizione compatta', () => {
    const unit = declaration(rule(tear, '.aca-tear'), '--aca-tear-u');
    const min = Number(/clamp\(([\d.]+)rem/.exec(unit)?.[1] ?? 0);
    const sizes = [...tear.matchAll(/\.aca-tear__day\.aca-type\s*\{[^}]*font-size:\s*([\d.]+)em/g)];
    expect(sizes.length).toBeGreaterThanOrEqual(2);
    for (const [, size] of sizes) expect(min * Number(size) * 16).toBeGreaterThanOrEqual(24);
  });
});

describe('K16 e K19: orologio con il pozzetto del kit, più grande e centrato sul foglio', () => {
  it('lascia ogni materiale della copertina a 1 rem: raggio, anello e ombre del kit', () => {
    for (const selector of [
      '.aca-tear__clock',
      '.aca-tear__hook',
      '.aca-tear__pin',
      '.aca-tear__today',
    ]) {
      expect(declaration(rule(tear, selector), 'font-size'), selector).toBe('1rem');
    }
    // The sheet is a Surface of size md (1 rem): no font size of its own.
    expect(declaration(rule(tear, '.aca-tear__sheet.aca-m--card'), 'font-size')).toBe('');
  });

  it('mette la dimensione sulle cifre e misura il pozzetto con l’unità, non in em', () => {
    const clock = rule(tear, '.aca-tear__clock');
    expect(declaration(clock, '--aca-pad')).toMatch(/var\(--aca-tear-u\)/);
    expect(declaration(clock, '--aca-pad')).not.toMatch(/\d(?:\.\d+)?em/);
    expect(declaration(rule(tear, '.aca-tear__time'), 'font-size')).toBe('var(--aca-step-6)');
  });

  it('abbassa l’orologio dell’altezza del gancio, così il suo centro è quello del foglio', () => {
    expect(declaration(rule(tear, '.aca-tear__object'), 'padding-top')).toBe(
      'var(--aca-tear-hook)'
    );
    const landscape = block(tear, '@container aca-cover (aspect-ratio >= 4 / 3) {');
    expect(declaration(rule(landscape, '.aca-tear__clock'), 'margin-top')).toBe(
      'var(--aca-tear-hook)'
    );
    expect(declaration(rule(landscape, '.aca-tear'), 'flex-direction')).toBe('row');
  });
});

describe('K18 e L-13: giorno della settimana come in UI-008', () => {
  it('segue la data nell’ordine di lettura ed è nella griglia del foglio, prima del mese', () => {
    const { container } = render(<TearCalendar now={new Date(2026, 9, 7, 9, 0, 0)} />);
    const content = container.querySelector('.aca-tear__content') as HTMLElement;
    const children = [...content.children].map((child) => child.className);
    expect(children).toEqual([
      'aca-tear__header',
      'aca-tear__main',
      expect.stringContaining('aca-tear__weekday'),
      'aca-tear__month-grid',
    ]);
    expect(screen.getByRole('heading', { level: 2, name: 'Mercoledì' })).toBeInTheDocument();
    expect(container.querySelector('.aca-tear__footer')).toBeNull();
  });

  it('lo centra accanto alla tabella del mese, alla sua altezza; sul telefono sotto la data', () => {
    expect(tear).not.toMatch(/wrap-reverse/);
    const content = rule(tear, '.aca-tear__content');
    expect(declaration(content, 'grid-template-areas')).toMatch(/'grid weekday'/);
    expect(declaration(content, 'align-items')).toBe('center');
    expect(declaration(rule(tear, '.aca-tear__weekday'), 'justify-self')).toBe('center');
    const narrow = block(tear, '@container aca-cover (width < 30rem)');
    expect(declaration(rule(narrow, '.aca-tear__content'), 'grid-template-areas')).toMatch(
      /'main'\s*'weekday'\s*'grid'/
    );
    expect(declaration(rule(narrow, '.aca-tear__month-grid'), 'justify-self')).toBe('center');
  });
});

describe('L-11, B-12 e L-12: copertina dimensionata sulla pagina', () => {
  it('la pagina della copertina è il contenitore di dimensione «aca-cover»', () => {
    expect(declaration(rule(cover, '.aca-cover'), 'container')).toBe('aca-cover / size');
  });

  it('non usa più soglie sulla larghezza della finestra', () => {
    expect(tear).not.toMatch(/@media/);
    expect(tear).not.toMatch(/86vw|vmin/);
  });

  it('cresce con la pagina entro 0,8–1,75 rem, sia in larghezza sia in altezza', () => {
    const units = [...tear.matchAll(/--aca-tear-u:\s*([^;]+);/g)].map((m) => m[1] ?? '');
    expect(units).toHaveLength(3);
    for (const unit of units) {
      expect(unit).toMatch(
        /^clamp\(0\.8rem, min\(100cqw \/ [\d.]+, 100cqh \/ [\d.]+\), 1\.75rem\)$/
      );
    }
    // The kit's type steps follow the unit inside the calendar.
    const root = rule(tear, '.aca-tear');
    expect(declaration(root, '--aca-step-0')).toBe('var(--aca-tear-u)');
    expect(declaration(root, '--aca-step-6')).toBe('calc(var(--aca-tear-u) * 2.986)');
  });

  it('sul telefono orizzontale affianca foglio e orologio con un foglio orizzontale', () => {
    const compact = block(
      tear,
      '@container aca-cover (aspect-ratio >= 4 / 3) and (height < 30rem)'
    );
    expect(compact).not.toBe('');
    expect(declaration(rule(compact, '.aca-tear__content'), 'grid-template-areas')).toMatch(
      /'header header'\s*'main grid'\s*'weekday grid'/
    );
    // Height factor of the compact unit: hook and sheet take about 14.8 units with a six-week
    // month (Playwright, August 2026 at 844×390), so the factor leaves a margin above that.
    const unit = declaration(rule(compact, '.aca-tear'), '--aca-tear-u');
    expect(Number(/100cqh \/ ([\d.]+)/.exec(unit)?.[1])).toBeGreaterThanOrEqual(15.5);
  });
});

describe('B-02: spaziature sulla scala del kit', () => {
  const steps = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

  it('la pagina della copertina usa i token di spaziatura e il margine laterale comune', () => {
    expect(declaration(rule(cover, '.aca-cover'), 'padding')).toBe(
      'var(--aca-space-3) var(--aca-gutter)'
    );
  });

  it('nel calendario gap, margini e imbottiture sono passi della scala (in em o in unità)', () => {
    const values = [
      ...tear.matchAll(
        /(?:^|[;\s{])(gap|padding-top|margin-top|--aca-pad|--aca-tear-hook):\s*([^;]+);/g
      ),
    ].map((m) => m[2] ?? '');
    expect(values.length).toBeGreaterThan(8);
    for (const value of values) {
      const factors = [
        ...value.matchAll(/([\d.]+)em/g),
        ...value.matchAll(/var\(--aca-tear-u\) \* ([\d.]+)/g),
      ].map((m) => Number(m[1]));
      for (const factor of factors) expect(steps, value).toContain(factor);
      expect(value).not.toMatch(/\d(?:\.\d+)?(?:px|rem)/);
    }
  });
});
