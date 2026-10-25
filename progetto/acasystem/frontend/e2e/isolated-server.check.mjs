import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const server = spawn(
  process.execPath,
  [fileURLToPath(new URL('./isolated-server.mjs', import.meta.url))],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);
let output = '';
server.stderr.on('data', (data) => {
  output += data;
});
try {
  await Promise.race([
    once(server.stdout, 'data'),
    once(server, 'exit').then(() => {
      throw new Error(output);
    }),
  ]);
  const base = 'http://127.0.0.1:3003';
  assert.equal((await fetch(base + '/api/health').then((r) => r.json())).isolated, true);
  assert.equal(
    await fetch(base).then((r) => r.text()),
    await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  );
  assert.equal(
    (await fetch(base + '/ha/api/services/light/turn_on', { method: 'POST', body: '{}' })).status,
    404
  );
  const ws = new WebSocket('ws://127.0.0.1:3003/ha/api/websocket');
  let seq = 0;
  const pending = new Map();
  const ready = new Promise((resolve) =>
    ws.on('message', (raw) => {
      const message = JSON.parse(raw);
      if (message.type === 'auth_required')
        ws.send(JSON.stringify({ type: 'auth', access_token: 'aca-isolated-fixture' }));
      if (message.type === 'auth_ok') resolve();
      if (message.type === 'result') {
        pending.get(message.id)?.(message);
        pending.delete(message.id);
      }
    })
  );
  const send = (message) =>
    new Promise((resolve) => {
      const id = ++seq;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, ...message }));
    });
  await ready;
  assert.equal(
    (
      await send({
        type: 'call_service',
        domain: 'light',
        service: 'turn_off',
        service_data: { entity_id: 'light.fixture' },
      })
    ).success,
    true
  );
  assert.equal(
    (
      await send({
        type: 'call_service',
        domain: 'light',
        service: 'turn_on',
        service_data: { entity_id: 'light.non_configurata' },
      })
    ).success,
    false
  );
  const journal = await fetch(base + '/__fixture/journal').then((r) => r.json());
  assert.equal(journal.outbound, false);
  assert.equal(journal.commands.length, 1);
  assert.equal(journal.commands[0].data.entity_id, 'light.fixture');
  ws.close();
  console.log(
    'PASS: stesso index di produzione; REST HA non inoltrato; solo servizi/target di fixture; nessun outbound.'
  );
} finally {
  server.kill();
}
