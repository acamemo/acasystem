import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readZip } from '../../client/shared/packaging/zipReader.ts';
import { writeZip } from '../../client/scripts/zipWriter.ts';
import { parseManifest } from '../../client/core/src/manifest.ts';
import { compare, parseDistribution } from './update-policy.mjs';
import { SONOFF } from '../bootstrap/materials.mjs';
import { verifyPilotArchive } from './prepare-pilot.mjs';
import { executorCandidate } from './executor-materials.mjs';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const imagePattern = /^ghcr\.io\/acamemo\/acasystem@sha256:[a-f0-9]{64}$/;
const registry = 'https://ghcr.io/v2/acamemo/acasystem';

async function registryToken(fetcher) {
  const response = await fetcher('https://ghcr.io/token?service=ghcr.io&scope=repository:acamemo/acasystem:pull', {
    redirect: 'error', signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error('Immagine non leggibile anonimamente');
  const { token } = await response.json();
  if (typeof token !== 'string' || !token) throw new Error('Token pubblico registry assente');
  return token;
}

/** Nessuna sovrascrittura: si accetta soltanto MANIFEST_UNKNOWN dal registry ufficiale pubblico. */
export async function checkRegistryTagAbsent(appVersion, { fetcher = fetch } = {}) {
  if (!/^\d+\.\d+\.\d+\.[1-9]\d{0,2}$/.test(appVersion ?? '')) throw new Error('Revisione immagine non valida');
  const token = await registryToken(fetcher);
  const response = await fetcher(`${registry}/manifests/${appVersion}`, { redirect: 'error', signal: AbortSignal.timeout(60000), headers: {
    Authorization: `Bearer ${token}`, Accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json',
  } });
  if (response.status !== 404) throw new Error('Tag GHCR esistente o collisione non verificabile; usare una nuova appVersion');
  const error = await response.json();
  if (!Array.isArray(error.errors) || error.errors.length !== 1 || error.errors[0].code !== 'MANIFEST_UNKNOWN') {
    throw new Error('Assenza del tag GHCR non verificata');
  }
  return { absent: true, appVersion };
}

/** Non estende automaticamente la compatibilità del solo Core osservato sul banco. */
export function validateTarget(target) {
  if (target?.schema !== 1 || target.channel !== 'bank' || target.runtime !== 'container' ||
    target.qualification !== 'candidate-not-target-tested' || !/^\d+\.\d+\.\d+$/.test(target.version ?? '') ||
    !target.appVersion?.startsWith(target.version + '.') || !/^[1-9]\d{0,2}$/.test(target.appVersion.slice(target.version.length + 1)) ||
    !/^\d+\.\d+$/.test(target.haosVersion ?? '') || !/^\d+\.\d+\.\d+$/.test(target.coreVersion ?? '') ||
    target.compatibility?.core?.min !== target.coreVersion) throw new Error('Target bank candidato non valido; stable richiede qualifica separata');
  for (const name of ['core', 'upgradeFrom']) {
    const range = target.compatibility?.[name];
    if (!/^\d+\.\d+\.\d+$/.test(range?.min ?? '') || !/^\d+\.\d+\.\d+$/.test(range?.maxExclusive ?? '') ||
      compare(range.min, range.maxExclusive) >= 0) throw new Error(`Intervallo ${name} mancante o non valido`);
  }
  return target;
}

async function publicBytes(url, fetcher, headers = {}) {
  let response = await fetcher(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(60000) });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const next = new URL(response.headers.get('location'), url);
    if (next.protocol !== 'https:' || !(next.hostname === 'ghcr.io' || next.hostname.endsWith('.githubusercontent.com'))) {
      throw new Error('Redirect download non ufficiale');
    }
    // Nessuna autorizzazione è trasferita al CDN.
    response = await fetcher(next.href, { redirect: 'error', signal: AbortSignal.timeout(60000) });
  }
  if (!response.ok) throw new Error(`Download pubblico fallito (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

/** Verifica i byte del manifest OCI e del config dal registry anonimo, non un imageID locale. */
export async function verifyRegistryImage(image, expected, { fetcher = fetch } = {}) {
  if (!imagePattern.test(image)) throw new Error('Richiesto il digest immutabile GHCR');
  const token = await registryToken(fetcher);
  const digest = image.split('@')[1];
  const raw = await publicBytes(`${registry}/manifests/${digest}`, fetcher, {
    Authorization: `Bearer ${token}`, Accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json',
  });
  if (`sha256:${sha256(raw)}` !== digest) throw new Error('Digest manifest registry non corrispondente');
  const manifest = JSON.parse(raw);
  if (!/^sha256:[a-f0-9]{64}$/.test(manifest.config?.digest ?? '') || !Array.isArray(manifest.layers)) {
    throw new Error('Richiesta una singola immagine amd64, non un indice OCI');
  }
  const configBytes = await publicBytes(`${registry}/blobs/${manifest.config.digest}`, fetcher, { Authorization: `Bearer ${token}` });
  if (`sha256:${sha256(configBytes)}` !== manifest.config.digest) throw new Error('Digest config registry non corrispondente');
  const config = JSON.parse(configBytes);
  const labels = config.config?.Labels;
  if (config.architecture !== 'amd64' || config.os !== 'linux' || labels?.['org.acasystem.source.sha256'] !== expected.sourceSha256 ||
    labels?.['org.opencontainers.image.version'] !== expected.appVersion || labels?.['io.hass.version'] !== expected.appVersion ||
    !config.config?.Env?.includes(`ACASYSTEM_VERSION=${expected.version}`)) throw new Error('Immagine/versione/provenienza registry non coerenti');
  if (expected.executorSourceSha256 && labels?.['org.acasystem.executor.sha256'] !== expected.executorSourceSha256) {
    throw new Error('Runtime executor registry non coerente con i materiali');
  }
  return { image, manifestSha256: sha256(raw), configSha256: sha256(configBytes), anonymous: true };
}

export async function releaseAssets(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.name)) throw new Error('Nome asset non valido');
    const bytes = await readFile(join(directory, entry.name));
    files.push({ name: entry.name, size: bytes.length, sha256: sha256(bytes), bytes });
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/** Confronto con i file nell'immagine finale senza avviare alcun processo del prodotto. */
export async function verifyImageBundle(image, directory, bundle, { run = execFileSync } = {}) {
  const work = await mkdtemp(join(tmpdir(), 'aca-release-image-'));
  let container;
  try {
    container = String(run('docker', ['create', image], { encoding: 'utf8' })).trim();
    run('docker', ['cp', `${container}:/app/client-bundle/manifest.json`, join(work, 'manifest.json')]);
    run('docker', ['cp', `${container}:/app/client-bundle/${bundle.archive.name}`, join(work, bundle.archive.name)]);
    if (!Buffer.from(await readFile(join(directory, 'manifest.json'))).equals(await readFile(join(work, 'manifest.json'))) ||
      sha256(await readFile(join(work, bundle.archive.name))) !== bundle.archive.sha256) throw new Error('Immagine e bundle pubblicabile non identici');
  } finally {
    if (container) run('docker', ['rm', container]);
    const actual = await realpath(work);
    if (dirname(actual) !== await realpath(tmpdir()) || !basename(actual).startsWith('aca-release-image-')) throw new Error('Directory temporanea inattesa');
    await rm(actual, { recursive: true, force: true });
  }
}

/** distribution.json compare soltanto dopo verifica registry, sorgenti e bundle reali. */
export async function sealRelease({ directory, target, image, sourceCommit, root, verifyRegistry = verifyRegistryImage, verifyBundle = verifyImageBundle }) {
  validateTarget(target);
  if (!/^[a-f0-9]{40}$/.test(sourceCommit ?? '')) throw new Error('Commit sorgente completo richiesto');
  const proof = JSON.parse(await readFile(join(directory, 'SOURCE-PROVENANCE.json'), 'utf8'));
  if (proof.version !== target.version || proof.sourceCommit !== sourceCommit || proof.sourceWorktree !== 'clean' ||
    !/^[a-f0-9]{64}$/.test(proof.sourceSha256 ?? '')) throw new Error('Provenienza sorgenti incompleta, modificata o diversa dal commit richiesto');
  const bundle = parseManifest(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')));
  const candidate = parseDistribution({ schema: 1, ...target, tag: `v${target.appVersion}`, image, bundle });
  if (!candidate) throw new Error('Distribuzione/bounds/bundle non coerenti');
  const web = await readFile(join(directory, bundle.archive.name));
  if (web.length !== bundle.archive.size || sha256(web) !== bundle.archive.sha256) throw new Error('Checksum/dimensioni bundle non corrispondenti');
  readZip(web);
  const registryProof = await verifyRegistry(image, { ...target, sourceSha256: proof.sourceSha256,
    executorSourceSha256: proof.generatedImageTools?.executorSourceSha256 });
  await verifyBundle(image, directory, bundle);
  const installation = JSON.parse(await readFile(join(directory, 'installation.json'), 'utf8'));
  if (installation.version !== target.version || installation.appVersion !== target.appVersion ||
    installation.haosVersion !== target.haosVersion || installation.coreVersion !== target.coreVersion) throw new Error('Bootstrap di una candidata diversa');
  if (sha256(await readFile(join(directory, SONOFF.name))) !== SONOFF.sha256) throw new Error('Archivio Sonoff diverso dalla sorgente verificata');
  const { entries: kit, proof: kitProof } = verifyPilotArchive(await readFile(join(directory, `acasystem-pilot-candidate-${target.appVersion}.zip`)));
  if (proof.generatedImageTools?.executorSourceSha256) {
    const executor = await executorCandidate(target.appVersion);
    const embedded = kit.find(entry => entry.path === executor.name);
    if (executor.imageRuntimeSha256 !== proof.generatedImageTools.executorSourceSha256 ||
      !embedded || !Buffer.from(embedded.data).equals(executor.archive) ||
      !(await readFile(join(directory, executor.name))).equals(executor.archive)) throw new Error('Executor, immagine e kit di release differenti');
  }
  if (!kitProof?.client || kitProof.purpose !== 'single-candidate-kit-not-target-tested' ||
    kitProof.version !== target.version || kitProof.appVersion !== target.appVersion || kitProof.sourceCommit !== sourceCommit ||
    kitProof.sourceWorktree !== 'clean' || kitProof.runtimeSourceSha256 !== proof.sourceSha256) throw new Error('Kit completo/client/provenienza della candidata mancanti');
  for (const entry of kit.filter(({ path }) => path.startsWith('bootstrap/'))) {
    if (!Buffer.from(entry.data).equals(await readFile(join(directory, entry.path.slice('bootstrap/'.length))))) throw new Error('Kit e bootstrap di release differenti');
  }
  for (const entry of kit.filter(({ path }) => path.startsWith('pilot/') || path === 'Start.cmd' || path === 'LICENSE')) {
    const source = entry.path === 'LICENSE' ? join(root, 'progetto/acasystem/LICENSE') :
      join(root, 'progetto/ha-app/pilot', entry.path.replace(/^pilot\//, ''));
    if (!Buffer.from(entry.data).equals(await readFile(source))) throw new Error('Kit e strumenti del commit sorgente differenti');
  }
  const sourceEntries = readZip(await readFile(join(directory, `acasystem-src-${target.appVersion}.zip`)));
  if (!sourceEntries.some(({ path, data }) => path.endsWith('/SOURCE-PROVENANCE.json') &&
    sha256(data) === sha256(Buffer.from(JSON.stringify(proof, null, 2) + '\n')))) throw new Error('Sorgenti immagine/provenienza non coerenti');
  // Anche il codice dei client e della pipeline è nel sorgente della stessa revisione pubblicata.
  if (String(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' })).trim() !== sourceCommit ||
    String(execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' })).trim()) throw new Error('Checkout sorgente modificato durante la build');
  const catalog = [];
  for (const name of ['repository.yaml', 'acasystem/config.yaml', 'acasystem/DOCS.md', 'acasystem/CHANGELOG.md', 'acasystem/icon.png', 'acasystem/logo.png']) {
    catalog.push({ name, data: await readFile(join(directory, 'repository', name)) });
  }
  const catalogConfig = catalog.find(file => file.name === 'acasystem/config.yaml').data.toString('utf8');
  if (!catalogConfig.includes(`version: "${target.appVersion}"`) || !/^image: ghcr\.io\/acamemo\/acasystem\s*$/m.test(catalogConfig) ||
    catalogConfig.includes('__VERSION__')) throw new Error('Catalogo candidato non coerente con la release');
  await writeFile(join(directory, `acasystem-haos-catalog-candidate-${target.appVersion}.zip`), writeZip(catalog), { flag: 'wx' });
  const fullSources = execFileSync('git', ['-C', root, 'archive', '--format=zip', sourceCommit], { maxBuffer: 300 * 1024 * 1024 });
  await writeFile(join(directory, `acasystem-full-source-${target.appVersion}.zip`), fullSources, { flag: 'wx' });
  await writeFile(join(directory, 'distribution.json'), jsonBytes({ ...candidate,
    qualification: target.qualification, sourceRepository: 'https://github.com/acamemo/acasystem', sourceCommit,
  }), { flag: 'wx' });
  await writeFile(join(directory, 'RELEASE-PROVENANCE.json'), jsonBytes({ schema: 1,
    sourceRepository: 'https://github.com/acamemo/acasystem', sourceCommit, sourceSha256: proof.sourceSha256,
    build: target.build ?? null,
    qualification: target.qualification, registry: registryProof,
    assets: (await releaseAssets(directory)).filter(({ name }) => name !== 'SHA256SUMS').map(({ bytes, ...record }) => record),
  }), { flag: 'wx' });
  await writeFile(join(directory, 'SHA256SUMS'), (await releaseAssets(directory)).filter(({ name }) => name !== 'SHA256SUMS')
    .map(({ name, sha256 }) => `${sha256}  ${name}`).join('\n') + '\n');
  return candidate;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: Object.fromEntries(['target', 'directory', 'image', 'source-commit', 'root'].map((name) => [name, { type: 'string' }])) });
  console.log(JSON.stringify(await sealRelease({ directory: resolve(values.directory), target: JSON.parse(await readFile(values.target, 'utf8')),
    image: values.image, sourceCommit: values['source-commit'], root: resolve(values.root ?? '.') }), null, 2));
}
