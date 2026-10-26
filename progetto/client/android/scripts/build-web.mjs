import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Prepara www/ per Capacitor: pagina, grafica condivisa con Windows e script compilati.
const root = fileURLToPath(new URL('../', import.meta.url));
const www = new URL('../www/', import.meta.url);
await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });
await copyFile(new URL('../web/index.html', import.meta.url), new URL('index.html', www));
await copyFile(new URL('../../windows/shell/shell.css', import.meta.url), new URL('shell.css', www));
await copyFile(new URL('../../windows/shell/icon.png', import.meta.url), new URL('icon.png', www));
await mkdir(new URL('vendor/', www), { recursive: true });
await copyFile(
  new URL('../../node_modules/@capacitor/core/dist/index.js', import.meta.url),
  new URL('vendor/capacitor-core.js', www)
);
execFileSync(process.execPath, [fileURLToPath(new URL('../../node_modules/typescript/bin/tsc', import.meta.url)), '-p', 'tsconfig.build.json'], {
  cwd: root,
  stdio: 'inherit',
});
