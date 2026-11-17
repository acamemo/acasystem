import type { ClientSession } from '@/api/clientSession';
import { newRequestId } from './requestId';

const MARKER = 'aca:access:instance:v2';
const LAST = 'aca:client:session:last:v2';
/** Cambiare account o uscire non rende accessibili le bozze del precedente accesso. */
export function resetClientAccess(): void {
  try { localStorage.setItem(MARKER, newRequestId()); localStorage.removeItem(LAST); } catch { /* Nessuna cache offline se lo storage non è disponibile. */ }
}
export function cacheClientSession(session: ClientSession): void {
  try {
    let marker = localStorage.getItem(MARKER);
    if (!marker) { marker = newRequestId(); localStorage.setItem(MARKER, marker); }
    const key = `aca:client:session:v2:${session.houseId}:${session.user.id}`;
    const { offline: _offline, ...value } = session;
    localStorage.setItem(key, JSON.stringify({ marker, value }));
    localStorage.setItem(LAST, key);
  } catch { /* Il server resta autorevole; la cache è solo recupero locale. */ }
}
export function readCachedClientSession(): ClientSession | null {
  try {
    const marker = localStorage.getItem(MARKER);
    const key = localStorage.getItem(LAST);
    if (!marker || !key?.startsWith('aca:client:session:v2:')) return null;
    const record = JSON.parse(localStorage.getItem(key) || 'null') as { marker?: string; value?: ClientSession } | null;
    const value = record?.value;
    if (record?.marker !== marker || !value?.houseId || !value.user?.id || !value.client?.id
      || value.client.userId !== value.user.id || value.client.revokedAt) return null;
    return { ...value, offline: true };
  } catch { return null; }
}
