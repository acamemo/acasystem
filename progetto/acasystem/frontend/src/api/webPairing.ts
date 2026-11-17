import { backendRequest } from '@/api/backendClient';
import type { QrAcceptance, QrConfiguration } from '@/api/qrPairing';
import { isObject } from '@/validators/guards';

export const MAX_LAYOUT_FILE_BYTES = 512 * 1024;
export const LAYOUT_FILE_FORMAT = 'acasystem-layout';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const INVITE = /^[A-Za-z0-9_-]{43}$/;

export interface WebPairingCode { houseId: string; invite: string; }
export type WebPairingEntry = { kind: 'ready'; code: WebPairingCode } | { kind: 'invalid' };

/** Il browser parla soltanto con l'origine privata da cui ha caricato ACA. */
export function privatePairingOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    const octets = url.hostname.split('.');
    if (url.protocol !== 'http:' || url.port !== '3002' || url.username || url.password
      || octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part)
        || Number(part) > 255 || String(Number(part)) !== part)) return null;
    const [a, b] = octets.map(Number);
    return a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168)
      ? url.origin : null;
  } catch { return null; }
}

export function parseWebPairingUrl(value: string): WebPairingEntry {
  try {
    if (value.length > 2048 || /\s/.test(value)) return { kind: 'invalid' };
    const url = new URL(value);
    if (!privatePairingOrigin(value) || value.split('#')[0] !== `${url.origin}/`) return { kind: 'invalid' };
    const hash = /^#\/collega\?([^#]+)$/.exec(url.hash);
    if (!hash?.[1] || hash[1].split('&').some((part) => !/^(v|house|invite)=[A-Za-z0-9_-]+$/.test(part))) return { kind: 'invalid' };
    const params = new URLSearchParams(hash[1]);
    const keys = ['v', 'house', 'invite'];
    if ([...params.keys()].some((key) => !keys.includes(key))
      || keys.some((key) => params.getAll(key).length !== 1)
      || params.get('v') !== '1' || !UUID.test(params.get('house') ?? '') || !INVITE.test(params.get('invite') ?? '')) {
      return { kind: 'invalid' };
    }
    return { kind: 'ready', code: { houseId: params.get('house')!, invite: params.get('invite')! } };
  } catch { return { kind: 'invalid' }; }
}

/** Cattura prima dei provider React e toglie subito l'invito dalla barra/cronologia corrente. */
export function captureWebPairing(location: Pick<Location, 'href' | 'hash'>, history: Pick<History, 'replaceState' | 'state'>): WebPairingEntry | null {
  if (!location.hash.startsWith('#/collega')) return null;
  const entry = parseWebPairingUrl(location.href);
  history.replaceState(history.state, '', `${new URL(location.href).origin}/#/`);
  return entry;
}

export async function acceptWebPairing(code: WebPairingCode, action: 'account' | 'configuration'): Promise<QrAcceptance> {
  const origin = privatePairingOrigin(window.location.href);
  if (!origin || !UUID.test(code.houseId) || !INVITE.test(code.invite)) throw new Error('Il collegamento ACA non è valido.');
  const response = await fetch('./api/pairing/accept', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store', credentials: 'omit',
    body: JSON.stringify({ houseId: code.houseId, invite: code.invite, action }),
  });
  if (response.status === 410) throw new Error('Il QR Code è scaduto o è già stato usato. Generane uno nuovo sul PC.');
  if (!response.ok) throw new Error('Non riesco a completare il collegamento. Genera un nuovo QR Code e riprova.');
  const value: unknown = await response.json();
  if (!isObject(value) || value.schema !== 1 || value.houseId !== code.houseId || value.endpoint !== origin
    || value.mode !== action || value.loginRequired !== true || typeof value.pairingId !== 'string' || !UUID.test(value.pairingId)
    || (action === 'account' && (typeof value.accountUserId !== 'string' || !value.accountUserId))
    || (action === 'configuration' && !isQrConfiguration(value.configuration))) {
    throw new Error('La centrale non ha restituito un collegamento ACA valido.');
  }
  return value as unknown as QrAcceptance;
}

const isQrConfiguration = (value: unknown): value is QrConfiguration => isObject(value)
  && isObject(value.snapshot) && value.snapshot.version === 1 && isObject(value.snapshot.layout)
  && isObject(value.snapshot.appearance) && isObject(value.appearance);

export function portableLayoutFile(configuration: QrConfiguration): string {
  const text = JSON.stringify({ format: LAYOUT_FILE_FORMAT, schema: 1, configuration });
  if (new Blob([text]).size > MAX_LAYOUT_FILE_BYTES) throw new Error('Il layout supera 512 KB. Riducilo e genera un nuovo QR Code.');
  return text;
}

export function downloadPortableLayout(configuration: QrConfiguration): void {
  const url = URL.createObjectURL(new Blob([portableLayoutFile(configuration)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'acasystem-layout.aca.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Il server della propria casa ricontrolla e rende portabile anche un file alterato. */
export async function importPortableLayoutFile(file: Pick<File, 'size' | 'text'>): Promise<QrConfiguration> {
  if (!file.size || file.size > MAX_LAYOUT_FILE_BYTES) throw new Error('Scegli un file layout ACA di massimo 512 KB.');
  let value: unknown;
  try { value = JSON.parse(await file.text()); } catch { throw new Error('Il file layout ACA non è leggibile.'); }
  if (!isObject(value) || value.format !== LAYOUT_FILE_FORMAT || value.schema !== 1 || !isQrConfiguration(value.configuration)) {
    throw new Error('Il file non contiene un layout ACA compatibile.');
  }
  return validatePortableLayoutConfiguration(value.configuration);
}

export async function validatePortableLayoutConfiguration(configuration: QrConfiguration): Promise<QrConfiguration> {
  const imported = await backendRequest('/pairing/configuration/import', { method: 'POST', body: JSON.stringify({
    format: LAYOUT_FILE_FORMAT, schema: 1, configuration,
  }) });
  if (!isObject(imported) || imported.schema !== 1 || !isQrConfiguration(imported.configuration)) {
    throw new Error('La propria centrale non ha convalidato il layout ACA.');
  }
  return imported.configuration;
}
