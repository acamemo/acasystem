import type { AuthData } from 'home-assistant-js-websocket';
import type { ClientSession } from './clientSession';
import { CLIENT_SESSION_EVENT, getClientSession, setClientSession } from './clientSession';
import { backendRequest } from './backendClient';
import { getValidatedHomeAssistantRequestHeadersAsync } from './apiAuth';
import { readAccount } from './accountApi';
import { isObject } from '@/validators/guards';
import { newRequestId } from '@/utils/requestId';
import { discardAppearanceImages, readAppearanceImages, rememberAppearanceImages, validateAppearanceImages, type AppearanceImages } from '@/components/account/appearanceDraft';
import { commitAccountAppearance } from '@/components/account/accountAppearanceController';
import { readOwnAccountImage } from './accountApi';
import { cropDataUrl } from '@/components/account/imageCrop';

export const OWNER_APPEARANCE_KEY = 'aca:setup:owner-appearance';
interface OwnerAppearance {
  version: 1;
  id: string;
  username: string;
  color: string;
  houseId?: string;
  userId?: string;
  kind?: 'member';
  attemptId?: string;
}
const inflight = new Map<string, Promise<void>>();
let imageScope: { id: string; key: string } | null = null;
const sessionKey = (session: ClientSession) => `${session.houseId}:${session.user.id}:${session.client.id}`;
window.addEventListener(CLIENT_SESSION_EVENT, () => {
  const current = getClientSession();
  if (imageScope && (!current || sessionKey(current) !== imageScope.key)) {
    discardAppearanceImages(imageScope.id); imageScope = null;
  }
});

/** Non-secret intent only. Passwords, tokens and sessions never enter this record. */
export function readOwnerAppearance(): OwnerAppearance | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(OWNER_APPEARANCE_KEY) || 'null');
    if (!isObject(value) || value.version !== 1 || typeof value.id !== 'string'
      || typeof value.username !== 'string' || !value.username || value.username.length > 64
      || value.username !== value.username.trim().toLowerCase() || [...value.username].some((char) => char.charCodeAt(0) < 32)
      || typeof value.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.color)
      || (value.houseId !== undefined && typeof value.houseId !== 'string')
      || (value.userId !== undefined && typeof value.userId !== 'string')
      || Boolean(value.houseId) !== Boolean(value.userId)) return null;
    return { version: 1, id: value.id, username: value.username, color: value.color,
      ...(value.kind === 'member' && typeof value.attemptId === 'string' ? { kind: 'member' as const, attemptId: value.attemptId } : {}),
      ...(typeof value.houseId === 'string' && typeof value.userId === 'string'
        ? { houseId: value.houseId, userId: value.userId } : {}) };
  } catch { return null; }
}

function write(value: OwnerAppearance): void {
  try { sessionStorage.setItem(OWNER_APPEARANCE_KEY, JSON.stringify(value)); }
  catch { throw new Error('Non riesco a conservare il colore. Riprova.'); }
}

export function rememberOwnerAppearance(username: string, color: string, images: AppearanceImages = {}): void {
  const value = { version: 1 as const, id: newRequestId(), username, color: color.toLowerCase() };
  validateAppearanceImages(images); write(value); rememberAppearanceImages(value.id, images);
}
export function rememberMemberAppearance(username: string, color: string, attemptId: string, images: AppearanceImages): void {
  const previous = readOwnerAppearance();
  const value: OwnerAppearance = { version: 1, id: previous?.attemptId === attemptId ? previous.id : newRequestId(), username, color: color.toLowerCase(), kind: 'member', attemptId };
  validateAppearanceImages(images); write(value); rememberAppearanceImages(value.id, images);
}
export function discardUnboundAppearanceImages(): void {
  const pending = readOwnerAppearance();
  if (pending && !pending.userId) discardAppearanceImages(pending.id);
}
export async function bindMemberAppearance(tokens: AuthData, userId: string, attemptId: string, isCurrent = () => true): Promise<void> {
  const pending = readOwnerAppearance();
  if (pending?.kind !== 'member' || pending.attemptId !== attemptId) return;
  const value = await backendRequest('/v2/bootstrap', {}, { authHeadersOverride: { Authorization: `Bearer ${tokens.access_token}` }, retryOnOAuthUnauthorized: false, notifyOnUnauthorized: false });
  if (!isObject(value) || typeof value.houseId !== 'string' || !isObject(value.user) || value.user.id !== userId) throw new Error('Non riesco a verificare il tuo account. Riprova.');
  if (pending.userId && (pending.userId !== userId || pending.houseId !== value.houseId)) throw new Error('La personalizzazione appartiene a un altro account.');
  if (isCurrent() && readOwnerAppearance()?.id === pending.id) write({ ...pending, houseId: value.houseId, userId });
}

/** Bind only a matching actual login, using its exact transient token and fresh HA identity. */
export function bindOwnerAppearance(tokens: AuthData, loginUsername: string): Promise<void> | null {
  const pending = readOwnerAppearance();
  if (!pending || pending.kind === 'member' || pending.username !== loginUsername.trim().toLowerCase()) return null;
  const headers = { Authorization: `Bearer ${tokens.access_token}` };
  return backendRequest('/v2/bootstrap', {}, { authHeadersOverride: headers, retryOnOAuthUnauthorized: false, notifyOnUnauthorized: false })
    .then((value) => {
      if (!isObject(value) || value.protocol !== 2 || typeof value.houseId !== 'string'
        || !isObject(value.user) || typeof value.user.id !== 'string') throw new Error('Non riesco a verificare il tuo account. Riprova.');
      if (pending.userId && (pending.userId !== value.user.id || pending.houseId !== value.houseId))
        throw new Error('Il colore in attesa appartiene a un altro account.');
      if (readOwnerAppearance()?.id === pending.id)
        write({ ...pending, houseId: value.houseId, userId: value.user.id });
    });
}

export function hasOwnerAppearance(session: ClientSession): boolean {
  const pending = readOwnerAppearance();
  return Boolean(pending?.userId && pending.houseId === session.houseId && pending.userId === session.user?.id);
}

/** Registered client only. Captured auth headers prevent a concurrent account switch coloring another user. */
export function applyOwnerAppearance(session: ClientSession): Promise<void> {
  const pending = readOwnerAppearance();
  if (!pending?.userId || pending.houseId !== session.houseId || pending.userId !== session.user?.id)
    return Promise.resolve();
  const existing = inflight.get(pending.id);
  if (existing) return existing;
  const applying = (async () => {
    imageScope = { id: pending.id, key: sessionKey(session) };
    const headers = await getValidatedHomeAssistantRequestHeadersAsync();
    if (!headers.Authorization) throw new Error('Accedi di nuovo per completare il colore del tuo account.');
    const current = await backendRequest('/v2/bootstrap', {}, { authHeadersOverride: headers, retryOnOAuthUnauthorized: false, notifyOnUnauthorized: false });
    if (!isObject(current) || current.houseId !== pending.houseId || !isObject(current.user)
      || current.user.id !== pending.userId || !isObject(current.client) || current.client.revokedAt)
      throw new Error('Non riesco a verificare questo accesso. Il colore è conservato.');
    const account = await readAccount(headers, session);
    if (account.userId !== pending.userId) throw new Error('Il colore in attesa appartiene a un altro account.');
    let accepted = account.revision > 0 && account.color.toLowerCase() === pending.color.toLowerCase()
      ? account : await commitAccountAppearance(account, { kind: 'color', color: pending.color }, headers, session);
    if (accepted.userId !== pending.userId || accepted.color.toLowerCase() !== pending.color.toLowerCase())
      throw new Error('Il colore non è stato confermato. Riprova.');
    const images = readAppearanceImages(pending.id);
    for (const kind of ['avatar', 'cover'] as const) {
      const dataUrl = images[kind];
      if (!dataUrl) continue;
      const existing = accepted[kind === 'avatar' ? 'avatarRevision' : 'coverRevision'] == null ? null : await readOwnAccountImage(kind, headers, session);
      if (existing && await cropDataUrl(existing) === dataUrl) continue;
      accepted = await commitAccountAppearance(accepted, { kind, dataUrl }, headers, session);
      if (accepted.userId !== pending.userId) throw new Error('L’immagine non è stata confermata. Riprova.');
    }
    const active = getClientSession();
    if (active?.houseId === session.houseId && active.user.id === session.user.id
      && active.client.id === session.client.id && active.user.color !== accepted.color)
      setClientSession({ ...active, user: { ...active.user, color: accepted.color } });
    if (readOwnerAppearance()?.id === pending.id) {
      try { sessionStorage.removeItem(OWNER_APPEARANCE_KEY); }
      catch { throw new Error('Il colore è salvato. Riprova per completare.'); }
    }
    discardAppearanceImages(pending.id);
    if (imageScope?.id === pending.id) imageScope = null;
  })().finally(() => { if (inflight.get(pending.id) === applying) inflight.delete(pending.id); });
  inflight.set(pending.id, applying);
  return applying;
}
