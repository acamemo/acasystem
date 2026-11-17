import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'sh';
const repo = 'https://github.com/acamemo/acasystem-releases';
const slug = `${createHash('sha1').update(repo).digest('hex').slice(0, 8)}_acasystem`;
const temp = await mkdtemp(join(tmpdir(), 'aca-bootstrap-test-'));
const bin = join(temp, 'bin');
await mkdir(bin);
const script = join(temp, 'bootstrap-haos.sh');
const source = await readFile(join(here, 'bootstrap-haos.sh'), 'utf8');
await writeFile(script, source
  .replaceAll('__ACA_VERSION__', '0.9.34').replaceAll('__APP_VERSION__', '0.9.34')
  .replaceAll('__HAOS_VERSION__', '18.4').replaceAll('__CORE_VERSION__', '2026.9.4'));
const archivePayload = Buffer.from([0x50, 0x4b, 0, 13, 10, 0xff, 0x80]);
await writeFile(join(temp, 'SonoffLAN-v3.13.3.zip'), archivePayload);
await writeFile(join(temp, 'install-sonoff.py'), '# stub');

// Stub CLI/OS isolati: nessun Supervisor, servizio, download o Docker reale.
const runner = join(temp, 'stub.cjs');
await writeFile(runner, `
const fs = require('node:fs');
const [command,...args] = process.argv.slice(2);
const file=process.env.ACA_BOOTSTRAP_TEST_STATE;
const state=JSON.parse(fs.readFileSync(file,'utf8'));
const save=()=>fs.writeFileSync(file,JSON.stringify(state));
const json=(data)=>console.log(JSON.stringify({result:'ok',data}));
if(command==='ha'){
 const raw=args[0]==='--raw-json'; const a=raw?args.slice(1):args;
 if(raw&&a.join(' ')==='os info') return json({version:state.osVersion||'18.4'});
 if(raw&&a.join(' ')==='core info') return json({version:state.coreVersion||'2026.9.4'});
 if(raw&&a.join(' ')==='store') return json({repositories:state.repo?[{source:'${repo}'}]:[],addons:[{slug:'${slug}',version:state.installed,version_latest:state.storeVersion}]});
 if(raw&&a.join(' ')==='apps') return json({addons:state.installed?[{slug:'${slug}',version:state.installed,state:state.started?'started':'stopped'}]:[]});
 if(raw&&a.join(' ')==='apps info ${slug}') return json({version:state.installed,state:state.started?'started':'stopped'});
 state.actions.push(a.join(' '));
 if(a[0]==='store'&&a[1]==='add') state.repo=true;
 else if(a[0]==='store'&&a[1]==='reload'){}
 else if(a[0]==='apps'&&a[1]==='install') state.installed=state.storeVersion;
 else if(a[0]==='apps'&&a[1]==='start') state.started=true;
 else if(a.join(' ')==='core restart'){}
 else process.exitCode=9;
 save();
}else if(command==='jq'){
 const input=fs.readFileSync(0,'utf8'); let data; try{data=JSON.parse(input)}catch{process.exit(4)};
 const expression=args.at(-1); let value;
 const arg=(name)=>{const i=args.indexOf('--arg');for(let n=i;n>=0&&n<args.length;n++){if(args[n]==='--arg'&&args[n+1]===name)return args[n+2]}};
 if(expression.includes('any(')) value=(data.data.repositories||[]).some(x=>(x.source||x.url)===arg('source'));
 else if(expression.includes('.result ==')) value=data.result==='ok'&&typeof data.data==='object'&&data.data!==null;
 else if(expression.includes('.data.addons')){
  const app=(data.data.addons||[]).find(x=>x.slug===arg('slug'));
  value=app?(expression.includes('version_latest')?(Object.hasOwn(app,'version_latest')?app.version_latest:app.version):app.version)||'':'';
 }
 else if(expression.includes('.data.version')) value=data.data.version||'';
 else if(expression.includes('.data.state')) value=data.data.state||'';
 else if(expression.includes('.status ==')) value=data.status==='ok'&&data.version===arg('version');
 else process.exit(8);
 console.log(typeof value==='string'?value:JSON.stringify(value));
 if(value===false)process.exitCode=1;
}else if(command==='curl'){
 state.actions.push('health');save();console.log(JSON.stringify({status:'ok',version:state.healthVersion||state.installed}));
}else if(command==='docker'){
 state.actions.push(args.join(' '));save();
 if(args[0]==='exec'&&args[1]==='homeassistant'&&args[2]==='python'&&args[3]==='-c'){
  if(args[4].includes('mkdtemp'))console.log('/tmp/aca-bootstrap-test');
  return;
 }
 // Docker cp non vede il tmpfs creato da exec nel Core reale.
 if(args[0]==='cp'){process.exitCode=12;return;}
 if(args[0]==='exec'&&args[1]==='-i'&&args[2]==='homeassistant'){
  if(args[3]==='python'&&args[4]==='-c'){
   const received=fs.readFileSync(0);
   if(state.transferFailure||!received.equals(Buffer.from('${archivePayload.toString('base64')}','base64')))process.exitCode=1;
   else{state.transferReceived=true;save()}
   return;
  }
  if(!state.transferReceived){process.exitCode=1;return;}
  if(state.differentSonoff)process.exitCode=1;
  else{console.log(state.sonoff?'unchanged':'installed');state.sonoff=true;save()}
  return;
 }
 const name=args.at(args[0]==='inspect'?-1:1);
 const exists=Boolean(state.installed)&&Object.hasOwn(state.containers,name);
 const running=exists&&state.started&&state.containers[name];
 if(args[0]==='inspect'&&args.length===4&&args[1]==='--format'&&args[2]==='{{.State.Running}}'){
  if(exists)console.log(String(running));else process.exitCode=1;
 }else if(args[0]==='exec'&&args.length===5&&args[2]==='node'&&args[3]==='/haos/show-connection.mjs'){
  if(!running||state.missingQr)process.exitCode=1;else console.log('QR '+args.at(-1));
 }else process.exitCode=9;
}else if(command==='id') console.log('0');
else if(command==='grep'){if(state.wrongHost)process.exitCode=1}
else if(command==='sleep'){}
else process.exitCode=7;
`);
for (const command of ['ha', 'jq', 'curl', 'docker', 'id', 'grep', 'sleep']) {
  await writeFile(join(bin, command), `#!/bin/sh\nexec node "$ACA_BOOTSTRAP_TEST_RUNNER" ${command} "$@"\n`, { mode: 0o755 });
}
const run = (statePath, args) => spawnSync(bash, ['-c',
  process.platform === 'win32'
    ? 'PATH="$(cygpath -u "$ACA_BOOTSTRAP_TEST_BIN"):$PATH"; export PATH; exec sh "$(cygpath -u "$ACA_BOOTSTRAP_TEST_SCRIPT")" "$@"'
    : 'PATH="$ACA_BOOTSTRAP_TEST_BIN:$PATH"; export PATH; exec sh "$ACA_BOOTSTRAP_TEST_SCRIPT" "$@"',
  'aca-test', ...args], { encoding: 'utf8', env: { ...process.env,
    MSYS2_ARG_CONV_EXCL: '*',
    ACA_BOOTSTRAP_TEST_BIN: bin, ACA_BOOTSTRAP_TEST_RUNNER: runner,
    ACA_BOOTSTRAP_TEST_SCRIPT: script, ACA_BOOTSTRAP_TEST_STATE: statePath,
  } });
const scenario = async (name, extra = {}) => {
  const path = join(temp, `${name}.json`);
  await writeFile(path, JSON.stringify({ repo: false, storeVersion: '0.9.34', installed: null, started: false, containers: { [`app_${slug}`]: true }, actions: [], ...extra }));
  return { path, read: async () => JSON.parse(await readFile(path, 'utf8')) };
};
const args = ['--ip', '192.168.1.20', '--version', '0.9.34'];

try {
  await test('receiver reale limita lo stream e rifiuta hash o directory errati prima della scrittura', async () => {
    const receiver = source.match(/docker exec -i homeassistant python -c '\n([\s\S]+?)\n' "\$guest_temp\/sonoff\.zip" </)?.[1];
    assert.ok(receiver, 'receiver eseguito nel mount Core con stdin binario');
    const guest = await mkdtemp(join(tmpdir(), 'aca-bootstrap-'));
    const target = join(guest, 'sonoff.zip');
    const receive = (input, destination = target) => spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-B', '-c', receiver, destination], { input, encoding: 'utf8' });
    try {
      const wrongHash = receive(archivePayload);
      assert.notEqual(wrongHash.status, 0);
      assert.match(wrongHash.stderr, /Archivio SonoffLAN rifiutato/);
      await assert.rejects(stat(target), { code: 'ENOENT' });
      const oversized = receive(Buffer.alloc(2 * 1024 * 1024 + 1));
      assert.notEqual(oversized.status, 0);
      assert.match(oversized.stderr, /Archivio SonoffLAN rifiutato/);
      await assert.rejects(stat(target), { code: 'ENOENT' });
      const wrongTarget = join(temp, 'other', 'sonoff.zip');
      const wrongDirectory = receive(archivePayload, wrongTarget);
      assert.notEqual(wrongDirectory.status, 0);
      assert.match(wrongDirectory.stderr, /Directory temporanea Core inattesa/);
      await assert.rejects(stat(wrongTarget), { code: 'ENOENT' });
      if (process.env.ACA_TEST_SONOFF_ARCHIVE) {
        const original = await readFile(process.env.ACA_TEST_SONOFF_ARCHIVE);
        assert.equal(createHash('sha256').update(original).digest('hex'), 'f4f11279fc37dc51464fc6d5e3e0118cec42e024be41073afa9b4f35eb72e532');
        const accepted = receive(original);
        assert.equal(accepted.status, 0, accepted.stderr);
        assert.deepEqual(await readFile(target), original);
        const repeated = receive(original);
        assert.notEqual(repeated.status, 0, 'xb impedisce sovrascritture');
        assert.deepEqual(await readFile(target), original);
      }
    } finally {
      assert.ok(guest.startsWith(join(tmpdir(), 'aca-bootstrap-')));
      await rm(guest, { recursive: true, force: true });
    }
  });
  await test('trasferimento stdin funziona con cp tmpfs rifiutato; errore interrompe prima di installare', async () => {
    const state = await scenario('stream');
    const accepted = run(state.path, args);
    assert.equal(accepted.status, 0, accepted.stderr);
    const after = await state.read();
    assert.equal(after.transferReceived, true);
    assert.ok(!after.actions.some(action => action.startsWith('cp ')));
    const rejected = await scenario('stream-rejected', { transferFailure: true });
    const result = run(rejected.path, args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Trasferimento archivio SonoffLAN non riuscito/);
    const failed = await rejected.read();
    assert.ok(!failed.actions.some(action => /^(apps |core restart|exec -i homeassistant python - )/.test(action)));
    assert.ok(failed.actions.some(action => action.includes('shutil.rmtree')));
  });
  await test('dry-run e validazione non chiamano strumenti o modificano lo stato', async () => {
    const state = await scenario('dry');
    const before = await readFile(state.path, 'utf8');
    const result = run(state.path, [...args, '--dry-run']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /9960cdb4_acasystem/);
    assert.match(result.stdout, /http:\/\/192\.168\.1\.20:3002\//);
    for (const bad of [
      ['--ip', '8.8.8.8', '--version', '0.9.34', '--dry-run'],
      ['--ip', '127.0.0.1', '--version', '0.9.34', '--dry-run'],
      ['--ip', '192.168.001.20', '--version', '0.9.34', '--dry-run'],
      ['--ip', '192.168.1.20', '--version', '0.9.31', '--dry-run'],
      ['--ip', '192.168.1.20', '--dry-run'],
    ]) assert.notEqual(run(state.path, bad).status, 0);
    assert.equal(await readFile(state.path, 'utf8'), before);
  });
  await test('catalogo version:null/version_latest installa e avvia solo quando necessario, poi resta idempotente', async () => {
    const state = await scenario('fresh');
    const first = run(state.path, args);
    assert.equal(first.status, 0, first.stderr);
    const firstState = await state.read();
    assert.deepEqual(firstState.actions.filter(x => /^(store|apps|core) /.test(x)), [`store add ${repo}`, 'store reload', 'core restart', `apps install ${slug}`, `apps start ${slug}`]);
    assert.ok(firstState.actions.includes(`exec app_${slug} node /haos/show-connection.mjs http://192.168.1.20:3002/`));
    assert.equal(run(state.path, args).status, 0);
    const secondState = await state.read();
    assert.equal(secondState.actions.filter(x => x === `apps install ${slug}`).length, 1);
    assert.equal(secondState.actions.filter(x => x === `apps start ${slug}`).length, 1);
    assert.equal(secondState.actions.filter(x => x.startsWith('store add')).length, 1);
    assert.equal(secondState.actions.filter(x => x === 'core restart').length, 1);
  });
  await test('QR preferisce app_ attivo e usa addon_ legacy solo come ripiego', async () => {
    for (const [name, containers, selected] of [
      ['both-running', { [`app_${slug}`]: true, [`addon_${slug}`]: true }, `app_${slug}`],
      ['legacy-running', { [`addon_${slug}`]: true }, `addon_${slug}`],
      ['current-stopped-legacy-running', { [`app_${slug}`]: false, [`addon_${slug}`]: true }, `addon_${slug}`],
    ]) {
      const state = await scenario(name, { installed: '0.9.34', started: true, containers });
      const result = run(state.path, args);
      assert.equal(result.status, 0, result.stderr);
      const actions = (await state.read()).actions;
      const inspections = [`inspect --format {{.State.Running}} app_${slug}`];
      if (selected === `addon_${slug}`) inspections.push(`inspect --format {{.State.Running}} addon_${slug}`);
      assert.deepEqual(actions.filter(x => x.startsWith('inspect ')), inspections);
      assert.deepEqual(actions.filter(x => x.includes(' node /haos/')), [`exec ${selected} node /haos/show-connection.mjs http://192.168.1.20:3002/`]);
      assert.ok(!actions.some(x => /^apps (install|start|update)/.test(x)));
    }
  });
  await test('container ACA assente o fermo impedisce QR e messaggio di successo', async () => {
    for (const [name, containers] of [
      ['containers-missing', {}],
      ['containers-stopped', { [`app_${slug}`]: false, [`addon_${slug}`]: false }],
    ]) {
      const state = await scenario(name, { installed: '0.9.34', started: true, containers });
      const result = run(state.path, args);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Nessun container ACA attivo/);
      assert.doesNotMatch(result.stdout, /ACA 0\.9\.33 pronta/);
      assert.ok(!(await state.read()).actions.some(x => x.includes(' node /haos/')));
    }
  });
  await test('rifiuta catalogo vecchio, installazione diversa e host diverso', async () => {
    for (const [name, extra] of [
      ['old-store', { storeVersion: '0.9.31' }],
      ['old-installed', { installed: '0.9.31' }],
      ['wrong-host', { wrongHost: true }],
      ['wrong-os', { osVersion: '18.3' }],
      ['wrong-core', { coreVersion: '2026.10.0' }],
      ['different-sonoff', { differentSonoff: true }],
    ]) {
      const state = await scenario(name, extra);
      const result = run(state.path, args);
      assert.notEqual(result.status, 0);
      assert.ok(!(await state.read()).actions.some(x => /^apps (install|start|update)/.test(x)));
    }
  });
  await test('app con revisione e health ACA distinte; template sorgente rifiutato', async () => {
    const original = await readFile(script, 'utf8');
    try {
      await writeFile(script, original.replace("APP_VERSION='0.9.34'", "APP_VERSION='0.9.34.99'"));
      const state = await scenario('revision', { storeVersion: '0.9.34.99', healthVersion: '0.9.34' });
      assert.equal(run(state.path, args).status, 0);
      assert.equal((await state.read()).installed, '0.9.34.99');
      await writeFile(script, await readFile(join(here, 'bootstrap-haos.sh')));
      const before = await readFile(state.path, 'utf8');
      assert.notEqual(run(state.path, [...args, '--dry-run']).status, 0);
      assert.equal(await readFile(state.path, 'utf8'), before);
    } finally { await writeFile(script, original); }
  });
  await test('health errato o helper QR mancante non producono successo', async () => {
    for (const [name, extra] of [['bad-health', { healthVersion: '0.9.31' }], ['missing-qr', { missingQr: true }]]) {
      const state = await scenario(name, extra);
      const result = run(state.path, args);
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.stdout, /ACA 0\.9\.33 pronta/);
    }
  });
  await test('QR usa libreria esistente e contiene soltanto il collegamento con quiet zone', async () => {
    const image = join(temp, 'image'); await mkdir(image);
    await cp(join(root, 'progetto/ha-app/image/show-connection.mjs'), join(image, 'show-connection.mjs'));
    await cp(join(root, 'progetto/acasystem/node_modules/qrcode-generator/dist/qrcode.js'), join(image, 'qrcode.cjs'));
    const { centralUrl, renderConnectionQr } = await import(pathToFileURL(join(image, 'show-connection.mjs')).href);
    const output = renderConnectionQr('http://192.168.1.20:3002/');
    assert.equal(output.url, 'http://192.168.1.20:3002/');
    assert.equal(output.quietZone, 4);
    assert.equal(output.text.split('\n').length, output.modules + 8);
    assert.ok(output.text.split('\n').slice(0, 4).every(line => !line.includes('\u001b[40m')));
    for (const bad of ['http://127.0.0.1:3002/', 'https://192.168.1.20:3002/', 'http://8.8.8.8:3002/', 'http://192.168.1.20:3002/?token=secret', 'http://owner:secret@192.168.1.20:3002/', 'http://192.168.1.20:3002/#/collega?invite=secret']) assert.throws(() => centralUrl(bad));
  });
} finally {
  // Directory creata da questo test, sotto tmpdir: nessun file del workspace da eliminare.
  assert.ok(temp.startsWith(join(tmpdir(), 'aca-bootstrap-test-')));
  await rm(temp, { recursive: true, force: true });
}
