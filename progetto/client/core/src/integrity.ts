import type { ReleaseManifest } from './manifest.ts';

/** Controllo dell'archivio scaricato: dimensione e SHA-256 del manifesto (P-2). */

export const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const verifyArchive = async (
  manifest: ReleaseManifest,
  archive: Uint8Array
): Promise<boolean> =>
  archive.byteLength === manifest.archive.size &&
  (await sha256Hex(archive)) === manifest.archive.sha256;
