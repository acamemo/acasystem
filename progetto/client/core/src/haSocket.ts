import type { WebSocketFactory, WebSocketLike } from './ports.ts';

/**
 * Client minimo del WebSocket di Home Assistant (REP-20261026-005, S4): autenticazione con il
 * token e comandi con `id`. Serve solo durante la configurazione del mini PC (dati della casa,
 * Supervisor); poi l'interfaccia di Acasystem usa il proprio collegamento.
 */

export class HaSocketError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'HaSocketError';
    this.code = code;
  }
}

export interface HaSocket {
  /** Invia un comando e restituisce `result`; HaSocketError se HA risponde con un errore. */
  call<T = unknown>(message: Record<string, unknown>, timeoutMs?: number): Promise<T>;
  close(): void;
}

/** ws(s)://<host>/api/websocket dall'indirizzo http(s) di HA. */
export const haWebSocketUrl = (haBase: string): string =>
  `${haBase.replace(/^http/, 'ws').replace(/\/+$/, '')}/api/websocket`;

const parse = (data: unknown): Record<string, unknown> | null => {
  if (typeof data !== 'string') return null;
  try {
    const value = JSON.parse(data) as unknown;
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

export const openHaSocket = (
  factory: WebSocketFactory,
  haBase: string,
  accessToken: string,
  timeoutMs = 15_000
): Promise<HaSocket> =>
  new Promise((resolveOpen, rejectOpen) => {
    let socket: WebSocketLike;
    try {
      socket = factory(haWebSocketUrl(haBase));
    } catch (error) {
      rejectOpen(new HaSocketError('network', String(error)));
      return;
    }
    let nextId = 1;
    let authenticated = false;
    const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> | null }>();
    const fail = (error: HaSocketError) => {
      for (const entry of pending.values()) {
        if (entry.timer) clearTimeout(entry.timer);
        entry.reject(error);
      }
      pending.clear();
    };
    const openTimer = setTimeout(() => {
      rejectOpen(new HaSocketError('timeout', 'Home Assistant non ha risposto sul WebSocket'));
      socket.close();
    }, timeoutMs);

    const api: HaSocket = {
      call: (message, callTimeoutMs = 30_000) =>
        new Promise((resolveCall, rejectCall) => {
          const id = nextId++;
          const timer =
            callTimeoutMs > 0
              ? setTimeout(() => {
                  pending.delete(id);
                  rejectCall(new HaSocketError('timeout', `Nessuna risposta a ${String(message.type)}`));
                }, callTimeoutMs)
              : null;
          pending.set(id, { resolve: resolveCall as (value: unknown) => void, reject: rejectCall, timer });
          socket.send(JSON.stringify({ ...message, id }));
        }),
      close: () => socket.close(),
    };

    socket.onmessage = (event) => {
      const message = parse(event.data);
      if (!message) return;
      if (message.type === 'auth_required') {
        socket.send(JSON.stringify({ type: 'auth', access_token: accessToken }));
      } else if (message.type === 'auth_ok') {
        authenticated = true;
        clearTimeout(openTimer);
        resolveOpen(api);
      } else if (message.type === 'auth_invalid') {
        clearTimeout(openTimer);
        rejectOpen(new HaSocketError('auth_invalid', 'Accesso a Home Assistant non valido'));
        socket.close();
      } else if (message.type === 'result' && typeof message.id === 'number') {
        const entry = pending.get(message.id);
        if (!entry) return;
        pending.delete(message.id);
        if (entry.timer) clearTimeout(entry.timer);
        if (message.success === true) entry.resolve(message.result);
        else {
          const error = (message.error ?? {}) as { code?: unknown; message?: unknown };
          entry.reject(new HaSocketError(String(error.code ?? 'unknown_error'), String(error.message ?? 'Errore di Home Assistant')));
        }
      }
    };
    socket.onerror = () => {
      if (!authenticated) {
        clearTimeout(openTimer);
        rejectOpen(new HaSocketError('network', 'WebSocket di Home Assistant non raggiungibile'));
      }
    };
    socket.onclose = () => {
      clearTimeout(openTimer);
      if (!authenticated) rejectOpen(new HaSocketError('network', 'WebSocket di Home Assistant chiuso'));
      fail(new HaSocketError('closed', 'Collegamento con Home Assistant interrotto'));
    };
  });
