import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
const script = await readFile(new URL('browser-reset.js', import.meta.url), 'utf8');
function fixture(blocked = false) {
  const deleted = [], cleared = [], document = { title: '', body: { textContent: '' } };
  const scope = { document, setTimeout, clearTimeout,
    localStorage: { clear: () => cleared.push('local') }, sessionStorage: { clear: () => cleared.push('session') },
    caches: { keys: async () => ['old-cache'], delete: async key => { cleared.push(key); } },
    navigator: { serviceWorker: { getRegistrations: async () => [{ unregister: async () => cleared.push('worker') }] } },
    indexedDB: { deleteDatabase(name) { deleted.push(name); const request = {}; queueMicrotask(() => blocked ? request.onblocked() : request.onsuccess()); return request; } },
  };
  return { scope, deleted, cleared, document };
}
test('pulisce accessi/cache/foto e non richiede mai la cancellazione del DB bozze', async () => {
  const f = fixture();
  assert.equal(await runInNewContext(script, f.scope), true);
  assert.deepEqual(f.deleted, ['aca-appearance']);
  assert.deepEqual(f.cleared, ['local', 'session', 'old-cache', 'worker']);
  assert.equal(f.document.title, 'aca-storage-reset-ready');
});
test('un archivio foto occupato impedisce il passaggio alla nuova centrale e dichiara bozze conservate', async () => {
  const f = fixture(true);
  assert.equal(await runInNewContext(script, f.scope), false);
  assert.equal(f.document.title, 'aca-storage-reset-error');
  assert.match(f.document.body.textContent, /bozze sono conservate/);
  assert.deepEqual(f.deleted, ['aca-appearance']);
});
test('il timeout non autorizza il caricamento della nuova webapp', async () => {
  const f = fixture();
  f.scope.indexedDB.deleteDatabase = name => { f.deleted.push(name); return {}; };
  f.scope.setTimeout = callback => { queueMicrotask(callback); return 0; };
  assert.equal(await runInNewContext(script, f.scope), false);
  assert.equal(f.document.title, 'aca-storage-reset-error');
  assert.equal(f.deleted.includes('acasystem-profile-drafts-v2'), false);
  assert.deepEqual(f.cleared.slice(0, 2), ['local', 'session']);
});
