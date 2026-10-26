import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { adaptiveFixtureSettings } from '../src/utils/fixtures/adaptiveData.ts';

// Run only after the unit suites. One browser, one page, GPU disabled on the PC.
const tablet = process.argv.includes('--tablet');
const base = 'http://localhost:3003';
// Evidenze fuori da Git: ACA_EVIDENCE_DIR (sul banco, ../../../backup/rep003/browser) o .tmp/e2e.
const evidence = resolve(process.env.ACA_EVIDENCE_DIR ?? '.tmp/e2e/browser');
await mkdir(evidence, { recursive: true });
const browser = tablet
  ? await chromium.connectOverCDP('http://127.0.0.1:9225')
  : await chromium.launch({ headless: true, args: ['--disable-gpu'] });
const context = tablet ? browser.contexts()[0] : await browser.newContext();
const previous = tablet ? context.pages().find((p) => p.url().includes(':3002')) : null;
const page = await context.newPage();
const errors = [];
const results = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  const url = new URL(request.url());
  if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol))
    assert.equal(
      url.origin.replace(/^ws/, 'http'),
      base,
      'Una richiesta tenta di uscire dal banco isolato'
    );
});
const go = async (index) => {
  const range = page.getByRole('slider', { name: 'Pagina', exact: true });
  await range.evaluate((el, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(
      el,
      String(value)
    );
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, index + 1);
  await page.waitForTimeout(450);
};
try {
  await page.goto(base + '/fixture');
  await page.bringToFront();
  await page.locator('.aca-shell').waitFor({ timeout: 20000 });
  const widths = tablet ? [null] : [390, 1280, 1920];
  for (const width of widths) {
    if (width)
      await page.setViewportSize({
        width,
        height: width === 390 ? 844 : width === 1920 ? 1080 : 800,
      });
    for (const size of [1, 2, 3, 4]) {
      await page.goto(base + '/fixture?size=' + size);
      await page.locator('.aca-shell').waitFor({ timeout: 20000 });
      for (const [index, type] of Object.keys(adaptiveFixtureSettings).entries()) {
        await go(index);
        const current = page.locator('.aca-pager__page.is-current');
        const widget = current.locator(
          type === 'spacer' ? '.aca-adaptive-spacer' : `[data-widget-type="${type}"]`
        );
        await widget.waitFor();
        if (type === 'camera' && size > 1) {
          const feed = widget.locator('.aca-adaptive-camera');
          const media = feed.locator('img');
          await media.waitFor();
          const frame = await feed.boundingBox();
          const picture = await media.boundingBox();
          assert.ok(
            picture.height <= frame.height + 1,
            'Anteprima videocamera ritagliata dal contenitore'
          );
        }
        if (size === 4 && type !== 'spacer') {
          const scroll = widget.locator('.aca-adaptive-widget__controls-wrap');
          const last = widget.locator('.uikwa-controls > [data-control-id]').last();
          if (await last.count()) {
            await last.scrollIntoViewIfNeeded();
            const frame = await scroll.boundingBox();
            const control = await last.boundingBox();
            assert.ok(
              control.y + control.height <= frame.y + frame.height + 1,
              'Ultimo controllo Pagina non raggiungibile'
            );
            await scroll.evaluate((el) => {
              el.scrollTop = 0;
            });
          }
        }
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
          'Overflow della pagina'
        );
        if (type !== 'spacer') {
          const open = widget.getByRole('button', { name: 'Apri dettagli', exact: true });
          await open.focus();
          await open.press('Enter');
          await page.getByRole('dialog').waitFor();
          assert.equal(
            await page
              .getByRole('dialog')
              .getByText('Non è stato possibile mostrare i dettagli di questo widget.')
              .count(),
            0
          );
          await page.keyboard.press('Escape');
          await page.getByRole('dialog').waitFor({ state: 'hidden' });
        }
        await page.screenshot({
          path: resolve(evidence, `${tablet ? 'm11' : width}-${size}-${type}.png`),
        });
        results.push({
          width: width ?? (await page.evaluate(() => innerWidth)),
          type,
          size,
          details: type !== 'spacer',
          overflow: false,
        });
      }
    }
  }
  // Real pointer gesture and state confirmation against the mock HA, same production bundle.
  await go(Object.keys(adaptiveFixtureSettings).indexOf('light'));
  const widget = page.locator('.aca-pager__page.is-current [data-widget-type="light"]');
  // The settings open in edit mode (ADR-0016): a tap selects the widget, a second tap opens them.
  // The screen commands are clipped and take no pointer until focused: reach them by keyboard.
  await page.getByRole('button', { name: 'Modifica la disposizione', exact: true }).focus();
  await page.keyboard.press('Enter');
  const handle = page.locator(
    '.aca-pager__page.is-current [data-widget-id]:has([data-widget-type="light"]) .aca-launcher-widget__handle'
  );
  await handle.click();
  await handle.click();
  const settings = page.getByRole('dialog', { name: 'Impostazioni del widget' });
  await settings.waitFor();
  await settings.getByRole('switch', { name: 'Colore della luce', exact: true }).click();
  await page.screenshot({
    path: resolve(evidence, 'preferences-' + (tablet ? 'm11' : 'pc') + '.png'),
  });
  await settings.getByRole('button', { name: 'Fatto', exact: true }).click();
  await settings.waitFor({ state: 'hidden' });
  // Back to use: Esc ends the edit mode.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  await page.reload();
  await page.locator('.aca-shell').waitFor();
  await go(Object.keys(adaptiveFixtureSettings).indexOf('light'));
  assert.equal(
    await widget.getByRole('slider', { name: 'Colore della luce' }).count(),
    0,
    'Preferenza non conservata al riavvio'
  );
  await widget.getByRole('button', { name: 'Apri dettagli', exact: true }).press('Enter');
  await page.getByRole('dialog').getByRole('slider', { name: 'Colore della luce' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const slider = widget.getByRole('slider', { name: 'Luminosità della luce' });
  const before = await page.request.get(base + '/__fixture/journal').then((r) => r.json());
  const box = await slider.boundingBox();
  assert.ok(box);
  if (tablet) {
    const cdp = await context.newCDPSession(page);
    const touch = (type, y) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: box.x + box.width / 2, y }],
      });
    await touch('touchStart', box.y + box.height / 2);
    for (let step = 1; step <= 10; step++)
      await touch('touchMove', box.y + box.height / 2 - step * 5);
    await touch('touchEnd', 0);
    await cdp.detach();
  } else {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 50, { steps: 10 });
    await page.mouse.up();
  }
  await page.waitForTimeout(400);
  const after = await page.request.get(base + '/__fixture/journal').then((r) => r.json());
  const sent = after.commands
    .slice(before.commands.length)
    .filter((call) => call.domain === 'light');
  assert.ok(sent.length >= 1 && sent.length <= 2, 'Il gesto non rispetta throttle e rilascio');
  assert.ok(sent.every((call) => call.data.entity_id === 'light.fixture'));
  assert.equal(
    await widget.locator('[aria-busy="true"]').count(),
    0,
    'La conferma HA non chiude il pending'
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.locator('.aca-shell').waitFor();
  assert.equal(
    await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    true
  );
  assert.deepEqual(errors, []);
  const journal = await page.request.get(base + '/__fixture/journal').then((r) => r.json());
  await writeFile(
    resolve(evidence, 'result-' + (tablet ? 'm11' : 'pc') + '.json'),
    JSON.stringify({ results, errors, gesture: sent, outbound: journal.outbound }, null, 2)
  );
  console.log(
    `PASS: ${results.length} viste, dettagli da tastiera, gesto/conferma e movimento ridotto; nessun errore di pagina.`
  );
} catch (error) {
  await page
    .screenshot({ path: resolve(evidence, 'failure-' + (tablet ? 'm11' : 'pc') + '.png') })
    .catch(() => {});
  await writeFile(
    resolve(evidence, 'failure.json'),
    JSON.stringify({ error: String(error), url: page.url(), errors, results }, null, 2)
  );
  throw error;
} finally {
  await page.close();
  if (previous) await previous.bringToFront().catch(() => {});
  await browser.close();
}
