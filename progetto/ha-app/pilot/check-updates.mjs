import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { checkPublications } from './update-policy.mjs';

const { values } = parseArgs({ options: { installed: { type: 'string' }, channel: { type: 'string' } } });
if (!values.installed || !['stable', 'bank'].includes(values.channel)) {
  throw new Error('Uso: node check-updates.mjs --installed <stato-tecnico.json> --channel stable|bank');
}
const installed = JSON.parse(await readFile(values.installed, 'utf8'));
console.log(JSON.stringify(await checkPublications(installed, values.channel), null, 2));
