import { isRecord } from '@/validators/guards';

export type CentralSetupState = 'owner-required' | 'setup-required' | 'ready';
export interface CentralOwner {
  name: string;
  username: string;
  password: string;
}

const messages: Record<string, string> = {
  SETUP_OWNER_EXISTS: 'Il proprietario è già stato creato. Accedi per continuare la configurazione.',
  SETUP_INVALID_INPUT: 'Controlla i dati inseriti e riprova.',
  SETUP_USERNAME_INVALID: 'Usa un nome utente in minuscolo, senza spazi iniziali o finali.',
  SETUP_ADMIN_REQUIRED: 'Per completare la configurazione serve l’account amministratore della casa.',
  HA_AUTH_INVALID: 'La sessione non è più valida. Accedi di nuovo per completare la casa.',
  HA_UNREACHABLE: 'Home Assistant non risponde. Attendi che il mini PC sia pronto e riprova.',
  HA_TIMEOUT: 'Home Assistant sta impiegando più tempo del previsto. Attendi e riprova.',
  HA_URL_NOT_CONFIGURED: 'La centrale non è ancora predisposta. Contatta chi ha preparato il mini PC.',
};

export class CentralSetupError extends Error {
  constructor(readonly code: string) {
    super(messages[code] ?? 'Non riesco a completare la configurazione. Riprova.');
    this.name = 'CentralSetupError';
  }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`./api/setup/${path}`, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(90_000),
      ...init,
    });
  } catch {
    throw new CentralSetupError('HA_UNREACHABLE');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CentralSetupError(isRecord(body) && typeof body.code === 'string' ? body.code : 'unexpected');
  }
  return body;
}

/** Only the installation state: no saved access or protected application API is read here. */
export async function readCentralSetupStatus(): Promise<CentralSetupState> {
  const body = await request('status');
  if (isRecord(body) && (body.state === 'owner-required' || body.state === 'setup-required' || body.state === 'ready')) {
    return body.state;
  }
  throw new CentralSetupError('unexpected');
}

export async function createCentralOwner(owner: CentralOwner): Promise<void> {
  const body = await request('owner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(owner),
  });
  if (!isRecord(body) || body.created !== true) throw new CentralSetupError('unexpected');
}

export async function completeCentralSetup(accessToken: string, locationName: string): Promise<void> {
  const body = await request('complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ locationName }),
  });
  if (!isRecord(body) || body.complete !== true) throw new CentralSetupError('unexpected');
}
