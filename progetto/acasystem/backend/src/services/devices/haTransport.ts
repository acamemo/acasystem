import { WebSocket } from 'ws';
import { HA_WEBSOCKET_PATH } from '../../config/homeAssistantApiCatalog.ts';
import type { HaRestCall, HaWsCall } from '../../config/homeAssistantApiCatalog.ts';
import { isRecord, readProperty } from '../../helpers/objects.ts';

/**
 * Low-level transport towards Home Assistant for the device facade: one REST request or one
 * WebSocket session at a time, with a hard time limit. The only retry is on the next base URL
 * (see `withBaseUrl`): a call that may have changed something in HA is never sent twice.
 *
 * Errors never carry the token, the request body or the text HA sent back: only a kind, the
 * HTTP status and the machine code. Callers decide what the user may read.
 */

export type HaErrorKind =
  | 'unreachable'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'bad_request'
  | 'ha_error'
  | 'protocol';

export class HaError extends Error {
  readonly kind: HaErrorKind;
  readonly status: number | undefined;
  readonly code: string | undefined;
  /** Parsed JSON body of a failed REST call (flow errors). Never logged. */
  readonly body: unknown;
  /** True when the request certainly never reached HA (the connection could not be made). */
  readonly neverSent: boolean;

  constructor(
    kind: HaErrorKind,
    options: { status?: number; code?: string; body?: unknown; neverSent?: boolean } = {}
  ) {
    const detail = [kind, options.status, options.code].filter((part) => part !== undefined);
    super(`Home Assistant call failed (${detail.join(' ')})`);
    this.name = 'HaError';
    this.kind = kind;
    this.status = options.status;
    this.code = options.code;
    this.body = options.body;
    this.neverSent = options.neverSent ?? false;
  }
}

export const isHaError = (error: unknown): error is HaError => error instanceof HaError;

export interface RestOptions {
  /** Bearer token; omitted for the unauthenticated calls of the login. */
  token?: string | undefined;
  /** Values for the `{name}` placeholders of the path. */
  params?: Record<string, string>;
  /** JSON body. */
  body?: unknown;
  /** `application/x-www-form-urlencoded` body (token endpoints). */
  form?: Record<string, string>;
  timeoutMs: number;
}

export interface RestResponse {
  status: number;
  body: unknown;
}

export interface WsCommandOptions {
  /** Fields of the message besides `id` and `type`. */
  payload?: Record<string, unknown>;
  timeoutMs: number;
}

export interface HaWsSession {
  readonly haVersion: string | null;
  send(call: HaWsCall, options: WsCommandOptions): Promise<unknown>;
  close(): void;
}

export interface HaTransport {
  rest(call: HaRestCall, options: RestOptions): Promise<RestResponse>;
  openSession(token: string, timeoutMs: number): Promise<HaWsSession>;
  /** `ha_version` from the first WebSocket message, read before any login. */
  readVersion(timeoutMs: number): Promise<string | null>;
}

export interface HaTransportOptions {
  /** Base URLs of HA in order of preference (server configuration, never the browser's). */
  baseUrls: () => readonly string[];
  /** Called with the id of every call made; used by the tests to audit the traffic. */
  onCall?: (id: string) => void;
  fetchImpl?: typeof fetch;
}

const MAX_WS_PAYLOAD_BYTES = 32 * 1024 * 1024;

const fillPath = (template: string, params: Record<string, string> = {}): string =>
  template.replace(/\{([a-z_]+)\}/g, (_match, name: string) =>
    encodeURIComponent(params[name] ?? '')
  );

/** Error codes of a connection that failed before any byte of the request was sent. */
const CONNECT_ERROR_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
]);

const classifyNetworkError = (error: unknown): HaError => {
  const name = readProperty(error, 'name');
  if (name === 'TimeoutError' || name === 'AbortError') return new HaError('timeout');
  const code = readProperty(readProperty(error, 'cause'), 'code');
  return new HaError('unreachable', {
    neverSent: typeof code === 'string' && CONNECT_ERROR_CODES.has(code),
  });
};

const kindForStatus = (status: number): HaErrorKind => {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status >= 400 && status < 500) return 'bad_request';
  return 'ha_error';
};

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Some HA errors are plain text ("Failed dependencies ..."): the text is not exposed.
    return null;
  }
};

const wsUrlFor = (baseUrl: string): string =>
  `${baseUrl.replace(/^http/i, 'ws')}${HA_WEBSOCKET_PATH}`;

/** Error of a WebSocket `result` with `success: false`. */
const wsCommandError = (error: unknown): HaError => {
  const code = readProperty(error, 'code');
  const machineCode = typeof code === 'string' ? code : undefined;
  if (machineCode === 'unauthorized') return new HaError('forbidden', { code: machineCode });
  if (machineCode === 'not_found') return new HaError('not_found', { code: machineCode });
  if (machineCode === 'unknown_command') return new HaError('protocol', { code: machineCode });
  if (machineCode === 'timeout') return new HaError('timeout', { code: machineCode });
  if (
    machineCode === 'invalid_format' ||
    machineCode === 'invalid_info' ||
    machineCode === 'no_unique_id' ||
    machineCode === 'credentials_exist' ||
    machineCode === 'not_allowed' ||
    machineCode === 'cannot_delete_owner' ||
    machineCode === 'cannot_modify_system_generated'
  ) {
    return new HaError('bad_request', { code: machineCode });
  }
  return new HaError('ha_error', machineCode ? { code: machineCode } : {});
};

interface PendingCommand {
  resolve(value: unknown): void;
  reject(error: HaError): void;
  timer: NodeJS.Timeout;
}

/**
 * Opens a WebSocket to `baseUrl`. With a token it logs in and resolves with a session; with
 * `null` it resolves with a session that only knows the version (login not attempted).
 */
const connect = (
  baseUrl: string,
  token: string | null,
  timeoutMs: number,
  onCall?: (id: string) => void
): Promise<HaWsSession> =>
  new Promise<HaWsSession>((resolve, reject) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrlFor(baseUrl), {
        handshakeTimeout: timeoutMs,
        maxPayload: MAX_WS_PAYLOAD_BYTES,
        followRedirects: false,
      });
    } catch {
      reject(new HaError('unreachable'));
      return;
    }

    let haVersion: string | null = null;
    let nextId = 1;
    let ready = false;
    let settled = false;
    const pending = new Map<number, PendingCommand>();

    const failAll = (error: HaError) => {
      for (const command of pending.values()) {
        clearTimeout(command.timer);
        command.reject(error);
      }
      pending.clear();
    };

    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(loginTimer);
      action();
    };

    const loginTimer = setTimeout(() => {
      settle(() => reject(new HaError('timeout')));
      socket.terminate();
    }, timeoutMs);

    const session: HaWsSession = {
      get haVersion() {
        return haVersion;
      },
      send(call, options) {
        onCall?.(call.id);
        if (!ready || socket.readyState !== WebSocket.OPEN) {
          return Promise.reject(new HaError('unreachable'));
        }
        const id = nextId++;
        return new Promise<unknown>((resolveCommand, rejectCommand) => {
          const timer = setTimeout(() => {
            pending.delete(id);
            rejectCommand(new HaError('timeout'));
          }, options.timeoutMs);
          pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timer });
          socket.send(JSON.stringify({ ...options.payload, id, type: call.type }), (error) => {
            if (error) {
              clearTimeout(timer);
              pending.delete(id);
              rejectCommand(new HaError('unreachable'));
            }
          });
        });
      },
      close() {
        failAll(new HaError('unreachable'));
        try {
          socket.close();
        } catch {
          socket.terminate();
        }
      },
    };

    socket.on('message', (data) => {
      let message: unknown;
      try {
        message = JSON.parse(data.toString()) as unknown;
      } catch {
        settle(() => reject(new HaError('protocol')));
        socket.terminate();
        return;
      }
      if (!isRecord(message)) return;

      const type = message.type;
      if (type === 'auth_required') {
        const version = message.ha_version;
        haVersion = typeof version === 'string' ? version : null;
        if (token === null) {
          settle(() => resolve(session));
          return;
        }
        socket.send(JSON.stringify({ type: 'auth', access_token: token }));
        return;
      }
      if (type === 'auth_ok') {
        const version = message.ha_version;
        if (typeof version === 'string') haVersion = version;
        ready = true;
        settle(() => resolve(session));
        return;
      }
      if (type === 'auth_invalid') {
        settle(() => reject(new HaError('unauthorized')));
        socket.terminate();
        return;
      }
      if (type === 'result') {
        const id = message.id;
        const command = typeof id === 'number' ? pending.get(id) : undefined;
        if (!command || typeof id !== 'number') return;
        pending.delete(id);
        clearTimeout(command.timer);
        if (message.success === true) command.resolve(message.result ?? null);
        else command.reject(wsCommandError(message.error));
      }
    });

    socket.on('error', () => {
      settle(() => reject(new HaError('unreachable')));
      failAll(new HaError('unreachable'));
    });

    socket.on('close', () => {
      settle(() => reject(new HaError('unreachable')));
      failAll(new HaError('unreachable'));
    });
  });

export const createHaTransport = ({
  baseUrls,
  onCall,
  fetchImpl = fetch,
}: HaTransportOptions): HaTransport => {
  /**
   * Tries the configured URLs in order. The next URL is tried only when the call cannot have
   * done anything in HA: a read (GET) or a WebSocket handshake, after an unreachable host or a
   * timeout; any other call (POST, DELETE: pairing, flow steps, automations, removals) only
   * when the connection failed before the request was sent. A timeout of a write is never
   * repeated, because HA may have received it (a flow left open, an entry added twice).
   */
  const withBaseUrl = async <T>(readOnly: boolean, run: (baseUrl: string) => Promise<T>): Promise<T> => {
    const urls = baseUrls();
    if (!urls.length) throw new HaError('unreachable');

    let lastError: unknown = new HaError('unreachable');
    for (const url of urls) {
      try {
        return await run(url);
      } catch (error) {
        lastError = error;
        const retryable =
          isHaError(error) &&
          (readOnly
            ? error.kind === 'unreachable' || error.kind === 'timeout'
            : error.kind === 'unreachable' && error.neverSent);
        if (!retryable) throw error;
      }
    }
    throw lastError;
  };

  return {
    async rest(call, options) {
      onCall?.(call.id);
      return withBaseUrl(call.method === 'GET', async (baseUrl) => {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (options.token) headers.Authorization = `Bearer ${options.token}`;

        let body: string | undefined;
        if (options.form) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          body = new URLSearchParams(options.form).toString();
        } else if (options.body !== undefined) {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(options.body);
        }

        let response: Response;
        try {
          response = await fetchImpl(`${baseUrl}${fillPath(call.path, options.params)}`, {
            method: call.method,
            headers,
            ...(body !== undefined ? { body } : {}),
            redirect: 'manual',
            signal: AbortSignal.timeout(options.timeoutMs),
          });
        } catch (error) {
          throw classifyNetworkError(error);
        }

        let parsed: unknown;
        try {
          parsed = await parseBody(response);
        } catch (error) {
          throw classifyNetworkError(error);
        }

        if (response.status >= 300 && response.status < 400) {
          // HA never redirects these calls; following a redirect could leave the trusted host.
          throw new HaError('protocol', { status: response.status });
        }
        if (response.status >= 400) {
          throw new HaError(kindForStatus(response.status), {
            status: response.status,
            body: parsed,
          });
        }
        return { status: response.status, body: parsed };
      });
    },

    async openSession(token, timeoutMs) {
      return withBaseUrl(true, (baseUrl) => connect(baseUrl, token, timeoutMs, onCall));
    },

    async readVersion(timeoutMs) {
      onCall?.('ws.handshake');
      const session = await withBaseUrl(true, (baseUrl) => connect(baseUrl, null, timeoutMs));
      const version = session.haVersion;
      session.close();
      return version;
    },
  };
};
