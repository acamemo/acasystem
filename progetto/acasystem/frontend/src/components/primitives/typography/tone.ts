/**
 * Ink tones of the «Metallo» system; engraved is the gradient text of the reference button.
 * active (orange), info (blue) and danger use the ≥ 4.5:1 ink variants of the accents.
 */
export type TextTone = 'ink' | 'muted' | 'engraved' | 'active' | 'info' | 'danger';

export const toneClass: Record<TextTone, string> = {
  ink: 'aca-ink',
  muted: 'aca-ink--muted',
  engraved: 'aca-ink--engraved',
  active: 'aca-ink--active',
  info: 'aca-ink--info',
  danger: 'aca-ink--danger',
};

export function withTone(tone: TextTone | undefined, className: string | undefined) {
  return [tone && toneClass[tone], className].filter(Boolean).join(' ') || undefined;
}

/** Joins class names, dropping empty values; undefined when nothing is left. */
export function classes(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ') || undefined;
}
