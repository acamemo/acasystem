/// <reference types="vite/client" />
import { renderToStaticMarkup } from 'react-dom/server';
import * as mx from 'mx-icons';
import { describe, expect, it } from 'vitest';
import { Icon, iconNames } from '@/components/primitives';

/**
 * mx-icons 1.1.2 declares in its types about 2187 linear icons but ships about 946 at runtime:
 * TypeScript does not catch a missing one, the widget just fails to render. This test checks
 * every named import of mx-icons in the source and every icon of the kit (REP-20261006-001).
 */
const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const runtime = new Set(Object.keys(mx));
const IMPORT = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]mx-icons['"]/g;

describe('icone mx-icons', () => {
  it('legge i sorgenti dell’app', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
  });

  it('ogni import nominato da mx-icons esiste a runtime', () => {
    const missing: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      for (const match of source.matchAll(IMPORT)) {
        for (const part of (match[1] ?? '').split(',')) {
          const name =
            part
              .trim()
              .replace(/^type\s+/, '')
              .split(/\s+as\s+/)[0]
              ?.trim() ?? '';
          if (!name || name.endsWith('Props')) continue;
          if (!runtime.has(name)) missing.push(`${file}: ${name}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('ogni icona del kit disegna un SVG', () => {
    for (const name of iconNames) {
      expect(renderToStaticMarkup(<Icon name={name} />), name).toMatch(/^<svg/);
    }
  });
});
