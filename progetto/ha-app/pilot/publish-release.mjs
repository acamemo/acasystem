import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parseDistribution } from './update-policy.mjs';
import { releaseAssets, sha256 } from './release-artifacts.mjs';

const repository = 'acamemo/acasystem-releases';
const apiBase = `https://api.github.com/repos/${repository}`;
const publicBase = `https://github.com/${repository}/releases/download/`;

/** Solo invocazione esplicita CI. Un errore lascia una bozza, mai una release incompleta riutilizzata. */
export async function publishRelease({ directory, token, fetcher = fetch }) {
  if (typeof token !== 'string' || !token) throw new Error('Secret ACA_RELEASES_TOKEN richiesto su acamemo/acasystem-releases (Contents write)');
  const assets = await releaseAssets(directory);
  const distributionBytes = assets.find(({ name }) => name === 'distribution.json')?.bytes;
  const distribution = distributionBytes && parseDistribution(JSON.parse(distributionBytes));
  if (!distribution || distribution.channel !== 'bank' || distribution.runtime !== 'container') throw new Error('La pipeline pubblica soltanto candidate bank Container; stable richiede qualifica e promozione separata');
  const checksums = assets.find(({ name }) => name === 'SHA256SUMS')?.bytes.toString('utf8');
  const expectedChecksums = assets.filter(({ name }) => name !== 'SHA256SUMS').map(({ name, sha256 }) => `${sha256}  ${name}\n`).join('');
  if (checksums !== expectedChecksums || !assets.some(({ name }) => name === 'RELEASE-PROVENANCE.json') ||
    !assets.some(({ name }) => name === `acasystem-pilot-candidate-${distribution.appVersion}.zip`)) throw new Error('Asset/checksum della release incompleti o modificati dopo la verifica');
  const proof = JSON.parse(assets.find(({ name }) => name === 'RELEASE-PROVENANCE.json').bytes);
  const records = assets.filter(({ name }) => !['SHA256SUMS', 'RELEASE-PROVENANCE.json'].includes(name)).map(({ bytes, ...record }) => record);
  if (proof.schema !== 1 || proof.registry?.image !== distribution.image || proof.registry?.anonymous !== true ||
    JSON.stringify(proof.assets) !== JSON.stringify(records)) throw new Error('Asset diversi dalla provenienza verificata');
  const authenticated = async (url, { method = 'GET', body, binary = false, accept = 'application/vnd.github+json' } = {}) => {
    const parsed = new URL(url);
    if (!['api.github.com', 'uploads.github.com'].includes(parsed.hostname) || parsed.protocol !== 'https:' ||
      !(parsed.pathname === `/repos/${repository}` || parsed.pathname.startsWith(`/repos/${repository}/`))) throw new Error('Destinazione API non ufficiale');
    const response = await fetcher(url, { method, body: body === undefined ? undefined : binary ? body : JSON.stringify(body),
      redirect: 'manual', signal: AbortSignal.timeout(60000), headers: {
        Authorization: `Bearer ${token}`, Accept: accept, 'X-GitHub-Api-Version': '2026-03-10',
        ...(body === undefined ? {} : { 'Content-Type': binary ? 'application/octet-stream' : 'application/json' }),
      } });
    return response;
  };
  const json = async (url, options) => {
    const response = await authenticated(url, options);
    if (!response.ok) throw new Error(`API release fallita (${response.status})`);
    return response.json();
  };
  const repositoryInfo = await json(apiBase);
  if (repositoryInfo.private !== false || repositoryInfo.full_name !== repository) throw new Error('Il repository di distribuzione deve essere quello pubblico ufficiale');
  const existing = await authenticated(`${apiBase}/releases/tags/${distribution.tag}`);
  if (existing.status !== 404) throw new Error('Tag release esistente o collisione non verificabile: incrementare appVersion, nessuna sovrascrittura');
  const release = await json(`${apiBase}/releases`, { method: 'POST', body: {
    tag_name: distribution.tag, name: `ACA ${distribution.appVersion} — candidata banco`, draft: true, prerelease: true,
    make_latest: 'false', body: `Candidata bank Container ${distribution.appVersion}. Materiali HAOS e setup non collaudati sul target. Provenienza, digest e checksum negli asset; nessuna promozione stable.`,
  } });
  if (!Number.isSafeInteger(release.id) || release.id <= 0 || release.draft !== true) throw new Error('Bozza release non verificabile');
  for (const asset of assets) {
    const uploaded = await json(`https://uploads.github.com/repos/${repository}/releases/${release.id}/assets?name=${encodeURIComponent(asset.name)}`, {
      method: 'POST', body: asset.bytes, binary: true,
    });
    if (!Number.isSafeInteger(uploaded.id) || uploaded.size !== asset.size || uploaded.name !== asset.name ||
      (uploaded.digest && uploaded.digest !== `sha256:${asset.sha256}`)) throw new Error('Asset caricato non corrispondente');
    const response = await authenticated(`${apiBase}/releases/assets/${uploaded.id}`, { accept: 'application/octet-stream' });
    let bytes;
    if (response.status === 302) {
      const url = new URL(response.headers.get('location'));
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.githubusercontent.com')) throw new Error('CDN release non ufficiale');
      const download = await fetcher(url.href, { redirect: 'error', signal: AbortSignal.timeout(60000) });
      if (!download.ok) throw new Error('Asset in bozza non scaricabile');
      bytes = Buffer.from(await download.arrayBuffer());
    } else {
      if (!response.ok) throw new Error('Asset in bozza non scaricabile');
      bytes = Buffer.from(await response.arrayBuffer());
    }
    if (bytes.length !== asset.size || sha256(bytes) !== asset.sha256) throw new Error('Asset in bozza corrotto; pubblicazione interrotta');
  }
  await json(`${apiBase}/releases/${release.id}`, { method: 'PATCH', body: { draft: false, prerelease: true, make_latest: 'false' } });
  try {
    // Gli asset di una bozza non sono anonimi: questa seconda verifica segue la pubblicazione.
    for (const asset of assets) {
      const response = await fetcher(`${publicBase}${distribution.tag}/${asset.name}`, {
        redirect: 'follow', signal: AbortSignal.timeout(60000),
      });
      if (!response.ok || sha256(Buffer.from(await response.arrayBuffer())) !== asset.sha256) throw new Error('Verifica anonima asset fallita');
    }
  } catch (error) {
    await json(`${apiBase}/releases/${release.id}`, { method: 'PATCH', body: { draft: true, prerelease: true, make_latest: 'false' } });
    throw new Error('Verifica pubblica fallita: release riportata in bozza', { cause: error });
  }
  return { tag: distribution.tag, channel: distribution.channel, prerelease: true, assets: assets.length,
    url: `https://github.com/${repository}/releases/tag/${distribution.tag}`, catalogUpdated: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { directory: { type: 'string' } } });
  if (!values.directory) throw new Error('Specificare --directory della release verificata');
  console.log(JSON.stringify(await publishRelease({ directory: resolve(values.directory), token: process.env.ACA_RELEASES_TOKEN }), null, 2));
}
