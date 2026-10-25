/**
 * The Casa 3D plan commands, answered by the REST routes of the Acasystem backend (ADR-0014, T6).
 *
 * The Casa 3D bundle talks to its backend with `hass.callWS({ type: 'casa3d/...' })` (the original
 * was a websocket integration). This module is the whole translation to `/api/casa3d/*`; the bundle
 * is not changed. It holds the revision of the plan document the bundle has in memory (the last one
 * delivered by a read, a save or an import) and sends it with every save as `base_revision`
 * (compare-and-swap): when the server has a newer one, the save fails with the code
 * `revision_conflict` and nothing is overwritten. A restore does not move that revision: the bundle
 * is told at once that the server has another one and reloads, and until it does a save is refused.
 * One instance belongs to one element, because the revision is the one of its document. The role is
 * never decided here: the server checks the user from the Home Assistant token (every signed-in user may
 * write, ISSUE-102; 401 without one).
 *
 * Pictures travel as binary (`PUT /images/:id`), not as the data addresses the bundle uses: they are
 * converted here, so the server can look at the bytes.
 *
 * Plain functions with an injected `request`, so it is tested without a browser or a server.
 */
import { isRecord } from '@/validators/guards';

/** What the module needs of a response; `Response` fits. */
export interface PlanResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
  headers: { get(name: string): string | null };
}

export interface PlanRequestInit {
  method: 'GET' | 'PUT' | 'POST' | 'DELETE';
  /** A JSON text or the bytes of a picture. */
  body?: string | Uint8Array;
  headers?: Record<string, string>;
}

/** Sends a request to `/api/casa3d` + `path` with the signed-in user's token. */
export type PlanRequest = (path: string, init: PlanRequestInit) => Promise<PlanResponse>;

export type PlanErrorCode =
  | 'revision_conflict'
  | 'revision_unknown'
  | 'forbidden'
  | 'not_found'
  | 'too_large'
  | 'rejected'
  | 'invalid'
  | 'server';

/** Why a plan command failed; `revision` is the server's, on a conflict. */
export class Casa3dPlanError extends Error {
  readonly code: PlanErrorCode;
  readonly status: number;
  readonly revision?: number;

  constructor(code: PlanErrorCode, message: string, status = 0, revision?: number) {
    super(message);
    this.name = 'Casa3dPlanError';
    this.code = code;
    this.status = status;
    if (revision !== undefined) this.revision = revision;
  }
}

export interface Casa3dPlanApi {
  /** True for the commands this module answers. */
  handles(type: string): boolean;
  call<T>(message: Record<string, unknown>): Promise<T>;
  subscribe<T>(
    callback: (message: T) => void,
    message: Record<string, unknown>
  ): Promise<() => Promise<void>>;
  /** The revision of the plan document the bundle holds (last read, saved or imported); null before the first reading. */
  readonly revision: number | null;
}

export interface Casa3dPlanApiOptions {
  request: PlanRequest;
  /** Time between two looks at the revision on the server (30 s). */
  pollMs?: number;
  /** False while the page is not on screen: nothing is asked then. */
  isVisible?: () => boolean;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export const POLL_MS = 30_000;

const COMMANDS: ReadonlySet<string> = new Set([
  'casa3d/building/get',
  'casa3d/building/save',
  'casa3d/building/subscribe',
  'casa3d/image/get',
  'casa3d/image/set',
  'casa3d/history/list',
  'casa3d/history/snapshot',
  'casa3d/history/restore',
  'casa3d/packs/list',
  'casa3d/backup/export',
  'casa3d/backup/import',
]);

const JSON_HEADERS = { 'content-type': 'application/json' };

const serverMessage = async (response: PlanResponse): Promise<string> => {
  try {
    const body = await response.json();
    return isRecord(body) && typeof body.error === 'string' ? body.error : '';
  } catch {
    return '';
  }
};

/** The failure of a response as an error with a message for the person (Italian) and a code for the code. */
export async function planErrorFrom(response: PlanResponse): Promise<Casa3dPlanError> {
  const { status } = response;
  if (status === 409) {
    let revision: number | undefined;
    try {
      const body = await response.json();
      if (isRecord(body) && typeof body.revision === 'number') revision = body.revision;
    } catch {
      // no body: the revision stays unknown
    }
    return new Casa3dPlanError(
      'revision_conflict',
      'Il piano è stato modificato da un altro dispositivo. Ricarica la pagina prima di salvare.',
      status,
      revision
    );
  }
  const detail = await serverMessage(response);
  if (status === 403) {
    return new Casa3dPlanError('forbidden', 'Non hai il permesso di modificare il piano.', status);
  }
  if (status === 404) return new Casa3dPlanError('not_found', 'Elemento non trovato.', status);
  if (status === 413) {
    return new Casa3dPlanError('too_large', 'Il file o il piano è troppo grande.', status);
  }
  if (status === 415 || status === 422) {
    return new Casa3dPlanError(
      'rejected',
      `Immagine non accettata${detail ? `: ${detail}` : '.'}`,
      status
    );
  }
  if (status === 400) {
    return new Casa3dPlanError('invalid', `Dati non validi${detail ? `: ${detail}` : '.'}`, status);
  }
  return new Casa3dPlanError('server', `Errore del server (${status}).`, status);
}

// ── Pictures ────────────────────────────────────────────────────────────────

const DATA_URL = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/i;

/** The bytes and the type of an `data:image/...;base64,...` address; null for anything else. */
export function parseImageDataUrl(value: unknown): { mime: string; bytes: Uint8Array } | null {
  if (typeof value !== 'string') return null;
  const match = DATA_URL.exec(value);
  if (!match?.[1] || match[2] === undefined) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { mime: match[1].toLowerCase(), bytes };
}

/** A `data:` address from the type and the bytes of a picture. */
export function toImageDataUrl(mime: string, bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

// ── The module ──────────────────────────────────────────────────────────────

const pathId = (value: unknown): string | null =>
  typeof value === 'string' && /^[A-Za-z0-9_\-.]{1,64}$/.test(value) ? value : null;

export function createCasa3dPlanApi({
  request,
  pollMs = POLL_MS,
  isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  setTimer = (callback, ms) => setInterval(callback, ms),
  clearTimer = (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
}: Casa3dPlanApiOptions): Casa3dPlanApi {
  let revision: number | null = null;
  const listeners = new Set<(message: { revision: number }) => void>();

  const send = async (path: string, init: PlanRequestInit): Promise<PlanResponse> => {
    const response = await request(path, init);
    if (!response.ok) throw await planErrorFrom(response);
    return response;
  };

  const sendJson = async (
    path: string,
    init: PlanRequestInit
  ): Promise<Record<string, unknown>> => {
    const body = await (await send(path, init)).json();
    return isRecord(body) ? body : {};
  };

  const setRevision = (value: unknown): number => {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Casa3dPlanError('server', 'Risposta del server non valida.');
    }
    revision = value;
    return value;
  };

  const handlers: Record<string, (message: Record<string, unknown>) => Promise<unknown>> = {
    'casa3d/building/get': async () => {
      const body = await sendJson('/building', { method: 'GET' });
      setRevision(body.revision);
      return { building: body.building, revision: body.revision };
    },

    'casa3d/building/save': async (message) => {
      if (revision === null) {
        throw new Casa3dPlanError(
          'revision_unknown',
          'Il piano non è stato ancora letto dal server: ricarica la pagina prima di salvare.'
        );
      }
      const body = await sendJson('/building', {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ building: message.building, base_revision: revision }),
      });
      return { revision: setRevision(body.revision) };
    },

    'casa3d/image/get': async (message) => {
      const id = pathId(message.image_id);
      if (!id)
        throw new Casa3dPlanError('invalid', 'Identificativo dell’immagine non valido.', 400);
      const response = await send(`/images/${encodeURIComponent(id)}`, { method: 'GET' });
      const mime = response.headers.get('content-type') ?? 'application/octet-stream';
      return { data: toImageDataUrl(mime, new Uint8Array(await response.arrayBuffer())) };
    },

    'casa3d/image/set': async (message) => {
      const id = pathId(message.image_id);
      if (!id)
        throw new Casa3dPlanError('invalid', 'Identificativo dell’immagine non valido.', 400);
      const image = parseImageDataUrl(message.data);
      if (!image)
        throw new Casa3dPlanError(
          'rejected',
          'Immagine non accettata: serve un file PNG, JPEG o WebP.',
          415
        );
      await send(`/images/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'content-type': image.mime },
        body: image.bytes,
      });
      return {};
    },

    'casa3d/history/list': async () => {
      const body = await sendJson('/history', { method: 'GET' });
      return { snapshots: Array.isArray(body.snapshots) ? body.snapshots : [] };
    },

    'casa3d/history/snapshot': async () => {
      await send('/history', { method: 'POST', headers: JSON_HEADERS, body: '{}' });
      return {};
    },

    'casa3d/history/restore': async (message) => {
      const id = pathId(message.snapshot_id);
      if (!id)
        throw new Casa3dPlanError(
          'invalid',
          'Identificativo del punto di ripristino non valido.',
          400
        );
      const body = await sendJson(`/history/${encodeURIComponent(id)}/restore`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: '{}',
      });
      // The document in memory is not the restored one: the base stays, the bundle is told to reload.
      if (typeof body.revision !== 'number' || !Number.isInteger(body.revision)) {
        throw new Casa3dPlanError('server', 'Risposta del server non valida.');
      }
      const restored = body.revision;
      if (restored !== revision) listeners.forEach((listener) => listener({ revision: restored }));
      return { revision: restored };
    },

    // Furniture packs are not accepted by the backend (their signature check is not ported): none installed.
    'casa3d/packs/list': () => Promise.resolve({ packs: [] }),

    'casa3d/backup/export': async () => {
      const body = await sendJson('/backup', { method: 'GET' });
      return { format: body.format, version: body.version, building: body.building, packs: [] };
    },

    'casa3d/backup/import': async (message) => {
      const body = await sendJson('/backup', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ building: message.building, packs: message.packs ?? [] }),
      });
      setRevision(body.revision);
      return body;
    },
  };

  return {
    get revision() {
      return revision;
    },

    handles: (type) => COMMANDS.has(type),

    call: <T>(message: Record<string, unknown>): Promise<T> => {
      const type = typeof message.type === 'string' ? message.type : '';
      const handler = handlers[type];
      if (!handler) {
        return Promise.reject(new Casa3dPlanError('invalid', `Comando non previsto: ${type}`));
      }
      return handler(message) as Promise<T>;
    },

    // The server has no push channel: while the page is on screen its revision is looked at every 30 s.
    subscribe: <T>(callback: (message: T) => void) => {
      const listener = callback as (message: { revision: number }) => void;
      listeners.add(listener);
      const look = async (): Promise<void> => {
        if (!isVisible()) return;
        try {
          const body = await sendJson('/building/revision', { method: 'GET' });
          if (typeof body.revision === 'number' && body.revision !== revision) {
            callback({ revision: body.revision } as T);
          }
        } catch {
          // offline or refused: the next look tries again
        }
      };
      const handle = setTimer(() => void look(), pollMs);
      return Promise.resolve(() => {
        listeners.delete(listener);
        clearTimer(handle);
        return Promise.resolve();
      });
    },
  };
}

// ── The draft kept in the browser ───────────────────────────────────────────

/** Where the bundle keeps edits that could not be saved (`building-controller.ts`). */
export const DRAFT_KEY = 'casa3d.unsaved';
const DRAFT_OWNER_KEY = 'casa3d.draftOwner';

/**
 * The unsaved draft belongs to the person who made it: when another one signs in on the same
 * browser, the draft is removed, so a floor plan never reaches the next user (ADR-0014, section 4).
 * Without a user nothing is decided here: the hass object is not built until the user is known.
 * Returns true when a draft was removed.
 */
export function forgetDraftOfOtherUser(
  userId: string | null,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = safeStorage()
): boolean {
  if (!storage || !userId) return false;
  try {
    const owner = storage.getItem(DRAFT_OWNER_KEY);
    storage.setItem(DRAFT_OWNER_KEY, userId);
    if (owner === userId) return false;
    const had = storage.getItem(DRAFT_KEY) !== null;
    storage.removeItem(DRAFT_KEY);
    return had;
  } catch {
    return false;
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
