import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

// Tutti i file/database sono nel tmpfs del solo container di prova. Zero socket/volumi host.
const script = String.raw`
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { readHaosPrivateConfiguration } from '/haos/executor-tools/progetto/ha-app/pilot/haos-update.mjs';
const env={...process.env, ACA_PROCESS_ROLE:'', TUNET_INTERNAL_HA_URL:'http://127.0.0.1:9', SUPERVISOR_TOKEN:'', HASSIO_TOKEN:''};
await writeFile('/data/options.json','{}');
let child;
async function start(){
 child=spawn('sh',['/haos/run.sh'],{env,stdio:'ignore'});
 for(let i=0;i<150;i++){
  if(child.exitCode!==null)throw new Error('Backend isolato terminato');
  try{const r=await fetch('http://127.0.0.1:3002/api/health',{signal:AbortSignal.timeout(100)});const h=await r.json();if(r.ok&&h.version===process.env.ACASYSTEM_VERSION)return h;}catch{}
  await delay(50);
 }
 throw new Error('Health isolata non pronta');
}
async function stop(){if(child&&child.exitCode===null&&child.signalCode===null){const ended=once(child,'exit');child.kill('SIGTERM');await ended;}child=undefined;}
try{
 await start();
 const unconfigured=await(await fetch('http://127.0.0.1:3002/api/updates/status')).json();assert.equal(unconfigured.status,'unconfigured');
 await stop();
 const cli='/haos/executor-tools/progetto/ha-app/pilot/haos-provision.mjs';
 const init=spawnSync(process.execPath,[cli,'--init','--container-name','app_9960cdb4_acasystem','--shell-version','0.1.1'],{env,encoding:'utf8'});assert.equal(init.status,0,'inizializzazione privata');
 const {target,token}=await readHaosPrivateConfiguration();
 const second=spawnSync(process.execPath,[cli,'--init','--container-name','app_9960cdb4_acasystem','--shell-version','0.1.1'],{env,encoding:'utf8'});assert.equal(second.status,0);assert.equal(JSON.parse(second.stdout).action,'unchanged');assert.ok(!second.stdout.includes(token));
 await start();
 const call=async(path,body)=>{const response=await fetch('http://127.0.0.1:3002/api/internal/update/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(response.status,200,path);return response.json();};
 const state=await call('state');assert.equal(state.targetId,target.targetId);assert.equal(state.appVersion,process.env.APP_VERSION);assert.match(state.dataFingerprint,/^[a-f0-9]{64}$/);assert.equal(state.bundle.version,process.env.ACASYSTEM_VERSION);
 const transaction={targetId:target.targetId,transactionId:randomUUID()};
 await call('drain',transaction);assert.equal((await call('state')).maintenance.active,true);
 await call('resume',transaction);assert.equal((await call('state')).maintenance.active,false);
 await call('status',{status:'current',checkedAt:new Date().toISOString(),version:process.env.ACASYSTEM_VERSION});
 assert.equal((await(await fetch('http://127.0.0.1:3002/api/updates/status')).json()).status,'current');
 await stop();
 const denied=spawnSync('sh',['/haos/run.sh'],{env:{...env,ACA_PROCESS_ROLE:'updater'},encoding:'utf8',timeout:5000});
 assert.equal(denied.status,1);assert.ok(!denied.stdout.includes(token)&&!denied.stderr.includes(token));assert.match(denied.stderr,/Executor HAOS non avviato/);
 console.log(JSON.stringify({checks:7,normalWithoutConfiguration:true,privateInitialization:true,idempotentIdentity:true,mainMaintenance:true,bundleCoherent:true,statusBridge:true,workerFailsClosedWithoutSupervisor:true,version:process.env.ACASYSTEM_VERSION,appVersion:process.env.APP_VERSION}));
}finally{await stop();}
`;

export function smokeExecutorImage(image, { run = execFileSync } = {}) {
  if (!/^(ghcr\.io\/acamemo\/acasystem:(\d+\.){2}\d+(\.\d+)?|sha256:[a-f0-9]{64})$/.test(image ?? '')) throw new Error('Specificare immagine candidata esatta');
  const output = run('docker', ['run', '--rm', '--name', 'aca-executor-smoke-' + randomUUID(), '--pull', 'never', '--network', 'none',
    '--read-only', '--tmpfs', '/tmp:rw,nosuid,nodev,size=64m', '--tmpfs', '/data:rw,nosuid,nodev,size=64m',
    '--memory', '256m', '--cpus', '1', '--workdir', '/app/backend', '--entrypoint', 'node', image,
    '--input-type=module', '--eval', script], { encoding: 'utf8', timeout: 30000, windowsHide: true });
  const result = JSON.parse(String(output).trim());
  if (result.checks !== 7 || result.workerFailsClosedWithoutSupervisor !== true || result.mainMaintenance !== true) throw new Error('Smoke executor non verificato');
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { image: { type: 'string' } } });
  console.log(JSON.stringify(smokeExecutorImage(values.image)));
}
