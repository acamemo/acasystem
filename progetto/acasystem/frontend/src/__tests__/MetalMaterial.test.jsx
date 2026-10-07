import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(resolve(process.cwd(), 'src/themes/acasystem', file), 'utf8');
const tokens = read('tokens.css');
const material = read('material.css');
const components = read('components.css');
const typography = read('typography.css');
const themeCss = [tokens, material, components, typography];

const raw = (name) => {
  const match = tokens.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(match, name).not.toBeNull();
  return match[1].replace(/\s+/g, ' ').trim();
};

/** Token value with var() references to other tokens expanded. */
const token = (name) =>
  raw(name).replace(/var\((--aca-[\w-]+)\)/g, (_, ref) =>
    tokens.includes(`${ref}:`) ? token(ref) : `var(${ref})`
  );

/** Splits a comma list at depth 0 (shadow layers). */
const layers = (value) => {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += char;
  }
  parts.push(current.trim());
  return parts;
};

/** Innermost CSS rules as { selector, body }. */
const rules = (css) => {
  const found = [];
  const stack = [];
  let prelude = '';
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') {
      stack.push({ selector: prelude.trim(), start: i + 1, nested: false });
      if (stack.length > 1) stack[stack.length - 2].nested = true;
      prelude = '';
    } else if (char === '}') {
      const rule = stack.pop();
      if (rule && !rule.nested)
        found.push({ selector: rule.selector, body: text.slice(rule.start, i) });
      prelude = '';
    } else if (char === ';') {
      prelude = '';
    } else {
      prelude += char;
    }
  }
  return found;
};

const rgbStops = (value) =>
  [...value.matchAll(/rgb\((\d+) (\d+) (\d+)\)/g)].map((m) => [m[1], m[2], m[3]].map(Number));

const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) =>
  [r, g, b]
    .map((v) => toLinear(v / 255))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** OKLCH (L 0–1, C, H in degrees) → sRGB 0–255 (CSS Color 4 matrices), clamped to the gamut. */
const lchToRgb = ([L, C, H]) => {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  return linear.map((v) => {
    const c = Math.min(1, Math.max(0, v));
    const gamma = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(gamma * 255);
  });
};

/** One channel of a relative colour: a number, the source channel, or calc(x op n). */
const channel = (expr, src) => {
  const named = { l: src[0], c: src[1], h: src[2] };
  if (expr in named) return named[expr];
  const calc = expr.match(/^calc\((\w) ([+*-]) ([\d.]+)\)$/);
  if (calc) {
    const [, name, op, n] = calc;
    const v = named[name];
    return op === '+' ? v + Number(n) : op === '-' ? v - Number(n) : v * Number(n);
  }
  const number = Number(expr.replace('%', ''));
  expect(Number.isNaN(number), expr).toBe(false);
  return expr.endsWith('%') ? number / 100 : number;
};

/** Resolves a colour (literal oklch, rgb, var() or oklch(from …)) to OKLCH [L, C, H]. */
const lch = (value) => {
  const v = value.trim();
  const ref = v.match(/^var\((--aca-[\w-]+)\)$/);
  if (ref) return lch(raw(ref[1]));
  const literal = v.match(/^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)(?: \/ [\d.]+%)?\)$/);
  if (literal) return [Number(literal[1]) / 100, Number(literal[2]), Number(literal[3])];
  const part = String.raw`(calc\(\w [+*-] [\d.]+\)|[^\s)]+)`;
  const relative = v.match(
    new RegExp(String.raw`^oklch\(from (var\([^)]+\)) ${part} ${part} ${part}`)
  );
  expect(relative, v).not.toBeNull();
  const src = lch(relative[1]);
  return [channel(relative[2], src), channel(relative[3], src), channel(relative[4], src)];
};

const oklchToRgb = (value) => lchToRgb(lch(value));

/** Colour stops of a gradient (or a single colour) as sRGB. */
const stops = (value) => {
  const gradient = value.match(/^linear-gradient\((.*)\)$/);
  const parts = gradient ? layers(gradient[1]).filter((part) => !/deg$/.test(part)) : [value];
  return parts.map((part) => oklchToRgb(part));
};

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const color = (name) => oklchToRgb(raw(name));
/** Faces, well and page: every metal surface text and icons sit on. */
const surfaces = [
  ...stops(raw('--aca-face')),
  ...stops(raw('--aca-face-well')),
  color('--aca-page'),
];

describe('materiale Metallo (UI-003)', () => {
  it('mantiene lo stesso numero di strati in ogni stato, così le transizioni interpolano', () => {
    const groups = [
      [
        4,
        '--aca-socket-shadow',
        '--aca-socket-shadow-flat',
        '--aca-socket-shadow-well',
        '--aca-socket-shadow-card',
        '--aca-socket-shadow-card-flat',
      ],
      [3, '--aca-shell', '--aca-shell-card', '--aca-shell-flat'],
      [
        8,
        '--aca-face-rest',
        '--aca-face-pressed-soft',
        '--aca-face-pressed',
        '--aca-face-selected',
        '--aca-face-error',
        '--aca-face-well-error',
      ],
    ];
    for (const [count, ...names] of groups) {
      for (const name of names) expect(layers(token(name)), name).toHaveLength(count);
    }
  });

  it('aggiunge il LED come ottavo strato: trasparente a riposo, blu in selezione', () => {
    const led = (name) => layers(token(name))[7];
    for (const name of ['--aca-face-rest', '--aca-face-pressed-soft', '--aca-face-pressed']) {
      expect(led(name), name).toMatch(/inset transparent$/);
    }
    expect(led('--aca-face-selected')).toContain(raw('--aca-blue'));
    expect(led('--aca-face-error')).toContain(raw('--aca-danger'));
    // 1px: spread 0.0625em on a 16px face.
    expect(led('--aca-face-selected')).toMatch(/^0 0 0\.15em 0\.0625em inset/);
  });

  it('lascia l’ombra scura in alto a sinistra e ::after soltanto ai pozzetti', () => {
    const first = (name) => layers(token(name))[0];
    for (const name of [
      '--aca-socket-shadow',
      '--aca-socket-shadow-flat',
      '--aca-socket-shadow-card',
      '--aca-socket-shadow-card-flat',
    ]) {
      expect(first(name), name).toMatch(/^-0\.15em -0\.15em .* rgb\(5 5 5 \/ 0%\)$/);
    }
    // Lighter hole shade since 2026-10-07 (REP-20261007-005).
    expect(first('--aca-socket-shadow-well')).toContain('rgb(5 5 5 / 14%)');
    const after = rules(material).filter((rule) => rule.selector.includes('::after'));
    expect(after.map((rule) => rule.selector)).toEqual([':is(.aca-well, .aca-m--well)::after']);
  });

  it('usa un socket grafite ≥ 3:1 contro ogni faccia e la pagina', () => {
    const socket = color('--aca-socket');
    for (const surface of surfaces) {
      expect(contrast(socket, surface), `${surface}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('non usa nero pieno nelle ombre e alleggerisce guscio e pressioni', () => {
    // Every shadow: shadow tokens and box-shadow / text-shadow declarations.
    const shadows = [
      ...[...tokens.matchAll(/(--aca-(?:socket-shadow|shell|face|led)[\w-]*):/g)].map((m) =>
        token(m[1])
      ),
      ...themeCss.flatMap((css) =>
        [...css.matchAll(/(?:box|text)-shadow:\s*([^;]+);/g)].map((m) => m[1])
      ),
    ];
    expect(shadows.length).toBeGreaterThan(20);
    for (const shadow of shadows) {
      for (const [, r, g, b, alpha] of shadow.matchAll(
        /rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+)%)?\)/g
      )) {
        if (Math.max(Number(r), Number(g), Number(b)) > 10) continue;
        expect(alpha, `rgb(${r} ${g} ${b}) senza trasparenza in ${shadow}`).toBeDefined();
        expect(Number(alpha)).toBeLessThan(100);
      }
      expect(shadow).not.toMatch(/#000\b|#000000\b|\bblack\b/);
    }
    const darkAlphas = (name) =>
      [...token(name).matchAll(/rgb\(5 5 5 \/ ([\d.]+)%\)/g)].map((m) => Number(m[1]));
    expect(Math.max(...darkAlphas('--aca-face-pressed-soft'))).toBeLessThanOrEqual(40);
    expect(Math.max(...darkAlphas('--aca-face-pressed'))).toBeLessThanOrEqual(55);
    // Contact line raised to 45% for the edge contrast of the soft UI (REP-20261007-003).
    expect(layers(token('--aca-shell'))[0]).toContain('rgb(5 5 5 / 45%)');
    expect(layers(token('--aca-shell'))[2]).toBe('0.12em 0.25em 0.25em -0.01em rgb(5 5 5 / 15%)');
    // Cards: dark layers about 40% lighter.
    const ratio = (a, b) => Math.max(...darkAlphas(a)) / Math.max(...darkAlphas(b));
    expect(ratio('--aca-shell-card', '--aca-shell')).toBeCloseTo(0.6, 1);
    expect(ratio('--aca-socket-shadow-card', '--aca-socket-shadow')).toBeCloseTo(0.6, 1);
  });

  it('usa i colori e il font del pulsante di riferimento', () => {
    expect(raw('--aca-font')).toMatch(/^'Inter'/);
    // Face: from the pure-white base to one step darker, both derived from --aca-base.
    expect(raw('--aca-base')).toBe('oklch(100% 0 0)');
    expect(stops(raw('--aca-face'))).toEqual([[255, 255, 255], lchToRgb([0.9, 0, 0])]);
  });

  it('arrotonda il clip-path con lo stesso raggio del bordo', () => {
    expect(material).toContain('clip-path: inset(0 0 0 0 round var(--aca-radius))');
    expect(material).toMatch(
      /clip-path: inset\(\s*var\(--aca-ring\)[\s\S]*?round var\(--aca-radius\)/
    );
  });

  it('preme scalando guscio e faccia insieme, con socket e ombre esterne fermi', () => {
    const all = rules(material);
    expect(material).toMatch(/--aca-press-scale: 0\.96/);
    // Hover light (fx-hover-light, alias --press): only brightens the face, mouse only.
    const hover = all.filter((rule) =>
      rule.selector.includes(':is(.aca-fx-hover-light, .aca-m--press):is(:hover, .is-hover)')
    );
    expect(hover).toHaveLength(1);
    expect(hover[0].body.trim()).toBe('filter: brightness(1.04);');
    expect(material).not.toContain('var(--aca-face-pressed-soft)');
    // Press (fx-press, alias --press): the shell scales, carrying the face with it.
    const press = all.filter((rule) =>
      rule.selector.includes(':is(.aca-fx-press, .aca-m--press):is(:active, .is-active)')
    );
    expect(press).toHaveLength(1);
    expect(press[0].body.trim()).toBe('transform: scale(var(--aca-press-scale));');
    expect(press[0].selector).toMatch(/> \.aca-m__outer$/);
  });

  it('su toggle e cursore il pomello ospitato non cambia in hover e scala al click', () => {
    const all = rules(material);
    const hosted = all.filter((rule) => rule.selector.includes('.aca-m-host'));
    expect(hosted.filter((rule) => rule.selector.includes(':hover'))).toHaveLength(0);
    const click = hosted.find((rule) => rule.body.includes('--aca-hosted-press-scale'));
    expect(click?.selector).toContain(':is(:active, .is-active)');
    expect(click?.body).not.toContain('clip-path');
  });

  it('mostra la selezione con pressione morbida e LED, senza ridurre la faccia', () => {
    const all = rules(material);
    for (const state of [
      "[aria-pressed='true']",
      "[aria-current='page']",
      "[aria-selected='true']",
      "[aria-expanded='true']",
    ]) {
      expect(material).toContain(state);
    }
    const selected = all.filter((rule) => rule.body.includes('var(--aca-face-selected)'));
    expect(selected.length).toBeGreaterThan(0);
    for (const rule of selected) {
      expect(rule.body).not.toContain('transform');
      expect(rule.body).not.toContain('var(--aca-ring)');
    }
    expect(material).not.toContain('--aca-select-scale');
  });

  it('forza gli stati di anteprima negli stessi selettori di hover, click e focus', () => {
    const selectors = rules(material + components)
      .map((rule) => rule.selector)
      .join('\n');
    expect(selectors).not.toMatch(/(?<!is\():hover(?!,)/);
    expect(selectors).not.toMatch(/(?<!is\():active(?!,)/);
    expect(selectors).toContain(':is(:hover, .is-hover)');
    expect(selectors).toContain(':is(:active, .is-active)');
    expect(selectors).toContain(':is(:focus-visible, .is-focus)');
  });

  it('sta nel layer components, sotto le utility', () => {
    for (const css of [material, components, typography])
      expect(css).toMatch(/@layer components \{/);
  });

  it('rimuove movimento, transizioni e pulsazioni con movimento ridotto', () => {
    const reduced = material.slice(material.indexOf('prefers-reduced-motion'));
    expect(reduced).toContain('transition: none !important');
    expect(reduced).toContain('transform: none !important');
    expect(reduced).toContain('animation: none !important');
    const reducedComponents = components.slice(components.indexOf('prefers-reduced-motion'));
    expect(reducedComponents).toContain('animation: none !important');
    expect(reducedComponents).toMatch(/\.aca-sheet[\s\S]*transform: none !important/);
  });

  it('mantiene il testo leggibile su tutta la faccia e sulla pagina', () => {
    const inks = [
      ...stops(raw('--aca-ink')),
      ...stops(raw('--aca-ink-strong')),
      color('--aca-ink-solid'),
      color('--aca-ink-muted'),
    ];
    for (const ink of inks) {
      for (const surface of surfaces) {
        expect(contrast(ink, surface), `${ink} su ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('scrive le basi in OKLCH con l’hex di riferimento nel commento e ne deriva le varianti', () => {
    const declared = [
      ...tokens.matchAll(/(--aca-[\w-]+):\s*(oklch\([^)]*\));\s*\/\*\s*(#[0-9a-f]{6})\s*\*\//g),
    ];
    const names = declared.map((m) => m[1]);
    expect(names).toEqual(
      expect.arrayContaining([
        '--aca-base',
        '--aca-orange',
        '--aca-blue',
        '--aca-danger',
        '--aca-on-orange',
        '--aca-on-blue',
      ])
    );
    for (const [, name, value, hex] of declared) {
      const rgb = oklchToRgb(value);
      hexToRgb(hex).forEach((channel, i) => {
        expect(Math.abs(channel - rgb[i]), `${name} ${hex}`).toBeLessThanOrEqual(1);
      });
    }
    expect(tokens).toMatch(/--aca-orange: oklch\([^)]*\); \/\* #ff622a \*\//);
    expect(tokens).toMatch(/--aca-blue: oklch\([^)]*\); \/\* #295bff \*\//);
    // Every variant comes from its base: changing a base recolours the whole scale.
    const derived = {
      '--aca-base': [
        '--aca-page',
        '--aca-socket',
        '--aca-socket-well',
        '--aca-ink-solid',
        '--aca-ink-muted',
      ],
      '--aca-orange': ['--aca-orange-light', '--aca-orange-ink', '--aca-orange-ink-icon'],
      '--aca-blue': ['--aca-blue-ink', '--aca-blue-ink-icon'],
      '--aca-danger': ['--aca-danger-ink', '--aca-danger-ink-icon'],
    };
    for (const [base, names] of Object.entries(derived)) {
      for (const name of names) expect(raw(name), name).toContain(`oklch(from var(${base})`);
    }
  });

  it('mantiene i contrasti se la base di un accento cambia tinta (es. verde)', () => {
    const green = [0.65, 0.2, 145];
    const derive = (L, k) => lchToRgb([L, green[1] * k, green[2]]);
    for (const surface of surfaces) {
      expect(contrast(derive(0.4, 0.6), surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(derive(0.49, 0.75), surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it('rispetta le coppie di contrasto di accenti e varianti ink', () => {
    for (const name of ['--aca-orange-ink', '--aca-blue-ink', '--aca-danger-ink']) {
      for (const surface of surfaces) {
        expect(contrast(color(name), surface), `${name} su ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const name of ['--aca-orange-ink-icon', '--aca-blue-ink-icon', '--aca-danger-ink-icon']) {
      for (const surface of surfaces) {
        expect(contrast(color(name), surface), `${name} su ${surface}`).toBeGreaterThanOrEqual(3);
      }
    }
    // Text on the accents, including the light end of the orange gradients.
    expect(contrast(color('--aca-on-orange'), color('--aca-orange'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color('--aca-on-orange'), color('--aca-orange-light'))).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contrast(color('--aca-on-blue'), color('--aca-blue'))).toBeGreaterThanOrEqual(4.5);
    expect(hexToRgb('#202020')).toEqual(color('--aca-on-orange'));
    // Focus ring: the blue icon ink, ≥ 3:1 on page and faces.
    expect(raw('--aca-focus')).toBe('var(--aca-blue-ink-icon)');
  });

  it('riempie cursore e anello con il gradiente arancione', () => {
    expect(raw('--aca-fill')).toBe(
      'linear-gradient(90deg, var(--aca-orange-light), var(--aca-orange))'
    );
    expect(raw('--aca-arc-from')).toBe('var(--aca-orange-light)');
    expect(raw('--aca-arc-to')).toBe('var(--aca-orange)');
    const fill = rules(components).find((rule) => rule.selector === '.aca-slider__fill');
    expect(fill?.body).toContain('background-image: var(--aca-fill)');
  });

  it('tiene le cifre su una riga con cifre tabellari', () => {
    const numeric = rules(typography).find((rule) => rule.selector === '.aca-numeric');
    expect(numeric?.body).toContain('white-space: nowrap');
    expect(numeric?.body).toContain('font-variant-numeric: tabular-nums');
  });

  it('usa solo pesi 300–500, nessuna trasformazione del testo e nessuna spaziatura positiva', () => {
    for (const css of themeCss) {
      for (const [, weight] of css.matchAll(/font-weight:\s*(\d+)/g)) {
        expect(Number(weight)).toBeLessThanOrEqual(500);
      }
      expect(css).not.toMatch(/text-transform:\s*(?!none)/);
      for (const [, value] of css.matchAll(/letter-spacing:\s*([^;]+);/g)) {
        expect(value.trim(), 'letter-spacing').toMatch(/^(-|0\b|normal)/);
      }
    }
    expect(read('index.css')).not.toMatch(/inter\/(600|700)\.css/);
  });

  it('tiene le primitive al primo livello: niente import da strati superiori o components/ui', () => {
    const root = resolve(process.cwd(), 'src/components/primitives');
    const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((file) =>
      /\.tsx?$/.test(file)
    );
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const source = readFileSync(join(root, file), 'utf8');
      expect(source, file).not.toMatch(
        /from '(?:@\/|(?:\.\.\/)+)(?:components\/(?:ui|system|widgets|cards)|services|contexts|hooks|utils|types|config|i18n|api|pages|templates|modals|layouts|rendering)\b/
      );
    }
  });

  it('definisce la scala semantica degli z-index', () => {
    const order = [
      '--aca-z-dropdown',
      '--aca-z-sticky',
      '--aca-z-sheet-backdrop',
      '--aca-z-sheet',
      '--aca-z-toast',
      '--aca-z-tooltip',
    ].map((name) => Number(raw(name)));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
  });
});
