import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { bootstrapMaterials } from './materials.mjs';

// Prepara soltanto file locali; non usa Docker, rete, Hyper-V o dati del banco.
const { values } = parseArgs({ options: Object.fromEntries([
  'version', 'app-version', 'haos-version', 'core-version', 'sonoff-archive', 'output',
].map((name) => [name, { type: 'string' }])) });
if (!values.output) throw new Error('Specificare --output: deve essere una directory nuova');
const materials = await bootstrapMaterials({ version: values.version, appVersion: values['app-version'],
  haosVersion: values['haos-version'], coreVersion: values['core-version'], sonoffArchive: values['sonoff-archive'] });
const output = resolve(values.output);
await mkdir(output); // Nessuna sovrascrittura di una consegna esistente.
for (const [name, bytes] of materials) await writeFile(resolve(output, name), bytes, { flag: 'wx' });
await writeFile(resolve(output, 'SHA256SUMS'), [...materials].map(([name, bytes]) =>
  `${createHash('sha256').update(bytes).digest('hex')}  ${name}`).join('\n') + '\n', { flag: 'wx' });
console.log(`Materiali candidati preparati: ${output}; nessuna installazione o compatibilità target dichiarata.`);
