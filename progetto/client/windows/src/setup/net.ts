import http from 'node:http';
import https from 'node:https';
import type { IncomingMessage } from 'node:http';

/** Richieste HTTP/HTTPS con i moduli di Node: reindirizzamenti, timeout e annullamento. */

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export interface OpenOptions {
  headers?: Record<string, string>;
  /** Inattività massima del socket (connessione, intestazioni, pause tra i dati). */
  timeoutMs: number;
  maxRedirects?: number;
  signal?: AbortSignal;
}

/** Apre una GET seguendo i reindirizzamenti (le intestazioni, Range compreso, si conservano). */
export const openResponse = (url: string, options: OpenOptions): Promise<IncomingMessage> =>
  new Promise((resolve, reject) => {
    const follow = (current: string, redirectsLeft: number): void => {
      let target: URL;
      try {
        target = new URL(current);
      } catch {
        reject(new Error('Indirizzo non valido'));
        return;
      }
      const client = target.protocol === 'https:' ? https : http;
      const request = client.get(
        target,
        { headers: { 'User-Agent': 'Acasystem-setup', ...options.headers }, signal: options.signal },
        (response) => {
          const status = response.statusCode ?? 0;
          const location = response.headers.location;
          if (REDIRECTS.has(status) && location) {
            response.resume();
            if (redirectsLeft <= 0) reject(new Error('Troppi reindirizzamenti'));
            else follow(new URL(location, target).toString(), redirectsLeft - 1);
            return;
          }
          resolve(response);
        }
      );
      request.setTimeout(options.timeoutMs, () => request.destroy(new Error('timeout')));
      request.on('error', reject);
    };
    follow(url, options.maxRedirects ?? 5);
  });

export interface HttpGetOptions {
  headers?: Record<string, string>;
  /** Tempo totale massimo della richiesta. */
  timeoutMs: number;
  maxRedirects?: number;
  signal?: AbortSignal;
  /** Byte di corpo da leggere al massimo (il resto si scarta). */
  maxBodyBytes?: number;
}

export interface HttpGetResult {
  status: number;
  body: string;
}

export const httpGet = async (url: string, options: HttpGetOptions): Promise<HttpGetResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  try {
    const response = await openResponse(url, {
      ...(options.headers ? { headers: options.headers } : {}),
      ...(options.maxRedirects !== undefined ? { maxRedirects: options.maxRedirects } : {}),
      timeoutMs: options.timeoutMs,
      signal,
    });
    const limit = options.maxBodyBytes ?? 65_536;
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of response) {
      chunks.push(chunk as Buffer);
      size += (chunk as Buffer).length;
      if (size >= limit) {
        response.destroy();
        break;
      }
    }
    return { status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') };
  } finally {
    clearTimeout(timer);
  }
};
