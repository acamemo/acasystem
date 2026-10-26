import type { Notice, StartupResult } from './startup.ts';
import type { WizardError } from './wizard.ts';

/** Testi in italiano per le pagine del guscio (ADR-0005), uguali su Windows e Android. */

export const WIZARD_ERROR_TEXT: Record<WizardError, string> = {
  empty: "Scrivi l'indirizzo IP di Home Assistant, per esempio 192.168.1.184.",
  'not-ipv4': 'Non sembra un indirizzo IP. Scrivilo come 192.168.1.184.',
  'not-local':
    "L'indirizzo deve essere della rete di casa (192.168.…, 10.… o 172.16-31.…). Da fuori casa l'app non si collega.",
  'invalid-port': 'La porta deve essere un numero da 1 a 65535.',
  unreachable:
    "Il mini PC non risponde. Controlla che sia acceso e che questo dispositivo sia sulla stessa rete Wi-Fi.",
  'not-acasystem':
    "A questo indirizzo risponde un altro servizio, non Acasystem. Controlla l'IP o la porta nelle impostazioni avanzate.",
};

type ErrorResult = Exclude<StartupResult, { kind: 'wizard' } | { kind: 'launch' }>;

export const startupErrorText = (result: ErrorResult): string => {
  switch (result.kind) {
    case 'server-unreachable':
      return `Il mini PC (${result.origin}) non risponde. Controlla che sia acceso e sulla stessa rete, poi riprova.`;
    case 'not-acasystem':
      return `A ${result.origin} non risponde Acasystem. Usa «Cambia indirizzo» per correggerlo.`;
    case 'no-bundle':
      if (result.reason === 'offline') {
        return "Per il primo avvio serve internet: l'app deve scaricare Acasystem. Collegati e riprova.";
      }
      if (result.reason === 'unpublished') {
        return 'Su GitHub non è ancora pubblicata nessuna versione di Acasystem. Riprova più tardi.';
      }
      if (result.reason === 'incompatible') {
        return "Nessuna versione di Acasystem è compatibile con questo mini PC o con questa app. Aggiorna il mini PC o l'app.";
      }
      return 'Il download di Acasystem non è riuscito o il file non è integro. Riprova più tardi.';
  }
};

export const noticeText = (notice: Notice): string => {
  switch (notice.kind) {
    case 'server-update':
      return `È disponibile Acasystem ${notice.available}: aggiorna il mini PC per usarla.`;
    case 'shell-update':
      return `Acasystem ${notice.available} richiede una versione più recente di questa app: aggiorna l'app.`;
    case 'offline':
      return 'Nessuna connessione a internet: uso la versione già scaricata.';
    case 'download-failed':
      return `Il download di Acasystem ${notice.version} non è riuscito: uso la versione già scaricata.`;
  }
};
