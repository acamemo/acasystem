import { HttpRequestError, MAX_ARCHIVE_BYTES } from '../../core/src/index.ts';
import type { HaHttp, HttpClient } from '../../core/src/index.ts';

/**
 * HttpClient del nucleo con il `fetch` del processo principale: niente CORS e niente
 * contenuto misto, perché le richieste non partono dalla pagina. GitHub richiede uno
 * User-Agent; i reindirizzamenti degli asset si seguono.
 */

const request = async (url: string, timeoutMs: number, userAgent: string): Promise<Response> => {
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': userAgent, Accept: 'application/json, application/octet-stream' },
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new HttpRequestError(timedOut ? 'timeout' : 'network', `${url}: ${String(error)}`);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new HttpRequestError('status', `${url}: HTTP ${response.status}`, response.status);
  }
  return response;
};

export const createNodeHttpClient = (userAgent: string): HttpClient => ({
  getJson: async (url, timeoutMs) => {
    const response = await request(url, timeoutMs, userAgent);
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new HttpRequestError('format', `${url}: risposta non JSON`);
    }
  },
  getBytes: async (url, timeoutMs) => {
    const response = await request(url, timeoutMs, userAgent);
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > MAX_ARCHIVE_BYTES) {
      await response.body?.cancel();
      throw new HttpRequestError('format', `${url}: file troppo grande`);
    }
    try {
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      throw new HttpRequestError('network', `${url}: ${String(error)}`);
    }
  },
});

/** HaHttp del nucleo per la configurazione del mini PC: JSON o modulo, token, URL finale. */
export const createNodeHaHttp = (userAgent: string): HaHttp => ({
  request: async ({ method, url, json, form, token, timeoutMs }) => {
    const headers: Record<string, string> = { 'User-Agent': userAgent, Accept: 'application/json' };
    let body: string | undefined;
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(form).toString();
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    let response: Response;
    try {
      response = await fetch(url, { method, headers, body, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new HttpRequestError(timedOut ? 'timeout' : 'network', `${url}: ${String(error)}`);
    }
    const text = await response.text().catch(() => '');
    let parsed: unknown = null;
    try {
      parsed = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      parsed = text;
    }
    return { status: response.status, body: parsed, url: response.url || url };
  },
});
