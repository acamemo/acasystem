import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { smokeExecutorImage } from './smoke-executor-image.mjs';

test('predisposizione shell: piano o rifiuto prima di chiamate HA/Docker', () => {
  const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'sh';
  const script = fileURLToPath(new URL('../executor-candidate/prepare-haos-executor.sh', import.meta.url)).replaceAll('\\', '/');
  const args = ['--app-version', '0.9.73.2', '--shell-version', '0.1.1'];
  const run = values => spawnSync(bash, [script, ...values], { encoding: 'utf8' });
  const plan = run(args); assert.equal(plan.status, 0, plan.stderr); assert.match(plan.stdout, /Nessun comando HA\/Docker/);
  for (const invalid of [[], [...args, '--apply'], [...args, '--app-version', '0.9.73.1'], ['--app-version', 'latest', '--shell-version', '0.1.1']]) {
    assert.notEqual(run(invalid).status, 0);
  }
});
test('smoke CI vincola il solo container di prova senza rete, socket o mount del banco', () => {
  let calls = 0;
  const result = smokeExecutorImage('ghcr.io/acamemo/acasystem:0.9.73.2', { run: (command, args) => {
    calls++; assert.equal(command, 'docker'); assert.equal(args[0], 'run'); assert.ok(args.includes('--rm'));
    assert.equal(args[args.indexOf('--network') + 1], 'none'); assert.equal(args[args.indexOf('--pull') + 1], 'never');
    for (const forbidden of ['--mount', '--volume', '-v', '--privileged', '--publish', '-p']) assert.ok(!args.includes(forbidden));
    return JSON.stringify({ checks: 7, workerFailsClosedWithoutSupervisor: true, mainMaintenance: true });
  } });
  assert.equal(result.checks, 7); assert.equal(calls, 1);
  assert.throws(() => smokeExecutorImage('homeassistant:latest', { run: () => assert.fail('non deve eseguire Docker') }));
});
