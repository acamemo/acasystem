/**
 * Valori predefiniti del guscio (ADR-0023). Repository dei rilasci creato dall'utente il
 * 2026-10-26 e confermato nello stesso giorno (REP-20261026-002).
 */

/** Porta del server Acasystem sul mini PC; si cambia nelle impostazioni avanzate (Q-A7). */
export const DEFAULT_SERVER_PORT = 3002;

export interface ReleaseRepository {
  owner: string;
  repo: string;
  /** Solo per le prove (un finto GitHub locale); predefiniti github.com e api.github.com. */
  webBase?: string;
  apiBase?: string;
}

/** Repository pubblico con le sole Releases dell'interfaccia (P-3 bis). */
export const RELEASE_REPOSITORY: ReleaseRepository = { owner: 'acamemo', repo: 'acasystem-releases' };

/** Nome dell'asset con il manifesto in ogni Release; il tag della Release è `v<versione>`. */
export const MANIFEST_ASSET = 'manifest.json';

export const GITHUB_TIMEOUT_MS = 10_000;

export const DEFAULT_RELEASE_TIMEOUTS = { health: 5_000, download: 120_000 } as const;

/** Quante Release più vecchie esaminare cercando l'ultima compatibile (P-1 bis). */
export const MAX_RELEASES_SCANNED = 10;
