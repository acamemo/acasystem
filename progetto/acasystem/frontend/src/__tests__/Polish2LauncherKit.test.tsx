import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import StateMatrix from '@/pages/kit/StateMatrix';

/**
 * REP-20261007-001, second round, R-05: the «pozzetto tenue» of the free cells is a modifier of
 * the kit (.aca-m--well-soft), with its row in the state matrix; launcher.css only uses it.
 * jsdom does not compute the cascade: the CSS rules are checked as text.
 */
let tokens = '';
let material = '';
let launcher = '';

beforeAll(async () => {
  // Vitest empties CSS imports and the strict program has no Node types (see FixKitReview).
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  const read = (file: string) => fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  tokens = read('src/themes/acasystem/tokens.css');
  material = read('src/themes/acasystem/material.css');
  launcher = read('src/templates/launcher/launcher.css');
});

afterEach(cleanup);

/** Splits a comma list at depth 0 (shadow layers). */
function layers(value: string): string[] {
  const parts: string[] = [];
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
}

/** Value of a custom property or declaration (first match), whitespace collapsed. */
function value(css: string, name: string): string {
  const escaped = name.replace(/[-]/g, '\\-');
  const match = new RegExp(`(?:^|[;{\\s])${escaped}:\\s*([^;]+);`).exec(css);
  return match?.[1].replace(/\s+/g, ' ').trim() ?? '';
}

/** Rules whose selector mentions .aca-m--well-soft: [selector, body]. */
function wellSoftRules(): Array<[string, string]> {
  return [...material.matchAll(/([^{}]*\.aca-m--well-soft[^{}]*)\{([^}]*)\}/g)].map((m) => [
    m[1].trim(),
    m[2],
  ]);
}

/** Expands var(--x) of the soft well's own properties and of the tokens. */
function expand(text: string, scope: string): string {
  return text.replace(/var\((--aca-[\w-]+)\)/g, (whole, name: string) => {
    const own = value(scope, name) || value(tokens, name);
    return own ? expand(own, scope) : whole;
  });
}

describe('soft well of the kit (.aca-m--well-soft)', () => {
  it('keeps the layer counts of the kit in every state: socket 4, shell 3, face 7 + LED', () => {
    const rules = wellSoftRules();
    const base = rules.find(([selector]) => selector === '.aca-m--well-soft')?.[1] ?? '';
    expect(base).not.toBe('');
    for (const name of ['--aca-well-soft-rest', '--aca-well-soft-hover', '--aca-well-soft-press']) {
      expect(layers(value(base, name)), name).toHaveLength(7);
    }
    expect(layers(value(base, 'box-shadow'))).toHaveLength(4);
    const shells = rules.filter(([selector]) => /> \.aca-m__outer$/.test(selector));
    expect(shells.length).toBeGreaterThan(0);
    for (const [, body] of shells)
      expect(layers(expand(value(body, 'box-shadow'), base))).toHaveLength(3);
    const faceRules = rules.filter(([selector]) => /> \.aca-m__face$/.test(selector));
    expect(faceRules.length).toBeGreaterThanOrEqual(4); // rest, hover, focus, press
    for (const [selector, body] of faceRules) {
      const shadow = expand(value(body, 'box-shadow'), base);
      expect(layers(shadow), selector).toHaveLength(8);
      expect(layers(shadow)[7], selector).toMatch(/inset transparent$/);
    }
  });

  it('has no hole shade or graphite ring, and a quieter edge than the well', () => {
    const base = wellSoftRules().find(([selector]) => selector === '.aca-m--well-soft')?.[1] ?? '';
    expect(value(base, 'background-color')).toBe('transparent');
    expect(material).not.toMatch(/well-soft[^{}]*::after/);
    const darkAlphas = (text: string) =>
      [...text.matchAll(/rgb\(5 5 5 \/ ([\d.]+)%\)/g)].map((m) => Number(m[1]));
    // Rest: at most 20% dark (the round-one cells had 40%), the press of the kit at most 55%.
    expect(Math.max(...darkAlphas(value(base, '--aca-well-soft-rest')))).toBeLessThanOrEqual(20);
    expect(Math.max(...darkAlphas(value(base, '--aca-well-soft-press')))).toBeLessThanOrEqual(55);
    // States on buttons only, written with the preview classes of the kit.
    const selectors = wellSoftRules()
      .map(([selector]) => selector)
      .join('\n');
    expect(selectors).toContain('button.aca-m--well-soft:is(:hover, .is-hover)');
    expect(selectors).toContain('button.aca-m--well-soft:is(:active, .is-active)');
    expect(selectors).toContain('button.aca-m--well-soft:is(:focus-visible, .is-focus)');
  });

  it('is used by the launcher cells without reaching into the material layers', () => {
    expect(launcher).not.toMatch(
      /\.aca-launcher-cell[^{}]*\.aca-m__face\s*\{[^}]*(box-shadow|background-image|clip-path|font-size)/
    );
    expect(launcher).not.toMatch(/\.aca-launcher-cell[^{}]*::after/);
  });

  it('has its row in the state matrix: rest, hover, click, focus and disabled', () => {
    render(<StateMatrix />);
    const row = screen.getByRole('region', { name: 'Pozzetto tenue' });
    const buttons = within(row).getAllByRole('button', { name: 'Aggiungi un widget' });
    expect(buttons).toHaveLength(5);
    for (const button of buttons) {
      expect(button).toHaveClass('aca-m', 'aca-m--static', 'aca-m--well-soft');
      expect(button).not.toHaveClass('aca-m--well');
    }
    expect(within(row).getAllByText('Non previsto')).toHaveLength(3);
    const cell = (state: string) =>
      row.querySelector(`[data-state="${state}"] button`) as HTMLButtonElement;
    expect(cell('hover')).toHaveClass('is-hover');
    expect(cell('active')).toHaveClass('is-active');
    expect(cell('focus')).toHaveClass('is-focus');
    expect(cell('disabled')).toBeDisabled();
  });
});
