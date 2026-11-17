import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readComponentAvailability } from './component-availability.mjs';

test('OS/Core/Supervisor/Sonoff distinti; sola lettura senza divulgare token', async () => {
  const requests = [];
  const result = await readComponentAvailability({ supervisorToken: 'fixture-private-token', sonoffVersion: '3.13.3', fetcher: async (url, options) => {
    requests.push({ url, options });
    if (url.startsWith('https://api.github.com/')) return new Response(JSON.stringify({ tag_name: 'v3.13.4', draft: false, prerelease: false }));
    const part = url.split('/')[3];
    return new Response(JSON.stringify({ result: 'ok', data: part === 'os' ? { version: '18.4', version_latest: '18.5' } : part === 'core' ? { version: '2026.9.4', version_latest: '2026.9.4' } : { version: '2026.09.0', version_latest: '2026.10.0' } }));
  } });
  assert.deepEqual(result.map(x => [x.component, x.newer]), [['haos', true], ['core', false], ['supervisor', true], ['sonofflan', true]]);
  assert.ok(requests.every(x => x.options.method === 'GET'));
  assert.ok(requests.filter(x => x.url.startsWith('http:')).every(x => x.options.redirect === 'error'));
  assert.ok(!requests.at(-1).options.headers.Authorization);
  assert.doesNotMatch(JSON.stringify(result), /fixture-private-token/);
});
test('mancanza token o upstream offline non viene scambiata per assenza aggiornamenti', async () => {
  let count = 0;
  const result = await readComponentAvailability({ fetcher: async () => { count++; throw new Error('offline'); } });
  assert.equal(count, 1); assert.ok(result.every(x => x.status === 'unavailable'));
});
test('errori di un componente non cancellano disponibilita degli altri', async () => {
  const result = await readComponentAvailability({ supervisorToken: 'fixture', sonoffVersion: '3.13.3', fetcher: async (url) => {
    if (url.endsWith('/core/info')) throw new Error('timeout');
    if (url.startsWith('https:')) return new Response(JSON.stringify({ tag_name: 'v9.0.0', draft: false, prerelease: true }));
    return new Response(JSON.stringify({ result: 'ok', data: { version: '18.4', version_latest: '18.5' } }));
  } });
  assert.equal(result.find(x => x.component === 'core').status, 'unavailable');
  assert.equal(result.find(x => x.component === 'haos').status, 'available');
  assert.equal(result.find(x => x.component === 'sonofflan').newer, null);
});
