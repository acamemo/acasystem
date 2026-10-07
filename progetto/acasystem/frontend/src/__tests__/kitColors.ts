/**
 * Colour resolver for the kit tokens (REP-20261007-005): literal oklch(), var() aliases and the
 * OKLCH relative colours the scales are derived with (oklch(from var(--base) L C H [/ a])).
 * Shared by the tests that check contrast pairs on the resolved values.
 */

type Lch = [number, number, number];

/** Value of a custom property declared in a stylesheet. */
export function declared(css: string, name: string): string {
  const escaped = name.replace(/[-]/g, String.raw`\-`);
  const value = new RegExp(String.raw`(?:^|[;\s])${escaped}:\s*([^;]+);`).exec(css)?.[1];
  if (!value) throw new Error(`token mancante: ${name}`);
  return value.replace(/\s+/g, ' ').trim();
}

/** OKLCH → sRGB 0–255 (CSS Color 4 matrices), clamped to the gamut. */
export function lchToRgb([L, C, H]: Lch): number[] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => {
    const c = Math.min(1, Math.max(0, v));
    return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
  });
}

function channel(expr: string, [l, c, h]: Lch): number {
  const named: Record<string, number> = { l, c, h };
  if (expr in named) return named[expr] as number;
  const calc = /^calc\((\w) ([+*-]) ([\d.]+)\)$/.exec(expr);
  if (calc) {
    const v = named[calc[1] as string] as number;
    const n = Number(calc[3]);
    return calc[2] === '+' ? v + n : calc[2] === '-' ? v - n : v * n;
  }
  const number = Number(expr.replace('%', ''));
  if (Number.isNaN(number)) throw new Error(`canale non riconosciuto: ${expr}`);
  return expr.endsWith('%') ? number / 100 : number;
}

/** Resolves a colour expression against the tokens to OKLCH. */
export function lch(css: string, value: string): Lch {
  const v = value.trim();
  const ref = /^var\((--aca-[\w-]+)\)$/.exec(v);
  if (ref) return lch(css, declared(css, ref[1] as string));
  const literal = /^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)(?: \/ [\d.]+%)?\)$/.exec(v);
  if (literal) return [Number(literal[1]) / 100, Number(literal[2]), Number(literal[3])];
  const part = String.raw`(calc\(\w [+*-] [\d.]+\)|[^\s)]+)`;
  const relative = new RegExp(String.raw`^oklch\(from (var\([^)]+\)) ${part} ${part} ${part}`).exec(
    v
  );
  if (!relative) throw new Error(`colore non riconosciuto: ${v}`);
  const src = lch(css, relative[1] as string);
  return [
    channel(relative[2] as string, src),
    channel(relative[3] as string, src),
    channel(relative[4] as string, src),
  ];
}

/** sRGB of a token. */
export function tokenRgb(css: string, name: string): number[] {
  return lchToRgb(lch(css, declared(css, name)));
}

/** Colour stops of a gradient token as sRGB (the angle is skipped). */
export function gradientRgb(css: string, name: string): number[][] {
  const value = declared(css, name);
  const inner = /^linear-gradient\((.*)\)$/.exec(value)?.[1] ?? value;
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of inner) {
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += char;
  }
  parts.push(current.trim());
  return parts.filter((p) => !/deg$/.test(p)).map((p) => lchToRgb(lch(css, p)));
}

/** Faces, well and page: every metal surface text and icons sit on. */
export function kitSurfaces(css: string): number[][] {
  return [
    ...gradientRgb(css, '--aca-face'),
    ...gradientRgb(css, '--aca-face-well'),
    tokenRgb(css, '--aca-page'),
  ];
}
