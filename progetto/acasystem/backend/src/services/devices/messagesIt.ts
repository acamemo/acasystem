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
  invalid_pin: 'Il codice non è quello mostrato sul televisore. Riprova.',
  invalid_psk: 'La chiave di cifratura non è corretta.',
  authentication_error: 'Il codice non è corretto. Controlla le cifre e riprova.',
  unable_to_pair: 'Non sono riuscito ad abbinare il dispositivo. Controlla il codice e riprova.',
  linking_error: 'Non ho trovato il pulsante premuto. Premilo e tocca Conferma entro 30 secondi.',
  no_link_button_pressed:
    'Non ho trovato il pulsante premuto. Premilo e tocca Conferma subito dopo.',
  not_authorizing_new_devices:
    'Il dispositivo non è pronto: tieni premuto il tasto di accensione per 5-7 secondi e riprova.',
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
  not_supported: 'Questo dispositivo non è supportato.',
  already_paired: 'Questo dispositivo è già abbinato a un altro sistema. Ripristinalo e riprova.',
};

export const GENERIC_ABORT_MESSAGE = "L'aggiunta non è andata a buon fine.";

/** Integrations of televisions: the error texts above speak of «il televisore». */
const TV_HANDLERS: readonly string[] = [
  'webostv',
  'samsungtv',
  'androidtv_remote',
  'androidtv',
  'braviatv',
  'philips_js',
];

/** Texts for the error keys that FORM_ERROR_MESSAGES words for a television, for any device. */
const GENERIC_FORM_ERRORS: Readonly<Record<string, string>> = {
  cannot_connect:
    "Non riesco a collegarmi al dispositivo. Controlla che sia acceso, collegato alla stessa rete e che l'indirizzo sia giusto.",
  invalid_auth: 'Accesso non riuscito. Controlla nome utente e password e riprova.',
  invalid_pin: 'Il codice non è quello mostrato dal dispositivo. Riprova.',
  error_pairing: "Non hai confermato in tempo sul dispositivo. Riprova.",
};

/** Error keys that HA puts in `errors` of a form step, as a sentence for a person. */
export const resolveFormError = (
  key: string,
  handler: string,
  haText: string | null
): string => {
  if (TV_HANDLERS.includes(handler)) return FORM_ERROR_MESSAGES[key] ?? haText ?? GENERIC_ERROR_MESSAGE;
  return haText ?? GENERIC_FORM_ERRORS[key] ?? FORM_ERROR_MESSAGES[key] ?? GENERIC_ERROR_MESSAGE;
};

/** The text of an abort reason: ours first, then the Italian one of HA, then a plain sentence. */
export const resolveAbortReason = (reason: string, haText: string | null): string =>
  ABORT_MESSAGES[reason] ?? haText ?? GENERIC_ABORT_MESSAGE;

export const translateFormError = (key: string): string =>
  FORM_ERROR_MESSAGES[key] ?? GENERIC_ERROR_MESSAGE;

export const translateAbortReason = (reason: string): string =>
  ABORT_MESSAGES[reason] ?? GENERIC_ABORT_MESSAGE;

/**
 * Italian labels for the field names that integrations use over and over (F4, point 3). Used when
 * neither our own texts nor an Italian translation of HA give the field a label.
 */
const GENERIC_FIELD_LABELS: Readonly<Record<string, string>> = {
  host: 'Indirizzo IP o nome',
  ip_address: 'Indirizzo IP',
  ip: 'Indirizzo IP',
  pin: 'Codice PIN',
  pairing_code: 'Codice di abbinamento',
  code: 'Codice',
  password: 'Password',
  username: 'Nome utente',
  user: 'Nome utente',
  email: 'E-mail',
  port: 'Porta',
  name: 'Nome',
  api_key: 'Chiave API',
  api_token: 'Token API',
  access_token: 'Token di accesso',
  token: 'Token',
  client_id: 'ID client',
  client_secret: 'Segreto client',
  mac: 'Indirizzo MAC',
  url: 'Indirizzo web',
  ssl: 'Usa una connessione cifrata (SSL)',
  verify_ssl: 'Verifica il certificato',
  model: 'Modello',
  device: 'Dispositivo',
  location: 'Posizione',
  latitude: 'Latitudine',
  longitude: 'Longitudine',
  timeout: 'Tempo massimo',
  scan_interval: 'Ogni quanto leggere',
  broadcast_address: 'Indirizzo di broadcast',
  broadcast_port: 'Porta di broadcast',
  noise_psk: 'Chiave di cifratura',
  language: 'Lingua',
  country: 'Paese',
  region: 'Regione',
};

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** «api_key_2» becomes «Api key 2»: the last resort when a field has no label at all. */
export const humanizeName = (name: string): string =>
  capitalize(name.replace(/[_-]+/g, ' ').trim()) || 'Valore';

export const genericFieldLabel = (name: string): string =>
  GENERIC_FIELD_LABELS[name] ?? humanizeName(name);

/** Fixed Italian wording for the steps that are not forms. */
export const FLOW_STEP_FALLBACKS = {
  menuTitle: 'Scegli come continuare',
  progressTitle: 'Un momento',
  progressWaiting: 'Sto aspettando che Home Assistant finisca. Può volerci qualche istante.',
  externalTitle: 'Accedi sul sito del produttore',
  externalDescription:
    'Per collegare il dispositivo devi accedere al tuo account sul sito del produttore. Si apre in una nuova pagina: quando hai finito torna qui.',
} as const;

export interface StepTexts {
  title: string;
  description?: string;
  /** Seconds the person is asked to wait at the TV (pairing). */
  waitSeconds?: number;
  fields?: Readonly<Record<string, { label: string; hint?: string }>>;
}

const confirmStep = (title: string, description: string): StepTexts => ({
  title,
  description,
});

const LOGIN_FIELDS = {
  username: { label: 'Nome utente' },
  password: { label: 'Password' },
} as const;

/** Texts of the integrations that HA discovers (F3). The step ids are the ones of HA. */
const DISCOVERED_STEP_TEXTS: Readonly<Record<string, Readonly<Record<string, StepTexts>>>> = {
  samsungtv: {
    user: {
      title: 'Aggiungi il televisore Samsung',
      description: 'Accendi il televisore e scrivi qui il suo indirizzo.',
      fields: {
        host: {
          label: 'Indirizzo del televisore',
          hint: 'Per esempio 192.168.1.26',
        },
      },
    },
    confirm: {
      title: 'Accetta sul televisore',
      description:
        'Accendi il televisore. Premi Avanti: sullo schermo comparirà una richiesta, scegli Consenti con il telecomando. Sui modelli più vecchi comparirà un codice da scrivere qui.',
      waitSeconds: 30,
    },
    pairing: {
      title: 'Accetta sul televisore',
      description: 'Scegli Consenti sul televisore con il telecomando, poi tocca Avanti.',
      waitSeconds: 30,
    },
    encrypted_pairing: {
      title: 'Scrivi il codice',
      description: 'Sul televisore è comparso un codice di quattro cifre: scrivilo qui.',
      fields: { pin: { label: 'Codice mostrato sul televisore' } },
    },
  },
  androidtv_remote: {
    user: {
      title: 'Aggiungi Android TV',
      description: 'Accendi il televisore e scrivi qui il suo indirizzo.',
      fields: {
        host: {
          label: 'Indirizzo del televisore',
          hint: 'Per esempio 192.168.1.26',
        },
      },
    },
    zeroconf_confirm: confirmStep(
      'Aggiungi Android TV',
      'Accendi il televisore. Tocca Conferma: sullo schermo comparirà un codice.'
    ),
    pair: {
      title: 'Scrivi il codice',
      description: 'Sul televisore è comparso un codice di sei caratteri: scrivilo qui.',
      fields: { pin: { label: 'Codice mostrato sul televisore' } },
    },
  },
  cast: {
    confirm: confirmStep('Aggiungi il dispositivo Cast', 'Tocca Conferma per aggiungerlo.'),
  },
  sonos: {
    confirm: confirmStep('Aggiungi Sonos', 'Tocca Conferma per aggiungere il diffusore.'),
  },
  hue: {
    link: confirmStep(
      'Premi il pulsante del bridge',
      'Premi il pulsante rotondo sopra il bridge Hue, poi tocca Conferma entro 30 secondi.'
    ),
  },
  shelly: {
    confirm_discovery: confirmStep(
      'Aggiungi Shelly',
      'Tocca Conferma per aggiungere il dispositivo.'
    ),
    credentials: {
      title: 'Accesso al dispositivo Shelly',
      description: 'Il dispositivo è protetto da una password: scrivila qui.',
      fields: LOGIN_FIELDS,
    },
  },
  tplink: {
    discovery_confirm: confirmStep(
      'Aggiungi TP-Link',
      'Tocca Conferma per aggiungere il dispositivo.'
    ),
    user_auth_confirm: {
      title: 'Accesso TP-Link',
      description: "Scrivi l'e-mail e la password del tuo account TP-Link.",
      fields: LOGIN_FIELDS,
    },
  },
  wiz: {
    discovery_confirm: confirmStep('Aggiungi la luce WiZ', 'Tocca Conferma per aggiungerla.'),
  },
  yeelight: {
    discovery_confirm: confirmStep('Aggiungi la luce Yeelight', 'Tocca Conferma per aggiungerla.'),
  },
  lifx: {
    confirm: confirmStep('Aggiungi la luce LIFX', 'Tocca Conferma per aggiungerla.'),
    discovery_confirm: confirmStep('Aggiungi la luce LIFX', 'Tocca Conferma per aggiungerla.'),
  },
  nanoleaf: {
    link: confirmStep(
      'Prepara Nanoleaf',
      'Tieni premuto il tasto di accensione per 5-7 secondi finché la luce lampeggia, poi tocca Conferma.'
    ),
  },
  esphome: {
    discovery_confirm: confirmStep(
      'Aggiungi il dispositivo ESPHome',
      'Tocca Conferma per aggiungerlo.'
    ),
    authenticate: {
      title: 'Password del dispositivo',
      description: 'Il dispositivo è protetto da una password: scrivila qui.',
      fields: { password: { label: 'Password' } },
    },
    encryption_key: {
      title: 'Chiave di cifratura',
      description: 'Il dispositivo è cifrato: scrivi la sua chiave.',
      fields: { noise_psk: { label: 'Chiave di cifratura' } },
    },
  },
  homekit_controller: {
    pair: {
      title: 'Codice di abbinamento',
      description:
        'Scrivi il codice di otto cifre che trovi sul dispositivo o sulla sua confezione, per esempio 123-45-678.',
      fields: {
        pairing_code: {
          label: 'Codice di abbinamento',
          hint: 'Per esempio 123-45-678',
        },
      },
    },
  },
};

/** Texts per integration and step. A step that is not listed has no text and no input rule. */
export const STEP_TEXTS: Readonly<Record<string, Readonly<Record<string, StepTexts>>>> = {
  ...DISCOVERED_STEP_TEXTS,
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
