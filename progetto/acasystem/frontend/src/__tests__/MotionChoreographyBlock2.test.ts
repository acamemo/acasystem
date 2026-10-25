/**
 * Choreography of the launcher, block 2 of 0.9.28 (REP-20261023-006, with the user's answers of
 * 2026-10-23): sheets (D-M5, D-M19), Sistema (D-M12) and the exits of pills and notices (D-M14),
 * with their times in tokens (D-M16). jsdom computes no animation, so the rules are read as text,
 * as in `MotionChoreography.test.ts`; the behaviour is in `SheetSystemChoreography.test.tsx` and the
 * frames themselves are measured in the report, on the tablet.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  SHEET_IN_MS,
  SHEET_OUT_MS,
  SHEET_REDUCED_MS,
} from '@/components/primitives/components/Sheet';
import { LABEL_SWAP_MS } from '@/components/system/page-indicator/PageIndicator';
import { NOTICE_EXIT_MS } from '@/components/system/status-bar/ConnectionNotice';
import { TOAST_EXIT_MS } from '@/components/system/toast/ToastHost';
import { SYSTEM_IN_MS, SYSTEM_OUT_MS } from '@/hooks/launcher/useOverlayScene';

const FILES = {
  tokens: 'src/themes/acasystem/tokens.css',
  components: 'src/themes/acasystem/components.css',
  shell: 'src/templates/app-shell/appShell.css',
  toast: 'src/components/system/toast/toast.css',
  status: 'src/components/system/status-bar/statusBar.css',
  edit: 'src/components/system/edit/edit.css',
  indicator: 'src/components/system/page-indicator/pageIndicator.css',
} as const;
type Sheet = keyof typeof FILES;

describe('choreography of the launcher (block 2 of 0.9.28)', () => {
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

  /** The body of the first rule of a sheet with exactly this selector (any depth of nesting). */
  const rule = (sheet: Sheet, selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css[sheet])?.[1] ?? '';
  };
  /** The bodies of every rule that has exactly this selector (alone or at the end of a list). */
  const rules = (sheet: Sheet, selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return Array.from(
      css[sheet].matchAll(new RegExp(`(?:^|\\n|\\}|,)\\s*${escaped}\\s*\\{([^}]*)\\}`, 'g')),
      (match) => match[1]
    ).join('\n');
  };
  /** The body of a @keyframes. */
  const keyframes = (sheet: Sheet, name: string) =>
    new RegExp(`@keyframes ${name}\\s*\\{((?:[^{}]*\\{[^}]*\\})*)\\s*\\}`).exec(css[sheet])?.[1] ??
    '';
  const token = (name: string) => {
    const value = new RegExp(`${name}:\\s*([0-9.]+)(ms)?;`).exec(css.tokens)?.[1];
    expect(value, name).toBeDefined();
    return Number(value);
  };

  describe('times in tokens, equal to the ones the code waits for (D-M16)', () => {
    it('the sheet, Sistema, the toast, the notice and the page name have a token each', () => {
      for (const name of [
        '--aca-dur-veil-in',
        '--aca-dur-veil-out',
        '--aca-dur-content-in',
        '--aca-dur-toast-in',
        '--aca-dur-system-in',
        '--aca-dur-system-out',
        '--aca-scale-page',
        '--aca-z-overlay',
      ]) {
        expect(css.tokens, name).toMatch(new RegExp(`${name}:`));
      }
    });

    it('what the code waits for is what the stylesheet plays', () => {
      expect(SHEET_IN_MS).toBe(token('--aca-dur-sheet-in'));
      expect(SHEET_OUT_MS).toBe(token('--aca-dur-sheet-out'));
      expect(SHEET_REDUCED_MS).toBe(token('--aca-dur-reduced'));
      expect(SYSTEM_IN_MS).toBe(token('--aca-dur-system-in'));
      expect(SYSTEM_OUT_MS).toBe(token('--aca-dur-system-out'));
      expect(TOAST_EXIT_MS).toBe(token('--aca-dur-exit-sm'));
      expect(NOTICE_EXIT_MS).toBe(token('--aca-dur-exit-sm'));
      expect(LABEL_SWAP_MS).toBe(token('--aca-dur-swap-out'));
    });

    it('the values of the table: sheets 280 and 200, veil 200 and 160, Sistema 140 and 96', () => {
      expect(token('--aca-dur-sheet-in')).toBe(280);
      expect(token('--aca-dur-sheet-out')).toBe(200);
      expect(token('--aca-dur-veil-in')).toBe(200);
      expect(token('--aca-dur-veil-out')).toBe(160);
      // Shorter than the 240/160 approved on 2026-10-23: the user chose «Dissolvenza più breve»
      // on 2026-10-24 (same fade and scale, about 0.12-0.16 s in); the exit keeps the ratio.
      expect(token('--aca-dur-system-in')).toBeGreaterThanOrEqual(120);
      expect(token('--aca-dur-system-in')).toBeLessThanOrEqual(160);
      expect(token('--aca-dur-system-out') / token('--aca-dur-system-in')).toBeCloseTo(
        160 / 240,
        1
      );
      expect(token('--aca-dur-content-in')).toBe(160);
    });

    it('the exits are shorter than the entrances, in every pair', () => {
      expect(token('--aca-dur-veil-out')).toBeLessThan(token('--aca-dur-veil-in'));
      expect(token('--aca-dur-system-out')).toBeLessThan(token('--aca-dur-system-in'));
      expect(token('--aca-dur-exit-sm')).toBeLessThan(token('--aca-dur-toast-in'));
      expect(token('--aca-dur-exit-sm')).toBeLessThan(token('--aca-dur-enter-sm'));
    });

    it('the scale of a page is within 10 % (the answer of 2026-10-23), and Sistema is above the bars and under the sheets', () => {
      expect(Math.abs(token('--aca-scale-page') - 1)).toBeLessThanOrEqual(0.1);
      expect(token('--aca-z-overlay')).toBeGreaterThan(token('--aca-z-sticky'));
      expect(token('--aca-z-overlay')).toBeLessThan(token('--aca-z-sheet-backdrop'));
    });
  });

  describe('sheets (D-M5)', () => {
    it('the way up is the open rule and the way down is the closed rule, each with its time and curve', () => {
      const open = rule('components', '.aca-sheet');
      expect(open).toMatch(/transition-duration:\s*var\(--aca-dur-sheet-in, 280ms\)/);
      expect(open).toMatch(/transition-timing-function:\s*var\(--aca-motion-ease-out/);
      const closed = rule('components', '.aca-sheet:not([open])');
      expect(closed).toMatch(/transform:\s*translateY\(100%\)/);
      expect(closed).toMatch(/transition-duration:\s*var\(--aca-dur-sheet-out, 200ms\)/);
      expect(closed).toMatch(/transition-timing-function:\s*var\(--aca-motion-ease-in/);
    });

    it('a panel that goes down is not a target for the pointer', () => {
      expect(rule('components', '.aca-sheet:not([open])')).toMatch(/pointer-events:\s*none/);
    });

    it('the veil comes in 200 ms and goes in 160 ms, before the panel is gone', () => {
      expect(rule('components', '.aca-sheet::backdrop')).toMatch(
        /transition-duration:\s*var\(--aca-dur-veil-in, 200ms\)/
      );
      expect(rule('components', '.aca-sheet:not([open])::backdrop')).toMatch(
        /transition-duration:\s*var\(--aca-dur-veil-out, 160ms\)/
      );
    });

    it('the panel shows its structure only until it arrives; the content fades in', () => {
      expect(css.components).toMatch(
        /\.aca-sheet:not\(\[data-arrived\]\) :is\(\.aca-sheet__body, \.aca-sheet__footer\) \{[^}]*opacity:\s*0;[^}]*pointer-events:\s*none;/
      );
      expect(rule('components', '.aca-sheet__body,\n  .aca-sheet__footer')).toMatch(
        /transition:\s*opacity var\(--aca-dur-content-in, 160ms\)/
      );
    });

    it('with reduced motion the panel only fades, for 120 ms, and the content is there at once', () => {
      const reduced = css.components.slice(css.components.lastIndexOf('prefers-reduced-motion'));
      expect(reduced).toMatch(
        /\.aca-sheet,\s*\.aca-sheet:not\(\[open\]\) \{\s*transition-property:\s*opacity, display, overlay;/
      );
      expect(reduced).toMatch(/\.aca-sheet:not\(\[open\]\) \{\s*opacity:\s*0;/);
      expect(reduced).toMatch(/transition-duration:\s*var\(--aca-dur-reduced, 120ms\)/);
      expect(reduced).toMatch(/\.aca-sheet__footer \{\s*transition:\s*none;/);
    });
  });

  describe('Sistema (D-M12)', () => {
    it('is a layer over the launcher that moves only by opacity and a scale of the token', () => {
      const layer = rule('shell', '.aca-overlay-scene');
      expect(layer).toMatch(/position:\s*fixed/);
      expect(layer).toMatch(/inset:\s*0/);
      expect(layer).toMatch(/z-index:\s*var\(--aca-z-overlay/);
      expect(layer).toMatch(/background:\s*var\(--aca-page\)/);
      // A layer from the wait to the end: one raster, at the scale of rest (tracing of 2026-10-24).
      expect(layer).toMatch(/will-change:\s*opacity,\s*scale/);
      // The wait is transparent at the scale of rest; the way out ends transparent and smaller.
      expect(rule('shell', ".aca-overlay-scene[data-scene='wait']")).toMatch(/opacity:\s*0/);
      expect(rule('shell', ".aca-overlay-scene[data-scene='wait']")).not.toMatch(/scale:/);
      const away = rules('shell', ".aca-overlay-scene[data-scene='out']");
      expect(away).toMatch(/opacity:\s*0/);
      expect(away).toMatch(/scale:\s*var\(--aca-scale-page, 0\.96\)/);
    });

    it('comes in with ease-out and goes with ease-in, shorter, and never slides; the fallbacks equal the tokens', () => {
      // The way in is an animation of the layer (it waits at scale 1 and has one raster): from
      // opacity 0 and the scale of the token to the look of rest, the same values as the transition.
      const coming = rule('shell', ".aca-overlay-scene[data-scene='in']");
      expect(coming).toMatch(
        new RegExp(
          String.raw`animation:\s*aca-system-in var\(--aca-dur-system-in, ${token('--aca-dur-system-in')}ms\) var\(--aca-motion-ease-out`
        )
      );
      expect(coming).toMatch(/\bboth\b/);
      const from = keyframes('shell', 'aca-system-in');
      expect(from).toMatch(/opacity:\s*0/);
      expect(from).toMatch(/scale:\s*var\(--aca-scale-page, 0\.96\)/);
      expect(from).not.toMatch(/translate|rotate|transform/);
      const going = rules('shell', ".aca-overlay-scene[data-scene='out']");
      expect(going).toMatch(
        new RegExp(
          String.raw`opacity var\(--aca-dur-system-out, ${token('--aca-dur-system-out')}ms\) var\(--aca-motion-ease-in`
        )
      );
      expect(going).toMatch(
        new RegExp(
          String.raw`scale var\(--aca-dur-system-out, ${token('--aca-dur-system-out')}ms\) var\(--aca-motion-ease-in`
        )
      );
      expect(going).toMatch(/pointer-events:\s*none/);
      const scene = css.shell.slice(
        css.shell.indexOf('.aca-overlay-scene {'),
        css.shell.indexOf('.aca-app-error')
      );
      expect(scene).not.toMatch(/translate|rotate|top:\s*[^0]|transform:/);
    });

    it('is still on the wait and on the way out-wait: the transitions belong to in and out only', () => {
      expect(css.shell).not.toMatch(/data-scene='wait'\] \{[^}]*transition/);
      expect(css.shell).not.toMatch(/data-scene='out-wait'\]/);
    });

    it('with reduced motion it fades in 120 ms, linear, without the scale', () => {
      const reduced = css.shell.slice(css.shell.lastIndexOf('prefers-reduced-motion'));
      expect(reduced).toMatch(/\.aca-overlay-scene\[data-scene='out'\] \{\s*scale:\s*none/);
      expect(reduced).toMatch(
        /animation:\s*aca-system-in-reduced var\(--aca-dur-reduced, 120ms\) linear/
      );
      expect(keyframes('shell', 'aca-system-in-reduced')).not.toMatch(/scale/);
      expect(reduced).toMatch(/transition:\s*opacity var\(--aca-dur-reduced, 120ms\) linear/);
    });
  });

  describe('pills and notices go in 160 ms, without a slide (D-M14)', () => {
    it('a toast comes by a fade and a scale, and goes by the same in the exit time, holding its last frame', () => {
      for (const name of ['aca-toast-in', 'aca-toast-out']) {
        const body = keyframes('toast', name);
        expect(body, name).toMatch(/opacity:\s*0/);
        expect(body, name).toMatch(/scale:\s*var\(--aca-scale-enter, 0\.92\)/);
        expect(body, name).not.toMatch(/translate|rotate|transform/);
      }
      const leaving = rule('toast', '.aca-toast.is-leaving');
      expect(leaving).toMatch(
        /aca-toast-out var\(--aca-dur-exit-sm, 160ms\) var\(--aca-motion-ease-in/
      );
      expect(leaving).toMatch(/forwards/);
      expect(leaving).toMatch(/pointer-events:\s*none/);
      expect(rule('toast', '.aca-toast')).toMatch(/var\(--aca-dur-toast-in, 200ms\)/);
    });

    it('the connection notice comes in 240 ms and goes in 160 ms by a fade and a scale', () => {
      expect(rule('status', '.aca-connection-notice')).toMatch(
        /aca-notice-in var\(--aca-dur-enter-sm, 240ms\) var\(--aca-motion-ease-out/
      );
      expect(rule('status', '.aca-connection-notice.is-leaving')).toMatch(
        /aca-notice-out var\(--aca-dur-exit-sm, 160ms\) var\(--aca-motion-ease-in[^;]*forwards/
      );
      for (const name of ['aca-notice-in', 'aca-notice-out']) {
        const body = keyframes('status', name);
        expect(body, name).toMatch(/scale:\s*var\(--aca-scale-enter, 0\.92\)/);
        expect(body, name).not.toMatch(/translate|transform/);
      }
    });

    it('the gear dims over 160 ms when a widget is dragged, instead of at once', () => {
      expect(rules('shell', '.aca-system-gear')).toMatch(
        /transition:\s*opacity var\(--aca-dur-exit-sm, 160ms\)/
      );
      expect(rule('shell', '.aca-system-gear[inert]')).toMatch(/opacity:\s*0\.5/);
    });

    it('the page name changes by a cross-fade of opacity only, out of the flow, with no size or position animated', () => {
      expect(rule('indicator', '.aca-indicator__label--entering')).toMatch(
        /aca-indicator-label-in var\(--aca-dur-swap-out, 120ms\) linear/
      );
      const leaving = rule(
        'indicator',
        '.aca-indicator .aca-indicator__label.aca-indicator__label--leaving'
      );
      expect(leaving).toMatch(/position:\s*absolute/);
      expect(leaving).toMatch(
        /aca-indicator-label-out var\(--aca-dur-swap-out, 120ms\) linear forwards/
      );
      for (const name of ['aca-indicator-label-in', 'aca-indicator-label-out']) {
        expect(keyframes('indicator', name), name).not.toMatch(/width|translate|scale|transform/);
      }
    });

    it('«Rimuovi» does not change the width of the bar: the rest fades in its place and the pill lies over it', () => {
      expect(css.edit).not.toMatch(/aca-widget-actions--drop > \[hidden\]/);
      const group = rule('edit', '.aca-widget-actions > .aca-page-overview__group');
      expect(group).toMatch(/min-width:\s*min\(100cqw, 20rem\)/);
      expect(group).toMatch(/position:\s*relative/);
      // The same width as the group has when it is the drop target.
      expect(rule('edit', '.aca-page-overview__group.aca-widget-actions--drop')).toMatch(
        /width:\s*min\(100cqw, 20rem\)/
      );
      const rest = rule('edit', '.aca-widget-actions--drop > .aca-widget-actions__rest');
      expect(rest).toMatch(/opacity:\s*0/);
      expect(rest).toMatch(/visibility:\s*hidden/);
      expect(rest).toMatch(/opacity var\(--aca-dur-swap-out, 120ms\) var\(--aca-motion-ease-in/);
      expect(rest).not.toMatch(/display:\s*none/);
      expect(rule('edit', '.aca-widget-actions--drop > .aca-widget-actions__remove')).toMatch(
        /position:\s*absolute;[^}]*inset:\s*var\(--aca-space-1\)/
      );
      expect(css.edit).toMatch(
        /@starting-style \{\s*\.aca-widget-actions__remove-text \{\s*opacity:\s*0;/
      );
    });
  });
});
