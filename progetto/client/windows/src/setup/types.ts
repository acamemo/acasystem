/**
 * Contratto tra il motore di installazione della centrale (processo principale) e le viste del
 * guscio (REP-20261120-001). Il motore guida: controlli → download → creazione della VM →
 * primo avvio → pronta. Le viste mostrano solo ciò che arriva qui; nessun dettaglio tecnico
 * (percorsi, comandi, errori grezzi) attraversa il confine: i messaggi sono già in italiano.
 */

export type SetupCheckId = 'virtualbox' | 'hardware' | 'disk' | 'network' | 'internet';
export type SetupCheckStatus = 'ok' | 'missing' | 'warning';

export interface SetupCheck {
  id: SetupCheckId;
  status: SetupCheckStatus;
  /** Testo breve a destra della riga, es. «Installato, 7.2», «112 GB liberi, ne servono 40». */
  detail: string;
}

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number;
  /** Media mobile degli ultimi secondi; 0 se non ancora misurata. */
  bytesPerSecond: number;
  /** null finché la velocità non è stimabile. */
  etaSeconds: number | null;
  /** 1 al primo tentativo; aumenta a ogni ripresa dopo una caduta della connessione. */
  attempt: number;
}

export type PrepStepId = 'disk' | 'vm' | 'core' | 'aca' | 'qr';
export type PrepStepState = 'done' | 'active' | 'pending';

export interface PrepStep {
  id: PrepStepId;
  state: PrepStepState;
  /** Es. l'indirizzo IP accanto a «Centrale accesa», oppure «in corso». */
  detail?: string;
}

/** Avanzamento del passo attivo della preparazione; percent null = indeterminato. */
export interface PrepProgress {
  /** Nome del passo attivo, es. «Download di Home Assistant». */
  label: string;
  percent: number | null;
  /** Secondi stimati alla fine della preparazione; null se non stimabili. */
  etaSeconds: number | null;
}

export type SetupFailureStep = 'checks' | 'download' | 'verify' | 'creating' | 'preparing';

export type SetupPhase =
  | { phase: 'welcome'; checking: boolean; checks: SetupCheck[] }
  /** startedAt: inizio del download, conservato tra ripresa e nuovi tentativi della stessa installazione. */
  | { phase: 'download'; progress: DownloadProgress; startedAt: number }
  /** Controllo dell'impronta ed estrazione del disco. */
  | { phase: 'verify' }
  /** Creazione della VM e del supervisore con Installa-Centrale.ps1. */
  | { phase: 'creating' }
  | { phase: 'preparing'; steps: PrepStep[]; ip?: string; startedAt: number; progress: PrepProgress }
  | { phase: 'ready'; ip: string; port: number; elapsedMinutes: number; qr: boolean[][] }
  | { phase: 'failed'; step: SetupFailureStep; message: string; canRetry: boolean };

export interface CentralSetup {
  /** Fase corrente, sempre disponibile (all'inizio: welcome senza controlli). */
  getPhase(): SetupPhase;
  /** Chiamato a ogni cambio di fase o avanzamento (al massimo qualche volta al secondo). */
  onChange(listener: (phase: SetupPhase) => void): void;
  /** Esegue i quattro controlli; la fase resta welcome con checking true finché non finiscono. */
  runChecks(): Promise<void>;
  /** Avvia download → verifica → creazione → preparazione. Ignorato se già in corso. */
  start(): Promise<void>;
  /** Annulla il download in corso (il file parziale resta per una ripresa); torna a welcome. */
  cancel(): Promise<void>;
  /**
   * All'avvio dell'app: se esiste un'installazione avviata da questa app (stato persistito),
   * riprende dal punto raggiunto e restituisce true; altrimenti false.
   */
  resume(): Promise<boolean>;
  /** Dopo un errore: riprende dal passo fallito (il download riparte dai byte già scaricati). */
  retry(): Promise<void>;
  /** Interrompe timer e richieste in corso (alla chiusura dell'app). */
  dispose(): void;
}
