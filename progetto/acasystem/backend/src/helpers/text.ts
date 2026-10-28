const IPV4_TEXT = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;
const MAC_TEXT = /\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b/i;
// eslint-disable-next-line no-control-regex
const CONTROL_RUN = /[\x00-\x1f\x7f]+/g;

/** A non-empty string, otherwise null. */
export const asString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;

/** A name for a person: cut, without control characters, never an address or a MAC. */
export const displayText = (value: string | null, maxLength: number): string | null => {
  const text = value?.replace(CONTROL_RUN, ' ').trim().slice(0, maxLength);
  if (!text || IPV4_TEXT.test(text) || MAC_TEXT.test(text)) return null;
  return text;
};
