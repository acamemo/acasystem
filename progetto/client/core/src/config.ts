import { DEFAULT_SERVER_PORT } from './defaults.ts';

/**
 * Indirizzo del mini PC (Q-A7, Q-A8, Q-A10): un solo impianto, IPv4 della rete locale,
 * porta del server Acasystem predefinita.
 */

export interface ClientConfig {
  host: string;
  port: number;
}

export type HostError = 'empty' | 'not-ipv4' | 'not-local';
export type PortError = 'invalid-port';

export type ParseResult<T, E> = { ok: true; value: T } | { ok: false; error: E };

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Reti private (RFC 1918) e loopback: fuori casa l'app non funziona (Q-A10). */
const isLocalIpv4 = ([a, b]: readonly number[]): boolean =>
  a === 10 ||
  a === 127 ||
  (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
  (a === 192 && b === 168);

/**
 * Accetta l'IP com'è scritto o incollato dalla barra di HA, per esempio
 * `http://192.168.1.184:8123/onboarding.html`: tiene solo l'host, perché la porta di HA
 * non è quella di Acasystem.
 */
export const parseHost = (input: string): ParseResult<string, HostError> => {
  let text = input.trim();
  if (!text) return { ok: false, error: 'empty' };
  text = text.replace(/^[a-z]+:\/\//i, '');
  text = text.split(/[/?#]/, 1)[0] ?? '';
  text = text.replace(/:\d*$/, '');
  const match = IPV4_PATTERN.exec(text);
  if (!match) return { ok: false, error: 'not-ipv4' };
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return { ok: false, error: 'not-ipv4' };
  if (!isLocalIpv4(octets)) return { ok: false, error: 'not-local' };
  return { ok: true, value: octets.join('.') };
};

export const parsePort = (input: string | number | undefined): ParseResult<number, PortError> => {
  if (input === undefined || (typeof input === 'string' && !input.trim())) {
    return { ok: true, value: DEFAULT_SERVER_PORT };
  }
  const text = String(input).trim();
  const port = /^\d{1,5}$/.test(text) ? Number(text) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return { ok: false, error: 'invalid-port' };
  return { ok: true, value: port };
};

export const serverOrigin = ({ host, port }: ClientConfig): string => `http://${host}:${port}`;

/** Legge la configurazione salvata; `null` se manca o è stata alterata (si riparte dalla procedura). */
export const parseStoredConfig = (value: unknown): ClientConfig | null => {
  if (typeof value !== 'object' || value === null) return null;
  const { host, port } = value as Record<string, unknown>;
  if (typeof host !== 'string' || (typeof port !== 'number' && typeof port !== 'string')) return null;
  const parsedHost = parseHost(host);
  const parsedPort = parsePort(port);
  if (!parsedHost.ok || !parsedPort.ok || parsedHost.value !== host) return null;
  return { host: parsedHost.value, port: parsedPort.value };
};
