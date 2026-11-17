import { pathToFileURL } from 'node:url';
import qrcode from './qrcode.cjs';

/** Solo URL della centrale: nessuna password, token, invito o scelta account. */
export const centralUrl = (value) => {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Collegamento ACA non valido');
  let url;
  try { url = new URL(value); } catch { throw new Error('Collegamento ACA non valido'); }
  const octets = url.hostname.split('.');
  const ipv4 = octets.length === 4 && octets.every((item) => /^(0|[1-9]\d{0,2})$/.test(item) && Number(item) <= 255);
  const [a, b] = octets.map(Number);
  const privateIp = a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
  if (!ipv4 || !privateIp || url.protocol !== 'http:' || url.port !== '3002'
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || (value !== url.origin && value !== `${url.origin}/`)) throw new Error('Serve il collegamento HTTP locale della centrale sulla porta 3002');
  return `${url.origin}/`;
};

/** Blocchi Unicode su sfondo chiaro; quattro moduli bianchi di quiet zone. */
export const renderConnectionQr = (value) => {
  const url = centralUrl(value);
  const code = qrcode(0, 'M');
  code.addData(url, 'Byte');
  code.make();
  const size = code.getModuleCount();
  const quiet = 4;
  const lines = [];
  for (let row = -quiet; row < size + quiet; row++) {
    let line = '';
    for (let col = -quiet; col < size + quiet; col++) {
      const dark = row >= 0 && col >= 0 && row < size && col < size && code.isDark(row, col);
      // ANSI limita i colori a questa riga e rende la quiet zone chiara anche su terminale scuro.
      line += dark ? '\u001b[40m  ' : '\u001b[47m  ';
    }
    lines.push(`${line}\u001b[0m`);
  }
  return { url, modules: size, quietZone: quiet, text: lines.join('\n') };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Uso: node show-connection.mjs http://<IP-privato>:3002/');
    const qr = renderConnectionQr(process.argv[2]);
    console.log(`\nCollega Acasystem: ${qr.url}\n`);
    console.log(qr.text);
    console.log(`\nQR di collegamento: ${qr.modules} moduli, quiet zone ${qr.quietZone}. Nessuna credenziale inclusa.\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'QR non disponibile');
    process.exitCode = 1;
  }
}
