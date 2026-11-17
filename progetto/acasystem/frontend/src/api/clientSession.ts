import type { ClientRecord, CollaborationBootstrap } from '../../../contracts/collaboration';
import { backendRequest } from '@/api/backendClient';
import { isObject } from '@/validators/guards';
import { newRequestId } from '@/utils/requestId';
import { cacheClientSession } from '@/utils/clientSessionCache';

export type { ClientRecord, CollaborationBootstrap };
export interface ClientSession {
  client: ClientRecord;
  houseId: string;
  user: CollaborationBootstrap['user'];
  offline?: boolean;
}
let currentSession: ClientSession | null = null;
export const CLIENT_SESSION_EVENT = 'acasystem:client-session';
/** Solo metadati: non contiene token e non sostituisce l'autorizzazione server. */
export const getClientSession = (): ClientSession | null => currentSession;
export function setClientSession(value: ClientSession | null): void {
  currentSession = value;
  if (value && !value.offline) cacheClientSession(value);
  window.dispatchEvent(new Event(CLIENT_SESSION_EVENT));
}
const client = (value: unknown): ClientRecord => {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.userId !== 'string'
    || typeof value.label !== 'string' || !['windows', 'android', 'web'].includes(String(value.platform))) {
    throw new Error('La centrale ha restituito un dispositivo non valido.');
  }
  return value as unknown as ClientRecord;
};
export async function readClientBootstrap(signal?: AbortSignal): Promise<CollaborationBootstrap> {
  const value = await backendRequest('/v2/bootstrap', { signal });
  if (!isObject(value) || value.protocol !== 2 || typeof value.houseId !== 'string'
    || !isObject(value.user) || typeof value.user.id !== 'string' || typeof value.user.name !== 'string') {
    throw new Error('Aggiorna ACA sulla centrale per collegare questo dispositivo.');
  }
  return value as unknown as CollaborationBootstrap;
}
export function currentClientId(houseId: string, userId: string): string {
  const key = `aca:client:v2:${houseId}:${userId}`;
  try { const saved = localStorage.getItem(key); if (saved) return saved; } catch { /* Il server conserva il legame della sessione. */ }
  const id = newRequestId();
  try { localStorage.setItem(key, id); } catch { /* Accesso privato: resta valido per la sessione HA. */ }
  return id;
}
export function clientPlatform(): ClientRecord['platform'] {
  const agent = navigator.userAgent;
  return /Electron/i.test(agent) ? 'windows' : /Android/i.test(agent) ? 'android' : 'web';
}
export function defaultClientLabel(): string {
  try {
    const saved = localStorage.getItem('tunet_device_label')?.trim();
    if (saved) return saved;
  } catch { /* Il nome automatico non richiede memoria locale. */ }
  const agent = navigator.userAgent;
  if (/iPhone/i.test(agent)) return 'iPhone';
  if (/iPad/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/i.test(agent)) return /Mobile/i.test(agent) ? 'Telefono Android' : 'Tablet Android';
  if (/Windows/i.test(agent)) return 'PC Windows';
  if (/Macintosh|Mac OS X/i.test(agent)) return 'Mac';
  return 'Browser';
}
export async function registerClient(houseId: string, userId: string, label: string): Promise<ClientRecord> {
  return client(await backendRequest('/v2/clients', { method: 'POST', body: JSON.stringify({
    clientId: currentClientId(houseId, userId), label, platform: clientPlatform(),
  }) }));
}
export async function listClients(): Promise<ClientRecord[]> {
  const value = await backendRequest('/v2/clients');
  if (!Array.isArray(value)) throw new Error('Elenco dispositivi non disponibile.');
  return value.map(client);
}
export async function renameClient(id: string, label: string): Promise<ClientRecord> {
  const record = client(await backendRequest(`/v2/clients/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ label }) }));
  if (currentSession?.client.id === record.id) setClientSession({ ...currentSession, client: record });
  return record;
}
export async function revokeClient(id: string): Promise<ClientRecord> {
  return client(await backendRequest(`/v2/clients/${encodeURIComponent(id)}/revoke`, { method: 'POST', body: '{}' }));
}
