/** randomUUID richiede un contesto sicuro; getRandomValues funziona anche via IP HTTP in LAN. */
export function newRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const values = crypto.getRandomValues(new Uint8Array(16));
  values[6] = (values[6]! & 15) | 64;
  values[8] = (values[8]! & 63) | 128;
  const hex = [...values].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
