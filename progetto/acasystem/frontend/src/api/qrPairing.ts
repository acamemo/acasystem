import qrcode from 'qrcode-generator';
import { backendRequest } from '@/api/backendClient';
import { getValidatedHomeAssistantRequestHeadersAsync } from '@/api/apiAuth';
import { applySnapshot, collectSnapshot } from '@/api/snapshot';
import type { LauncherContextSetters } from '@/hooks/launcher/useSnapshotSetters';
import { applyAppearance, readAppearance, type Appearance } from '@/utils/appearance';
import { isObject } from '@/validators/guards';
import { parseWebPairingUrl, privatePairingOrigin } from '@/api/webPairing';

export const QR_PREFERENCES_KEY = 'aca_pairing_preferences';
export const QR_PREFERENCES_EVENT = 'acasystem:pairing-preferences';
export interface QrConfiguration {
  snapshot: { version: number; layout: Record<string, unknown>; appearance: Record<string, unknown> };
  appearance: Appearance;
}
export interface QrPreferences {
  schema: 1;
  mode: 'account' | 'configuration';
  houseId?: string;
  accountUserId?: string;
}
export interface QrAcceptance {
  schema: 1;
  pairingId: string;
  houseId: string;
  endpoint: string;
  mode: 'account' | 'configuration';
  loginRequired: true;
  accountUserId?: string;
  configuration?: QrConfiguration;
}
export interface QrInvitation {
  schema: 1;
  houseId: string;
  endpoint: string;
  invite: string;
  expiresAt: number;
}
export interface QrAccountSettings {
  revision: number;
  configuration: QrConfiguration;
  updatedAt: string;
}

export function collectQrConfiguration(): QrConfiguration {
  const snapshot = collectSnapshot();
  const appearance = readAppearance();
  return {
    snapshot: { version: 1, layout: { ...snapshot.layout }, appearance: {} },
    appearance,
  };
}

export function applyQrConfiguration(configuration: QrConfiguration, setters: LauncherContextSetters): void {
  applySnapshot(configuration.snapshot, setters);
  applyAppearance(configuration.appearance);
}

export function readQrPreferences(): QrPreferences | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(QR_PREFERENCES_KEY) || 'null');
    return isObject(value) && value.schema === 1 && (value.mode === 'account' || value.mode === 'configuration')
      ? value as unknown as QrPreferences : null;
  } catch { return null; }
}

/** CONFIG never changes the destination's house, authentication or endpoint. */
export function importQrPairing(value: QrAcceptance, setters: LauncherContextSetters): void {
  const previous = readQrPreferences();
  const next: QrPreferences = value.mode === 'account'
    ? { schema: 1, mode: 'account', houseId: value.houseId, accountUserId: value.accountUserId }
    : { ...previous, schema: 1, mode: 'configuration' };
  if (value.mode === 'configuration' && value.configuration) applyQrConfiguration(value.configuration, setters);
  localStorage.setItem(QR_PREFERENCES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(QR_PREFERENCES_EVENT));
}

/** File convalidato dalla propria centrale: conserva associazione e accesso di destinazione. */
export function importQrConfiguration(configuration: QrConfiguration, setters: LauncherContextSetters): void {
  const previous = readQrPreferences();
  applyQrConfiguration(configuration, setters);
  localStorage.setItem(QR_PREFERENCES_KEY, JSON.stringify({ ...previous, schema: 1, mode: 'configuration' }));
  window.dispatchEvent(new Event(QR_PREFERENCES_EVENT));
}

export function pairingUri(invite: QrInvitation): string {
  const origin = privatePairingOrigin(invite.endpoint);
  if (!origin || (invite.endpoint !== origin && invite.endpoint !== `${origin}/`)) throw new Error('Indirizzo ACA non valido per il QR Code.');
  const uri = new URL(`${origin}/`);
  uri.hash = `/collega?${new URLSearchParams({ v: '1', house: invite.houseId, invite: invite.invite })}`;
  if (parseWebPairingUrl(uri.href).kind !== 'ready') throw new Error('Invito ACA non valido per il QR Code.');
  return uri.href;
}

export function qrImage(uri: string): string {
  const code = qrcode(0, 'M');
  code.addData(uri, 'Byte');
  code.make();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(code.createSvgTag({ scalable: true, margin: 16 }))}`;
}

/** Plain connection QR: only the LAN origin, never an account or a session. */
export function centralConnectionUri(endpoint: string): string {
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new Error('Indirizzo della centrale non valido.'); }
  const octets = url.hostname.split('.');
  if (url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || (endpoint !== url.origin && endpoint !== `${url.origin}/`) || octets.length !== 4
    || octets.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255 || String(Number(part)) !== part)) {
    throw new Error('Indirizzo della centrale non valido.');
  }
  const [a, b] = octets.map(Number);
  if (a !== 10 && !(a === 192 && b === 168) && !(a === 172 && b !== undefined && b >= 16 && b <= 31)) {
    throw new Error('Usa l’indirizzo della centrale sulla rete locale.');
  }
  return `${url.origin}/`;
}

export async function readQrEndpoint(): Promise<string | null> {
  const bridge = (window as unknown as { acasystemShell?: { pairingEndpoint?: () => Promise<{ endpoint: string | null }> } }).acasystemShell;
  if (bridge?.pairingEndpoint) return (await bridge.pairingEndpoint()).endpoint;
  if (location.hostname === 'localhost' || /^127\./.test(location.hostname)) {
    try {
      const response = await fetch('/__acasystem/endpoint', { cache: 'no-store', credentials: 'same-origin' });
      const value: unknown = response.ok ? await response.json() : null;
      if (isObject(value) && typeof value.endpoint === 'string') return new URL(centralConnectionUri(value.endpoint)).origin;
    } catch { /* A normal browser on localhost has no native central endpoint. */ }
    return null;
  }
  // Direct browser access to the central server: its own private address is already usable.
  return /^http:\/\/(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(location.origin) ? location.origin : null;
}

export async function createQrInvitation(endpoint: string): Promise<QrInvitation> {
  const value = await backendRequest('/pairing/invites', {
    method: 'POST', body: JSON.stringify({ endpoint, configuration: collectQrConfiguration() }),
  });
  if (!isObject(value) || value.schema !== 1 || typeof value.invite !== 'string'
    || typeof value.houseId !== 'string' || typeof value.endpoint !== 'string' || typeof value.expiresAt !== 'number') {
    throw new Error('Risposta della centrale non valida.');
  }
  return value as unknown as QrInvitation;
}

export const readAccountSettings = (signal?: AbortSignal) => backendRequest('/pairing/settings', { signal }) as Promise<QrAccountSettings | null>;
export const writeAccountSettings = (baseRevision: number, configuration: QrConfiguration, signal?: AbortSignal) =>
  backendRequest('/pairing/settings', { method: 'PUT', body: JSON.stringify({ baseRevision, configuration }), signal }) as Promise<QrAccountSettings>;

/** Fetch streaming supports our bearer headers; EventSource would not send them. */
export async function watchAccountSettings(signal: AbortSignal, changed: (revision: number) => void): Promise<void> {
  const headers = await getValidatedHomeAssistantRequestHeadersAsync();
  const response = await fetch('./api/pairing/events', {
    headers: headers.Authorization ? { Authorization: headers.Authorization } : {}, signal,
  });
  if (!response.ok || !response.body) throw new Error('Collegamento alla sincronizzazione non disponibile.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) return;
      buffer += decoder.decode(part.value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = event.split('\n').find((line) => line.startsWith('data: '));
        if (!data) continue;
        const value: unknown = JSON.parse(data.slice(6));
        if (isObject(value) && Number.isSafeInteger(value.revision)) changed(Number(value.revision));
      }
    }
  } finally { reader.releaseLock(); }
}
