/**
 * Choreography of the launcher, block 3 of 0.9.28 (REP-20261023-006, with the user's answers of
 * 2026-10-23): the flat dashed shape of a resize (D-M6, D-M7, D-M23), the «+» cells that come and
 * go with a fade and a small scale, the copy that is born at the size of the widget and keeps
 * still (D-M9), the flight into the cell (D-M8), the removal and the entrance of a widget (D-M10,
 * D-M11) and the shadows that fade instead of growing (D-M17). jsdom computes no animation, so the
 * rules are read as text, as in `MotionChoreography.test.ts`; the behaviour is in
 * `WidgetChoreography.test.tsx` and the frames themselves are measured in the report, on the tablet.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { FLIGHT_MS } from '@/templates/launcher/DragGhost';
import { SHAPE_CLEAR_MS, SHAPE_SETTLE_MS } from '@/hooks/launcher/useResizeShape';
import { CELL_EXIT_MS } from '@/hooks/launcher/useLeaving';

const FILES = {
  tokens: 'src/themes/acasystem/tokens.css',
  launcher: 'src/templates/launcher/launcher.css',
  edit: 'src/components/system/edit/edit.css',
} as const;
type Sheet = keyof typeof FILES;

describe('choreography of the launcher (block 3 of 0.9.28)', () => {
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

  /** The body of the first rule of a sheet with exactly this selector (no nesting inside it). */
  const rule = (sheet: Sheet, selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css[sheet])?.[1] ?? '';
  };
  const token = (name: string) => {
    const value = new RegExp(`${name}:\\s*([0-9.]+)(ms)?;`).exec(css.tokens)?.[1];
    expect(value, name).toBeDefined();
    return Number(value);
  };

  describe('times and scales in tokens, equal to the ones the code waits for (D-M16)', () => {
    it('the drag, the flight, the reveal, the cell and the ring have a token each', () => {
      for (const name of [
        '--aca-scale-drag',
        '--aca-dur-fly',
        '--aca-dur-fly-back',
        '--aca-dur-reveal',
        '--aca-dur-cell',
        '--aca-dur-ring',
      ]) {
        expect(css.tokens, name).toMatch(new RegExp(`${name}:`));
      }
    });

    it('the times the code waits for are the times of the tokens', () => {
      expect(FLIGHT_MS.land).toBe(token('--aca-dur-fly'));
      expect(FLIGHT_MS.return).toBe(token('--aca-dur-fly-back'));
      expect(FLIGHT_MS.remove).toBe(token('--aca-dur-exit-sm'));
      expect(CELL_EXIT_MS).toBe(token('--aca-dur-cell'));
      expect(SHAPE_CLEAR_MS).toBe(token('--aca-dur-clear'));
      expect(SHAPE_SETTLE_MS).toBe(token('--aca-dur-move'));
    });

    it('the copy grows by 4 %, an element comes in at 0.92, nothing goes beyond 10 %', () => {
      expect(token('--aca-scale-drag')).toBe(1.04);
      for (const name of ['--aca-scale-drag', '--aca-scale-enter', '--aca-scale-press']) {
        expect(Math.abs(token(name) - 1), name).toBeLessThanOrEqual(0.1);
      }
      // Exits are shorter than entrances: the flight in is quicker than the way back is not asked,
      // but the way out of a widget is (160 against 240).
      expect(token('--aca-dur-exit-sm')).toBeLessThan(token('--aca-dur-enter-sm'));
      expect(token('--aca-dur-fly')).toBeLessThan(token('--aca-dur-fly-back'));
    });
  });

  describe('the shape of a resize (D-M6, D-M7, D-M23)', () => {
    it('is flat, dashed and without a shadow, for every widget, drawn by the box of the widget', () => {
      const shape = rule('launcher', '.aca-launcher-widget::before');
      expect(shape).toMatch(/content: '';/);
      expect(shape).toMatch(/border: 2px dashed /);
      expect(shape).toMatch(/inset: 0;/);
      expect(shape).toMatch(/opacity: 0;/);
      expect(shape).not.toMatch(/box-shadow|filter|backdrop/);
      // Built on the box every widget has, not on a kind of widget: no per-widget selector.
      for (const [, selector] of css.launcher.matchAll(/([^{}]*\.is-shaped[^{}]*)\{/g)) {
        expect(selector).not.toMatch(/\.ctl-|aca-category|aca-media|aca-stack|utility/);
      }
    });

    it('takes the face and the content away with opacity alone, the shape in with it', () => {
      const shaped = rule('launcher', '.aca-launcher-widget.is-shaped::before');
      expect(shaped).toMatch(/opacity: 1;/);
      const frame = rule(
        'launcher',
        '.aca-launcher-widget.is-shaped > :is(.aca-launcher-widget__frame, .aca-launcher-widget__bare)'
      );
      expect(frame).toMatch(/opacity: 0;/);
      expect(frame).toMatch(/transition: opacity var\(--aca-dur-clear, 100ms\)/);
      expect(frame).not.toMatch(/box-shadow|scale|translate|width|height/);
      // Back, the face fades in over --aca-dur-reveal (the base transition of the frame).
      expect(
        rule(
          'launcher',
          '.aca-launcher-widget > :is(.aca-launcher-widget__frame, .aca-launcher-widget__bare)'
        )
      ).toMatch(/opacity var\(--aca-dur-reveal, 200ms\)/);
      expect(rule('launcher', '.aca-launcher-widget::before')).toMatch(
        /transition: opacity var\(--aca-dur-reveal, 200ms\)/
      );
    });

    it('skips the content for the gesture, in a box that keeps the size of the cell', () => {
      const skipped = rule(
        'launcher',
        '.aca-launcher-widget.is-skipped > :is(.aca-launcher-widget__frame, .aca-launcher-widget__bare)'
      );
      expect(skipped).toMatch(/content-visibility: hidden;/);
      expect(skipped).toMatch(/width: 100%;/);
      expect(skipped).toMatch(/height: 100%;/);
    });

    it('turns red when the size is refused, and fades only with reduced motion', () => {
      expect(rule('launcher', '.aca-launcher-widget.is-shape-invalid::before')).toMatch(
        /border-color: var\(--aca-danger-ink-icon\);/
      );
      expect(css.launcher).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.aca-launcher-widget::before,[\s\S]*?transition: opacity var\(--aca-dur-reduced, 120ms\) linear;/
      );
    });

    it('the ring and the dots stay: they are not the frame', () => {
      expect(css.launcher).not.toMatch(
        /\.is-shaped[^{]*(?:is-selected|aca-resize-dot|aca-resize-frame)/
      );
    });
  });

  describe('the «+» cells that come and go (D-M6, «comparsa delle caselle col +»)', () => {
    it('come in with a fade and a scale of 0.92, from a keyframe, once', () => {
      const entering = rule('launcher', '.aca-launcher-cell.aca-m.is-entering');
      expect(entering).toMatch(
        /animation: aca-cell-in var\(--aca-dur-cell, 160ms\) var\(--aca-motion-ease-out, ease-out\) backwards;/
      );
      expect(entering).not.toMatch(/infinite/);
      const frames = /@keyframes aca-cell-in \{([^]*?)\n {2}\}/.exec(css.launcher)?.[1] ?? '';
      expect(frames).toMatch(/opacity: 0;/);
      expect(frames).toMatch(/scale: var\(--aca-scale-enter, 0\.92\);/);
    });

    it('go with the same scale, in the same time, out of reach', () => {
      const leaving = rule('launcher', '.aca-launcher-cell.aca-m.is-leaving');
      expect(leaving).toMatch(/opacity: 0;/);
      expect(leaving).toMatch(/scale: var\(--aca-scale-enter, 0\.92\);/);
      expect(leaving).toMatch(/pointer-events: none;/);
      expect(leaving).toMatch(/opacity var\(--aca-dur-cell, 160ms\) var\(--aca-motion-ease-in/);
      expect(leaving).not.toMatch(/box-shadow|rotate|translate/);
    });

    it('a cell that comes back while it still leaves fades in from where it is, not at once', () => {
      expect(css.launcher).toMatch(
        /\.aca-launcher-cell\.aca-m \{\s*transition:[^}]*opacity var\(--aca-dur-cell, 160ms\) var\(--aca-motion-ease-out, ease-out\);/
      );
    });

    it('the «+» of the cells goes in 120 ms when a widget is dragged', () => {
      expect(
        rule('launcher', '.aca-launcher-grid.is-dragging .aca-launcher-cell__content')
      ).toMatch(/transition-duration: var\(--aca-dur-swap-out, 120ms\);/);
    });

    it('with reduced motion they only fade', () => {
      expect(css.launcher).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.aca-launcher-cell\.aca-m\.is-entering \{\s*animation: aca-cell-fade var\(--aca-dur-reduced, 120ms\) linear backwards;/
      );
      expect(css.launcher).toMatch(
        /\.aca-launcher-cell\.aca-m\.is-leaving \{\s*scale: 1;\s*transition: opacity var\(--aca-dur-reduced, 120ms\) linear;/
      );
    });
  });

  describe('the copy under the finger (D-M9, D-M17) and its flight (D-M8, D-M10)', () => {
    it('keeps still: no keyframes, no rotation, no translation of its own', () => {
      const base = rule('launcher', '.aca-drag-ghost__copy,\n  .aca-drag-ghost__frame.aca-m--card');
      expect(css.launcher).not.toMatch(/aca-hold-shake|animation-delay: 150ms/);
      // The rules that carry its scale have no animation and no rotation.
      expect(base || css.launcher).not.toMatch(/aca-hold-shake/);
      expect(css.launcher).not.toMatch(/\.aca-drag-ghost[^{]*\{[^}]*\banimation\s*:/);
    });

    it('has no box-shadow in any transition, and its shadow is a layer that fades', () => {
      const ghostRules = [...css.launcher.matchAll(/(\.aca-drag-ghost[^{}]*)\{([^}]*)\}/g)];
      for (const [, selector, body] of ghostRules) {
        const transitions = [...body.matchAll(/transition(?:-property)?:([^;]*);/g)]
          .map((match) => match[1])
          .join(' ');
        expect(transitions, selector).not.toMatch(/box-shadow/);
      }
      const shadow = rule('launcher', '.aca-drag-ghost__copy::before');
      expect(shadow).toMatch(/box-shadow: 0\.6rem 1rem 1\.6rem rgb\(5 5 5 \/ 18%\);/);
      expect(shadow).toMatch(/z-index: -1;/);
      expect(shadow).toMatch(/transition: opacity var\(--aca-dur-lift, 150ms\)/);
      // Fading in with the copy, out in the flight.
      expect(css.launcher).toMatch(
        /@starting-style \{\s*\.aca-drag-ghost__copy::before \{\s*opacity: 0;/
      );
      expect(css.launcher).toMatch(
        /\.aca-drag-ghost\.is-flying:not\(\.is-flying--remove\) \.aca-drag-ghost__copy::before \{\s*opacity: 0;/
      );
    });

    it('is born at the size of the widget (scale 1) and goes to 1.04, not from 0.9', () => {
      expect(css.launcher).toMatch(
        /@starting-style \{\s*\.aca-drag-ghost__copy,\s*\.aca-drag-ghost__frame\.aca-m--card \{\s*scale: 1;/
      );
      expect(css.launcher).toMatch(/scale: var\(--aca-scale-drag, 1\.04\);/);
      expect(css.launcher).not.toMatch(/@starting-style[^}]*hold-scale/);
    });

    it('flies by transform and scale, back at its own pace, and away by opacity and scale', () => {
      const flying = rule('launcher', '.aca-drag-ghost.is-flying');
      expect(flying).toMatch(/--aca-fly-dur: var\(--aca-dur-fly, 200ms\);/);
      expect(flying).toMatch(/transform var\(--aca-fly-dur\) var\(--aca-fly-ease\)/);
      expect(flying).toMatch(/scale var\(--aca-fly-dur\) var\(--aca-fly-ease\)/);
      const back = rule('launcher', '.aca-drag-ghost.is-flying--return');
      expect(back).toMatch(/--aca-fly-dur: var\(--aca-dur-fly-back, 240ms\);/);
      expect(back).toMatch(/--aca-fly-ease: var\(--aca-motion-ease-in-out/);
      expect(rule('launcher', '.aca-drag-ghost.is-flying--remove')).toMatch(/transition: none;/);
      const away = /\.aca-drag-ghost\.is-flying--remove\s*:is\([^)]*\) \{([^}]*)\}/.exec(
        css.launcher
      )?.[1];
      expect(away).toMatch(/opacity: 0;/);
      expect(away).toMatch(/var\(--aca-dur-exit-sm, 160ms\) var\(--aca-motion-ease-in/);
    });
  });

  describe('a widget that leaves and a widget that comes in (D-M10, D-M11)', () => {
    it('leaves at 0.92 and transparent in 160 ms, ease-in, out of reach', () => {
      const leaving = rule('launcher', '.aca-launcher-widget.is-exiting');
      expect(leaving).toMatch(/opacity: 0;/);
      expect(leaving).toMatch(/scale: var\(--aca-scale-enter, 0\.92\);/);
      expect(leaving).toMatch(/pointer-events: none;/);
      expect(leaving).toMatch(/opacity var\(--aca-dur-exit-sm, 160ms\) var\(--aca-motion-ease-in/);
      expect(leaving).not.toMatch(/box-shadow|translate|rotate/);
    });

    it('is mounted at the look it comes from and goes to full size on `go`, 60 ms later if put back', () => {
      const from = rule('launcher', '.aca-launcher-widget.is-entering');
      expect(from).toMatch(/opacity: 0;/);
      expect(from).toMatch(/scale: var\(--aca-scale-enter, 0\.92\);/);
      expect(from).toMatch(/transition: none;/);
      const to = rule('launcher', '.aca-launcher-widget.is-entering.is-go');
      expect(to).toMatch(/opacity: 1;/);
      expect(to).toMatch(/scale: 1;/);
      expect(to).toMatch(/opacity var\(--aca-dur-enter-sm, 240ms\) var\(--aca-motion-ease-out/);
      expect(rule('launcher', '.aca-launcher-widget.is-entering.is-go.is-restored')).toMatch(
        /transition-delay: calc\(1\.5 \* var\(--aca-stagger, 40ms\)\);/
      );
    });

    it('the ring and the dots come after the widget, in sequence, never from the first frame', () => {
      expect(rule('launcher', '.aca-launcher-widget.is-selected::after')).toMatch(
        /transition: opacity var\(--aca-dur-ring, 120ms\)/
      );
      expect(css.launcher).toMatch(
        /\.aca-launcher-widget\.is-dragging::after,[\s\S]*?\.aca-launcher-widget\.is-entering:not\(\.is-go\) \.aca-resize-dot \{\s*opacity: 0;\s*transition: none;/
      );
      expect(
        rule(
          'launcher',
          '.aca-launcher-widget.is-landing.is-selected::after,\n  .aca-launcher-widget.is-entering.is-go.is-selected::after'
        )
      ).toMatch(/transition-delay: var\(--aca-stagger, 40ms\);/);
      expect(rule('launcher', '.aca-launcher-widget.is-landing .aca-resize-dot')).toMatch(
        /transition-delay: calc\(2 \* var\(--aca-stagger, 40ms\)\);/
      );
      // The dots come back from the scale of an element coming in, within 10 % (not from 0.5).
      expect(
        rule(
          'launcher',
          '.aca-launcher-widget.is-dragging .aca-resize-dot,\n  .aca-launcher-widget.is-entering:not(.is-go) .aca-resize-dot'
        )
      ).toMatch(/scale: var\(--aca-scale-enter, 0\.92\);/);
    });
  });

  describe('shadows that fade (D-M17)', () => {
    it('the widget that changes cell moves by translate, width and height, with no shadow in its transition', () => {
      const widget = rule('launcher', '.aca-launcher-widget');
      expect(widget).toMatch(/translate 240ms/);
      expect(widget).not.toMatch(/box-shadow/);
      expect(rule('launcher', '.aca-launcher-widget.is-resizing')).not.toMatch(/box-shadow/);
    });
  });

  describe('every small scale of the block is within 10 %', () => {
    it('widgets, cells and the copy, but the trash shrink the copy has had since 0.9.22', () => {
      const scales: number[] = [];
      for (const [, selector, body] of css.launcher.matchAll(
        /([^{}]*(?:\.aca-launcher-widget|\.aca-launcher-cell|\.aca-drag-ghost)[^{}]*)\{([^}]*)\}/g
      )) {
        // The copy over the trash shrinks to 0.6 (REP-20261008-001), released there to 0.54; the dots
        // of the ring come from 0.5, as they have since 0.9.21.
        if (/is-removing|is-flying--remove|aca-resize-dot/.test(selector)) continue;
        for (const [, value] of body.matchAll(/(?:^|[\s;])scale:\s*([^;]+);/g)) {
          for (const [, tokened, plain] of value.matchAll(
            /var\(--aca-scale-[a-z]+,\s*([0-9.]+)\)|^\s*([0-9.]+)\s*$/g
          )) {
            scales.push(Number(tokened ?? plain ?? 1));
          }
        }
      }
      expect(scales.length).toBeGreaterThan(8);
      for (const scale of scales) expect(Math.abs(scale - 1)).toBeLessThanOrEqual(0.1);
    });
  });
});
