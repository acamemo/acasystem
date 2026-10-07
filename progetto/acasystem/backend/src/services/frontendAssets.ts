import { basename, extname } from 'node:path';

/**
 * Ripiego per i file JS/CSS con hash della build Vite: una pagina rimasta aperta dopo
 * un aggiornamento chiede `index-OLDHASH.js`; il server risponde con il file attuale
 * dello stesso nome (`index-NEWHASH.js`).
 */

/** `index-abc123.js` → `index.js`; null per estensioni diverse da .js/.css o nomi senza hash. */
export const hashedAssetKey = (fileName: string): string | null => {
  const fileExt = extname(fileName).toLowerCase();
  if (fileExt !== '.js' && fileExt !== '.css') return null;

  const baseName = basename(fileName, fileExt);
  const hashSeparatorIndex = baseName.lastIndexOf('-');
  if (hashSeparatorIndex <= 0) return null;

  return `${baseName.slice(0, hashSeparatorIndex)}${fileExt}`;
};

/** Mappa nome senza hash → file attuale nella cartella `assets/` della build. */
export const buildHashedAssetFallbackMap = (fileNames: readonly string[]): Map<string, string> => {
  const fallbackMap = new Map<string, string>();
  fileNames.forEach((fileName) => {
    const key = hashedAssetKey(fileName);
    if (key) fallbackMap.set(key, fileName);
  });
  return fallbackMap;
};

/** File attuale da servire al posto di quello richiesto, oppure null. */
export const resolveHashedAssetFallback = (
  requestedPath: string,
  fallbackMap: ReadonlyMap<string, string>
): string | null => {
  const requested = basename(requestedPath || '');
  if (!requested) return null;

  const key = hashedAssetKey(requested);
  if (!key) return null;

  const fallbackFileName = fallbackMap.get(key);
  if (!fallbackFileName || fallbackFileName === requested) return null;
  return fallbackFileName;
};
