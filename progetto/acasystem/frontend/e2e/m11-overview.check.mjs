import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Read-only UI measurement on the real bench: edit/overview controls only, no HA commands.
const output = resolve(process.env.ACA_EVIDENCE_DIR ?? '../../../backup/rep003/performance');
await mkdir(output, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:9225');
const page = browser
  .contexts()
  .flatMap((context) => context.pages())
  .find((p) => {
    try {
      return new URL(p.url()).port === '3002';
    } catch {
      return false;
    }
  });
assert.ok(page, 'Aprire il banco reale 3002 sul M11 prima della misura');
await page.bringToFront();
assert.equal(await page.evaluate(() => document.visibilityState), 'visible');
const click = async (selector) => {
  const result = await page.evaluate((q) => {
    const el = [...document.querySelectorAll(q)].find(
      (candidate) => candidate.offsetParent !== null
    );
    if (!el) return false;
    el.click();
    return true;
  }, selector);
  assert.ok(result, 'Controllo di misura non trovato: ' + selector);
};
const overview = '[aria-label="Modifica le pagine"]';
const close = '.aca-page-overview:not(.aca-page-overview--hidden) .aca-frame-pill';
const done = '.aca-edit-toolbar:not(.aca-edit-toolbar--hidden) .aca-edit-toolbar__done';
const report = { environment: {}, rounds: [], pass: false };
try {
  await page.reload();
  await page.locator('.aca-shell').waitFor();
  await page.waitForTimeout(1500);
  report.environment = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    dpr: devicePixelRatio,
    pages: document.querySelectorAll('.aca-pager__page').length,
    widgets: document.querySelectorAll('.aca-launcher-widget').length,
    visible: document.visibilityState,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    scripts: [...document.scripts]
      .map((script) => script.src)
      .filter((src) => src.includes('/assets/index-')),
    cells: document.querySelectorAll('.aca-launcher-cell').length,
  }));
  assert.equal(
    report.environment.reducedMotion,
    false,
    'Misurare le animazioni senza movimento ridotto'
  );
  // Same starting condition as the historical three-round measure: first widget page, edit mode.
  await page.locator('.aca-pager').evaluate((pager) => pager.scrollTo({ left: pager.clientWidth }));
  await page.waitForTimeout(1000);
  await click('[data-launcher-edit]');
  await page.waitForTimeout(3500);
  const cdp = await page.context().newCDPSession(page);
  for (let round = 1; round <= 3; round++)
    for (const action of ['open', 'close']) {
      const events = [];
      const collect = (e) => events.push(...e.value);
      cdp.on('Tracing.dataCollected', collect);
      const completed = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
      await cdp.send('Tracing.start', {
        categories:
          'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,toplevel,blink,cc,gpu,viz,v8,blink.user_timing',
        transferMode: 'ReportEvents',
      });
      await page.evaluate(() => {
        window.__acaMeasure = { frames: [], active: true };
        let last = performance.now();
        const tick = (time) => {
          const state = window.__acaMeasure;
          state.frames.push(time - last);
          last = time;
          if (state.active) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await click(action === 'open' ? overview : close);
      await page.waitForTimeout(2000);
      const frames = await page.evaluate(() => {
        window.__acaMeasure.active = false;
        return window.__acaMeasure.frames.slice(1);
      });
      await cdp.send('Tracing.end');
      await completed;
      cdp.off('Tracing.dataCollected', collect);
      await writeFile(
        resolve(output, `${round}-${action}.json`),
        JSON.stringify({ traceEvents: events })
      );
      const threads = new Map(
        events
          .filter((e) => e.ph === 'M' && e.name === 'thread_name')
          .map((e) => [`${e.pid}:${e.tid}`, e.args.name])
      );
      const gpu = events.filter(
        (e) => e.ph === 'X' && e.dur && threads.get(`${e.pid}:${e.tid}`) === 'CrGpuMain'
      );
      const maxGpuMs = Math.max(0, ...gpu.map((e) => e.dur / 1000));
      const sample = {
        round,
        action,
        frames: frames.length,
        over50: frames.filter((ms) => ms > 50).length,
        maxFrameMs: Math.max(...frames),
        maxGpuMs,
        gpuEvents: gpu.length,
        pass: frames.filter((ms) => ms > 50).length <= 1 && maxGpuMs <= 40 && gpu.length > 0,
      };
      report.rounds.push(sample);
      console.log(JSON.stringify(sample));
      await page.waitForTimeout(500);
    }
  report.pass = report.rounds.every((round) => round.pass);
  await click(done);
  await writeFile(resolve(output, 'result.json'), JSON.stringify(report, null, 2));
  console.log('ISSUE-062: ' + (report.pass ? 'PASS' : 'FAIL'));
} finally {
  await browser.close();
}
