import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkPublications, parseDistribution, selectUpdate } from './update-policy.mjs';

const installed = { version: '0.9.72', appVersion: '0.9.72.99', haosVersion: '18.4', coreVersion: '2026.9.4', supervisorVersion: '2026.9.0', shellVersion: '0.1.0' };
const publication = (version = '0.9.73', change = {}) => ({
  release: { tag_name: `v${version}`, draft: false, prerelease: false },
  distribution: {
    schema: 1, version, appVersion: version, tag: `v${version}`, channel: 'stable',
    image: 'ghcr.io/acamemo/acasystem@sha256:' + 'a'.repeat(64),
    bundle: { schema: 1, version, minServer: version, minShell: '0.1.0', archive: { name: `acasystem-web-${version}.zip`, sha256: 'b'.repeat(64), size: 100 } },
    compatibility: { haos: { min: '18.4', maxExclusive: '19.0' }, core: { min: '2026.9.4', maxExclusive: '2026.10.0' }, supervisor: { min: '2026.9.0', maxExclusive: '2026.12.0' }, upgradeFrom: { min: '0.9.34', maxExclusive: '0.9.74' } },
    ...change,
  },
});
test('nessun downgrade dalla .72 alla pubblica .34, nessun aggiornamento uguale', () => {
  assert.equal(selectUpdate(installed, [publication('0.9.34'), publication('0.9.72')], 'stable').action, 'keep');
});
test('sceglie la piu recente compatibile senza fidarsi di ordine o data', () => {
  const invalid = publication('0.9.80'); invalid.distribution.bundle.minShell = '0.2.0';
  assert.equal(selectUpdate(installed, [publication('0.9.73'), invalid, publication('0.9.74')], 'stable').publication.version, '0.9.74');
});
test('separa stable, prerelease e canale bank', () => {
  const bank = publication('0.9.74', { channel: 'bank' }); bank.release.prerelease = true;
  assert.equal(selectUpdate(installed, [bank], 'stable').action, 'keep');
  assert.equal(selectUpdate(installed, [bank], 'bank').publication.version, '0.9.74');
  const draft = publication(); draft.release.draft = true;
  assert.equal(selectUpdate(installed, [draft], 'stable').action, 'keep');
});
test('rifiuta combinazioni OS/Core/Supervisor non compatibili senza aggiornarle', () => {
  for (const [key, value] of [['haosVersion', '19.0'], ['coreVersion', '2026.10.0'], ['supervisorVersion', '2026.12.0']]) {
    assert.equal(selectUpdate({ ...installed, [key]: value }, [publication()], 'stable').action, 'keep');
  }
});
test('contratto esige digest GHCR, tag, backend e bundle coerenti', () => {
  for (const change of [{ image: 'ghcr.io/other/image@sha256:' + 'a'.repeat(64) }, { image: 'ghcr.io/acamemo/acasystem:latest' }, { appVersion: '0.9.72.100' }, { tag: 'v0.9.34' }]) {
    assert.equal(parseDistribution(publication('0.9.73', change).distribution), null);
  }
  const mismatch = publication(); mismatch.distribution.bundle.version = '0.9.72';
  assert.equal(parseDistribution(mismatch.distribution), null);
  const tagMismatch = publication(); tagMismatch.release.tag_name = 'v0.9.99';
  assert.equal(selectUpdate(installed, [tagMismatch], 'stable').action, 'keep');
});
test('confronta anche la revisione HAOS senza arretrare il backend', () => {
  const revised = publication('0.9.72', { appVersion: '0.9.72.100', tag: 'v0.9.72.100' }); revised.release.tag_name = 'v0.9.72.100';
  assert.equal(selectUpdate(installed, [revised], 'stable').action, 'available');
  assert.equal(selectUpdate({ ...installed, appVersion: '0.9.72.101' }, [revised], 'stable').action, 'keep');
});
test('GitHub offline conserva lo stato locale senza dati o bozze da migrare', async () => {
  const before = JSON.stringify(installed);
  const result = await checkPublications(installed, 'stable', { fetcher: async () => { throw new Error('offline'); } });
  assert.deepEqual(result, { action: 'keep', reason: 'offline-or-invalid-publication' });
  assert.equal(JSON.stringify(installed), before);
});
test('pubblicazioni incomplete e link di asset estranei non vengono seguiti', async () => {
  const requested = [];
  const fake = publication();
  const releases = [{ ...fake.release, assets: [{ name: 'distribution.json', browser_download_url: 'https://untrusted.invalid/distribution.json' }] }];
  const result = await checkPublications(installed, 'stable', { fetcher: async (url) => { requested.push(url); return new Response(JSON.stringify(releases)); } });
  assert.equal(result.action, 'keep'); assert.equal(requested.length, 1);
});
test('stato invalido rifiutato prima della rete', async () => {
  let called = false;
  await assert.rejects(checkPublications({ ...installed, appVersion: 'invalid' }, 'stable', { fetcher: async () => { called = true; } }));
  assert.equal(called, false);
});
test('banco Container richiede Core reale ma non inventa versioni HAOS/Supervisor', () => {
  const container = { version: '0.9.72', appVersion: '0.9.72.99', coreVersion: '2026.9.4', shellVersion: '0.1.0', runtime: 'container' };
  const bank = publication('0.9.73', { channel: 'bank', runtime: 'container' });
  bank.release.prerelease = true;
  delete bank.distribution.compatibility.haos;
  delete bank.distribution.compatibility.supervisor;
  assert.equal(selectUpdate(container, [bank], 'bank').action, 'available');
  assert.equal(selectUpdate({ ...container, coreVersion: '2026.10.0' }, [bank], 'bank').action, 'keep');
  assert.equal(selectUpdate(installed, [bank], 'bank').action, 'keep');
  assert.throws(() => selectUpdate(container, [bank], 'stable'));
  assert.equal(parseDistribution({ ...bank.distribution, channel: 'stable' }), null);
});
