/**
 * REP-20261019-002: two defects of REP-20261019-001 found on the Tab M11, fixed as proposed.
 * - ISSUE-075: the text of a card that says what is missing («Nessun dispositivo associato alla
 *   stanza») was cut in the middle of a word, with no ellipsis, in a narrow tile.
 * - ISSUE-077 (the row of the widget tray, fixed then): the tray is gone, so is its test.
 * jsdom has no layout and no scroll snap: the CSS is read as text and the order of the calls
 * that move the row is checked (the measures in the browser are in the report).
 */
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { CardMessage } from '@/components/widgets/utilities/shared/UtilityCard';

describe('ISSUE-075: a long text of a narrow card truncates', () => {
  let css = '';
  beforeAll(async () => {
    // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    css = fs
      .readFileSync('src/components/widgets/utilities/utilities.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\>]/g, '\\$&');
    return new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  };

  it('the message of a card puts its detail in a truncating line, with the whole text as title', () => {
    render(
      <CardMessage icon="home" title="Stanza" detail="Nessun dispositivo associato alla stanza" />
    );
    const detail = screen.getByText('Nessun dispositivo associato alla stanza');
    expect(detail.closest('.utility-empty')).not.toBeNull();
    expect(detail).toHaveClass('utility-truncate');
    expect(detail).toHaveAttribute('title', 'Nessun dispositivo associato alla stanza');
  });

  it('the column is as wide as the card, and the line stops at it: an ellipsis, not a cut', () => {
    // A start-aligned item is as wide as its text even where the column is narrower (fit-content
    // of a text that does not wrap): the column alone is not enough, the line needs its max-width.
    expect(rule('.utility-empty')).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\);/);
    expect(rule('.utility-empty > .utility-truncate')).toMatch(/max-width:\s*100%;/);
    expect(rule('.utility-truncate')).toMatch(/overflow:\s*hidden;/);
    expect(rule('.utility-truncate')).toMatch(/text-overflow:\s*ellipsis;/);
    expect(rule('.utility-truncate')).toMatch(/white-space:\s*nowrap;/);
  });

  it('the detail of an empty card takes two lines before an ellipsis (REP-20261020-001)', () => {
    // «Nessun dispositivo associato alla stanza» was one line, cut by an ellipsis in a narrow tile
    // of the Stanza that is associated but has no device: it wraps to two lines, and an ellipsis ends the
    // second one only if the text is longer still.
    const detail = rule('.utility-empty > .utility-truncate');
    expect(detail).toMatch(/white-space:\s*normal;/);
    expect(detail).toMatch(/-webkit-line-clamp:\s*2;/);
    expect(detail).toMatch(/display:\s*-webkit-box;/);
    expect(detail).toMatch(/-webkit-box-orient:\s*vertical;/);
    expect(detail).toMatch(/max-width:\s*100%;/);
    // An id with no spaces (the other messages of CardMessage) breaks too instead of being clipped.
    expect(detail).toMatch(/overflow-wrap:\s*anywhere;/);
    // The line itself keeps the clip and the ellipsis; the rule is for the message only.
    expect(rule('.utility-truncate')).toMatch(/white-space:\s*nowrap;/);
  });

  it('a short tile (one row) keeps the single line with its ellipsis (REP-20261020-001)', () => {
    // Two lines do not fit in the box of a one-row tile: the second one was cut with no ellipsis.
    const query =
      /@container \(max-height: 6\.25rem\)\s*\{[^@]*?\.utility-empty > \.utility-truncate\s*\{([^}]*)\}/.exec(
        css
      );
    expect(query).not.toBeNull();
    expect(query![1]).toMatch(/white-space:\s*nowrap;/);
    expect(query![1]).toMatch(/display:\s*block;/);
    expect(query![1]).toMatch(/line-clamp:\s*none;/);
    // It comes after the two-line rule of the same specificity, so it wins.
    expect(css.indexOf(query![0])).toBeGreaterThan(css.indexOf('-webkit-line-clamp: 2;'));
  });
});
