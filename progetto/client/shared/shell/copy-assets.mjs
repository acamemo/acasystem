import { copyFile, mkdir } from 'node:fs/promises';
import { copyDesignAssets } from '../../scripts/copy-design.mjs';

/** Composizione grafica dei launcher HTML, indipendente dalla piattaforma. */
export async function copyShellAssets(destination) {
  await mkdir(destination, { recursive: true });
  for (const name of ['shell.css', 'icon.png', 'browser-reset.js']) {
    await copyFile(new URL(name, import.meta.url), new URL(name, destination));
  }
  await copyDesignAssets(new URL('design-aca/', destination));
}
