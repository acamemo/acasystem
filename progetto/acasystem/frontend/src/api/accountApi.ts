import type { AccountAvatarVersion, AccountImageKind, AccountMetadata } from '../../../contracts/account';
import { AVATAR_MAX_BYTES, COVER_MAX_BYTES } from '../../../contracts/account';
import { backendRequest, getBackendOverride } from './backendClient';
import { getValidatedHomeAssistantRequestHeadersAsync } from './apiAuth';
import type { HomeAssistantRequestHeaders } from './apiAuth';
import { getClientSession, setClientSession, CLIENT_SESSION_EVENT, type ClientSession } from './clientSession';
import { ACTIVITY_CHANGED_EVENT } from './activityApi';
import { getDemoSource } from './demoSource';

export type { AccountMetadata, AccountImageKind };
export const ACCOUNT_CHANGED_EVENT = 'acasystem:account-changed';
const sameSession = (a: ClientSession | null, b: ClientSession): boolean => Boolean(a && a.houseId === b.houseId && a.user.id === b.user.id && a.client.id === b.client.id);
async function captured(authHeaders?: HomeAssistantRequestHeaders, expectedSession = getClientSession() ?? undefined) {
  const headers = authHeaders ?? (getBackendOverride() ? {} : await getValidatedHomeAssistantRequestHeadersAsync());
  if (expectedSession && !sameSession(getClientSession(), expectedSession)) throw new Error('L’accesso è cambiato. Riapri il tuo account.');
  return { headers, session: expectedSession, control: { authHeadersOverride: headers, retryOnOAuthUnauthorized: false, notifyOnUnauthorized: false } };
}
export const readAccount = async (authHeaders?: HomeAssistantRequestHeaders, expectedSession?: ClientSession): Promise<AccountMetadata> => {
  const access = await captured(authHeaders, expectedSession);
  return await backendRequest('/v2/account', {}, access.control) as AccountMetadata;
};
const updated = (metadata: AccountMetadata, expectedSession?: ClientSession): AccountMetadata => {
  const session = getClientSession();
  if (!expectedSession || metadata.userId !== expectedSession.user.id || !sameSession(session, expectedSession)) return metadata;
  lastManifest = 0;
  if (session?.user.id === metadata.userId) setClientSession({ ...session, user: { ...session.user, color: metadata.color } });
  window.dispatchEvent(new CustomEvent(ACCOUNT_CHANGED_EVENT, { detail: metadata }));
  return metadata;
};
export const saveAccountColor = async (baseRevision: number, color: string, authHeaders?: HomeAssistantRequestHeaders, expectedSession?: ClientSession): Promise<AccountMetadata> => {
  const access = await captured(authHeaders, expectedSession);
  return updated(await backendRequest('/v2/account', { method: 'PATCH', body: JSON.stringify({ baseRevision, color }) }, access.control) as AccountMetadata, access.session);
};
export const saveAccountImage = async (kind: AccountImageKind, baseRevision: number, dataUrl: string, authHeaders?: HomeAssistantRequestHeaders, expectedSession?: ClientSession): Promise<AccountMetadata> => {
  const access = await captured(authHeaders, expectedSession);
  return updated(await backendRequest(`/v2/account/images/${kind}`, { method: 'PUT', body: JSON.stringify({ baseRevision, dataUrl }) }, access.control) as AccountMetadata, access.session);
};
export const removeAccountImage = async (kind: AccountImageKind, baseRevision: number, authHeaders?: HomeAssistantRequestHeaders, expectedSession?: ClientSession): Promise<AccountMetadata> => {
  const access = await captured(authHeaders, expectedSession);
  return updated(await backendRequest(`/v2/account/images/${kind}`, { method: 'DELETE', body: JSON.stringify({ baseRevision }) }, access.control) as AccountMetadata, access.session);
};

async function imageBlob(path: string, maxBytes: number, authHeaders?: HomeAssistantRequestHeaders, expectedSession?: ClientSession): Promise<Blob | null> {
  const access = await captured(authHeaders, expectedSession);
  const override = getBackendOverride();
  const synthetic = override ? await override({ method: 'GET', path: `/v2/account${path}`, body: null }) : null;
  const response = synthetic ? new Response(synthetic.blob ?? null, { status: synthetic.status })
    : await fetch(`./api/v2/account${path}`, { headers: { ...access.headers }, cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Immagine account non disponibile.');
  const blob = await response.blob();
  if (access.session && !sameSession(getClientSession(), access.session)) throw new Error('L’accesso è cambiato. Riapri il tuo account.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || blob.size > maxBytes) throw new Error('Formato immagine account non valido.');
  return blob;
}
export const readOwnAccountImage = (kind: AccountImageKind, authHeaders?: HomeAssistantRequestHeaders, expectedSession?: ClientSession): Promise<Blob | null> =>
  imageBlob(`/images/${kind}`, kind === 'avatar' ? AVATAR_MAX_BYTES : COVER_MAX_BYTES, authHeaders, expectedSession);

let scope = '';
let versions = new Map<string, number>();
export const hasAccountAvatar = (userId: string): boolean => versions.has(userId);
let lastManifest = 0;
let loading: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();
const images = new Map<string, Promise<string | null>>();
const blobUrls = new Set<string>();
const emit = () => { for (const listener of listeners) listener(); };
function clearImages() {
  for (const url of blobUrls) URL.revokeObjectURL(url);
  blobUrls.clear(); images.clear();
}
async function refreshAvatars(force = false): Promise<void> {
  const session = getClientSession();
  if (!session || getDemoSource()) {
    scope = ''; versions.clear(); lastManifest = 0; clearImages();
    return;
  }
  const nextScope = `${session.houseId}:${session.user.id}`;
  if (scope !== nextScope) { scope = nextScope; versions.clear(); lastManifest = 0; clearImages(); }
  if (loading) return loading;
  if (!force && Date.now() - lastManifest < 30_000) return;
  const requestedScope = scope;
  loading = (async () => {
    try {
      const rows = await backendRequest('/v2/account/avatars') as AccountAvatarVersion[];
      if (requestedScope !== scope || !Array.isArray(rows)) return;
      const next = new Map(rows.filter((row) => typeof row.userId === 'string' && Number.isInteger(row.avatarRevision))
        .map((row) => [row.userId, row.avatarRevision]));
      if (JSON.stringify([...next]) !== JSON.stringify([...versions])) { clearImages(); versions = next; emit(); }
      lastManifest = Date.now();
    } catch { /* Offline: conserva soltanto la cache della casa e dell'account attivi. */ }
  })().finally(() => { loading = null; });
  return loading;
}
export async function accountAvatarUrl(userId: string): Promise<string | null> {
  await refreshAvatars();
  const revision = versions.get(userId);
  if (revision === undefined) return null;
  const requestedScope = scope;
  const key = `${scope}:${userId}:${revision}`;
  if (!images.has(key)) images.set(key, imageBlob(`/users/${encodeURIComponent(userId)}/avatar`, AVATAR_MAX_BYTES).then((blob) => {
    if (!blob || scope !== requestedScope) { images.delete(key); return null; }
    const url = URL.createObjectURL(blob); blobUrls.add(url); return url;
  }).catch(() => { images.delete(key); return null; }));
  return images.get(key)!;
}
const changed = () => { void refreshAvatars(true).then(emit); };
const visible = () => { if (document.visibilityState === 'visible') changed(); };
export function subscribeAccountAvatars(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(changed, 30_000);
    window.addEventListener(ACCOUNT_CHANGED_EVENT, changed);
    window.addEventListener(ACTIVITY_CHANGED_EVENT, changed);
    window.addEventListener(CLIENT_SESSION_EVENT, changed);
    document.addEventListener('visibilitychange', visible);
    changed();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer); timer = null;
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, changed);
      window.removeEventListener(ACTIVITY_CHANGED_EVENT, changed);
      window.removeEventListener(CLIENT_SESSION_EVENT, changed);
      document.removeEventListener('visibilitychange', visible);
    }
  };
}
