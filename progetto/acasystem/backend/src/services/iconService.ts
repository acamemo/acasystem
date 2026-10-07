import * as mdiIcons from '@mdi/js';

/** Catalogo delle icone Material Design (@mdi/js) per nome kebab-case. */

const MDI_SEARCH_RESULT_LIMIT = 500;

/** `mdiLightbulbOn` → path SVG, solo per le esportazioni `mdi*` testuali. */
const mdiPathByExportKey: ReadonlyMap<string, string> = new Map(
  Object.entries(mdiIcons).flatMap(([key, value]): [string, string][] =>
    key.startsWith('mdi') && typeof value === 'string' ? [[key, value]] : []
  )
);

/** `mdiNumeric1Box` → `numeric1-box`. */
const exportKeyToKebab = (key: string): string =>
  key
    .replace(/^mdi/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

/** `numeric-1-box` → `mdiNumeric1Box`. */
export const kebabToMdiKey = (name: string): string => {
  const camel = name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `mdi${camel}`;
};

/** Nome kebab-case → path; si arricchisce con i nomi risolti dal ripiego camelCase. */
const mdiPathByName = new Map<string, string>(
  Array.from(mdiPathByExportKey, ([key, path]): [string, string] => [exportKeyToKebab(key), path])
);

const mdiNames: readonly string[] = Array.from(mdiPathByName.keys()).sort((a, b) =>
  a.localeCompare(b)
);

/** Elenco `mdi:<nome>`: tutti senza ricerca, altrimenti i primi 500 che contengono il testo. */
export const listMdiIcons = (query: string): string[] => {
  if (!query) {
    return mdiNames.map((name) => `mdi:${name}`);
  }

  return mdiNames
    .filter((name) => name.includes(query))
    .slice(0, MDI_SEARCH_RESULT_LIMIT)
    .map((name) => `mdi:${name}`);
};

/** Path SVG dell'icona, cercato per nome e poi per chiave camelCase; null se non esiste. */
export const findMdiIconPath = (name: string): string | null => {
  const direct = mdiPathByName.get(name);
  if (direct) return direct;

  const path = mdiPathByExportKey.get(kebabToMdiKey(name));
  if (typeof path !== 'string') return null;

  mdiPathByName.set(name, path);
  return path;
};
