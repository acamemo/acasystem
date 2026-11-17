import { chmod, lstat, mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { checkPublications } from './update-policy.mjs';
import { runUpdateTransaction } from './update-transaction.mjs';
import { createAcaMaintenanceClient, createSupervisorUpdateAdapter, createSupervisorUpdateClient } from './supervisor-update-adapter.mjs';
import { createSupervisorImageAuthority } from './supervisor-image-authority.mjs';

const fail = () => { throw new Error('Executor HAOS non predisposto o configurazione non valida'); };
export function validateHaosTarget(value) {
  if (value?.schema !== 1 || value.enabled !== true || value.channel !== 'stable' ||
    !/^aca-[a-f0-9-]{36}$/.test(value.targetId ?? '') || value.slug !== '9960cdb4_acasystem' ||
    !['app_' + value.slug, 'addon_' + value.slug].includes(value.containerName) ||
    !/^\d+\.\d+\.\d+$/.test(value.shellVersion ?? '') ||
    !Number.isInteger(value.checkIntervalMs) || value.checkIntervalMs < 60000 || value.checkIntervalMs > 86400000) fail();
  return { schema: 1, enabled: true, channel: 'stable', targetId: value.targetId, slug: value.slug,
    containerName: value.containerName, shellVersion: value.shellVersion, checkIntervalMs: value.checkIntervalMs };
}

// Solo la credenziale dedicata; non legge utenti/HA o campi options del Supervisor.
export async function readHaosPrivateConfiguration(directory = '/data/update-secret') {
  const folder = await lstat(directory);
  if (!folder.isDirectory() || folder.isSymbolicLink() || (folder.mode & 0o077) || (process.getuid && folder.uid !== process.getuid())) fail();
  const values = [];
  for (const name of ['target.json', 'token']) {
    const path = join(directory, name); const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) || info.size > 8192 || info.uid !== folder.uid) fail();
    values.push(await readFile(path, 'utf8'));
  }
  let target;
  try { target = validateHaosTarget(JSON.parse(values[0])); } catch { fail(); }
  const token = values[1].trim(); if (!/^[a-f0-9]{64}$/.test(token)) fail();
  return { target, token };
}

export async function prepareHaosRuntime(directory = '/data/runtime') {
  try { await mkdir(directory, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const folder = await lstat(directory);
  if (!folder.isDirectory() || folder.isSymbolicLink() || (process.getuid && folder.uid !== process.getuid())) fail();
  await chmod(directory, 0o700);
  return directory;
}

export async function waitForHaosConfiguration({ read = readHaosPrivateConfiguration, pause = delay, now = Date.now, timeoutMs = 60000 } = {}) {
  const deadline = now() + timeoutMs;
  while (true) {
    try { return await read(); }
    catch (error) { if (error.code !== 'ENOENT' || now() >= deadline) fail(); }
    await pause(1000);
  }
}

export async function checkHaos({ target, directory, maintenance, adapter, check = checkPublications }) {
  const recovered = await runUpdateTransaction({ directory, targetId: target.targetId, channel: 'stable', publication: null, adapter });
  if (['recovery-required', 'deferred'].includes(recovered.action)) return recovered;
  const installed = await adapter.inspect();
  const report = (status, availableVersion) => maintenance.status({ status, checkedAt: new Date().toISOString(),
    version: installed.version, ...(availableVersion ? { availableVersion } : {}) });
  await report('checking');
  const result = await check(installed, 'stable');
  if (result.action !== 'available') {
    await report(['offline-or-invalid-publication', 'timeout'].includes(result.reason) ? 'offline' : 'current');
    return result;
  }
  await report('updating', result.publication.version);
  const outcome = await runUpdateTransaction({ directory, targetId: target.targetId, channel: 'stable', adapter,
    publication: { distribution: result.publication, release: { draft: false, prerelease: false, tag_name: result.publication.tag } } });
  if (outcome.action !== 'recovery-required') {
    await maintenance.status({ status: outcome.action === 'updated' ? 'current' : outcome.action === 'deferred' ? 'deferred' : 'failed',
      checkedAt: new Date().toISOString(), version: outcome.action === 'updated' ? result.publication.version : installed.version });
  }
  return outcome;
}

export async function monitorHaos({ target, directory, maintenance, adapter, check = checkPublications,
  pause = delay, stopped = () => false, log = value => console.log(JSON.stringify(value)) }) {
  let lastRequest; let lastCheck = 0; let previous; let outcome; let retryAt = 0;
  while (!stopped()) {
    if (Date.now() < retryAt) { await pause(2000); continue; }
    try {
      // Prima il journal: dopo un crash ACA puo essere fermo e non rispondere via HTTP.
      const state = lastCheck ? await maintenance.state() : null;
      const request = JSON.stringify(state?.checkRequest ?? null);
      if (!lastCheck || request !== lastRequest || Date.now() - lastCheck >= target.checkIntervalMs) {
        outcome = await checkHaos({ target, directory, maintenance, adapter, check });
        if (JSON.stringify(outcome) !== previous) log(outcome);
        previous = JSON.stringify(outcome);
        if (outcome.action === 'recovery-required' && outcome.phase !== 'preflight') return outcome;
        retryAt = outcome.action === 'recovery-required' ? Date.now() + 30000 : 0;
        lastCheck = outcome.action === 'recovery-required' ? 0 : Date.now(); lastRequest = request;
      }
    } catch {
      outcome = { action: 'unavailable', reason: 'haos-prerequisites-or-recovery-required' };
      if (JSON.stringify(outcome) !== previous) log(outcome);
      previous = JSON.stringify(outcome); lastCheck = 0; retryAt = Date.now() + 30000;
    }
    if (!stopped()) await pause(2000);
  }
  return outcome;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { target, token } = await waitForHaosConfiguration();
    const supervisor = createSupervisorUpdateClient({ token: process.env.SUPERVISOR_TOKEN });
    const self = await supervisor.self();
    if (self.slug !== '9960cdb4_acasystem_updater' || self.hassio_role !== 'manager' || self.protected !== false || self.docker_api !== true) fail();
    const maintenance = createAcaMaintenanceClient({ baseUrl: `http://${target.slug.replaceAll('_', '-')}:3002/`, token });
    const imageAuthority = createSupervisorImageAuthority({ slug: target.slug, containerName: target.containerName, socketPath: '/run/docker.sock' });
    const directory = await prepareHaosRuntime();
    const adapter = createSupervisorUpdateAdapter({ directory, targetId: target.targetId, slug: target.slug,
      supervisor, maintenance, imageAuthority, shellVersion: target.shellVersion });
    let stopping = false;
    process.on('SIGTERM', () => { stopping = true; }); process.on('SIGINT', () => { stopping = true; });
    const result = await monitorHaos({ target, directory, maintenance, adapter, stopped: () => stopping });
    if (result?.action === 'recovery-required') process.exitCode = 1;
  } catch {
    console.error('Executor HAOS non avviato: verificare predisposizione e privilegi dalla console locale.');
    process.exitCode = 1;
  }
}
