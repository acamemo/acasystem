/**
 * Italian texts of the configuration flows (ADR-0021, point 4: the dictionary of Acasystem
 * has priority over the translations of HA, which are partial for these two integrations).
 * Only static text: nothing here is built from what the customer typed.
 */

export const GENERIC_ERROR_MESSAGE = 'Qualcosa non ha funzionato. Riprova.';

/** Error keys that HA puts in `errors` of a form step. */
const FORM_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  cannot_connect:
    "Non riesco a collegarmi al televisore. Controlla che sia acceso, collegato alla stessa rete e che l'indirizzo sia giusto.",
  error_pairing: 'Non hai premuto OK sul televisore in tempo. Riprova.',
  invalid_host: "L'indirizzo non è valido.",
  invalid_mac: "L'indirizzo MAC non è valido.",
  invalid_auth: 'Accesso non riuscito. Riprova.',
  unknown: GENERIC_ERROR_MESSAGE,
};

/** Reasons of an `abort` result. */
const ABORT_MESSAGES: Readonly<Record<string, string>> = {
  already_configured: 'Questo dispositivo è già stato aggiunto.',
  already_in_progress:
    "L'aggiunta di questo dispositivo è già in corso, forse da un altro tablet. Riprova tra poco.",
  single_instance_allowed: 'Questo servizio è già configurato.',
  wrong_device: 'Questo indirizzo appartiene a un altro dispositivo.',
  reauth_successful: 'Accesso rinnovato.',
  reconfigure_successful: 'Dispositivo aggiornato.',
  cannot_connect:
    'Non riesco a collegarmi al dispositivo. Controlla che sia acceso e raggiungibile in rete.',
  no_devices_found: 'Non ho trovato nessun dispositivo di questo tipo sulla rete.',
};

export const GENERIC_ABORT_MESSAGE = "L'aggiunta non è andata a buon fine.";

export const translateFormError = (key: string): string =>
  FORM_ERROR_MESSAGES[key] ?? GENERIC_ERROR_MESSAGE;

export const translateAbortReason = (reason: string): string =>
  ABORT_MESSAGES[reason] ?? GENERIC_ABORT_MESSAGE;

export interface StepTexts {
  title: string;
  description?: string;
  /** Seconds the person is asked to wait at the TV (pairing). */
  waitSeconds?: number;
  fields?: Readonly<Record<string, { label: string; hint?: string }>>;
}

/** Texts per integration and step. A step that is not listed has no text and no input rule. */
export const STEP_TEXTS: Readonly<Record<string, Readonly<Record<string, StepTexts>>>> = {
  webostv: {
    user: {
      title: 'Aggiungi il televisore LG',
      description:
        'Accendi il televisore e scrivi qui il suo indirizzo. Lo trovi nelle impostazioni di rete del televisore.',
      fields: { host: { label: 'Indirizzo del televisore', hint: 'Per esempio 192.168.1.26' } },
    },
    pairing: {
      title: 'Accetta sul televisore',
      description:
        'Sullo schermo del televisore comparirà una richiesta. Premi OK con il telecomando entro 10 secondi, poi tocca Avanti.',
      waitSeconds: 10,
    },
  },
  wake_on_lan: {
    user: {
      title: 'Accensione via rete',
      description: "Scrivi l'indirizzo MAC del televisore. Lo trovi nelle impostazioni di rete.",
      fields: {
        mac: { label: 'Indirizzo MAC', hint: 'Per esempio 02:00:00:00:00:01' },
        broadcast_address: { label: 'Indirizzo di broadcast (facoltativo)' },
        broadcast_port: { label: 'Porta (facoltativa)' },
      },
    },
  },
};

/**
 * Titles of config entries that would reveal an address. The Wake on LAN entry of HA is named
 * after the MAC of the TV: the browser sees this fixed name instead.
 */
const ENTRY_TITLE_OVERRIDES: Readonly<Record<string, string>> = {
  wake_on_lan: 'Accensione via rete',
};

export const publicEntryTitle = (domain: string, title: string): string =>
  ENTRY_TITLE_OVERRIDES[domain] ?? title.slice(0, 120);
