import { describe, expect, it } from 'vitest';

/**
 * REP-20261028-004: nothing in the app tells the person to ask the installer. The sources of
 * `src` (tests and documentation aside) are scanned; comment lines are allowed.
 */

const sources = import.meta.glob<string>(
  ['/src/**/*.{ts,tsx}', '!/src/__tests__/**', '!/src/**/documentazione/**'],
  { query: '?raw', import: 'default', eager: true }
);

/** Lines that are not comments, and the line is kept only when it contains the word. */
function offending(text: string): string[] {
  const found: string[] = [];
  let inBlock = false;
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (inBlock) {
      if (trimmed.includes('*/')) inBlock = false;
      return;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlock = true;
      return;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    if (/installatore|installatrice/i.test(line)) found.push(`${index + 1}: ${trimmed}`);
  });
  return found;
}

describe('texts of the app', () => {
  it('never mention the installer', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
    const hits = Object.entries(sources).flatMap(([file, text]) =>
      offending(text).map((line) => `${file}:${line}`)
    );
    expect(hits).toEqual([]);
  });

  it('the scan tells a comment from a text', () => {
    expect(offending("// chiedi all'installatore")).toEqual([]);
    expect(offending('/**\n * serve l’installatore\n */')).toEqual([]);
    expect(offending("const text = 'Chiedi all’installatore';")).toHaveLength(1);
  });
});
