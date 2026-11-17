import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { copyDesignAssets } from '../../acasystem/design/copy-assets.mjs';

const require = createRequire(new URL('../../acasystem/frontend/package.json', import.meta.url));
const qrcode = require('qrcode-generator');
const { values } = parseArgs({ options: { origin: { type: 'string', default: 'http://192.168.1.11:3002/' } } });
const central = new URL(values.origin);
if (central.protocol !== 'http:' || central.port !== '3002' || central.username || central.password
  || central.pathname !== '/' || central.search || central.hash
  || !/^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(central.hostname)) {
  throw new Error('Usa il solo URL HTTP privato della centrale sulla porta 3002.');
}
const output = new URL('../out/connection-screen-preview/', import.meta.url);
await mkdir(output, { recursive: true });
await copyDesignAssets(new URL('./design-aca/', output));
const template = await readFile(new URL('./index.html', import.meta.url), 'utf8');
await writeFile(new URL('./index.html', output), template.replace('{{CENTRAL_URL}}', central.href));
await writeFile(new URL('./screen.css', output), await readFile(new URL('./screen.css', import.meta.url)));
const code = qrcode(0, 'M');
code.addData(central.href, 'Byte');
code.make();
await writeFile(new URL('./connection-qr.svg', output), code.createSvgTag(8, 32));
console.log(JSON.stringify({ output: output.pathname, centralUrl: central.href, qrModules: code.getModuleCount(), quietZone: 4 }));
