import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { networkInterfaces, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron } from 'playwright-core';
import { writeZip } from '../../scripts/zipWriter.ts';

// Banco client isolato: mini PC ACA già predisposti, senza Home Assistant o VM reali.
const address = Object.values(networkInterfaces()).flat().find((item) =>
  item && !item.internal && item.family === 'IPv4'
  && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address))?.address;
if (!address) throw new Error('Prova non eseguita: serve un IPv4 privato della rete locale.');
const evidence = resolve(process.env.ACA_EVIDENCE_DIR ?? '.tmp/e2e/smoke');
await mkdir(evidence, { recursive: true });
const dataDir = await mkdtemp(join(tmpdir(), 'aca-client-smoke-'));
const LOCAL_PORT = 47399;
const listen = (server) => new Promise((done) => server.listen(0, address, () => done(server.address().port)));
const close = (server) => new Promise((done) => { server.closeAllConnections(); server.close(done); });
const bundle = writeZip([
  { name: 'index.html', data: '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>ACA di prova</title><script src="assets/app.js" defer></script></head><body><p id="out">…</p></body></html>' },
  { name: 'assets/app.js', data: "fetch('./api/health').then(r=>r.json()).then(h=>{document.getElementById('out').textContent='server '+h.version;});" },
]);
const manifestFor = (version) => ({
  schema: 1, version,
  archive: { name: `acasystem-web-${version}.zip`, sha256: createHash('sha256').update(bundle).digest('hex'), size: bundle.byteLength },
  minServer: '0.9.28', minShell: '0.1.0',
});
const fakeMiniPc = (version) => {
  const manifest = manifestFor(version);
  let bundleAvailable = true;
  return {
    setBundleAvailable: (value) => { bundleAvailable = value; },
    server: createServer((req, res) => {
      if (req.url === '/api/health') return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'ok', version }));
      if (bundleAvailable && req.url === '/api/client-bundle/manifest') return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(manifest));
      if (bundleAvailable && req.url === '/api/client-bundle/archive') return res.writeHead(200, { 'Content-Type': 'application/octet-stream' }).end(Buffer.from(bundle));
      res.writeHead(404).end();
    }),
  };
};
const first = fakeMiniPc('0.9.31'), second = fakeMiniPc('0.9.32');
const firstPort = await listen(first.server), secondPort = await listen(second.server);
// Il vecchio flag attivo deve essere ignorato senza cercare VBoxManage o modificare il disco.
await mkdir(join(dataDir, 'engine'));
await writeFile(join(dataDir, 'engine/local-engine.json'), '{"schema":1,"enabled":true}');
const launch = () => electron.launch({ args: ['.'], cwd: resolve('.'), env: {
  ...process.env, ACASYSTEM_CLIENT_DATA_DIR: dataDir, ACASYSTEM_CLIENT_PORT: String(LOCAL_PORT), ACASYSTEM_CLIENT_NO_NOTIFICATIONS: '1',
} });
const results = [];
const step = (name) => results.push(name);
let app;
try {
  app = await launch();
  let page = await app.firstWindow();
  await page.waitForSelector('body[data-view="wizard"]');
  assert.equal(await page.locator('#prepare-local-pc').count(), 0);
  assert.equal(await page.locator('input[type="password"]').count(), 0);
  step('avvio IP senza VM o credenziali native, anche con vecchio flag locale attivo');
  await page.fill('#host', '8.8.8.8'); await page.click('#submit');
  await page.waitForFunction(() => document.querySelector('#wizard-message')?.textContent?.includes('rete di casa'));
  step('IP pubblico rifiutato');
  await page.fill('#host', address); await page.click('summary'); await page.fill('#port', '1'); await page.click('#submit');
  await page.waitForFunction(() => document.querySelector('#wizard-message')?.textContent?.includes('non risponde'));
  step('centrale non raggiungibile: errore senza salvare indirizzo');
  await page.fill('#host', `http://${address}:${firstPort}/`); await page.fill('#port', ''); await page.click('#submit');
  await page.waitForURL(`http://127.0.0.1:${LOCAL_PORT}/`);
  await page.waitForFunction(() => document.querySelector('#out')?.textContent === 'server 0.9.31');
  assert.deepEqual(await page.evaluate(() => Object.keys(window.acasystemShell ?? {})), ['pairingEndpoint']);
  assert.deepEqual(await page.evaluate(() => window.acasystemShell.pairingEndpoint()), { endpoint: `http://${address}:${firstPort}` });
  assert.deepEqual(JSON.parse(await readFile(join(dataDir, 'config.json'), 'utf8')), { host: address, port: firstPort });
  await page.screenshot({ path: join(evidence, 'mini-pc-client.png') });
  await page.evaluate(() => localStorage.setItem('aca-test-home', 'first'));
  step('URL incollato con porta: health e bundle verificati, bridge limitato alla centrale');
  await app.close();
  first.setBundleAvailable(false);
  app = await launch(); page = await app.firstWindow();
  await page.waitForURL(`http://127.0.0.1:${LOCAL_PORT}/`);
  await page.waitForFunction(() => document.querySelector('#out')?.textContent === 'server 0.9.31');
  assert.equal(await page.evaluate(() => localStorage.getItem('aca-test-home')), 'first');
  step('riapertura dalla cache con sessione conservata');
  await page.evaluate(async () => {
    localStorage.setItem('tunet_auth_cache_v1', 'credenziale-di-prova');
    localStorage.setItem('aca:client:session:last:v2', 'identità-precedente');
    sessionStorage.setItem('sessione', 'precedente'); document.cookie = 'aca-test=old; path=/';
    const seed = (name, store, value) => new Promise((resolve, reject) => {
      const request = indexedDB.open(name, name === 'acasystem-profile-drafts-v2' ? 2 : 1);
      request.onupgradeneeded = () => { request.result.createObjectStore(store, { keyPath: 'id' }); };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, transaction = db.transaction(store, 'readwrite');
        transaction.objectStore(store).put(value);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
    await seed('acasystem-profile-drafts-v2', 'drafts', { id: 'draft-qa', houseId: 'old-house', userId: 'anna', title: 'Bozza da recuperare' });
    await seed('aca-appearance', 'photos', { id: 'wallpaper', value: 'foto-precedente' });
    await caches.open('old-house-cache');
  });
  await page.evaluate(() => window.location.assign('acasystem://change-address'));
  await page.waitForSelector('body[data-view="wizard"]');
  assert.equal(await page.inputValue('#host'), address);
  await page.getByText('Impostazioni avanzate', { exact: true }).click();
  await page.fill('#port', String(secondPort)); await page.click('#submit');
  await page.waitForURL(`http://127.0.0.1:${LOCAL_PORT}/`);
  await page.waitForFunction(() => document.querySelector('#out')?.textContent === 'server 0.9.32');
  assert.equal(await page.evaluate(() => localStorage.getItem('aca-test-home')), null);
  step('cambio centrale cancella la sessione precedente');
  const preserved = await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    const draft = await new Promise((resolve, reject) => {
      const request = indexedDB.open('acasystem-profile-drafts-v2', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, read = db.transaction('drafts', 'readonly').objectStore('drafts').get('draft-qa');
        read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => { db.close(); reject(read.error); };
      };
    });
    return { draft, databases: databases.map(item => item.name), local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie, caches: await caches.keys() };
  });
  assert.deepEqual(preserved.draft, { id: 'draft-qa', houseId: 'old-house', userId: 'anna', title: 'Bozza da recuperare' });
  assert.equal(preserved.databases.includes('aca-appearance'), false);
  assert.deepEqual(preserved.local, []); assert.deepEqual(preserved.session, []); assert.equal(preserved.cookies, ''); assert.deepEqual(preserved.caches, []);
  step('IndexedDB bozze conservato; credenziali, identitycache, cookie, cache e foto precedenti cancellati');
  await app.close();
  await close(first.server); await close(second.server);
  app = await launch(); page = await app.firstWindow();
  await page.waitForSelector('body[data-view="error"]');
  assert.match(await page.textContent('#error-message') ?? '', /non risponde/);
  await page.click('#change-address');
  await page.waitForSelector('body[data-view="wizard"]');
  step('mini PC spento e cambio indirizzo disponibili');
  assert.equal(await readFile(join(dataDir, 'engine/local-engine.json'), 'utf8'), '{"schema":1,"enabled":true}');
  step('flag e dati sperimentali conservati senza attivare il motore');
  console.log(JSON.stringify({ passed: results.length, steps: results, evidence }));
} catch (error) {
  if (app) await app.windows()[0]?.screenshot({ path: join(evidence, 'failure.png') }).catch(() => {});
  console.error(error); process.exitCode = 1;
} finally {
  await app?.close().catch(() => {});
  if (first.server.listening) await close(first.server);
  if (second.server.listening) await close(second.server);
  assert.ok(resolve(dataDir).startsWith(join(resolve(tmpdir()), 'aca-client-smoke-')));
  await rm(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
