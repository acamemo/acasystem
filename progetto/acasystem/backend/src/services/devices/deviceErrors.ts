import { isHaError } from './haTransport.ts';
import type { HaError } from './haTransport.ts';

/**
 * Errors of the device facade. Each one carries the HTTP status, a machine code and a message
 * in Italian that is safe to show to a customer: no address, MAC, token or text from HA.
 */

export const DEVICE_ERROR_DEFINITIONS = {
  SERVICE_NOT_ACTIVE: {
    status: 503,
    message:
      "Servizio non attivo. La configurazione dei dispositivi da Acasystem è spenta: chiedi all'installatore di attivarla.",
  },
  HA_UNREACHABLE: {
    status: 503,
    message: 'Home Assistant non è raggiungibile. Controlla che sia acceso e riprova tra poco.',
  },
  HA_TIMEOUT: {
    status: 504,
    message: 'Home Assistant non ha risposto in tempo. Riprova.',
  },
  HA_NOT_READY: {
    status: 503,
    message: "Home Assistant non è ancora stato configurato. Serve l'installatore.",
  },
  HA_INCOMPATIBLE: {
    status: 503,
    message: "Questa versione di Home Assistant non risponde come previsto. Serve l'installatore.",
  },
  FEATURE_UNAVAILABLE: {
    status: 503,
    message:
      "Su questo sistema non è possibile aggiungere dispositivi da qui. Chiedi all'installatore.",
  },
  REQUIRES_INSTALLER: { status: 403, message: "Richiede l'installatore." },
  FORBIDDEN: { status: 403, message: 'Non puoi usare questo elemento.' },
  FLOW_NOT_FOUND: {
    status: 404,
    message: 'Questa aggiunta non esiste più. Ricomincia.',
  },
  FLOW_EXPIRED: {
    status: 410,
    message: "L'aggiunta è scaduta perché è rimasta ferma troppo a lungo. Ricomincia.",
  },
  FLOW_ALREADY_OPEN: {
    status: 409,
    message: "Hai già un'aggiunta in corso per questo dispositivo. Continuala oppure annullala.",
  },
  FLOW_BUSY: {
    status: 409,
    message: 'Un passaggio è già in corso. Aspetta che finisca.',
  },
  TOO_MANY_FLOWS: {
    status: 429,
    message: 'Hai troppe aggiunte aperte. Chiudine una e riprova.',
  },
  RATE_LIMITED: {
    status: 429,
    message: 'Troppi tentativi. Riprova tra qualche minuto.',
  },
  INVALID_INPUT: { status: 400, message: 'I dati inseriti non sono validi.' },
  UNSUPPORTED_STEP: {
    status: 422,
    message:
      "Questo dispositivo non si può ancora aggiungere da Acasystem. Chiedi all'installatore.",
  },
  ENTRY_NOT_FOUND: { status: 404, message: 'Dispositivo non trovato.' },
  DEVICE_NOT_FOUND: { status: 404, message: 'Dispositivo non trovato.' },
  AREA_NOT_FOUND: { status: 404, message: 'Stanza non trovata.' },
  MAC_REQUIRED: {
    status: 409,
    message:
      "Per accendere il televisore serve il suo indirizzo MAC, che Home Assistant non conosce. Lo inserisce l'installatore.",
  },
  ENTRY_NOT_READY: {
    status: 409,
    message: 'Il dispositivo non è ancora pronto. Riprova tra qualche secondo.',
  },
  HA_REFUSED: {
    status: 502,
    message: "Home Assistant ha rifiutato l'operazione. Riprova o chiedi all'installatore.",
  },
  AREA_EXISTS: { status: 409, message: 'Esiste già una stanza con questo nome.' },
  RECIPE_FAILED: {
    status: 502,
    message: "Non sono riuscito a configurare l'accensione. Riprova o chiedi all'installatore.",
  },
  NOT_FOUND: { status: 404, message: 'Percorso non trovato.' },
  BAD_REQUEST: { status: 400, message: 'Richiesta non valida.' },
  INTERNAL: { status: 500, message: 'Errore interno. Riprova.' },
} as const;

export type DeviceErrorCode = keyof typeof DEVICE_ERROR_DEFINITIONS;

export interface DeviceErrorExtras {
  /** Field of the request that is wrong (INVALID_INPUT). */
  field?: string;
  /** Message that replaces the default one (still Italian, still free of secrets). */
  message?: string;
  retryAfterSeconds?: number;
  /** Id of the flow already open (FLOW_ALREADY_OPEN). */
  flowId?: string;
}

export class DeviceError extends Error {
  readonly status: number;
  readonly code: DeviceErrorCode;
  readonly field: string | undefined;
  readonly retryAfterSeconds: number | undefined;
  readonly flowId: string | undefined;

  constructor(code: DeviceErrorCode, extras: DeviceErrorExtras = {}) {
    const definition = DEVICE_ERROR_DEFINITIONS[code];
    super(extras.message ?? definition.message);
    this.name = 'DeviceError';
    this.status = definition.status;
    this.code = code;
    this.field = extras.field;
    this.retryAfterSeconds = extras.retryAfterSeconds;
    this.flowId = extras.flowId;
  }
}

export const isDeviceError = (error: unknown): error is DeviceError => error instanceof DeviceError;

/**
 * Maps a failure towards HA to the error shown to the customer. `refusal` is what a refusal
 * of HA (bad request, not found, server error) becomes: HA_REFUSED by default, RECIPE_FAILED
 * only for the power-on recipe, whose message talks about the TV. `unauthorized` and
 * `forbidden` mean HA refused the service token (user suspended, deleted, no longer admin):
 * the caller must also tell the identity, so the answer is "service not active", never a
 * fallback on another token.
 */
export const translateHaError = (
  error: HaError,
  refusal: 'HA_REFUSED' | 'RECIPE_FAILED' = 'HA_REFUSED'
): DeviceError => {
  switch (error.kind) {
    case 'unreachable':
      return new DeviceError('HA_UNREACHABLE');
    case 'timeout':
      return new DeviceError('HA_TIMEOUT');
    case 'unauthorized':
    case 'forbidden':
      return new DeviceError('SERVICE_NOT_ACTIVE');
    case 'protocol':
      return new DeviceError('HA_INCOMPATIBLE');
    default:
      return new DeviceError(refusal);
  }
};

/** True when HA refused the credentials of the service user. */
export const isServiceRejection = (error: unknown): boolean =>
  isHaError(error) && (error.kind === 'unauthorized' || error.kind === 'forbidden');

/** Short description of an unexpected error for the logs: class and code, never the message. */
export const describeForLog = (error: unknown): string => {
  if (isHaError(error)) return `HaError(${error.kind}${error.code ? `:${error.code}` : ''})`;
  if (isDeviceError(error)) return `DeviceError(${error.code})`;
  if (error instanceof Error) return error.name;
  return typeof error;
};
