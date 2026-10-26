/**
 * Validation of the addresses a customer may hand to Home Assistant. Acasystem never scans
 * the network: these functions only check text and compute a broadcast address.
 */

export type Ipv4 = readonly [number, number, number, number];

/** Dotted-decimal IPv4 without leading zeros (so `010` is never read as octal), or null. */
export const parseIpv4 = (value: unknown): Ipv4 | null => {
  if (typeof value !== 'string') return null;
  const parts = value.trim().split('.');
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    octets.push(octet);
  }
  return [octets[0] ?? 0, octets[1] ?? 0, octets[2] ?? 0, octets[3] ?? 0];
};

export const formatIpv4 = (ip: Ipv4): string => ip.join('.');

/**
 * Address of a private LAN (RFC 1918): 10/8, 172.16/12 and 192.168/16. The 172.30.32.0/23
 * network is the internal network of the Home Assistant Supervisor (HAOS): never a device.
 */
export const isPrivateLanAddress = ([a, b, c]: Ipv4): boolean =>
  a === 10 ||
  (a === 172 && b >= 16 && b <= 31 && !(b === 30 && (c === 32 || c === 33))) ||
  (a === 192 && b === 168);

/**
 * Host of a device (D1): a private IPv4 address of the local network, nothing else. DNS names
 * are refused because a name can resolve to loopback or to the Supervisor network, which a
 * check on the text cannot see; so are public, loopback, link-local, multicast and reserved
 * addresses, IPv6 and anything with a scheme, port, path or credentials. Returns the
 * normalised host, or null.
 */
export const normalizeDeviceHost = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const ip = parseIpv4(value.trim());
  return ip && isPrivateLanAddress(ip) ? formatIpv4(ip) : null;
};

/**
 * Broadcast address for the magic packet (installer only): a private LAN address, or the
 * limited broadcast 255.255.255.255 that never leaves the local network.
 */
export const normalizeBroadcastAddress = (value: unknown): string | null => {
  const ip = parseIpv4(value);
  if (!ip) return null;
  if (ip.every((octet) => octet === 255)) return formatIpv4(ip);
  return isPrivateLanAddress(ip) ? formatIpv4(ip) : null;
};

/** UDP port 1-65535 as a number, or null. */
export const normalizePort = (value: unknown): number | null => {
  const port = typeof value === 'string' && /^[0-9]{1,5}$/.test(value) ? Number(value) : value;
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65_535) return null;
  return port;
};

/**
 * Broadcast address of the network that holds `ip` (default /24: 192.168.1.26 gives
 * 192.168.1.255). Pure arithmetic: the server does not look at the network.
 */
export const deriveBroadcastAddress = (ip: unknown, prefix = 24): string | null => {
  const parsed = parseIpv4(ip);
  if (!parsed || !Number.isInteger(prefix) || prefix < 8 || prefix > 30) return null;

  const address = parsed.reduce((acc, octet) => acc * 256 + octet, 0);
  const hostBits = 32 - prefix;
  const hostMask = 2 ** hostBits - 1;
  const broadcast = Math.floor(address / 2 ** hostBits) * 2 ** hostBits + hostMask;
  return formatIpv4([
    Math.floor(broadcast / 2 ** 24) % 256,
    Math.floor(broadcast / 2 ** 16) % 256,
    Math.floor(broadcast / 2 ** 8) % 256,
    broadcast % 256,
  ]);
};
