import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, lstat, mkdir, open, readFile, readdir, realpath, statfs, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { isAbsolute, join, posix, resolve, win32 } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { isDeepStrictEqual, promisify } from 'node:util';
import { parseArgs } from 'node:util';
import { createAcaMaintenanceClient } from './supervisor-update-adapter.mjs';
import { checkPublications, parseDistribution } from './update-policy.mjs';
import { runUpdateTransaction } from './update-transaction.mjs';

const execute = promisify(execFile);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const equal = isDeepStrictEqual;
const fingerprint = (value) => /^[a-f0-9]{64}$/.test(value ?? '');
const imageId = (value) => /^sha256:[a-f0-9]{64}$/.test(value ?? '');
const officialImage = (value) => /^ghcr\.io\/acamemo\/acasystem@sha256:[a-f0-9]{64}$/.test(value ?? '');
const name = (value) => /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(value ?? '');
const fail = () => { throw new Error('Prerequisito o verifica del banco non soddisfatti'); };
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const runningFormat = '{{json .State.Running}}';
// Non legge Env, log o contenuti dei volumi. L'output selettivo resta solo in memoria.
const identityFormat = '{"name":{{json .Name}},"image":{{json .Image}},"command":{{json .Config.Cmd}},"entrypoint":{{json .Config.Entrypoint}},"workingDirectory":{{json .Config.WorkingDir}},"restart":{{json .HostConfig.RestartPolicy.Name}},"project":{{json (index .Config.Labels "com.docker.compose.project")}},"service":{{json (index .Config.Labels "com.docker.compose.service")}},"composeFiles":{{json (index .Config.Labels "com.docker.compose.project.config_files")}},"mounts":[{{range $index,$mount := .Mounts}}{{if $index}},{{end}}{"type":{{json $mount.Type}},"name":{{json $mount.Name}},"source":{{json $mount.Source}},"destination":{{json $mount.Destination}},"rw":{{json $mount.RW}}}{{end}}]}';
const coreFormat = '{"name":{{json .Name}},"image":{{json .Image}},"project":{{json (index .Config.Labels "com.docker.compose.project")}},"service":{{json (index .Config.Labels "com.docker.compose.service")}},"version":{{json (index .Config.Labels "io.hass.version")}},"running":{{json .State.Running}}}';
const candidateFormat = '{"id":{{json .Id}},"digests":{{json .RepoDigests}},"size":{{json .Size}},"version":{{json (index .Config.Labels "io.hass.version")}},"source":{{json (index .Config.Labels "org.acasystem.source.sha256")}}}';

/**
 * Percorso host di un bind come lo riporta `docker inspect`. Docker Desktop per Windows lo mostra
 * nel proprio formato (`/run/desktop/mnt/host/c/...`, prima `/host_mnt/c/...`): su Windows va
 * riportato al percorso del disco prima del confronto, altrimenti il file chiave non coincide mai.
 */
export function dockerHostPath(source, platform = process.platform) {
  if (platform !== 'win32') return posix.resolve(source);
  const desktop = /^\/(?:run\/desktop\/mnt\/host|host_mnt)\/([a-zA-Z])(\/.*)?$/.exec(source ?? '');
  return win32.resolve(desktop ? `${desktop[1].toUpperCase()}:${(desktop[2] ?? '/').replaceAll('/', '\\')}` : source);
}
const sameHostPath = (source, file, platform = process.platform) => platform === 'win32'
  ? dockerHostPath(source, platform).toLowerCase() === win32.resolve(file).toLowerCase()
  : dockerHostPath(source, platform) === posix.resolve(file);

export function validateBankTarget(target) {
  let url;
  try { url = new URL(target.baseUrl); } catch { fail(); }
  if (target?.schema !== 1 || !/^[A-Za-z0-9-]{1,100}$/.test(target.targetId ?? '') ||
    !['containerName', 'composeProject', 'composeService', 'dataVolume', 'serviceSecretVolume', 'coreContainerName', 'coreService'].every(key => name(target[key])) ||
    target.dataVolume === target.serviceSecretVolume || !imageId(target.coreImageId) ||
    !Array.isArray(target.composeFiles) || !target.composeFiles.length || target.composeFiles.length > 50 ||
    !target.composeFiles.every(file => isAbsolute(file.path ?? '') && fingerprint(file.sha256)) ||
    new Set(target.composeFiles.map(file => resolve(file.path))).size !== target.composeFiles.length ||
    !isAbsolute(target.directory ?? '') || /[,\r\n\0]/.test(target.directory) || !isAbsolute(target.tokenFile ?? '') ||
    !Array.isArray(target.command) || !target.command.length || !target.command.every(arg => typeof arg === 'string' && !/[\r\n\0]/.test(arg)) ||
    !Array.isArray(target.entrypoint) || !target.entrypoint.every(arg => typeof arg === 'string' && !/[\r\n\0]/.test(arg)) ||
    typeof target.workingDirectory !== 'string' || !target.workingDirectory.startsWith('/') ||
    !['unless-stopped', 'always', 'no'].includes(target.restart) || !/^\d+\.\d+\.\d+$/.test(target.shellVersion ?? '') ||
    url.origin !== target.baseUrl || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== '3002' ||
    !Number.isInteger(target.lockPort) || target.lockPort < 1024 || target.lockPort > 65535 ||
    !Number.isSafeInteger(target.maxBackupBytes) || target.maxBackupBytes < 1024 * 1024 ||
    !Number.isSafeInteger(target.checkIntervalMs) || target.checkIntervalMs < 60000) fail();
  return target;
}

export async function dockerRun(args) {
  try { return (await execute('docker', args, { encoding: 'utf8', maxBuffer: 1024 * 1024, windowsHide: true, timeout: 10 * 60 * 1000 })).stdout.trim(); }
  catch { fail(); } // Mai copiare stderr Docker/Compose o argomenti negli errori.
}

/** Cattura tecnica esplicita; non crea credenziali e non avvia alcun container. */
export async function captureBankTarget({ directory, tokenFile, shellVersion, run = dockerRun }) {
  if (!/^\d+\.\d+\.\d+$/.test(shellVersion ?? '')) fail();
  const actual = JSON.parse(await run(['container', 'inspect', 'aca-tunet-tunet-1', '--format', identityFormat]));
  const core = JSON.parse(await run(['container', 'inspect', 'aca-tunet-ha-bank-1', '--format', coreFormat]));
  if (core.project !== actual.project || core.running !== true || !/^\d+\.\d+\.\d+$/.test(core.version ?? '')) fail();
  const composeFiles = [];
  for (const path of actual.composeFiles.split(',')) composeFiles.push({ path: resolve(path), sha256: sha(await readFile(path)) });
  return validateBankTarget({ schema: 1, targetId: 'aca-pc-bank', containerName: actual.name.slice(1),
    composeProject: actual.project, composeService: actual.service, composeFiles,
    dataVolume: actual.mounts.find(mount => mount.destination === '/app/data')?.name,
    serviceSecretVolume: actual.mounts.find(mount => mount.destination === '/app/service-secret')?.name,
    command: actual.command, entrypoint: actual.entrypoint, workingDirectory: actual.workingDirectory, restart: actual.restart,
    coreContainerName: core.name.slice(1), coreService: core.service, coreImageId: core.image,
    baseUrl: 'http://127.0.0.1:3002', directory: resolve(directory), tokenFile: resolve(tokenFile),
    shellVersion, lockPort: 3073, maxBackupBytes: 512 * 1024 * 1024, checkIntervalMs: 10 * 60 * 1000 });
}

async function fileHash(path) {
  const hash = createHash('sha256'); let size = 0;
  for await (const chunk of createReadStream(path)) { size += chunk.length; hash.update(chunk); }
  return { sha256: hash.digest('hex'), size };
}
async function syncFile(path) {
  const file = await open(path, 'r+');
  try { await file.sync(); } finally { await file.close(); }
}

// SetAccessControl scrive solo owner e DACL modificati. Set-Acl di Windows PowerShell 5.1 scrive anche la
// SACL e, con file già presenti nella cartella, richiede SeSecurityPrivilege (amministratore): dal secondo
// aggiornamento in poi la cartella dei backup non verrebbe più accettata.
const privateDirectoryScript = `$ErrorActionPreference='Stop'; $AcaPath=[IO.Path]::GetFullPath($env:ACA_BANK_PRIVATE_DIRECTORY); $AcaItem=Get-Item -LiteralPath $AcaPath -Force; if(-not $AcaItem.PSIsContainer -or ($AcaItem.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Directory updater non regolare'}; $AcaOwner=[Security.Principal.WindowsIdentity]::GetCurrent().User; $AcaSids=@($AcaOwner.Value,'S-1-5-18') | Select-Object -Unique; $AcaAcl=New-Object Security.AccessControl.DirectorySecurity; $AcaAcl.SetAccessRuleProtection($true,$false); $AcaAcl.SetOwner($AcaOwner); foreach($AcaSid in $AcaSids){$AcaRule=New-Object Security.AccessControl.FileSystemAccessRule([Security.Principal.SecurityIdentifier]::new($AcaSid),'FullControl','ContainerInherit,ObjectInherit','None','Allow'); $AcaAcl.AddAccessRule($AcaRule)}; $AcaItem.SetAccessControl($AcaAcl); $AcaActual=Get-Acl -LiteralPath $AcaPath; if($AcaActual.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $AcaOwner.Value){throw 'Owner updater non verificato'}; if(-not $AcaActual.AreAccessRulesProtected){throw 'ACL updater non protetta'}; $AcaRules=$AcaActual.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]); if($AcaRules.Count -ne $AcaSids.Count){throw 'ACL updater ambigua'}; foreach($AcaRule in $AcaRules){if($AcaRule.IdentityReference.Value -notin $AcaSids -or $AcaRule.AccessControlType -ne 'Allow' -or $AcaRule.IsInherited -or $AcaRule.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl){throw 'ACL updater non privata'}}`;

export function windowsPowerShellEnvironment(environment = process.env, extra = {}) {
  const output = { ...environment, ...extra };
  const root = Object.entries(output).find(([key]) => key.toLowerCase() === 'systemroot')?.[1];
  if (typeof root !== 'string' || !/^[A-Za-z]:[\\/]/.test(root)) fail();
  // PS7 passa un PSModulePath incompatibile a powershell.exe 5.1; Windows tratta i nomi senza case.
  for (const key of Object.keys(output)) if (key.toLowerCase() === 'psmodulepath') delete output[key];
  output.PSModulePath = win32.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules');
  return output;
}

export async function secureBankDirectory(target, { platform = process.platform, native = execute, environment = process.env } = {}) {
  await mkdir(target.directory, { recursive: true, mode: 0o700 });
  const marker = join(target.directory, '.aca-bank-owner.json');
  try {
    const owner = JSON.parse(await readFile(marker, 'utf8'));
    if (owner.schema !== 1 || owner.targetId !== target.targetId) fail();
  } catch (error) {
    if (error.code !== 'ENOENT') fail();
    if ((await readdir(target.directory)).length) fail();
    await writeFile(marker, json({ schema: 1, targetId: target.targetId }), { flag: 'wx', mode: 0o600 });
  }
  if (platform === 'win32') {
    try {
      await native('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(privateDirectoryScript, 'utf16le').toString('base64')], {
        windowsHide: true, timeout: 15000, encoding: 'utf8', maxBuffer: 4096,
        env: windowsPowerShellEnvironment(environment, { ACA_BANK_PRIVATE_DIRECTORY: target.directory }),
      });
    } catch { fail(); }
  } else if (platform === 'linux' || platform === 'darwin') await chmod(target.directory, 0o700);
}

const privateTokenScript = `$ErrorActionPreference='Stop'; $AcaPath=$env:ACA_BANK_TOKEN_FILE; $AcaItem=Get-Item -LiteralPath $AcaPath -Force; if($AcaItem.PSIsContainer -or ($AcaItem.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'File updater non regolare'}; $AcaOwner=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $AcaAllowed=@($AcaOwner,'S-1-5-18'); $AcaAcl=Get-Acl -LiteralPath $AcaPath; if($AcaAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $AcaAllowed){throw 'Owner updater non privato'}; $AcaRules=$AcaAcl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]); if(-not $AcaRules.Count){throw 'ACL updater assente'}; foreach($AcaRule in $AcaRules){if($AcaRule.IdentityReference.Value -notin $AcaAllowed -or $AcaRule.AccessControlType -ne 'Allow'){throw 'ACL updater non privata'}}`;

export async function readBankTokenFile(path, { platform = process.platform, native = execute, environment = process.env } = {}) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 128) fail();
  if (platform === 'win32') {
    try {
      await native('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(privateTokenScript, 'utf16le').toString('base64')], {
        windowsHide: true, timeout: 15000, maxBuffer: 4096, encoding: 'utf8', env: windowsPowerShellEnvironment(environment, { ACA_BANK_TOKEN_FILE: path }),
      });
    } catch { fail(); }
  } else if ((info.mode & 0o077) !== 0 || (process.getuid && info.uid !== process.getuid())) fail();
  const token = (await readFile(await realpath(path), 'utf8')).trim();
  if (!fingerprint(token)) fail();
  return token;
}

/** Solo tar regolari e directory relativi; nessun link, device o percorso esterno. */
export function validateBankTar(bytes) {
  if (bytes.length % 512 !== 0) return false;
  let offset = 0; const names = new Set(); let database = false;
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512); offset += 512;
    if (header.every(byte => byte === 0)) return database && bytes.length - offset >= 512 && bytes.subarray(offset).every(byte => byte === 0);
    const field = (a, b) => header.subarray(a, b).toString('utf8').replace(/\0.*$/s, '');
    const octal = (a, b) => /^[0-7]+$/.test(field(a, b).trim()) ? parseInt(field(a, b).trim(), 8) : NaN;
    const path = (field(345, 500) ? field(345, 500) + '/' : '') + field(0, 100);
    const clean = path.replace(/^\.\//, '').replace(/\/$/, '');
    const size = octal(124, 136);
    if ((!clean && path !== './') || clean.startsWith('/') || /[\\:\x00-\x1f]/.test(clean) ||
      (clean && clean.split('/').some(part => !part || part === '..' || part === '.')) ||
      names.has(clean) || ![0, 48, 53].includes(header[156]) || !Number.isSafeInteger(size) || size < 0 ||
      (header[156] === 53 && size !== 0) ||
      octal(148, 156) !== header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0) ||
      offset + size > bytes.length) return false;
    names.add(clean); if (clean === 'tunet.db' && [0, 48].includes(header[156]) && size > 0) database = true;
    offset += Math.ceil(size / 512) * 512;
  }
  return false;
}

const auditScript = 'import Database from "better-sqlite3"; import {updateDataFingerprint} from "/app/backend/src/updateMaintenance.ts"; const db=new Database("/aca-data/tunet.db",{readonly:true,fileMustExist:true}); if(db.pragma("integrity_check",{simple:true})!=="ok")process.exit(3); console.log(JSON.stringify({dataFingerprint:updateDataFingerprint(db)})); db.close();';
const clearScript = 'const fs=require("node:fs"),path=require("node:path");const root="/aca-data";if(fs.realpathSync(root)!==root)process.exit(3);for(const item of fs.readdirSync(root)){const file=path.resolve(root,item);if(!file.startsWith(root+"/"))process.exit(3);fs.rmSync(file,{recursive:true,force:false});}';

export function createBankAdapter({ target, maintenance, run = dockerRun, secureDirectory = secureBankDirectory, pause = delay, healthTimeoutMs = 90000 }) {
  validateBankTarget(target);
  const activeOverride = join(target.directory, 'bank-active.yaml');
  let transactionId; let staged; let rollbackCache; let backupFingerprint;
  const context = value => {
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value?.transactionId ?? '')) fail();
    transactionId = value.transactionId; return { targetId: target.targetId, transactionId };
  };
  const identity = async () => JSON.parse(await run(['container', 'inspect', target.containerName, '--format', identityFormat]));
  const stopped = async () => { if (await run(['container', 'inspect', target.containerName, '--format', runningFormat]) !== 'false') fail(); };
  const assertTarget = async id => {
    if (id !== target.targetId) fail();
    for (const file of target.composeFiles) if (sha(await readFile(file.path)) !== file.sha256) fail();
    const actual = await identity();
    const paths = actual.composeFiles.split(',').map(path => resolve(path));
    const expected = target.composeFiles.map(file => resolve(file.path));
    if (!equal(paths, expected) && !equal(paths, [...expected, resolve(activeOverride)])) fail();
    if (actual.name !== '/' + target.containerName || actual.project !== target.composeProject || actual.service !== target.composeService ||
      !equal(actual.command, target.command) || !equal(actual.entrypoint, target.entrypoint) || actual.workingDirectory !== target.workingDirectory ||
      actual.restart !== target.restart || !imageId(actual.image)) fail();
    const mounts = actual.mounts.filter(mount => mount.destination === '/app/data' || mount.destination === '/app/service-secret');
    if (mounts.length !== 2 || mounts.some(mount => mount.type !== 'volume' || mount.rw !== true ||
      mount.name !== (mount.destination === '/app/data' ? target.dataVolume : target.serviceSecretVolume))) fail();
    if (actual.mounts.some(mount => mount.destination !== '/app/data' && mount.destination !== '/app/service-secret' &&
      !(mount.type === 'bind' && mount.destination === '/run/aca-update/token' && mount.rw === false && sameHostPath(mount.source, target.tokenFile)))) fail();
    await coreVersion();
  };
  const coreVersion = async () => {
    const core = JSON.parse(await run(['container', 'inspect', target.coreContainerName, '--format', coreFormat]));
    if (core.name !== '/' + target.coreContainerName || core.project !== target.composeProject || core.service !== target.coreService ||
      core.image !== target.coreImageId || core.running !== true || !/^\d+\.\d+\.\d+$/.test(core.version ?? '')) fail();
    return core.version;
  };
  const helper = (image, entrypoint, args, { backup = false, writable = false } = {}) => run(['run', '--rm', '--network', 'none',
    '--mount', `type=volume,src=${target.dataVolume},dst=/aca-data${writable ? '' : ',readonly'}`,
    ...(backup ? ['--mount', `type=bind,src=${target.directory},dst=/aca-backup${writable ? ',readonly' : ''}`] : []),
    '--entrypoint', entrypoint, image, ...args]);
  const audit = async image => {
    const value = JSON.parse(await helper(image, 'node', ['--input-type=module', '-e', auditScript]));
    if (!fingerprint(value.dataFingerprint)) fail(); return value.dataFingerprint;
  };
  const receiptFiles = receipt => {
    if (!/^[a-f0-9-]{36}$/.test(receipt.id ?? '') || !fingerprint(receipt.imageSha256) || !imageId(receipt.localImageId) ||
      !fingerprint(receipt.dataFingerprint) || !/^[a-f0-9-]{36}$/.test(receipt.transactionId ?? '')) fail();
    return { data: join(target.directory, `bank-data-${receipt.id}.tar`), image: join(target.directory, `bank-image-${receipt.id}.tar`) };
  };
  const verifyBackup = async (receipt, before) => {
    try {
      const paths = receiptFiles(receipt);
      const data = await fileHash(paths.data); const image = await fileHash(paths.image);
      if (data.sha256 !== receipt.sha256 || data.size !== receipt.size || data.size > target.maxBackupBytes ||
        image.sha256 !== receipt.imageSha256 || image.size !== receipt.imageSize || receipt.image !== before.image ||
        receipt.localImageId !== before.localImageId) return false;
      return validateBankTar(await readFile(paths.data));
    } catch { return false; }
  };
  const composeInstall = async expected => {
    await stopped();
    await writeFile(activeOverride, json({ services: { [target.composeService]: { image: expected.image,
      command: target.command, entrypoint: target.entrypoint, working_dir: target.workingDirectory,
      environment: { ACASYSTEM_VERSION: expected.version, APP_VERSION: expected.appVersion } } } }), { mode: 0o600 });
    await run(['compose', '--project-name', target.composeProject, ...target.composeFiles.flatMap(file => ['-f', file.path]),
      '-f', activeOverride, 'up', '-d', '--no-deps', '--no-build', '--pull', 'never', target.composeService]);
  };
  const verifyRunning = async (expected, value, { fingerprint: expectedFingerprint, requireMaintenance = true } = {}) => {
    try {
      context(value); await assertTarget(target.targetId);
      const actual = await identity();
      if (actual.image !== (expected.localImageId ?? staged?.localImageId)) return false;
      if (await run(['container', 'inspect', target.containerName, '--format', runningFormat]) === 'false') await run(['start', target.containerName]);
      const deadline = Date.now() + healthTimeoutMs;
      do {
        try {
          const app = await maintenance.inspect();
          if (app.targetId === target.targetId && app.version === expected.version && app.appVersion === expected.appVersion &&
            equal(app.bundle, expected.bundle) && (!expectedFingerprint || app.dataFingerprint === expectedFingerprint) &&
            (!requireMaintenance || (value.committed && app.maintenance?.active === false) ||
              (app.maintenance?.active === true && app.maintenance.transactionId === transactionId))) return true;
        } catch { /* Retry soltanto letture, mai install/restore incerti. */ }
        if (Date.now() >= deadline) break;
        await pause(Math.min(1000, Math.max(1, deadline - Date.now())));
      } while (Date.now() <= deadline);
    } catch { /* Restare chiusi richiede recupero esterno. */ }
    return false;
  };
  return {
    acquire: async () => {
      const server = createServer(socket => socket.destroy());
      const acquired = await new Promise((done, reject) => {
        server.once('error', error => error.code === 'EADDRINUSE' ? done(false) : reject(new Error('Lock banco non disponibile')));
        server.listen(target.lockPort, '127.0.0.1', () => done(true));
      });
      return acquired ? async () => new Promise(done => server.close(done)) : null;
    },
    assertTarget,
    inspect: async () => {
      await assertTarget(target.targetId);
      const app = await maintenance.inspect(); const actual = await identity();
      if (app.targetId !== target.targetId || !fingerprint(app.dataFingerprint) || !app.bundle) fail();
      return { runtime: 'container', version: app.version, appVersion: app.appVersion, bundle: app.bundle,
        image: actual.image, localImageId: actual.image, dataFingerprint: app.dataFingerprint,
        coreVersion: await coreVersion(), shellVersion: target.shellVersion };
    },
    stage: async (candidate, before) => {
      await assertTarget(target.targetId);
      if (!parseDistribution(candidate) || !officialImage(candidate.image) || candidate.runtime !== 'container' || !imageId(before.localImageId)) fail();
      await secureDirectory(target);
      const space = await statfs(target.directory);
      const oldSize = Number(await run(['image', 'inspect', before.localImageId, '--format', '{{json .Size}}']));
      if (!Number.isSafeInteger(oldSize) || oldSize <= 0 || space.bavail * space.bsize < target.maxBackupBytes * 3 + oldSize * 3) fail();
      const cacheId = randomUUID();
      const rollbackPath = join(target.directory, `bank-image-${cacheId}.tar`);
      await run(['image', 'save', '--output', rollbackPath, before.localImageId]);
      await syncFile(rollbackPath);
      rollbackCache = { id: cacheId, path: rollbackPath, ...await fileHash(rollbackPath) };
      await run(['pull', candidate.image]);
      const image = JSON.parse(await run(['image', 'inspect', candidate.image, '--format', candidateFormat]));
      if (!imageId(image.id) || !image.digests?.includes(candidate.image) || image.version !== candidate.appVersion || !fingerprint(image.source)) fail();
      staged = { ...candidate, localImageId: image.id };
    },
    drain: async value => {
      const body = context(value);
      if (!await maintenance.drain(body)) return false;
      const app = await maintenance.state();
      return app.targetId === target.targetId && app.maintenance?.active === true && app.maintenance.transactionId === transactionId &&
        ['pendingWrites', 'activeCommands', 'activeEditors', 'activeConnections'].every(key => app.activity?.[key] === 0);
    },
    backup: async before => {
      const app = await maintenance.state();
      if (!rollbackCache || !transactionId || app.maintenance?.active !== true || app.maintenance.transactionId !== transactionId ||
        !fingerprint(app.dataFingerprint) || !['pendingWrites', 'activeCommands', 'activeEditors', 'activeConnections'].every(key => app.activity?.[key] === 0)) fail();
      await run(['stop', '--time', '30', target.containerName]); await stopped();
      if (await audit(before.localImageId) !== app.dataFingerprint) fail();
      const id = rollbackCache.id;
      await helper(before.localImageId, 'tar', ['-C', '/aca-data', '-cf', `/aca-backup/bank-data-${id}.tar`, '.'], { backup: true });
      await stopped();
      await syncFile(join(target.directory, `bank-data-${id}.tar`));
      const bytes = await fileHash(join(target.directory, `bank-data-${id}.tar`));
      if (bytes.size > target.maxBackupBytes) fail();
      backupFingerprint = app.dataFingerprint;
      return { id, ...bytes, image: before.image, localImageId: before.localImageId, imageSha256: rollbackCache.sha256,
        imageSize: rollbackCache.size, dataFingerprint: app.dataFingerprint, transactionId };
    },
    verifyBackup,
    install: async candidate => {
      await assertTarget(target.targetId); await stopped();
      if (!staged || staged.image !== candidate.image) fail();
      await composeInstall(candidate);
      await assertTarget(target.targetId);
      if ((await identity()).image !== staged.localImageId) fail();
    },
    verifyInstalled: async (candidate, value) => {
      // Recupero di un commit: ricostruire l'autorità dal digest esatto, senza pull o install.
      if (!staged) {
        const image = JSON.parse(await run(['image', 'inspect', candidate.image, '--format', candidateFormat]));
        if (!imageId(image.id) || !image.digests?.includes(candidate.image) || image.version !== candidate.appVersion) return false;
        staged = { ...candidate, localImageId: image.id };
      }
      if (!value?.committed && !backupFingerprint) {
        const journal = JSON.parse(await readFile(join(target.directory, 'update-journal.json'), 'utf8'));
        if (journal.targetId !== target.targetId || journal.transactionId !== value?.transactionId || !fingerprint(journal.backup?.dataFingerprint)) return false;
        backupFingerprint = journal.backup.dataFingerprint;
      }
      return verifyRunning(staged, value, { fingerprint: value?.committed ? undefined : backupFingerprint });
    },
    verifyUnchanged: (before, value) => verifyRunning(before, value, { requireMaintenance: false }),
    restore: async (receipt, before) => {
      if (!await verifyBackup(receipt, before)) fail();
      context(receipt); await assertTarget(target.targetId);
      await run(['stop', '--time', '30', target.containerName]); await stopped();
      const paths = receiptFiles(receipt);
      await run(['image', 'load', '--input', paths.image]);
      if (await run(['image', 'inspect', receipt.localImageId, '--format', '{{.Id}}']) !== receipt.localImageId) fail();
      await helper(receipt.localImageId, 'node', ['-e', clearScript], { writable: true });
      await helper(receipt.localImageId, 'tar', ['-C', '/aca-data', '-xf', `/aca-backup/bank-data-${receipt.id}.tar`], { backup: true, writable: true });
      if (await audit(receipt.localImageId) !== receipt.dataFingerprint) fail();
      await composeInstall(before);
    },
    verifyRestored: (before, receipt) => verifyRunning(before, receipt, { fingerprint: receipt.dataFingerprint }),
    resume: async value => {
      const body = context(value); const app = await maintenance.state();
      if (!app.maintenance?.active) return;
      if (app.targetId !== target.targetId || app.maintenance.transactionId !== transactionId) fail();
      await maintenance.resume(body);
      if ((await maintenance.state()).maintenance?.active !== false) fail();
    },
  };
}

export async function checkBank({ target, maintenance, adapter, check = checkPublications }) {
  const recovered = await runUpdateTransaction({ directory: target.directory, targetId: target.targetId, channel: 'bank', publication: null, adapter });
  if (recovered.action === 'recovery-required' || recovered.action === 'deferred') return recovered;
  const installed = await adapter.inspect();
  const report = async (status, availableVersion) => maintenance.status({ status, checkedAt: new Date().toISOString(), version: installed.version,
    ...(availableVersion ? { availableVersion } : {}) });
  await report('checking');
  const result = await check(installed, 'bank');
  if (result.action !== 'available') {
    await report(['offline-or-invalid-publication', 'timeout'].includes(result.reason) ? 'offline' : 'current');
    return result;
  }
  await report('available', result.publication.version);
  await report('updating', result.publication.version);
  const outcome = await runUpdateTransaction({ directory: target.directory, targetId: target.targetId, channel: 'bank',
    publication: { distribution: result.publication, release: { draft: false, prerelease: true, tag_name: result.publication.tag } }, adapter });
  await maintenance.status({ status: outcome.action === 'updated' ? 'current' : outcome.action === 'deferred' ? 'deferred' : 'failed',
    checkedAt: new Date().toISOString(), version: outcome.action === 'updated' ? result.publication.version : installed.version,
    ...(outcome.action === 'updated' ? {} : { availableVersion: result.publication.version }) });
  return outcome;
}

export async function monitorBank({ target, maintenance, adapter, watch = false, check = checkPublications,
  log = value => console.log(JSON.stringify(value)), pause = delay }) {
  let lastRequest; let lastCheck = 0; let lastMessage; let outcome;
  const report = value => {
    const message = JSON.stringify(value);
    if (message !== lastMessage) log(value);
    lastMessage = message;
  };
  do {
    try {
      // Al primo avvio ACA può essere fermo: il journal deve essere recuperato prima dell'HTTP.
      const state = lastCheck ? await maintenance.state() : null;
      const requested = JSON.stringify(state?.checkRequest ?? null);
      if (!lastCheck || requested !== lastRequest || Date.now() - lastCheck >= target.checkIntervalMs) {
        outcome = await checkBank({ target, maintenance, adapter, check });
        report(outcome);
        if (outcome.action === 'recovery-required' && outcome.phase !== 'preflight') return outcome;
        lastCheck = outcome.action === 'recovery-required' ? 0 : Date.now(); lastRequest = requested;
      }
    } catch {
      outcome = { action: 'unavailable', reason: 'local-prerequisites-or-recovery-required' };
      report(outcome); lastCheck = 0;
    }
    if (watch) await pause(2000);
  } while (watch);
  return outcome;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { target: { type: 'string' }, watch: { type: 'boolean' },
    'capture-target': { type: 'string' }, directory: { type: 'string' }, 'token-file': { type: 'string' }, 'shell-version': { type: 'string' } } });
  if (values['capture-target']) {
    if (!values.directory || !values['token-file']) fail();
    const target = await captureBankTarget({ directory: values.directory, tokenFile: values['token-file'], shellVersion: values['shell-version'] });
    await writeFile(resolve(values['capture-target']), json(target), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ action: 'captured-not-activated', targetId: target.targetId }));
  } else {
    if (!values.target) throw new Error('Specificare --target <config-locale.json> [--watch]; nessun target implicito');
    const target = validateBankTarget(JSON.parse(await readFile(values.target, 'utf8')));
    const token = await readBankTokenFile(target.tokenFile);
    const maintenance = createAcaMaintenanceClient({ baseUrl: target.baseUrl, token });
    const adapter = createBankAdapter({ target, maintenance });
    const outcome = await monitorBank({ target, maintenance, adapter, watch: values.watch });
    if (['unavailable', 'recovery-required'].includes(outcome?.action)) process.exitCode = 1;
  }
}
