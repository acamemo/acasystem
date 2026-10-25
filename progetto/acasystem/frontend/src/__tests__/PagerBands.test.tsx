import { beforeAll, describe, expect, it } from 'vitest';

/**
 * REP-20261009-006: the pager reaches under the bars, so a shadow or a lifted card is not
 * clipped at the line between the pages and a bar. jsdom has no layout: the rules that make it
 * so are read from the style sheets (the measures taken with Playwright are in the report).
 */

const css: Record<string, string> = {};

beforeAll(async () => {
  // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  for (const [key, path] of Object.entries({
    shell: 'src/templates/app-shell/appShell.css',
    launcher: 'src/templates/launcher/launcher.css',
    status: 'src/components/system/status-bar/statusBar.css',
    indicator: 'src/components/system/page-indicator/pageIndicator.css',
    edit: 'src/components/system/edit/edit.css',
  })) {
    css[key] = fs.readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  }
});

/** Body of the first rule whose selector is exactly `selector`. */
function rule(file: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css[file] ?? '')?.[1] ?? ''
  );
}

describe('the pager under the bars', () => {
  it('its clip edge is the edge of the screen: negative margin and equal padding', () => {
    const pager = rule('launcher', '.aca-pager');
    expect(pager).toMatch(/box-sizing:\s*border-box/);
    expect(pager).toMatch(
      /margin-block:\s*calc\(-1 \* var\(--aca-shell-head, 0px\)\) calc\(-1 \* var\(--aca-shell-foot, 0px\)\)/
    );
    expect(pager).toMatch(
      /padding-block:\s*var\(--aca-shell-head, 0px\) var\(--aca-shell-foot, 0px\)/
    );
    // The bands are given back to the box: the pages keep the height of the area between bars.
    expect(pager).toMatch(
      /height:\s*calc\(100% \+ var\(--aca-shell-head, 0px\) \+ var\(--aca-shell-foot, 0px\)\)/
    );
  });

  it('the bands are the frame’s: the safe areas (and the room of the gear); the bars are laid over the pages (ADR-0016)', () => {
    // The bands the pager reaches under are the safe areas: nothing is built into them.
    const shell = rule('shell', '.aca-shell');
    expect(shell).toMatch(/--aca-shell-foot:\s*env\(safe-area-inset-bottom, 0px\);/);
    expect(shell).toMatch(
      /--aca-shell-head:\s*calc\(env\(safe-area-inset-top, 0px\) \+ var\(--aca-gear-room\)\);/
    );
    expect(shell).toMatch(/padding-top:\s*var\(--aca-shell-head\)/);
    expect(shell).toMatch(/padding-bottom:\s*var\(--aca-shell-foot\)/);
    // The room of the gear is kept on a tablet in landscape only (the Tab M11).
    expect(shell).toMatch(/--aca-gear-room:\s*0px;/);
    expect(css.shell).toMatch(
      /@media \(min-width: 60rem\) and \(orientation: landscape\) \{\s*\.aca-shell \{\s*--aca-gear-room:\s*1\.25rem;/
    );
    // The bottom bars lie over the pages in a band of their own height, not in the flow.
    const footer = rule('shell', '.aca-shell__footer');
    expect(footer).toMatch(/position:\s*absolute/);
    expect(footer).toMatch(/height:\s*var\(--aca-bars-foot\)/);
    expect(shell).toMatch(/--aca-bars-foot:\s*calc\(/);
    // What the overview keeps for its bar is that band less the safe area (the padding has it).
    expect(shell).toMatch(
      /--aca-overview-foot:\s*calc\(var\(--aca-bars-foot\) - env\(safe-area-inset-bottom, 0px\)\);/
    );
    // The top bar, the gear and the commands with no face lie over the pages too.
    for (const selector of ['.aca-shell__top', '.aca-system-gear', '.aca-screen-commands']) {
      expect(rule('shell', selector), selector).toMatch(/position:\s*absolute/);
    }
    // No row of the old status bar is built into the top band, nor a variable of its margin.
    expect(css.shell).not.toMatch(/--aca-head-top|--aca-head-pad/);
    expect(css.status).not.toMatch(/--aca-head-top|--aca-head-pad/);
  });
  it('a page is not clipped up and down, and sideways only until its neighbour', () => {
    const page = rule('launcher', '.aca-pager__page');
    expect(page).not.toMatch(/overflow:\s*hidden/);
    expect(page).toMatch(/overflow-x:\s*clip/);
    expect(page).not.toMatch(/overflow-y/);
  });

  it('the lifted card of the pages view grows by 5 % around its centre (D-M2), with no origin at the top and no shake', () => {
    const lifted = rule(
      'launcher',
      '.aca-pager.is-overview > .aca-pager__page.is-lifted > .aca-pager__body'
    );
    expect(lifted).toMatch(
      /scale:\s*calc\(var\(--aca-overview-k, 0\.72\) \* var\(--aca-scale-lift, 1\.05\)\);/
    );
    expect(lifted).not.toMatch(/transform-origin|animation|rotate/);
  });

  it('the cards leave the room of the «Annulla» pill above them: measured and centred under it (REP-20261013-002)', () => {
    // The pill: space-3 under the safe area plus one floating bar high (edit.css).
    expect(css.launcher).toMatch(
      /--aca-undo-room:\s*calc\(var\(--aca-space-3\) \+ var\(--aca-float-height\)\);/
    );
    // It hangs from the area of the pages, so a connection notice above it is never covered.
    const top = rule('edit', '.aca-undo--top');
    expect(top).toMatch(/position:\s*absolute/);
    expect(top).toMatch(/top:\s*var\(--aca-space-3\)/);
    // The group of card and controls is centred in [room, area less the room of the bar]: one
    // offset, down by half the room of the pill, up by half the controls and half the bar. The
    // body takes it, and so does the top of the opener and of the controls.
    expect(css.launcher).toMatch(
      /--aca-card-offset:\s*calc\(\s*\(\s*var\(--aca-undo-room\) - var\(--aca-overview-foot, 0px\) - var\(--aca-card-footer\) -\s*var\(--aca-space-2\)\s*\)\s*\/\s*2\s*\);/
    );
    expect(
      rule(
        'launcher',
        '.aca-pager:is(.is-overview, .is-closing) > .aca-pager__page > .aca-pager__body'
      )
    ).toMatch(/translate:\s*0 var\(--aca-card-offset\);/);
    // On the opener and the controls, the only ones that read it (REP-20261019-002, N2).
    expect(rule('launcher', ':is(.aca-pager__open, .aca-pager__footer)')).toMatch(
      /--aca-card-top:\s*calc\(50% \* \(1 - var\(--aca-overview-k, 0\.72\)\) \+ var\(--aca-card-offset\)\);/
    );
  });

  it('notice, bars, gear and top bar are above the pager, on the layer of the scale, laid over it (ADR-0016)', () => {
    for (const [file, selector] of [
      ['status', '.aca-connection-notice'],
      ['shell', '.aca-shell__footer'],
      ['shell', '.aca-shell__top'],
      ['shell', '.aca-system-gear'],
    ] as const) {
      expect(rule(file, selector), selector).toMatch(/z-index:\s*var\(--aca-z-sticky\)/);
    }
    // The notice of the frame comes and goes without moving the grid; it keeps clear of the gear.
    const notice = rule('shell', '.aca-shell > .aca-connection-notice');
    expect(notice).toMatch(/position:\s*absolute/);
    expect(notice).toMatch(
      /padding-inline-end:\s*calc\(var\(--aca-gutter\) \+ var\(--aca-control-height\)\)/
    );
  });

  it('the «Annulla» pill sits over the band of the bottom bars whatever its height, not at a fixed offset (ADR-0016)', () => {
    const undo = rule('edit', '.aca-undo');
    expect(undo).toMatch(/bottom:\s*calc\(var\(--aca-bars-foot\) \+ var\(--aca-space-1\)\)/);
    expect(undo).not.toMatch(/--aca-space-7/);
  });

  it('a chip that opens details has a touch target of 44 px inside the row of the chips (REP-20261013-002)', () => {
    const hit = rule('status', 'button.aca-m.aca-chip::after');
    expect(hit).toMatch(/position:\s*absolute/);
    expect(hit).toMatch(/inset-block:\s*calc\(\(100% - var\(--aca-control-height\)\) \/ 2\)/);
  });

  it('the pager itself takes no pointer, the body of its pages does; the overview gives it back', () => {
    expect(rule('launcher', '.aca-pager')).toMatch(/pointer-events:\s*none/);
    // The page keeps the same value in every state (REP-20261019-002, N3): what it holds takes the
    // pointer by itself, the body at rest and the opener and the controls in the overview.
    expect(rule('launcher', '.aca-pager__page')).toMatch(/pointer-events:\s*none/);
    expect(rule('launcher', '.aca-pager__body')).toMatch(/pointer-events:\s*auto/);
    expect(rule('launcher', '.aca-pager:is(.is-overview, .is-closing)')).toMatch(
      /pointer-events:\s*auto/
    );
  });

  it('the pointer style of the pager and of the pages does not change with the view (REP-20261019-002, N3)', () => {
    // pointer-events is inherited and the touch action Blink hands down to every element below:
    // a change of either on the pager or on a page restyled the whole subtree at each entry and exit.
    const states = '.aca-pager:is(.is-overview, .is-closing)';
    expect(rule('launcher', states)).not.toMatch(/touch-action/);
    expect(rule('launcher', `${states} > .aca-pager__page`)).not.toMatch(
      /touch-action|pointer-events/
    );
    expect(rule('launcher', '.aca-pager.is-closing > .aca-pager__page')).not.toMatch(
      /touch-action|pointer-events/
    );
    expect(rule('launcher', '.aca-pager')).not.toMatch(/touch-action/);
    expect(rule('launcher', '.aca-pager__page')).not.toMatch(/touch-action/);
    // The gaps between the cards take the drag through a layer of their own, under the pages: the
    // browser reads the touch action of the element it hits, so a pseudo-element would not do.
    const layer = rule('launcher', '.aca-pager__surface');
    expect(layer).toMatch(/touch-action:\s*none/);
    expect(layer).toMatch(/pointer-events:\s*auto/);
    expect(layer).toMatch(/position:\s*absolute/);
    expect(layer).toMatch(/inset-block:\s*0/);
    expect(layer).toMatch(/width:\s*100%/);
    expect(css.launcher).not.toMatch(/\.aca-pager:is\(\.is-overview, \.is-closing\)::before/);
  });

  it('the bands let the pointer through to the pager; the pills and the controls take it', () => {
    expect(rule('shell', '.aca-shell__footer')).toMatch(/pointer-events:\s*none/);
    expect(rule('status', '.aca-connection-notice')).toMatch(/pointer-events:\s*none/);
    expect(rule('status', '.aca-connection-notice > .aca-m.aca-m--card')).toMatch(
      /pointer-events:\s*auto/
    );
    expect(rule('indicator', '.aca-indicator')).toMatch(/pointer-events:\s*auto/);
    // The pills of the bars of normal view, of edit mode and of the pages (the roots stay
    // transparent).
    expect(rule('status', '.aca-status-bar')).toMatch(/pointer-events:\s*none/);
    expect(rule('status', '.aca-status-bar__pill')).toMatch(/pointer-events:\s*auto/);
    expect(rule('edit', '.aca-edit-toolbar__group')).toMatch(/pointer-events:\s*auto/);
    expect(rule('edit', '.aca-page-overview__group')).toMatch(/pointer-events:\s*auto/);
    expect(rule('edit', '.aca-page-overview')).toMatch(/pointer-events:\s*none/);
  });
});
