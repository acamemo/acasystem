/**
 * Texts of «Aggiungi un dispositivo» (D1). The texts of the steps of a flow (titles, fields,
 * errors) come from the server in Italian; the ones here are the frame around them. Nothing
 * here is built from what the person typed.
 */

export const deviceTexts = {
  // Entry points.
  addDevice: 'Aggiungi un dispositivo',
  addDeviceHint: 'Non lo vedi nell’elenco? Aggiungilo da qui.',
  noTv: 'Nessun televisore in Home Assistant.',
  entityAppearing: 'Il televisore sta comparendo…',
  entityLate: 'Comparirà tra pochi secondi.',

  // Common buttons.
  exit: 'Esci',
  next: 'Avanti',
  confirm: 'Conferma',
  retry: 'Riprova',
  restart: 'Ricomincia',
  resume: 'Riprendi',
  continueFlow: 'Continua',
  cancel: 'Annulla',
  skip: 'Salta',
  done: 'Fine',
  save: 'Salva',
  backToChoice: 'Torna alla scelta del dispositivo',

  // Checks and states of the service.
  checking: 'Controllo Home Assistant…',
  featureUnavailable:
    'Su questo sistema non è possibile aggiungere dispositivi da qui. Chiedi all’installatore.',
  haUnreachable: 'Home Assistant non è raggiungibile. Controlla che sia acceso e riprova tra poco.',
  pendingFlow: 'Hai un’aggiunta in sospeso.',
  pendingFlowHint: 'Puoi riprenderla da dove eri arrivato oppure annullarla e ricominciare.',
  conflictFlow: 'Hai già un’aggiunta in corso per questo dispositivo. Continuala oppure annullala.',

  // Catalogue.
  recommended: 'Consigliati per questo widget',
  otherIntegrations: 'Altre integrazioni',
  searchLabel: 'Cerca un’integrazione',
  searchPlaceholder: 'Cerca per nome',
  addRow: 'Aggiungi',
  requiresInstaller: 'Richiede l’installatore',
  catalogLoading: 'Cerco le integrazioni…',
  catalogEmpty: 'Nessuna integrazione trovata.',
  catalogShown: (shown: number, total: number) =>
    `Mostro ${shown} di ${total}: scrivi per restringere.`,

  // Steps of a flow.
  unsupportedStep: 'Questo dispositivo non si può ancora aggiungere da Acasystem.',
  required: 'Compila questo campo.',
  confirmTitle: 'Conferma',
  confirmHint: 'Tocca Conferma per continuare.',

  // Pairing.
  pairingNeeds: 'Sul televisore deve essere attivo LG Connect Apps.',
  pairingIntro: (seconds: number) =>
    `Tieni in mano il telecomando. Premi Avanti: sul televisore comparirà una richiesta. Hai ${seconds} secondi per premere OK.`,
  pairingLook: 'Guarda il televisore e premi OK.',
  pairingWaiting: 'Sto aspettando la risposta del televisore…',
  pairingCountdown: 'Secondi rimasti per premere OK',
  pairingRetry: 'Riprova',

  // Entry not ready.
  entryPending: 'Il dispositivo si sta avviando. Aspetta qualche secondo.',
  entryChecking: 'Controllo il dispositivo…',

  // Name and room.
  nameTitle: 'Come vuoi chiamarlo?',
  nameLabel: 'Nome del dispositivo',
  nameProposal: 'Televisore',
  roomTitle: 'In quale stanza si trova?',
  roomNone: 'Nessuna stanza',
  roomNew: 'Nuova stanza',
  roomNewLabel: 'Nome della nuova stanza',
  roomCreate: 'Crea la stanza',
  roomsLoading: 'Cerco le stanze…',

  // Power-on.
  powerTitle: 'Accensione da spento',
  powerGuide:
    'Per accendere il televisore da spento, sul televisore attiva l’accensione via rete (Wake on LAN, oppure «Accendi tramite Wi-Fi»: il nome cambia col modello).',
  powerEnable: 'Attiva l’accensione',
  powerWorks: 'Accensione: funziona',
  powerInactive: 'L’accensione da spento non è attiva.',
  powerMacLabel: 'Indirizzo MAC',
  powerMacHint: 'Lo trovi nel menu Rete del televisore.',
  powerMacInvalid: 'L’indirizzo MAC non è valido. Per esempio 02:00:00:00:00:01.',
  powerAdvanced: 'Avanzate',
  powerBroadcastLabel: 'Indirizzo di broadcast',
  powerBroadcastInvalid: 'L’indirizzo di broadcast non è valido. Per esempio 192.168.1.255.',
  powerPortLabel: 'Porta',
  powerPortInvalid: 'La porta deve essere un numero da 1 a 65535.',
  powerTry: 'Prova ad accendere',
  powerTryAsk: 'Il televisore riceverà un comando di accensione.',
  powerTryConfirm: 'Accendi',
  powerTrySent: 'Comando inviato. Se il televisore non si accende, controlla le sue impostazioni.',
  powerTryFailed: 'Il comando non è riuscito. Riprova.',

  // End.
  added: 'Dispositivo aggiunto.',
  addedHint: 'Ora puoi collegarlo al widget.',
} as const;

/** Names of the integrations as the person knows them; the others keep the technical name. */
const INTEGRATION_NAMES: Readonly<Record<string, string>> = {
  webostv: 'Televisore LG (webOS)',
};

export const integrationName = (domain: string, technicalName: string): string =>
  INTEGRATION_NAMES[domain] ?? technicalName;

/** Integrations proposed first for each kind of widget (D1: the TV only). */
export const RECOMMENDED_HANDLERS: Readonly<Record<'tv', readonly string[]>> = {
  tv: ['webostv'],
};

/** Four octets without leading zeros (so `010` is never read as octal), or null. */
const parseIpv4 = (value: string): number[] | null => {
  const parts = value.trim().split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    octets.push(octet);
  }
  return octets;
};

/** `192.168.1.26` becomes `192.168.1.255`: the broadcast of a /24 network, or null. */
export function broadcastFor(address: string): string | null {
  const octets = parseIpv4(address);
  return octets ? `${octets.slice(0, 3).join('.')}.255` : null;
}

const MAC_COLON_OR_DASH = /^[0-9a-f]{2}([:-])(?:[0-9a-f]{2}\1){4}[0-9a-f]{2}$/i;
const MAC_PLAIN = /^[0-9a-f]{12}$/i;
const MAC_DOTTED = /^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i;

/**
 * Same rules as the server (helpers/macAddress.ts): colon, dash, dotted or plain hex, not
 * all zeros, not a group address. The server decides; this only saves a round trip.
 */
export function isValidMac(value: string): boolean {
  const text = value.trim();
  if (!MAC_COLON_OR_DASH.test(text) && !MAC_PLAIN.test(text) && !MAC_DOTTED.test(text)) {
    return false;
  }
  const hex = text.replace(/[:.-]/g, '').toLowerCase();
  if (hex === '000000000000') return false;
  return Number.parseInt(hex.slice(0, 2), 16) % 2 === 0;
}

export const isValidIpv4 = (value: string): boolean => parseIpv4(value) !== null;
