import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createSupervisorImageAuthority } from './supervisor-image-authority.mjs';

const slug = 'fixture_acasystem'; const containerName = 'addon_' + slug;
const repository = 'ghcr.io/acamemo/acasystem';
const oldImage = repository + '@sha256:' + '1'.repeat(64);
const newImage = repository + '@sha256:' + '2'.repeat(64);
const oldId = 'sha256:' + 'a'.repeat(64); const newId = 'sha256:' + 'b'.repeat(64);
const labels = version => ({ 'io.hass.type': 'addon', 'io.hass.name': 'Acasystem', 'io.hass.version': version });

async function fixture(t, failures = {}) {
  const socketPath = process.platform === 'win32' ? `\\\\.\\pipe\\aca-image-${randomUUID()}` : join(tmpdir(), `aca-image-${randomUUID()}.sock`);
  const calls = []; let running = true; let present = true; let current = oldId;
  const images = new Map([
    [oldId, { Id: oldId, RepoDigests: [oldImage], Config: { Labels: labels('0.9.72.99') }, Os: 'linux', Architecture: 'amd64' }],
    [newId, { Id: newId, RepoDigests: [newImage], Config: { Labels: labels('0.9.73') }, Os: 'linux', Architecture: 'amd64' }],
  ]);
  const refs = new Map([[oldImage, oldId], [newImage, newId], [repository + ':0.9.72.99', oldId]]);
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://fixture'); calls.push({ path: url.pathname, method: req.method, search: url.search });
    const send = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/v1.45/containers/' + containerName + '/json') {
      if (!present) return send({}, 404);
      const version = current === oldId ? '0.9.72.99' : '0.9.73';
      return send({ Name: failures.wrongName ? '/another-app' : '/' + containerName, Image: current,
        Config: { Image: repository + ':' + version, Labels: failures.badLabel ? {} : labels(version) }, State: { Running: running } });
    }
    const image = /^\/v1\.45\/images\/([^/]+)\/json$/.exec(url.pathname);
    if (image) {
      const ref = decodeURIComponent(image[1]); const id = images.has(ref) ? ref : refs.get(ref);
      if (!id) return send({}, 404);
      const value = structuredClone(images.get(id)); if (failures.noDigest) value.RepoDigests = [];
      return send(value);
    }
    if (url.pathname === '/v1.45/images/create' && req.method === 'POST') {
      if (failures.pull) { res.writeHead(200); res.end('{"error":"fixture-private-registry-value"}\n'); return; }
      assert.ok([oldImage, newImage].includes(url.searchParams.get('fromImage')));
      res.writeHead(200); res.end('{"status":"Download complete"}\n'); return;
    }
    const tag = /^\/v1\.45\/images\/([^/]+)\/tag$/.exec(url.pathname);
    if (tag && req.method === 'POST') {
      const id = decodeURIComponent(tag[1]); const repo = url.searchParams.get('repo');
      assert.ok([repository, 'aca-updater-cache'].includes(repo)); assert.ok(images.has(id));
      refs.set(repo + ':' + url.searchParams.get('tag'), id); return send({}, 201);
    }
    send({}, 404);
  });
  await new Promise(resolve => server.listen(socketPath, resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const authority = createSupervisorImageAuthority({ slug, containerName, socketPath, timeoutMs: 1000 });
  return { authority, calls, refs, setStopped: () => { running = false; present = false; },
    mutateTag: () => refs.set(repository + ':0.9.72.99', newId),
    setNew: () => { current = newId; }, before: { appVersion: '0.9.72.99', image: oldImage }, candidate: { appVersion: '0.9.73', image: newImage } };
}

test('Engine HTTP reale su socket temporaneo: digest runtime, cache e tag di recupero esatti', async t => {
  const f = await fixture(t);
  assert.deepEqual(await f.authority.inspect({ slug, appVersion: f.before.appVersion }), { image: oldImage, running: true });
  assert.deepEqual(await f.authority.stage({ slug, before: f.before, candidate: f.candidate }), {
    exactRollback: true, previousImage: oldImage, candidateImage: newImage,
  });
  assert.equal(f.refs.get('aca-updater-cache:' + '1'.repeat(64)), oldId);
  f.setStopped(); f.mutateTag();
  await assert.rejects(f.authority.inspect({ slug, appVersion: f.before.appVersion }));
  await f.authority.prepareRollback({ slug, appVersion: f.before.appVersion, image: oldImage });
  assert.deepEqual(await f.authority.inspect({ slug, appVersion: f.before.appVersion }), { image: oldImage, running: false });
  assert.ok(f.calls.every(call => call.method === 'GET' || /^\/v1\.45\/images\/(create|[^/]+\/tag)$/.test(call.path)));
});

test('nome/label/digest inattesi impediscono pull e qualsiasi mutazione', async t => {
  for (const failure of [{ wrongName: true }, { badLabel: true }, { noDigest: true }]) {
    const f = await fixture(t, failure);
    await assert.rejects(f.authority.stage({ slug, before: f.before, candidate: f.candidate }));
    assert.ok(!f.calls.some(call => call.method === 'POST'));
  }
});

test('errore nello stream pull HTTP200 non viene considerato riuscito e non espone il testo', async t => {
  const f = await fixture(t, { pull: true });
  await assert.rejects(f.authority.stage({ slug, before: f.before, candidate: f.candidate }), error => {
    assert.doesNotMatch(error.message, /private|registry-value/); return true;
  });
});

test('slug o repository diversi e rollback di container in esecuzione sono rifiutati', async t => {
  const f = await fixture(t);
  await assert.rejects(f.authority.inspect({ slug: 'different_app' }));
  await assert.rejects(f.authority.stage({ slug, before: f.before, candidate: { ...f.candidate, image: 'other@sha256:' + '2'.repeat(64) } }));
  await assert.rejects(f.authority.prepareRollback({ slug, appVersion: f.before.appVersion, image: oldImage }));
  assert.ok(!f.calls.some(call => call.method === 'POST'));
  assert.throws(() => createSupervisorImageAuthority({ slug, containerName: 'supervisor' }));
});
