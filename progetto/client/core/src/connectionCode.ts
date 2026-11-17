import { parseHost, parsePort } from './config.ts';
import type { ClientConfig, ParseResult } from './config.ts';

/** QR di solo collegamento alla centrale: non contiene inviti, account o credenziali. */
export const parseConnectionCode = (
  value: string,
): ParseResult<ClientConfig, 'invalid-code' | 'unsupported-endpoint'> => {
  if (value.length > 2048) return { ok: false, error: 'invalid-code' };
  let url: URL;
  try { url = new URL(value); } catch { return { ok: false, error: 'invalid-code' }; }
  const host = parseHost(url.hostname);
  const port = parsePort(url.port || 80);
  if (url.protocol !== 'http:' || !host.ok || host.value.startsWith('127.') || !port.ok
    || url.username || url.password) return { ok: false, error: 'unsupported-endpoint' };
  if (url.pathname !== '/' || url.search || url.hash
    || (value !== url.origin && value !== `${url.origin}/`)) return { ok: false, error: 'invalid-code' };
  return { ok: true, value: { host: host.value, port: port.value } };
};
