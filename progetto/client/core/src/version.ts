/** Versioni `X.Y.Z` (con `v` facoltativa), come `/api/health` e i tag delle Release. */

export type Version = readonly [number, number, number];

const VERSION_PATTERN = /^v?(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/;

export const parseVersion = (value: string): Version | null => {
  const match = VERSION_PATTERN.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

export const compareVersions = (a: Version, b: Version): number =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Confronto tra stringhe già validate; una stringa non valida conta come la più vecchia. */
export const compareVersionStrings = (a: string, b: string): number => {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return left ? 1 : right ? -1 : 0;
  return compareVersions(left, right);
};
