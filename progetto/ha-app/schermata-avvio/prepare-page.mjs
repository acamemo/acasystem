// Copia il design ACA condiviso accanto alla pagina prima della build dell'app (REP-20261118-001).
// Con --preview <URL> genera anche un'anteprima locale con IP e QR d'esempio, senza Docker.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { copyDesignAssets } from '../../acasystem/design/copy-assets.mjs';

const page = new URL('./page/', import.meta.url);
await copyDesignAssets(new URL('./design-aca/', page));

const { values } = parseArgs({ options: { preview: { type: 'string' }, offline: { type: 'boolean', default: false } } });
if (values.preview) {
  const central = new URL(values.preview);
  const output = new URL('../out/schermata-avvio-preview/', import.meta.url);
  await mkdir(output, { recursive: true });
  await cp(page, output, { recursive: true });
  const require = createRequire(new URL('../../acasystem/frontend/package.json', import.meta.url));
  const qrcode = require('qrcode-generator');
  const code = qrcode(0, 'M');
  code.addData(central.href, 'Byte');
  code.make();
  await writeFile(new URL('./qr.svg', output), values.offline ? '' : code.createSvgTag(8, 16));
  const html = (await readFile(new URL('./index.template.html', page), 'utf8'))
    .replaceAll('{{RETE}}', values.offline ? 'off' : 'on')
    .replaceAll('{{STATO}}', values.offline ? 'In attesa' : 'Collegata')
    .replaceAll('{{IP}}', values.offline ? '—' : central.hostname)
    .replaceAll('{{URL}}', values.offline ? '' : central.href);
  await writeFile(new URL('./index.html', output), html);
  console.log(JSON.stringify({ preview: output.pathname, url: central.href, offline: values.offline }));
}
