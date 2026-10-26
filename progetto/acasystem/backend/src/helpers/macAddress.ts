/**
 * MAC address handling. A MAC is sensitive in Acasystem: it is never stored in tunet.db,
 * never logged and never sent back to the browser (D1b). It only travels to Home Assistant.
 */

const COLON_OR_DASH = /^[0-9a-f]{2}([:-])(?:[0-9a-f]{2}\1){4}[0-9a-f]{2}$/i;
const PLAIN = /^[0-9a-f]{12}$/i;
const DOTTED = /^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i;

/**
 * Lower-case `aa:bb:cc:dd:ee:ff`, or null. Accepted inputs: colon, dash, dotted (Cisco) and
 * plain hex. Group (multicast and broadcast) and all-zero addresses are not valid targets
 * of a magic packet for one TV, so they are refused.
 */
export const normalizeMacAddress = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!COLON_OR_DASH.test(trimmed) && !PLAIN.test(trimmed) && !DOTTED.test(trimmed)) return null;

  const hex = trimmed.replace(/[:.-]/g, '').toLowerCase();
  if (hex === '000000000000') return null;
  const firstOctet = Number.parseInt(hex.slice(0, 2), 16);
  if (firstOctet % 2 === 1) return null;

  return (hex.match(/../g) ?? []).join(':');
};

/** Hex digits only, for comparing a MAC with the text of a Home Assistant title. */
export const macDigits = (mac: string): string => mac.replace(/[^0-9a-f]/gi, '').toLowerCase();
