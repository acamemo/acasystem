/** Costanti del motore di installazione della centrale (REP-20261120-001). */

export const DISK_URL =
  'https://github.com/acamemo/acasystem-releases/releases/download/centrale-vm-18.4-2/aca-centrale-vm-18.4-2.vdi.zip';
export const DISK_SHA256 = '30e03ec078bc5501d67ad5fa0fc44d7570b3405424ac6b7ed1b67a07908e3d18';
export const DISK_SIZE_BYTES = 591_441_407;

/** Spazio libero richiesto (come Installa-Centrale.ps1: 40GB = 40 × 1024³). */
export const REQUIRED_FREE_GB = 40;
export const REQUIRED_FREE_BYTES = REQUIRED_FREE_GB * 1024 ** 3;

/** Porta di Acasystem sulla centrale. */
/** La VM usa 2 GB e 2 core: sotto questi valori non parte, fino ai valori comodi il PC rallenta. */
export const MIN_MEMORY_GB = 4;
export const COMFORT_MEMORY_GB = 6;
export const MIN_CPUS = 2;
export const COMFORT_CPUS = 4;

/**
 * Peso del primo avvio, misurato il 2026-11-20: circa 1.366 MB in tutto, di cui circa 1.070 MB per
 * Home Assistant Core e 300 MB per Acasystem più l'app della schermata di avvio.
 */
export const CORE_DOWNLOAD_BYTES = 1_070_000_000;
export const ACA_DOWNLOAD_BYTES = 300_000_000;

export const APP_PORT = 3002;
/** Porta di Home Assistant Core. */
export const HA_PORT = 8123;
/** Porta usata per far comparire la VM nella tabella ARP (qualunque porta va bene). */
export const DISCOVERY_PORT = 4357;

export const STATE_FILE = 'centrale-setup.json';
export const INSTALL_INFO_FILE = 'installazione.json';
export const SCRIPT_NAME = 'Installa-Centrale.ps1';

export const MAX_DOWNLOAD_ATTEMPTS = 20;
export const DOWNLOAD_RETRY_DELAY_MS = 10_000;
export const DOWNLOAD_STALL_MS = 60_000;
export const PROGRESS_INTERVAL_MS = 250;
export const SPEED_WINDOW_MS = 5_000;

export const POLL_MS = 10_000;
/** Senza progressi (avanzamento di Home Assistant o passo attivo) per tanto tempo: la preparazione è ferma. */
export const PREPARING_STALL_MS = 20 * 60_000;
/** Attesa massima della risposta di supervisor-api/jobs/info durante il primo avvio. */
export const JOBS_TIMEOUT_MS = 4_000;
/** Finestra dei campioni per stimare la velocità di avanzamento di Home Assistant. */
export const RATE_WINDOW_MS = 5 * 60_000;
/** Tempo stimato del passo Acasystem se la velocità di download di questo PC non è nota. */
export const ACA_FALLBACK_SECONDS = 180;
export const SWEEP_INTERVAL_MS = 30_000;
export const CHECK_TIMEOUT_MS = 15_000;
export const CREATE_TIMEOUT_MS = 15 * 60_000;
