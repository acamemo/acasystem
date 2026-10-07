import { join } from 'node:path';

/**
 * Lettura delle variabili d'ambiente, con gli stessi valori predefiniti e gli stessi
 * limiti del server Tunet. Ogni funzione legge `process.env` quando viene chiamata:
 * i moduli che la chiamano al caricamento mantengono il momento di lettura originale,
 * quelle usate a ogni richiesta (ingress, URL interni di HA) restano dinamiche.
 */

export const readPort = (): number => parseInt(process.env.PORT || '3002', 10);

/** Cartella del database `tunet.db`; senza DATA_DIR è `data/` nella cartella corrente. */
export const readDataDir = (): string => process.env.DATA_DIR || join(process.cwd(), 'data');

export const isProductionEnvironment = (): boolean => process.env.NODE_ENV === 'production';

export interface RateLimitSettings {
  windowMs: number;
  max: number;
}

/** Legge `<prefix>_WINDOW_MS` e `<prefix>_MAX`, con minimi di 1 s e 10 richieste. */
export const readRateLimitSettings = (prefix: string, defaultMax: number): RateLimitSettings => ({
  windowMs: Math.max(Number(process.env[`${prefix}_WINDOW_MS`]) || 60_000, 1_000),
  max: Math.max(Number(process.env[`${prefix}_MAX`]) || defaultMax, 10),
});

export const readSettingsHistoryKeepLimit = (): number =>
  Math.min(Math.max(Number(process.env.SETTINGS_HISTORY_KEEP_LIMIT) || 50, 5), 500);

export const readHomeAssistantAuthCacheTtlMs = (): number =>
  Math.min(Math.max(Number(process.env.HA_AUTH_CACHE_TTL_MS) || 15_000, 1_000), 300_000);

export const readHomeAssistantInvalidAuthCacheTtlMs = (): number =>
  Math.min(Math.max(Number(process.env.HA_INVALID_AUTH_CACHE_TTL_MS) || 60_000, 1_000), 3_600_000);

/**
 * Attesa massima della prima risposta di HA attraverso il proxy /ha (HTTP e handshake
 * WebSocket): HA_PROXY_RESPONSE_TIMEOUT_MS, predefinito 30 s, tra 1 s e 5 minuti. Non
 * vale per gli stream e i tunnel già avviati.
 */
export const readHomeAssistantProxyResponseTimeoutMs = (): number =>
  Math.min(Math.max(Number(process.env.HA_PROXY_RESPONSE_TIMEOUT_MS) || 30_000, 1_000), 300_000);

export const isSupervisorIngressTrustEnabled = (): boolean =>
  process.env.TUNET_TRUST_SUPERVISOR_INGRESS === '1';

/** URL di HA configurati sul server: gli unici usati per autenticare le API (obbligatori). */
export const readInternalHomeAssistantUrls = (): readonly (string | undefined)[] => [
  process.env.TUNET_INTERNAL_HA_URL,
  process.env.TUNET_INTERNAL_HA_FALLBACK_URL,
];

export interface DataCryptoSettings {
  mode: string | undefined;
  key: string;
  salt: string;
}

export const readDataCryptoSettings = (): DataCryptoSettings => ({
  mode: process.env.TUNET_ENCRYPTION_MODE,
  key: process.env.TUNET_DATA_KEY || '',
  salt: process.env.TUNET_DATA_KEY_SALT || '',
});
