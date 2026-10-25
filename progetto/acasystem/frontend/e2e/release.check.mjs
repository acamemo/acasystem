import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Run after the unit suites and Compose deployment. The real bench is read only;
// browser interaction uses only the isolated mock with the same production assets.
const evidence = resolve('../../../backup/rep003/release');
const isolated = process.argv.includes('--isolated');
const bench = isolated ? 'http://localhost:3003' : 'http://127.0.0.1:3002';
await mkdir(evidence, { recursive: true });
const manifest = JSON.parse(
  await readFile(resolve(evidence, '../assets-image-final.json'), 'utf8')
);
const health = await fetch(bench + '/api/health').then((r) => r.json());
assert.equal(health.version, '0.9.27');
for (const [name, expected] of Object.entries(manifest)) {
  const response = await fetch(bench + '/' + name);
  assert.equal(response.status, 200);
  const actual = createHash('sha256')
    .update(Buffer.from(await response.arrayBuffer()))
    .digest('hex');
  assert.equal(actual, expected, 'Asset diverso sul banco: ' + name);
}
const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:3003/fixture');
  await page.locator('.aca-shell').waitFor();
  await page.getByRole('button', { name: /^Sistema/ }).click();
  await page.locator('#sistema-informazioni').scrollIntoViewIfNeeded();
  await page.getByText('0.9.27', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  await page.screenshot({ path: resolve(evidence, 'interface-version.png') });
  await page.getByRole('button', { name: 'Torna al launcher' }).click();
  await page.getByRole('slider', { name: 'Pagina', exact: true }).evaluate((el) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '2');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const widget = page.locator('.aca-pager__page.is-current [data-widget-type="light"]');
  await widget.waitFor();
  const before = await page.request
    .get('http://localhost:3003/__fixture/journal')
    .then((r) => r.json());
  await page.request.post('http://localhost:3003/__fixture/scenario', {
    data: { disconnect: true },
  });
  await widget.getByText('Connessione a Home Assistant assente', { exact: true }).waitFor();
  const power = widget.getByRole('button', { name: 'Accensione luce', exact: true });
  assert.ok((await power.count()) === 0 || (await power.isDisabled()));
  const brightness = widget.getByRole('slider', { name: 'Luminosità della luce' });
  assert.ok((await brightness.count()) === 0 || (await brightness.isDisabled()));
  if (await power.count()) await power.evaluate((el) => el.click());
  const after = await page.request
    .get('http://localhost:3003/__fixture/journal')
    .then((r) => r.json());
  assert.equal(after.commands.length, before.commands.length);
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(evidence, isolated ? 'result-isolated.json' : 'result.json'),
    JSON.stringify(
      {
        health,
        assets: Object.keys(manifest).length,
        interfaceVersion: '0.9.27',
        interfaceOrigin: 'http://localhost:3003',
        bench,
        socketDisconnect: true,
        offlineCommands: 0,
        errors,
      },
      null,
      2
    )
  );
  console.log(
    `PASS: API ${isolated ? 'simulata' : 'reale'} 0.9.27, asset conformi, versione UI e socket offline senza nuovi comandi.`
  );
} finally {
  await fetch('http://localhost:3003/__fixture/scenario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reconnect: true }),
  }).catch(() => undefined);
  await browser.close();
}
