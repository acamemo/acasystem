import type { ClientConfig } from './config.ts';
import type { ReleaseManifest } from './manifest.ts';

/**
 * Porte che ogni guscio implementa (Electron in C5, Capacitor in C6). Il nucleo non fa
 * rete né disco da solo: così la logica è uguale sulle due piattaforme e si prova con finti.
 */

export type HttpErrorKind = 'network' | 'timeout' | 'status' | 'format';

/** Errore che le implementazioni di HttpClient devono lanciare. */
export class HttpRequestError extends Error {
  readonly kind: HttpErrorKind;
  readonly status: number | undefined;

  constructor(kind: HttpErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'HttpRequestError';
    this.kind = kind;
    this.status = status;
  }
}

export interface HttpClient {
  /** GET con risposta JSON; segue i reindirizzamenti (GitHub manda gli asset su un altro host). */
  getJson(url: string, timeoutMs: number): Promise<unknown>;
  getBytes(url: string, timeoutMs: number): Promise<Uint8Array>;
}

export interface ConfigStore {
  load(): Promise<ClientConfig | null>;
  save(config: ClientConfig): Promise<void>;
}

/**
 * Pacchetti dell'interfaccia già scaricati. `install` riceve un archivio già verificato:
 * lo estrae in modo atomico (una versione o è completa o non c'è).
 */
export interface BundleCache {
  list(): Promise<ReleaseManifest[]>;
  install(manifest: ReleaseManifest, archive: Uint8Array): Promise<void>;
}
