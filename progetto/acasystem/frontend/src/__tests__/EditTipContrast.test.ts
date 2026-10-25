import { beforeAll, describe, expect, it } from 'vitest';
import { contrast, lch, lchToRgb } from './kitColors';

/**
 * REP-20261009-003, tip of the icons of the page editor: the face of the bubble is the accent
 * darkened to L 45 % at most (edit.css, --aca-tip-surface) and its text is white, so the text
 * is ≥ 4.5:1 on every accent of the kit and on every hue of the «from the wallpaper» accent.
 * The surface is resolved from the CSS itself (kitColors), not rewritten here.
 */
let surface = '';
let ink = '';
let accents: Array<[string, string]> = [];
let darkOverridesAccent = true;

beforeAll(async () => {
  // Vitest empties CSS imports and the strict program has no Node types (see FixKitReview).
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  const read = (file: string) => fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const edit = read('src/components/system/edit/edit.css');
  const tokens = read('src/themes/kit2/tokens.css');
  const wallpapers = read('src/themes/kit2/wallpapers.css');
  // The rule may be wrapped over lines: collapse it to the single-line form.
  surface = (/--aca-tip-surface:\s*([^;]+);/.exec(edit)?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    .trim();
  ink = /--aca-tip-ink:\s*([^;]+);/.exec(edit)?.[1]?.trim() ?? '';

  accents = [['violet', /:root,\s*\.k2 \{[^}]*?--k2-accent:\s*([^;]+);/.exec(tokens)?.[1] ?? '']];
  for (const match of tokens.matchAll(
    /\.k2\[data-accent='(\w+)'\] \{\s*--k2-accent:\s*([^;]+);/g
  )) {
    accents.push([match[1] as string, match[2] as string]);
  }
  // «Dallo sfondo»: fixed lightness and chroma, any hue.
  const custom = /--k2-accent:\s*oklch\(([\d.]+%) ([\d.]+) var\(/.exec(wallpapers);
  for (let hue = 0; hue < 360; hue += 5) {
    accents.push([`custom ${hue}`, `oklch(${custom?.[1]} ${custom?.[2]} ${hue})`]);
  }
  accents.push(['custom 359', `oklch(${custom?.[1]} ${custom?.[2]} 359)`]);
  darkOverridesAccent = /\[data-theme='dark'\][^{]*\{[^}]*--k2-accent:/.test(tokens);
});

/** The face the given accent gives the tip, as the sRGB it is painted with. */
function tipFace(accent: string): { css: string; rgb: number[] } {
  const css = `--aca-test-accent: ${accent};\n--aca-test-ink: ${ink};`;
  const face = lch(
    css,
    surface.replace('var(--k2-accent, var(--aca-orange))', 'var(--aca-test-accent)')
  );
  return { css, rgb: lchToRgb(face) };
}

/** The contrast of the tip text on the face the given accent gives it. */
function tipContrast(accent: string): number {
  const { css, rgb } = tipFace(accent);
  return contrast(lchToRgb(lch(css, ink)), rgb);
}

/** OKLab hue (degrees) of an sRGB colour 0-255, as the screen shows it. */
function hueOf(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

describe('contrasto della nuvoletta delle icone dell’editor (REP-20261009-003)', () => {
  it('il fondo scurisce l’accento a L 45 % al massimo e il testo è bianco', () => {
    expect(surface).toBe(
      'oklch(from var(--k2-accent, var(--aca-orange)) min(l, 0.45) calc(c * min(1, 0.45 / l)) h)'
    );
    expect(ink).toBe('oklch(100% 0 0)');
  });

  it('trova viola, rosso, ciano, arancio e le tinte custom del kit', () => {
    const names = accents.map(([name]) => name);
    for (const name of [
      'violet',
      'red',
      'cyan',
      'orange',
      'custom 0',
      'custom 355',
      'custom 359',
    ]) {
      expect(names).toContain(name);
    }
    expect(accents).toHaveLength(4 + 72 + 1);
    // The accent is the same in the light and in the dark theme: one measure covers both.
    expect(darkOverridesAccent).toBe(false);
  });

  it('il testo bianco ha almeno 4,5:1 su ogni accento e su ogni tinta custom', () => {
    for (const [name, accent] of accents) {
      expect(tipContrast(accent), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('il fondo ha la tinta dell’accento come viene dipinto: niente canali tagliati', () => {
    for (const [name, accent] of accents) {
      const { css, rgb } = tipFace(accent);
      const drift = Math.abs(hueOf(rgb) - hueOf(lchToRgb(lch(css, accent))));
      expect(Math.min(drift, 360 - drift), name).toBeLessThanOrEqual(3);
    }
  });
});
