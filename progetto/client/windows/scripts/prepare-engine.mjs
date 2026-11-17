import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeZip } from '../../scripts/zipWriter.ts';

const windows = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(windows, '../../..');
const app = join(root, 'progetto', 'acasystem');
const version = '0.9.31';
const output = resolve(windows, '.tmp', 'local-resources', 'engine');
const stage = resolve(windows, '.tmp', 'local-app-source');
const image = resolve(root, 'backup', 'dispositivi', 'haos', 'haos_ova-18.4.vdi');

const cleanStage = async (directory) => {
  const allowed = resolve(windows, '.tmp') + sep;
  if (!resolve(directory).startsWith(allowed)) throw new Error('Cartella di preparazione esterna al workspace.');
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
};
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = async (directory, prefix = '') => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await files(join(directory, entry.name), name));
    else if (entry.isFile()) result.push({ name, data: await readFile(join(directory, entry.name)) });
  }
  return result;
};

await stat(join(app, 'frontend', 'dist', 'index.html'));
await stat(join(app, 'casa3d', 'dist'));
await cleanStage(output);
await cleanStage(stage);

// Gli artefatti vengono dal build locale, senza alterare o pubblicare una release GitHub.
const entries = await files(join(app, 'frontend', 'dist'));
entries.push(...(await files(join(app, 'casa3d', 'dist'))).map((entry) => ({ ...entry, name: `casa3d/${entry.name}` })));
const archive = writeZip(entries);
const archiveName = `acasystem-web-${version}.zip`;
const clientBundle = join(stage, 'client-bundle');
await mkdir(clientBundle, { recursive: true });
await writeFile(join(clientBundle, archiveName), archive);
await writeFile(join(clientBundle, 'manifest.json'), JSON.stringify({
  schema: 1, version,
  archive: { name: archiveName, sha256: digest(archive), size: archive.length },
  minServer: version, minShell: '0.1.0',
}, null, 2) + '\n');

for (const name of ['package.json', 'package-lock.json', 'frontend/package.json', 'backend/package.json', 'casa3d/package.json']) {
  const destination = join(stage, name);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(app, name), destination);
}
for (const name of ['backend/src', 'frontend/dist', 'casa3d/dist']) {
  await cp(join(app, name), join(stage, name), { recursive: true });
}
await mkdir(join(stage, 'haos'), { recursive: true });
for (const name of ['run.sh', 'detect-ha-url.mjs']) {
  await cp(join(root, 'progetto', 'ha-app', 'image', name), join(stage, 'haos', name));
}
let config = await readFile(join(root, 'progetto', 'ha-app', 'repository', 'acasystem', 'config.yaml'), 'utf8');
config = config.replace('__VERSION__', version).replace(/^image:.*\r?\n/m, '').replace(/^boot: auto\r?$/m, 'boot: manual');
await writeFile(join(stage, 'config.yaml'), config);
await writeFile(join(stage, 'Dockerfile'), `FROM node:26-alpine
LABEL io.hass.name="Acasystem" io.hass.version="${version}" io.hass.type="addon" io.hass.arch="amd64"
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
COPY casa3d/package.json casa3d/
RUN npm ci --omit=dev -w backend && apk del python3 make g++
COPY backend/src backend/src
COPY frontend/dist frontend/dist
COPY casa3d/dist casa3d/dist
COPY client-bundle client-bundle
COPY haos /haos
RUN chmod 0755 /haos/run.sh
ENV NODE_ENV=production PORT=3002 DATA_DIR=/data/app CLIENT_BUNDLE_DIR=/app/client-bundle ACASYSTEM_VERSION=${version}
WORKDIR /app/backend
CMD ["/haos/run.sh"]
`);
execFileSync('tar.exe', ['-czf', join(output, 'acasystem-source.tgz'), '-C', stage, '.'], { windowsHide: true });
const sourceArchive = await readFile(join(output, 'acasystem-source.tgz'));
const disk = await readFile(image);
// Hash del VDI estratto dall'archivio ufficiale 18.4, verificato prima della prima prova.
if (digest(disk) !== '8f42700dd2ffd5429dabde8cf70655301886ff9f3ea2010be21a989e11cda66c') {
  throw new Error('Il VDI iniziale non coincide con il materiale HA OS 18.4 verificato.');
}
const manifest = {
  schema: 1, haosVersion: '18.4', expectedCoreVersion: '2026.10.4',
  diskFile: 'haos.vdi', diskSha256: digest(disk),
  appVersion: version, sourceArchive: 'acasystem-source.tgz', sourceSha256: digest(sourceArchive),
};
await cp(image, join(output, 'haos.vdi'));
await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output, appVersion: version, bundleBytes: archive.length, sourceBytes: sourceArchive.length, diskBytes: disk.length }));
