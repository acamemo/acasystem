import { copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { copyShellAssets } from '../../shared/shell/copy-assets.mjs';

// HTML sorgente separato dagli asset comuni; la copia pronta è inclusa nell'installatore.
const windows = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../generated-shell/', import.meta.url);
if (!fileURLToPath(output).startsWith(windows)) throw new Error('Output del launcher fuori dal progetto Windows.');
await rm(output, { recursive: true, force: true });
await copyShellAssets(output);
await copyFile(new URL('../shell/index.html', import.meta.url), new URL('index.html', output));
await copyFile(new URL('../shell/setup.css', import.meta.url), new URL('setup.css', output));
