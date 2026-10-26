import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron } from 'playwright-core';
import { writeZip } from '../../scripts/zipWriter.ts';

/**
 * Prova completa del guscio Windows dai sorgenti (`npm run build` prima), senza rete
 * esterna: un finto GitHub e un finto mini PC su 127.0.0.1. Percorsi:
 * procedura guidata → errore di IP → collegamento → interfaccia scaricata e verificata →
 * secondo avvio dalla cache senza GitHub → mini PC spento. Evidenze in ACA_EVIDENCE_DIR
 * o in .tmp/e2e.
 */

const evidence = resolve(process.env.ACA_EVIDENCE_DIR ?? '.tmp/e2e/smoke');
await mkdir(evidence, { recursive: true });
const dataDir = await mkdtemp(join(tmpdir(), 'aca-client-smoke-'));
const LOCAL_PORT = 47_399;

const listen = (server) =>
  new Promise((done) => server.listen(0, '127.0.0.1', () => done(server.address().port)));
const close = (server) =>
  new Promise((done) => {
    server.closeAllConnections();
    server.close(() => done());
  });

// Interfaccia finta: chiede /api/health attraverso il server locale del guscio.
const bundle = writeZip([
  {
    name: 'index.html',
    data:
      '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Acasystem finto</title>' +
      '<script src="assets/app.js" defer></script></head><body><p id="out">…</p></body></html>',
  },
  {
    name: 'assets/app.js',
    data:
      "fetch('./api/health').then((r) => r.json()).then((h) => {" +
      "document.getElementById('out').textContent = 'server ' + h.version; });",
  },
]);
const manifest = {
  schema: 1,
  version: '0.9.30',
  archive: {
    name: 'acasystem-web-0.9.30.zip',
    sha256: createHash('sha256').update(bundle).digest('hex'),
    size: bundle.byteLength,
  },
  minServer: '0.9.28',
  minShell: '0.1.0',
};

const github = createServer((req, res) => {
  const base = '/acamemo/acasystem-releases/releases';
  if (req.url === `${base}/latest/download/manifest.json` || req.url === `${base}/download/v0.9.30/manifest.json`) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(manifest));
  }
  if (req.url === `${base}/download/v0.9.30/${manifest.archive.name}`) {
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    return res.end(Buffer.from(bundle));
  }
  res.writeHead(404).end();
});
// Due finti mini PC: il secondo serve a provare la pulizia dei dati al cambio di impianto.
const fakeMiniPc = (version) =>
  createServer((req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', version }));
    }
    res.writeHead(404).end();
  });
const miniPc = fakeMiniPc('0.9.29');
const miniPc2 = fakeMiniPc('0.9.31');
const githubPort = await listen(github);
const miniPcPort = await listen(miniPc);
const miniPc2Port = await listen(miniPc2);

const launch = () =>
  electron.launch({
    args: ['.'],
    cwd: resolve('.'),
    env: {
      ...process.env,
      ACASYSTEM_CLIENT_DATA_DIR: dataDir,
      ACASYSTEM_CLIENT_PORT: String(LOCAL_PORT),
      ACASYSTEM_CLIENT_TEST_RELEASES: `http://127.0.0.1:${githubPort}`,
    },
  });

const results = [];
let app;
const step = (name) => results.push(name);

try {
  // 1. Primo avvio: procedura guidata.
  app = await launch();
  let page = await app.firstWindow();
  await page.waitForSelector('body[data-view="wizard"]');
  step('procedura guidata al primo avvio');

  await page.fill('#host', '8.8.8.8');
  await page.click('#submit');
  await page.waitForFunction(() => document.querySelector('#wizard-message')?.textContent?.includes('rete di casa'));
  step('IP pubblico rifiutato con messaggio');

  await page.fill('#host', '127.0.0.1');
  await page.click('summary');
  await page.fill('#port', '1');
  await page.click('#submit');
  await page.waitForFunction(() => document.querySelector('#wizard-message')?.textContent?.includes('non risponde'));
  step('mini PC che non risponde: indirizzo non salvato');
  await page.screenshot({ path: join(evidence, '1-wizard-errore.png') });

  await page.fill('#port', String(miniPcPort));
  await page.click('#submit');
  await page.waitForURL(`http://127.0.0.1:${LOCAL_PORT}/`);
  await page.waitForFunction(() => document.querySelector('#out')?.textContent === 'server 0.9.29');
  step('interfaccia scaricata, verificata e collegata al mini PC attraverso /api');
  assert.equal(await page.evaluate(() => typeof window.acasystemShell), 'undefined');
  step("l'interfaccia scaricata non vede il ponte del guscio");
  await page.screenshot({ path: join(evidence, '2-interfaccia.png') });
  // Un dato dell'impianto 1 nel browser dell'interfaccia (come la sessione di HA).
  await page.evaluate(() => localStorage.setItem('acasystem-prova', 'impianto-1'));

  // Pulsante «Cambia indirizzo» di Acasystem (utils/clientShell.ts): user agent e indirizzo.
  assert.match(await page.evaluate(() => navigator.userAgent), /AcasystemShell\/\d+\.\d+\.\d+ \(Windows\)/);
  await page.evaluate(() => window.location.assign('acasystem://change-address'));
  await page.waitForSelector('body[data-view="wizard"]');
  assert.equal(await page.inputValue('#host'), '127.0.0.1');
  step('«Cambia indirizzo» dall\'interfaccia riapre la procedura con l\'IP salvato');
  await app.close();

  // 2. Secondo avvio senza GitHub: dalla cache.
  await close(github);
  app = await launch();
  page = await app.firstWindow();
  await page.waitForURL(`http://127.0.0.1:${LOCAL_PORT}/`);
  await page.waitForFunction(() => document.querySelector('#out')?.textContent === 'server 0.9.29');
  step('secondo avvio senza GitHub: interfaccia dalla cache, indirizzo ricordato');
  assert.equal(await page.evaluate(() => localStorage.getItem('acasystem-prova')), 'impianto-1');
  step('stesso mini PC: sessione e dati del browser conservati');

  // Cambio di mini PC: sessione e dati del precedente cancellati prima di aprire l'interfaccia.
  await page.evaluate(() => window.location.assign('acasystem://change-address'));
  await page.waitForSelector('body[data-view="wizard"]');
  if (!(await page.isVisible('#port'))) await page.click('summary');
  await page.fill('#port', String(miniPc2Port));
  await page.click('#submit');
  await page.waitForURL(`http://127.0.0.1:${LOCAL_PORT}/`);
  await page.waitForFunction(() => document.querySelector('#out')?.textContent === 'server 0.9.31');
  assert.equal(await page.evaluate(() => localStorage.getItem('acasystem-prova')), null);
  step('altro mini PC: sessione e dati del browser del precedente cancellati');
  await app.close();

  // 3. Mini PC spento: pagina d'errore con «Riprova» e «Cambia indirizzo».
  await close(miniPc);
  await close(miniPc2);
  app = await launch();
  page = await app.firstWindow();
  await page.waitForSelector('body[data-view="error"]');
  const text = await page.textContent('#error-message');
  assert.match(text ?? '', /non risponde/);
  step('mini PC spento: pagina chiara');
  await page.screenshot({ path: join(evidence, '3-mini-pc-spento.png') });
  await page.click('#change-address');
  await page.waitForSelector('body[data-view="wizard"]');
  assert.equal(await page.inputValue('#host'), '127.0.0.1');
  step('«Cambia indirizzo» riapre la procedura con l\'IP salvato');
  await app.close();

  console.log(`OK ${results.length} passi:\n- ${results.join('\n- ')}\nEvidenze: ${evidence}`);
} catch (error) {
  console.error(`FALLITO dopo ${results.length} passi (${results.at(-1) ?? 'nessuno'}):`, error);
  if (app) {
    const page = app.windows()[0];
    await page?.screenshot({ path: join(evidence, 'errore.png') }).catch(() => {});
    console.error('Pagina:', page ? await page.content().catch(() => '?') : 'nessuna finestra');
  }
  process.exitCode = 1;
} finally {
  await app?.close().catch(() => {});
  github.listening && (await close(github));
  miniPc.listening && (await close(miniPc));
  miniPc2.listening && (await close(miniPc2));
  await rm(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
