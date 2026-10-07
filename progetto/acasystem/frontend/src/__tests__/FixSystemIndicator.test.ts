import { beforeAll, describe, expect, it } from 'vitest';

let css = '';

beforeAll(async () => {
  // Vitest empties CSS imports (`?raw` included) and the strict program has no Node types: the
  // file is read from disk through a typed dynamic import. Vitest runs from the frontend folder.
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  css = fs.readFileSync('src/components/system/page-indicator/pageIndicator.css', 'utf8');
});

/**
 * REP-20261006-001, DES-8: the groove of the page indicator must not move when the page name
 * changes width. jsdom has no layout, so the test checks the rule that guarantees it: the label is
 * out of the flow (absolute, at the right of the groove) and the centred group holds only the
 * groove. The measured positions are in the report of the lane.
 */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

describe('indicatore di pagina, DES-8', () => {
  it('centra solo la scanalatura: l’etichetta è fuori dal flusso', () => {
    const group = rule('.aca-indicator');
    const label = rule('.aca-indicator__label');
    expect(group).toMatch(/position:\s*relative/);
    expect(group).not.toMatch(/(^|\s)gap:/);
    expect(label).toMatch(/position:\s*absolute/);
    // Offset on the spacing scale (REP-20261007-001), still out of the flow.
    expect(label).toMatch(/left:\s*calc\(100% \+ var\(--aca-space-4\)\)/);
  });

  it('l’etichetta resta nello spazio a destra della scanalatura, con i puntini', () => {
    const label = rule('.aca-indicator__label');
    // Bounded by half of the band beside the groove (container width, never the viewport).
    expect(label).toMatch(
      /max-width:\s*min\(\s*14rem,\s*calc\(\(100cqw - 100%\) \/ 2 - var\(--aca-space-4\)/
    );
    expect(label).not.toMatch(/100vw/);
    expect(label).toMatch(/text-overflow:\s*ellipsis/);
    expect(label).toMatch(/white-space:\s*nowrap/);
  });
});
