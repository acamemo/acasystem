/**
 * Rules of the stylesheets that the corrections of the measurement of 2026-10-23 rest on
 * (REP-20261023-006, 0.9.28, part 3). jsdom computes no style, so the rules are read as text, as in
 * `MotionChoreographyBlock2.test.ts`; the frames themselves are measured on the tablet.
 */
import { beforeAll, describe, expect, it } from 'vitest';

const FILES = {
  launcher: 'src/templates/launcher/launcher.css',
  shell: 'src/templates/app-shell/appShell.css',
} as const;
type Sheet = keyof typeof FILES;

describe('stylesheet rules of the corrections of part 3', () => {
  const css = {} as Record<Sheet, string>;
  beforeAll(async () => {
    // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    for (const [key, path] of Object.entries(FILES)) {
      css[key as Sheet] = fs.readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    }
  });

  /** The rules (selector and body) whose selector contains `part`. */
  const rulesWith = (sheet: Sheet, part: string) =>
    [...css[sheet].matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map((match) => ({ selector: match[1].replace(/\s+/g, ' ').trim(), body: match[2] }))
      .filter((rule) => rule.selector.includes(part));

  it('the widgets and the cells of the pages out of sight run no transition', () => {
    // Their transitions started in the task of the unlock of a page, about 60 of them (width,
    // height, translate, clip-path of the faces; scale and transform of the «+»). The condition is
    // the attribute of the page (`data-quiet`), not the classes of the pager and not `.is-current`:
    // those changed several times in a scene and each change restyled about 850 elements. The
    // attribute itself does not change in a scene (PagerOverview.test.tsx).
    const found = rulesWith('launcher', '.aca-pager__page[data-quiet]').filter((rule) =>
      /transition:\s*none/.test(rule.body)
    );
    expect(found).toHaveLength(1);
    const { selector } = found[0];
    for (const part of [
      '.aca-launcher-widget',
      '.aca-launcher-widget__frame',
      '.aca-m__face',
      '.aca-launcher-cell',
      '.aca-launcher-cell__content',
    ]) {
      expect(selector).toContain(part);
    }
    expect(selector).not.toContain('.aca-pager:not(');
    expect(selector).not.toContain('.is-current');
    for (const state of ['.is-overview', '.is-closing', '.is-settling', '.is-entering']) {
      expect(selector).not.toContain(state);
    }
  });

  it('...and the old form on the classes of the pager is gone', () => {
    const old = rulesWith('launcher', '.aca-pager__page:not(.is-current)').filter(
      (rule) => /transition:\s*none/.test(rule.body) && rule.selector.includes('.aca-pager:not(')
    );
    expect(old).toHaveLength(0);
  });

  it('Sistema is a layer from the wait to the end: will-change on the layer, never taken away', () => {
    // Waiting at opacity 0 it must already be a layer, or it is drawn on the first frames of the
    // fade; and when `will-change` went away at the end of the fade it was rasterised a second time.
    const layer = rulesWith('shell', '.aca-overlay-scene').filter(
      (rule) =>
        rule.selector === '.aca-overlay-scene' && /will-change:\s*opacity,\s*scale/.test(rule.body)
    );
    expect(layer).toHaveLength(1);
    expect(css.shell.match(/will-change:/g)?.length).toBe(1);
    // The wait is transparent at the scale of rest: one raster, at the size it ends at.
    const wait = rulesWith('shell', ".aca-overlay-scene[data-scene='wait']");
    expect(wait.some((rule) => /opacity:\s*0/.test(rule.body))).toBe(true);
    expect(wait.some((rule) => /scale:/.test(rule.body))).toBe(false);
  });
});
