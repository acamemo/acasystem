/** Joins class names, dropping empty values; undefined when nothing is left. */
export function classes(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ') || undefined;
}
