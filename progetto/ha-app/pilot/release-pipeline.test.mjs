import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { test } from 'node:test';
import { writeZip } from '../../client/scripts/zipWriter.ts';
import { readZip } from '../../client/shared/packaging/zipReader.ts';
import { bootstrapMaterials } from '../bootstrap/materials.mjs';
import { preparePilot, verifyPilotArchive } from './prepare-pilot.mjs';
import { checkRegistryTagAbsent, releaseAssets, sealRelease, sha256, validateTarget, verifyImageBundle, verifyRegistryImage } from './release-artifacts.mjs';
import { publishRelease } from './publish-release.mjs';

const target = JSON.parse(await readFile(new URL('release-target.json', import.meta.url), 'utf8'));
const json = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
async function removeTemp(directory) {
  const actual = await realpath(directory);
  assert.equal(dirname(actual), await realpath(tmpdir())); assert.ok(basename(actual).startsWith('aca-'));
  await rm(actual, { recursive: true, force: true });
}
const sonoffArchive = process.env.ACA_TEST_SONOFF_ARCHIVE;
const fixtureSource = sha256('fixture-source-only-not-a-production-image');
const fixtureImage = (change = {}) => {
  const config = json({ architecture: 'amd64', os: 'linux', config: { Labels: {
    'org.acasystem.source.sha256': fixtureSource, 'org.opencontainers.image.version': target.appVersion, 'io.hass.version': target.appVersion,
  }, Env: [`ACASYSTEM_VERSION=${target.version}`] }, ...change });
  const manifest = json({ schemaVersion: 2, config: { digest: 'sha256:' + sha256(config) }, layers: [] });
  return { config, manifest, image: 'ghcr.io/acamemo/acasystem@sha256:' + sha256(manifest) };
};

test('target candidato bank non autorizza stable o intervalli inventati/invertiti', () => {
  assert.equal(validateTarget(target).appVersion, '0.9.73.1');
  for (const change of [{ channel: 'stable' }, { runtime: 'haos' }, { appVersion: '0.9.73.latest' },
    { qualification: 'target-tested' }, { compatibility: {} },
    { compatibility: { ...target.compatibility, core: { min: '2026.9.4', maxExclusive: '2026.9.4' } } }]) {
    assert.throws(() => validateTarget({ ...target, ...change }));
  }
});

test('registry verifica digest dai byte, sorgente/versioni/amd64; redirect non riceve token', async () => {
  const fixture = fixtureImage();
  const calls = [];
  const fetcher = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.startsWith('https://ghcr.io/token?')) return Response.json({ token: 'anonymous-fixture-token' });
    if (url.includes('/manifests/')) return new Response(fixture.manifest);
    if (url.includes('/blobs/')) return new Response(null, { status: 302, headers: { location: 'https://pkg-containers.githubusercontent.com/fixture-config' } });
    return new Response(fixture.config);
  };
  const proof = await verifyRegistryImage(fixture.image, { ...target, sourceSha256: fixtureSource }, { fetcher });
  assert.equal(proof.anonymous, true);
  assert.equal(proof.manifestSha256, sha256(fixture.manifest));
  assert.equal(calls.at(-1).options.headers, undefined);
  await assert.rejects(verifyRegistryImage(fixture.image, { ...target, sourceSha256: sha256('different-source') }, { fetcher }), /non coerenti/);
  await assert.rejects(verifyRegistryImage(fixture.image.replace(/.$/, fixture.image.endsWith('0') ? '1' : '0'), { ...target, sourceSha256: fixtureSource }, { fetcher }), /Digest manifest/);
  await assert.rejects(verifyRegistryImage(fixture.image, { ...target, sourceSha256: fixtureSource, executorSourceSha256: 'c'.repeat(64) }, { fetcher }), /Runtime executor/);
  await assert.rejects(verifyRegistryImage('ghcr.io/acamemo/acasystem:latest', target, { fetcher }), /digest immutabile/);
});

test('registry rifiuta indice OCI e redirect estraneo', async () => {
  const index = json({ schemaVersion: 2, manifests: [] });
  await assert.rejects(verifyRegistryImage('ghcr.io/acamemo/acasystem@sha256:' + sha256(index), target, { fetcher: async (url) =>
    url.includes('/token?') ? Response.json({ token: 'fixture' }) : new Response(index) }), /non un indice/);
  await assert.rejects(verifyRegistryImage(fixtureImage().image, target, { fetcher: async (url) =>
    url.includes('/token?') ? Response.json({ token: 'fixture' }) : new Response(null, { status: 302, headers: { location: 'https://other.invalid/fixture' } }) }), /non ufficiale/);
});

test('tag GHCR già presente, errore auth/rete o 404 ambiguo non autorizzano un push', async () => {
  const service = (status, body) => async url => url.includes('/token?') ? Response.json({ token: 'anonymous-fixture' }) : Response.json(body, { status });
  assert.equal((await checkRegistryTagAbsent(target.appVersion, { fetcher: service(404, { errors: [{ code: 'MANIFEST_UNKNOWN' }] }) })).absent, true);
  for (const [status, body] of [[200, {}], [401, { errors: [{ code: 'UNAUTHORIZED' }] }], [500, {}], [404, { errors: [{ code: 'NAME_UNKNOWN' }] }], [404, {}]]) {
    await assert.rejects(checkRegistryTagAbsent(target.appVersion, { fetcher: service(status, body) }));
  }
  await assert.rejects(checkRegistryTagAbsent(target.appVersion, { fetcher: async () => { throw new Error('offline fixture'); } }));
});

test('il bundle estratto dall’immagine finale deve essere esatto, senza avviare il container', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aca-bundle-image-test-'));
  try {
    const web = writeZip([{ name: 'index.html', data: 'fixture UI' }]);
    const bundle = { schema: 1, version: target.version, minServer: target.version, minShell: '0.1.0',
      archive: { name: `acasystem-web-${target.version}.zip`, size: web.length, sha256: sha256(web) } };
    await writeFile(join(directory, 'manifest.json'), json(bundle));
    await writeFile(join(directory, bundle.archive.name), web);
    const actions = [];
    let corrupt = false;
    const run = (_command, args) => {
      actions.push(args[0]);
      if (args[0] === 'create') return 'fixture-container';
      if (args[0] === 'cp') {
        const name = args[1].split('/').at(-1);
        copyFileSync(join(directory, name), args[2]);
        if (corrupt && name === 'manifest.json') copyFileSync(join(directory, bundle.archive.name), args[2]);
      }
      return '';
    };
    await verifyImageBundle(fixtureImage().image, directory, bundle, { run });
    corrupt = true;
    await assert.rejects(verifyImageBundle(fixtureImage().image, directory, bundle, { run }), /non identici/);
    assert.deepEqual(actions, ['create', 'cp', 'cp', 'rm', 'create', 'cp', 'cp', 'rm']);
  } finally { await removeTemp(directory); }
});

test('kit unico contiene client/setup/bootstrap reali e checksum; niente sovrascritture', { skip: !sonoffArchive && 'Impostare ACA_TEST_SONOFF_ARCHIVE all’archivio originale verificato' }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aca-pilot-kit-test-'));
  try {
    const client = join(directory, 'Client-fixture.exe');
    await writeFile(client, 'MZ fixture test only, not an executable');
    const output = join(directory, 'kit');
    const result = await preparePilot({ ...target, output, windowsClient: client, sonoffArchive });
    const archive = await readFile(join(output, result.name));
    const { entries, proof } = verifyPilotArchive(archive);
    assert.equal(proof.client.sha256, sha256(await readFile(client)));
    for (const name of ['Start.cmd', 'pilot/Start-AcaPilotSetup.ps1', 'pilot/haos-image.json', 'pilot/COLLAUDO.md', 'pilot/Test-AcaVirtualBoxStability.ps1', 'pilot/VM-STABILITY.md', 'bootstrap/installation.json', 'client/Client-fixture.exe', `acasystem-executor-candidate-${target.appVersion}.zip`]) {
      assert.ok(entries.some(({ path }) => path === name), name);
    }
    const modified = entries.map(({ path: name, data }) => ({ name, data: name.endsWith('Client-fixture.exe') ? 'modified fixture' : data }));
    assert.throws(() => verifyPilotArchive(writeZip(modified)), /diverso dalla provenienza/);
    await assert.rejects(preparePilot({ ...target, output, windowsClient: client, sonoffArchive }), /EEXIST/);
  } finally { await removeTemp(directory); }
});

test('kit senza client è rifiutato prima di produrre output', async () => {
  await assert.rejects(preparePilot({ ...target, output: join(tmpdir(), 'not-created-pilot-test') }), /windows-client/);
});

async function sealedFixture(directory) {
  const source = join(directory, 'source');
  const output = join(directory, 'release');
  await mkdir(source); await mkdir(output);
  execFileSync('git', ['init', source], { stdio: 'ignore' });
  await writeFile(join(source, 'README.md'), 'fixture committed source');
  const setup = ['New-AcaPilotVm.ps1', 'Invoke-AcaBootstrap.ps1', 'Test-AcaPilotHost.ps1', 'native-process.ps1',
    'Start-AcaPilotSetup.ps1', 'haos-image.json', 'README.md', 'Start-AcaVirtualBoxSetup.ps1', 'haos-virtualbox-image.json', 'VIRTUALBOX.md', 'UPDATES.md', 'COLLAUDO.md', 'Test-AcaVirtualBoxStability.ps1', 'VM-STABILITY.md'];
  const sourceMaterials = new Map(setup.map(name => [`pilot/${name}`, Buffer.from(`fixture committed setup ${name}`)]));
  sourceMaterials.set('Start.cmd', Buffer.from('fixture committed start'));
  sourceMaterials.set('LICENSE', Buffer.from('fixture license'));
  for (const [path, bytes] of sourceMaterials) {
    const output = path === 'LICENSE' ? join(source, 'progetto/acasystem/LICENSE') : join(source, 'progetto/ha-app/pilot', path.replace(/^pilot\//, ''));
    await mkdir(dirname(output), { recursive: true }); await writeFile(output, bytes);
  }
  execFileSync('git', ['-C', source, 'add', '.']);
  execFileSync('git', ['-C', source, '-c', 'user.name=Release fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture'], { stdio: 'ignore' });
  const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const proof = { schema: 1, version: target.version, sourceCommit: commit, sourceWorktree: 'clean', sourceSha256: fixtureSource };
  const archive = writeZip([{ name: 'index.html', data: 'fixture web UI' }]);
  const bundle = { schema: 1, version: target.version, minServer: target.version, minShell: '0.1.0',
    archive: { name: `acasystem-web-${target.version}.zip`, sha256: sha256(archive), size: archive.length } };
  await writeFile(join(output, 'SOURCE-PROVENANCE.json'), json(proof));
  await writeFile(join(output, 'manifest.json'), json(bundle));
  await writeFile(join(output, bundle.archive.name), archive);
  await writeFile(join(output, `acasystem-src-${target.appVersion}.zip`), writeZip([{ name: 'src/SOURCE-PROVENANCE.json', data: json(proof) }]));
  const bootstrap = await bootstrapMaterials({ ...target, sonoffArchive });
  for (const [name, data] of bootstrap) await writeFile(join(output, name), data);
  for (const name of ['repository.yaml', 'acasystem/config.yaml', 'acasystem/DOCS.md', 'acasystem/CHANGELOG.md', 'acasystem/icon.png', 'acasystem/logo.png']) {
    const path = join(output, 'repository', name); await mkdir(dirname(path), { recursive: true });
    await writeFile(path, name.endsWith('config.yaml') ? `version: "${target.appVersion}"\nimage: ghcr.io/acamemo/acasystem\n` : `fixture catalog ${name}`);
  }
  const kitFiles = [...bootstrap].map(([name, data]) => ({ name: `bootstrap/${name}`, data }));
  kitFiles.push(...[...sourceMaterials].map(([name, data]) => ({ name, data })));
  kitFiles.push({ name: 'client/Client-fixture.exe', data: Buffer.from('MZ fixture') });
  const records = kitFiles.map(({ name, data }) => ({ name, size: data.length, sha256: sha256(data) }));
  kitFiles.push({ name: 'MATERIAL-PROVENANCE.json', data: json({ schema: 1, version: target.version, appVersion: target.appVersion,
    purpose: 'single-candidate-kit-not-target-tested', sourceCommit: commit, sourceWorktree: 'clean',
    runtimeSourceSha256: fixtureSource,
    client: records.at(-1), files: records }) });
  kitFiles.push({ name: 'SHA256SUMS', data: kitFiles.map(({ name, data }) => `${sha256(data)}  ${name}\n`).join('') });
  await writeFile(join(output, `acasystem-pilot-candidate-${target.appVersion}.zip`), writeZip(kitFiles));
  const image = fixtureImage().image;
  const options = { directory: output, target, root: source, sourceCommit: commit, image,
    verifyRegistry: async () => ({ image, anonymous: true, validation: 'isolated-fixture-only' }), verifyBundle: async () => {} };
  return { output, options, commit };
}

test('seal lega sorgenti git reali e asset coerenti; file modificati non producono distribution.json', { skip: !sonoffArchive }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aca-seal-test-'));
  try {
    const fixture = await sealedFixture(directory);
    const candidate = await sealRelease(fixture.options);
    assert.equal(candidate.runtime, 'container');
    const assets = await releaseAssets(fixture.output);
    const proof = JSON.parse(assets.find(({ name }) => name === 'RELEASE-PROVENANCE.json').bytes);
    assert.equal(proof.sourceCommit, fixture.commit);
    const fullSource = readZip(assets.find(({ name }) => name.startsWith('acasystem-full-source-')).bytes);
    assert.equal(Buffer.from(fullSource.find(({ path }) => path === 'README.md').data).toString(), 'fixture committed source');
    await assert.rejects(sealRelease(fixture.options), /EEXIST/);
  } finally { await removeTemp(directory); }
  const second = await mkdtemp(join(tmpdir(), 'aca-seal-invalid-test-'));
  try {
    const fixture = await sealedFixture(second);
    await writeFile(join(fixture.output, `acasystem-web-${target.version}.zip`), 'corrupted fixture');
    await assert.rejects(sealRelease(fixture.options), /Checksum/);
    assert.ok(!(await releaseAssets(fixture.output)).some(({ name }) => name === 'distribution.json'));
  } finally { await removeTemp(second); }
});

function fakeReleaseService(assets, { corruptPublic = false, collision = false } = {}) {
  const uploaded = new Map();
  const patches = [];
  const authDestinations = [];
  return { patches, authDestinations, fetcher: async (url, options = {}) => {
    const address = new URL(url);
    if (options.headers?.Authorization) authDestinations.push(address.hostname);
    if (address.pathname.endsWith('/acasystem-releases')) return Response.json({ private: false, full_name: 'acamemo/acasystem-releases' });
    if (address.pathname.includes('/releases/tags/')) return new Response(null, { status: collision ? 200 : 404 });
    if (options.method === 'POST' && address.hostname === 'api.github.com') return Response.json({ id: 100, draft: true });
    if (options.method === 'POST') {
      const name = address.searchParams.get('name');
      const asset = assets.find((entry) => entry.name === name);
      const id = uploaded.size + 1;
      uploaded.set(id, asset);
      return Response.json({ id, name, size: asset.size, digest: 'sha256:' + asset.sha256 });
    }
    if (options.method === 'PATCH') { patches.push(JSON.parse(options.body)); return Response.json({ id: 100 }); }
    if (address.pathname.includes('/releases/assets/')) return new Response(uploaded.get(Number(address.pathname.split('/').at(-1))).bytes);
    const asset = assets.find((entry) => entry.name === address.pathname.split('/').at(-1));
    return new Response(corruptPublic ? 'corrupted CDN fixture' : asset.bytes);
  } };
}

test('publisher verifica bozza e CDN anonimo; collisioni rifiutate, errore pubblico riporta in bozza', { skip: !sonoffArchive }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aca-publisher-test-'));
  try {
    const fixture = await sealedFixture(directory);
    await sealRelease(fixture.options);
    const assets = await releaseAssets(fixture.output);
    const service = fakeReleaseService(assets);
    const result = await publishRelease({ directory: fixture.output, token: 'fixture-not-a-secret', fetcher: service.fetcher });
    assert.equal(result.catalogUpdated, false);
    assert.equal(result.prerelease, true);
    assert.equal(service.patches.length, 1);
    assert.ok(service.authDestinations.every((host) => ['api.github.com', 'uploads.github.com'].includes(host)));
    const corrupted = fakeReleaseService(assets, { corruptPublic: true });
    await assert.rejects(publishRelease({ directory: fixture.output, token: 'fixture-not-a-secret', fetcher: corrupted.fetcher }), /riportata in bozza/);
    assert.deepEqual(corrupted.patches.map(({ draft }) => draft), [false, true]);
    const collision = fakeReleaseService(assets, { collision: true });
    await assert.rejects(publishRelease({ directory: fixture.output, token: 'fixture-not-a-secret', fetcher: collision.fetcher }), /collisione/);
    assert.equal(collision.patches.length, 0);
    await assert.rejects(publishRelease({ directory: fixture.output }), /ACA_RELEASES_TOKEN/);
  } finally { await removeTemp(directory); }
});
