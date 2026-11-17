import { parseHost, parsePort } from './config.ts';
import type { ClientConfig } from './config.ts';

export interface PairingCode {
  endpoint: string;
  houseId: string;
  invite: string;
  config: ClientConfig;
}

export type PairingCodeResult =
  | { ok: true; value: PairingCode }
  | {
      ok: false;
      error: 'invalid-code' | 'unsupported-version' | 'unsupported-endpoint';
    };

/** URL apribile anche senza app. Il collegamento alla centrale deriva soltanto dall’origine. */
const parseWebPairingCode = (value: string, url: URL): PairingCodeResult => {
  if (
    url.pathname !== '/' ||
    url.search ||
    !url.hash.startsWith('#/collega?') ||
    value !== `${url.origin}/${url.hash}`
  )
    return { ok: false, error: 'invalid-code' };
  const host = parseHost(url.hostname);
  if (
    url.protocol !== 'http:' ||
    !host.ok ||
    host.value.startsWith('127.') ||
    url.port !== '3002' ||
    url.username ||
    url.password
  )
    return { ok: false, error: 'unsupported-endpoint' };

  const rawParams = url.hash.slice('#/collega?'.length);
  const params = new URLSearchParams(rawParams);
  const keys = ['v', 'house', 'invite'];
  if (
    rawParams
      .split('&')
      .some((part) => !/^(v|house|invite)=[a-zA-Z0-9_-]+$/.test(part)) ||
    [...params.keys()].some((key) => !keys.includes(key)) ||
    keys.some((key) => params.getAll(key).length !== 1)
  )
    return { ok: false, error: 'invalid-code' };
  if (params.get('v') !== '1')
    return { ok: false, error: 'unsupported-version' };
  const houseId = params.get('house') ?? '';
  const invite = params.get('invite') ?? '';
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      houseId,
    ) ||
    !/^[a-zA-Z0-9_-]{43}$/.test(invite)
  )
    return { ok: false, error: 'invalid-code' };
  return {
    ok: true,
    value: {
      endpoint: url.origin,
      houseId,
      invite,
      config: { host: host.value, port: 3002 },
    },
  };
};

/** QR di acquisizione: non contiene credenziali HA e non cambia la casa del client. */
export function parsePairingCode(value: string): PairingCodeResult {
  if (value.length > 2048) return { ok: false, error: 'invalid-code' };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: 'invalid-code' };
  }
  if (url.protocol === 'http:' || url.protocol === 'https:')
    return parseWebPairingCode(value, url);
  if (
    url.protocol !== 'acasystem:' ||
    url.hostname !== 'pair' ||
    url.pathname ||
    url.hash ||
    url.username ||
    url.password ||
    url.port
  ) {
    return { ok: false, error: 'invalid-code' };
  }
  const keys = ['v', 'endpoint', 'house', 'invite'];
  if (
    [...url.searchParams.keys()].some((key) => !keys.includes(key)) ||
    keys.some((key) => url.searchParams.getAll(key).length !== 1)
  ) {
    return { ok: false, error: 'invalid-code' };
  }
  if (url.searchParams.get('v') !== '1')
    return { ok: false, error: 'unsupported-version' };
  const houseId = url.searchParams.get('house') ?? '';
  const invite = url.searchParams.get('invite') ?? '';
  if (
    !/^[a-zA-Z0-9_-]{1,128}$/.test(houseId) ||
    !/^[a-zA-Z0-9_-]{20,256}$/.test(invite)
  ) {
    return { ok: false, error: 'invalid-code' };
  }
  try {
    const rawEndpoint = url.searchParams.get('endpoint') ?? '';
    const endpoint = new URL(rawEndpoint);
    const host = parseHost(endpoint.hostname);
    const port = parsePort(endpoint.port || 80);
    // Il proxy Android attuale è HTTP/LAN. Niente loopback di un altro dispositivo o URL nascosti.
    if (
      endpoint.protocol !== 'http:' ||
      !host.ok ||
      host.value.startsWith('127.') ||
      !port.ok ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      endpoint.pathname !== '/' ||
      (rawEndpoint !== endpoint.origin && rawEndpoint !== `${endpoint.origin}/`)
    ) {
      return { ok: false, error: 'unsupported-endpoint' };
    }
    return {
      ok: true,
      value: {
        endpoint: endpoint.origin,
        houseId,
        invite,
        config: { host: host.value, port: port.value },
      },
    };
  } catch {
    return { ok: false, error: 'unsupported-endpoint' };
  }
}
