import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { networkInterfaces, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright-core';
import { writeZip } from '../../scripts/zipWriter.ts';

// Solo server fixture LAN e profili Electron temporanei. Non usa HA, Docker,
// credenziali personali o la porta del banco; non installa il client.
const windowsRoot = fileURLToPath(new URL('../', import.meta.url));
const address = Object.values(networkInterfaces()).flat().find(item => item && !item.internal && item.family === 'IPv4'
  && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address))?.address;
if (!address) throw new Error('Smoke non eseguito: manca un IPv4 LAN privato per il server fixture.');
const work = await mkdtemp(join(tmpdir(), 'aca-native-update-smoke-'));
const evidence = resolve(process.env.ACA_EVIDENCE_DIR ?? join(windowsRoot, '.tmp', 'e2e', 'update-startup-' + Date.now()));
await mkdir(evidence, { recursive: true });
const steps = []; const reports = [];
const oldVersion = '0.9.72'; const nextVersion = '0.9.73';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(done => setTimeout(done, ms));
async function until(check) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) { if (check()) return; await sleep(20); }
  throw new Error('Stato fixture non raggiunto entro il limite.');
}
const listen = (server, host) => new Promise((resolve, reject) => {
  server.once('error', reject); server.listen(0, host, () => resolve(server.address().port));
});
const close = server => new Promise(done => { server.closeAllConnections(); server.close(done); });
async function freeLocalPort() {
  const reservation = createServer(); const port = await listen(reservation, '127.0.0.1'); await close(reservation); return port;
}
function makeBundle(version) {
  const script = `fetch('./api/fixture/launch?version=${version}',{method:'POST'}).then(()=>{new WebSocket('ws://'+location.host+'/ha/api/websocket');document.getElementById('out').textContent='fixture ${version}';});`;
  const archive = writeZip([
    { name: 'index.html', data: '<!doctype html><html><head><title>ACA startup fixture</title><script src="assets/app.js" defer></script></head><body><p id="out">loading fixture</p></body></html>' },
    { name: 'assets/app.js', data: script },
  ]);
  return { archive, manifest: { schema: 1, version, minServer: version, minShell: '0.1.1',
    archive: { name: `acasystem-web-${version}.zip`, size: archive.byteLength, sha256: sha(archive) } } };
}
async function runCase(mode) {
  const dataDir = join(work, mode); await mkdir(dataDir);
  const calls = []; const sockets = new Set(); const bundles = new Map([oldVersion, nextVersion].map(version => [version, makeBundle(version)]));
  let current = oldVersion; let permitCurrent = mode !== 'updating'; let temporaryRestartReported = false;
  const record = (path, extra = {}) => { calls.push({ sequence: calls.length, path, ...extra }); };
  const fixture = createServer((req, res) => {
    const url = new URL(req.url, 'http://fixture');
    const json = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/api/health') { record(url.pathname, { version: current }); return json({ status: 'ok', version: current }); }
    if (url.pathname === '/api/updates/check' || url.pathname === '/api/updates/status') {
      assert.equal(url.searchParams.get('shellVersion') ?? '0.1.1', '0.1.1');
      if (mode === 'legacy') { record(url.pathname, { status: 404 }); return json({}, 404); }
      if (mode === 'current-race' || permitCurrent) {
        if (mode === 'updating' && !temporaryRestartReported) {
          temporaryRestartReported = true; record(url.pathname, { status: 503 }); return json({}, 503);
        }
        current = nextVersion; record(url.pathname, { status: 'current', version: current }); return json({ status: 'current', version: current });
      }
      record(url.pathname, { status: 'updating', version: current }); return json({ status: 'updating', version: current });
    }
    if (url.pathname === '/api/client-bundle/manifest') { record(url.pathname, { version: current }); return json(bundles.get(current).manifest); }
    if (url.pathname === '/api/client-bundle/archive') {
      record(url.pathname, { version: current }); res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); res.end(Buffer.from(bundles.get(current).archive)); return;
    }
    if (url.pathname === '/api/fixture/launch') { record(url.pathname, { version: url.searchParams.get('version') }); return json({ ok: true }); }
    record(url.pathname, { status: 404 }); json({}, 404);
  });
  fixture.on('upgrade', (req, socket) => {
    record('WS ' + req.url); sockets.add(socket); socket.once('close', () => sockets.delete(socket)); socket.on('error', () => {});
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  });
  const serverPort = await listen(fixture, address); const localPort = await freeLocalPort();
  let app;
  try {
    app = await electron.launch({ args: ['.'], cwd: windowsRoot, env: { ...process.env,
      ACASYSTEM_CLIENT_DATA_DIR: dataDir, ACASYSTEM_CLIENT_PORT: String(localPort), ACASYSTEM_CLIENT_NO_NOTIFICATIONS: '1' } });
    const page = await app.firstWindow(); await page.waitForSelector('body[data-view="wizard"]');
    await page.fill('#host', `http://${address}:${serverPort}/`); await page.click('#submit');
    if (mode === 'updating') {
      await until(() => calls.some(call => call.status === 'updating'));
      await page.waitForSelector('body[data-view="loading"]');
      assert.ok(!calls.some(call => call.path.startsWith('WS ') || call.path.startsWith('/api/fixture/') || call.path.startsWith('/api/client-bundle/')));
      steps.push('updating mantiene UI e WebSocket non avviati'); permitCurrent = true;
    }
    const expected = mode === 'legacy' ? oldVersion : nextVersion;
    await page.waitForURL(`http://127.0.0.1:${localPort}/`);
    await page.waitForFunction(version => document.getElementById('out')?.textContent === 'fixture ' + version, expected);
    await until(() => calls.some(call => call.path.startsWith('WS ')));
    const completion = calls.findIndex(call => call.status === (mode === 'legacy' ? 404 : 'current'));
    const freshHealth = calls.findIndex((call, index) => index > completion && call.path === '/api/health' && call.version === expected);
    const manifest = calls.findIndex(call => call.path === '/api/client-bundle/manifest');
    const download = calls.findIndex(call => call.path === '/api/client-bundle/archive');
    const launched = calls.findIndex(call => call.path === '/api/fixture/launch');
    const websocket = calls.findIndex(call => call.path.startsWith('WS '));
    assert.ok(completion >= 0 && freshHealth > completion && manifest > freshHealth && download > manifest && launched > download && websocket > launched,
      'Ordine richiesto: fine check → health nuova → manifest → archivio verificato → app → WS');
    assert.equal(calls[manifest].version, expected); assert.equal(calls[download].version, expected); assert.equal(calls[launched].version, expected);
    assert.ok(!calls.some(call => call.path === '/api/client-bundle/manifest' && call.version !== expected));
    await page.screenshot({ path: join(evidence, mode + '.png') });
    steps.push(mode === 'updating' ? 'riavvio temporaneo503 → current → health nuova e bundle corretto prima di app/WS'
      : mode === 'current-race' ? 'current diretto dopo health vecchia rilegge health e avvia il bundle nuovo'
        : 'endpoint update404 conserva la versione sana con health riletta e bundle verificato');
    reports.push({ mode, expectedVersion: expected, calls });
  } catch (error) {
    await app?.windows()[0]?.screenshot({ path: join(evidence, mode + '-failure.png') }).catch(() => {});
    reports.push({ mode, failed: true, calls }); throw error;
  } finally {
    await app?.close().catch(() => {});
    for (const socket of sockets) socket.destroy();
    await close(fixture);
  }
}

try {
  for (const mode of ['updating', 'current-race', 'legacy']) await runCase(mode);
  console.log(JSON.stringify({ passed: steps.length, steps, evidence }));
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  await writeFile(join(evidence, 'startup-update-smoke.json'), JSON.stringify({ schema: 1, passed: steps.length, steps, reports }, null, 2) + '\n');
  const actual = await realpath(work);
  assert.equal(dirname(actual), await realpath(tmpdir())); assert.ok(basename(actual).startsWith('aca-native-update-smoke-'));
  await rm(actual, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
