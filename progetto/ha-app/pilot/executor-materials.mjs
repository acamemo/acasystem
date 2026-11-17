import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { writeZip } from '../../client/scripts/zipWriter.ts';
import { sourceSnapshot } from '../source-provenance.mjs';

export const executorRuntimePaths = [
  ...['haos-update.mjs', 'haos-provision.mjs', 'update-policy.mjs', 'update-transaction.mjs', 'supervisor-update-adapter.mjs', 'supervisor-image-authority.mjs'].map(name => `progetto/ha-app/pilot/${name}`),
  'progetto/client/core/src/manifest.ts', 'progetto/client/core/src/version.ts',
];
export const executorImagePaths = [...executorRuntimePaths, 'progetto/ha-app/image/update-environment.mjs', 'progetto/ha-app/image/run.sh', 'progetto/ha-app/executor-candidate/prepare-haos-executor.sh'];
const candidatePaths = ['config.yaml.in', 'prepare-haos-executor.sh', 'README.md'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export async function executorCandidate(appVersion, frozen) {
  if (!/^\d+\.\d+\.\d+(\.[1-9]\d{0,2})?$/.test(appVersion ?? '')) throw new Error('Versione app richiesta per executor');
  const paths = [...executorImagePaths, ...candidatePaths.map(name => `progetto/ha-app/executor-candidate/${name}`)];
  const files = frozen ?? new Map(await Promise.all(paths.map(async name =>
    [name, await readFile(new URL('../../../' + name, import.meta.url))])));
  const snapshot = sourceSnapshot(executorImagePaths.map(name => ({ name, data: files.get(name) })));
  const entries = candidatePaths.map(name => ({ name: name === 'config.yaml.in' ? 'acasystem_updater/config.yaml' : name,
    data: Buffer.from(files.get(`progetto/ha-app/executor-candidate/${name}`).toString('utf8').replaceAll('__VERSION__', appVersion).replaceAll('\r\n', '\n')) }));
  entries.push({ name: 'EXECUTOR-PROVENANCE.json', data: Buffer.from(JSON.stringify({ schema: 1, appVersion,
    image: `ghcr.io/acamemo/acasystem:${appVersion}`, imageRuntimeSha256: snapshot.sha256,
    activation: 'explicit-target-only-not-activated', privileges: { hassio_role: 'manager', docker_api: true, protectionModeOffRequired: true },
    files: snapshot.files.map(({ name, data }) => ({ name, sha256: sha256(data) })),
  }, null, 2) + '\n') });
  entries.push({ name: 'SHA256SUMS', data: Buffer.from(entries.map(({ name, data }) => `${sha256(data)}  ${name}`).join('\n') + '\n') });
  return { name: `acasystem-executor-candidate-${appVersion}.zip`, archive: writeZip(entries), imageRuntimeSha256: snapshot.sha256 };
}
