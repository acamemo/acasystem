import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const SONOFF = Object.freeze({
  version: '3.13.3',
  name: 'SonoffLAN-v3.13.3.zip',
  url: 'https://github.com/AlexxIT/SonoffLAN/archive/refs/tags/v3.13.3.zip',
  sha256: 'f4f11279fc37dc51464fc6d5e3e0118cec42e024be41073afa9b4f35eb72e532',
});

// Versioni dichiarate per la singola consegna, non una matrice di compatibilità collaudata.
export async function bootstrapMaterials({ version, appVersion = version, haosVersion, coreVersion, sonoffArchive }) {
  const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  if (!versionPattern.test(version ?? '') || !(appVersion === version ||
    (appVersion?.startsWith(`${version}.`) && /^[1-9]\d{0,2}$/.test(appVersion.slice(version.length + 1))))) {
    throw new Error('Versioni ACA/app non valide');
  }
  if (!/^[1-9]\d*\.(0|[1-9]\d*)$/.test(haosVersion ?? '') || !versionPattern.test(coreVersion ?? '')) {
    throw new Error('Dichiarare le versioni candidate HAOS e Core dei materiali');
  }
  const archive = await readFile(sonoffArchive);
  if (createHash('sha256').update(archive).digest('hex') !== SONOFF.sha256) {
    throw new Error('Archivio SonoffLAN diverso dalla sorgente v3.13.3 verificata');
  }
  const replacements = { __ACA_VERSION__: version, __APP_VERSION__: appVersion, __HAOS_VERSION__: haosVersion, __CORE_VERSION__: coreVersion };
  const render = (text) => Object.entries(replacements).reduce((out, [key, value]) => out.replaceAll(key, value), text);
  const materials = new Map();
  for (const [source, target] of [['bootstrap-haos.sh', 'bootstrap-haos.sh'], ['install-sonoff.py', 'install-sonoff.py'], ['README.md', 'BOOTSTRAP.md']]) {
    materials.set(target, Buffer.from(render(await readFile(new URL(source, import.meta.url), 'utf8')).replaceAll('\r\n', '\n')));
  }
  materials.set(SONOFF.name, archive);
  materials.set('installation.json', Buffer.from(`${JSON.stringify({
    schema: 1, version, appVersion, haosVersion, coreVersion, sonoff: SONOFF,
    validation: 'candidate-not-target-tested',
    repository: 'https://github.com/acamemo/acasystem-releases',
    image: `ghcr.io/acamemo/acasystem:${appVersion}`,
  }, null, 2)}\n`));
  materials.set('BOOTSTRAP-SHA256SUMS', Buffer.from([...materials].map(([name, bytes]) =>
    `${createHash('sha256').update(bytes).digest('hex')}  ${name}`).join('\n') + '\n'));
  return materials;
}
