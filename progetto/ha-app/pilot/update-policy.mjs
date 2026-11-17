import { parseManifest } from '../../client/core/src/manifest.ts';

const numberParts = (value, lengths) => {
  // Supervisor usa anche date come 2026.09.0: il confronto resta numerico.
  if (typeof value !== 'string' || !/^\d{1,6}(\.\d{1,6}){1,3}$/.test(value)) return null;
  const parts = value.split('.').map(Number);
  return lengths.includes(parts.length) ? parts : null;
};
export const compare = (left, right) => {
  const a = numberParts(left, [2, 3, 4]);
  const b = numberParts(right, [2, 3, 4]);
  if (!a || !b) throw new Error('Versione non valida');
  for (let i = 0; i < 4; i++) { const delta = (a[i] ?? 0) - (b[i] ?? 0); if (delta) return Math.sign(delta); }
  return 0;
};
const inRange = (version, range, lengths) => range && numberParts(range.min, lengths) &&
  numberParts(range.maxExclusive, lengths) && compare(range.min, range.maxExclusive) < 0 &&
  compare(version, range.min) >= 0 && compare(version, range.maxExclusive) < 0;

// Contratto della futura pubblicazione completa. Non installa nulla e non modifica il catalogo.
export function parseDistribution(value) {
  const runtime = value?.runtime ?? 'haos';
  if (!value || value.schema !== 1 || !['stable', 'bank'].includes(value.channel) ||
    !['haos', 'container'].includes(runtime) || (runtime === 'container' && value.channel !== 'bank') ||
    !numberParts(value.version, [3]) || !numberParts(value.appVersion, [3, 4]) ||
    !(value.appVersion === value.version || value.appVersion.startsWith(value.version + '.')) ||
    value.tag !== `v${value.appVersion}` ||
    !/^ghcr\.io\/acamemo\/acasystem@sha256:[a-f0-9]{64}$/.test(value.image ?? '')) return null;
  const bundle = parseManifest(value.bundle);
  if (!bundle || bundle.version !== value.version || bundle.minServer !== value.version || !numberParts(bundle.minShell, [3])) return null;
  for (const [name, lengths] of [['core', [3]], ['upgradeFrom', [3]], ...(runtime === 'haos' ? [['haos', [2]], ['supervisor', [3]]] : [])]) {
    const range = value.compatibility?.[name];
    if (!range || !numberParts(range.min, lengths) || !numberParts(range.maxExclusive, lengths) ||
      compare(range.min, range.maxExclusive) >= 0) return null;
  }
  return { schema: 1, channel: value.channel, runtime, version: value.version, appVersion: value.appVersion,
    tag: value.tag, image: value.image, bundle, compatibility: value.compatibility };
}

export function selectUpdate(installed, publications, channel) {
  const runtime = installed.runtime ?? 'haos';
  if (!['stable', 'bank'].includes(channel) || !numberParts(installed.version, [3]) ||
    !['haos', 'container'].includes(runtime) || (runtime === 'container' && channel !== 'bank') ||
    !numberParts(installed.appVersion, [3, 4]) ||
    (runtime === 'haos' && (!numberParts(installed.haosVersion, [2]) || !numberParts(installed.supervisorVersion, [3]))) ||
    !numberParts(installed.coreVersion, [3]) ||
    !numberParts(installed.shellVersion, [3]) || !(installed.appVersion === installed.version ||
      installed.appVersion.startsWith(installed.version + '.'))) throw new Error('Stato installato/canale non valido');
  const candidates = publications.flatMap(({ release, distribution }) => {
    const candidate = parseDistribution(distribution);
    if (!candidate || release.draft !== false || typeof release.prerelease !== 'boolean' ||
      (channel === 'stable' && release.prerelease) || release.tag_name !== candidate.tag ||
      candidate.channel !== channel || candidate.runtime !== runtime || compare(candidate.version, installed.version) < 0 ||
      compare(candidate.appVersion, installed.appVersion) <= 0 ||
      compare(candidate.bundle.minShell, installed.shellVersion) > 0) return [];
    const ranges = candidate.compatibility;
    if ((runtime === 'haos' && (!inRange(installed.haosVersion, ranges.haos, [2]) || !inRange(installed.supervisorVersion, ranges.supervisor, [3]))) ||
      !inRange(installed.coreVersion, ranges.core, [3]) || !inRange(installed.version, ranges.upgradeFrom, [3])) return [];
    return [candidate];
  }).sort((a, b) => compare(b.appVersion, a.appVersion));
  return candidates[0] ? { action: 'available', publication: candidates[0] } : { action: 'keep', reason: 'no-compatible-newer-publication' };
}

const repository = 'https://api.github.com/repos/acamemo/acasystem-releases/releases';
const releaseBase = 'https://github.com/acamemo/acasystem-releases/releases/download/';
export async function checkPublications(installed, channel, { fetcher = fetch, timeoutMs = 15000 } = {}) {
  selectUpdate(installed, [], channel); // Rifiuta lo stato errato prima di qualunque rete.
  const signal = AbortSignal.timeout(timeoutMs);
  const get = async (url) => {
    const response = await fetcher(url, { signal, headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error('Pubblicazione non raggiungibile');
    const text = await response.text();
    if (text.length > 2 * 1024 * 1024) throw new Error('Risposta troppo grande');
    return JSON.parse(text);
  };
  try {
    // Limite dichiarato: le 30 pubblicazioni piu recenti; il canale non si deduce da latest.
    const releases = await get(`${repository}?per_page=30`);
    if (!Array.isArray(releases)) throw new Error('Elenco release non valido');
    const publications = [];
    for (const release of releases.slice(0, 30)) {
      if (release.draft !== false || (channel === 'stable' && release.prerelease) ||
        !/^v\d+\.\d+\.\d+(\.\d+)?$/.test(release.tag_name ?? '')) continue;
      const url = `${releaseBase}${release.tag_name}/distribution.json`;
      if (!Array.isArray(release.assets) || !release.assets.some((asset) => asset.name === 'distribution.json' && asset.browser_download_url === url)) continue;
      try { publications.push({ release, distribution: await get(url) }); } catch { /* Pubblicazione incompleta: conservarne altre valide. */ }
    }
    return selectUpdate(installed, publications, channel);
  } catch {
    return { action: 'keep', reason: signal.aborted ? 'timeout' : 'offline-or-invalid-publication' };
  }
}
