import type { AuthData } from 'home-assistant-js-websocket';
import type { RegistrationInput, RegistrationResult, RegistrationStatus } from '../../../contracts/registration';
import { isObject } from '@/validators/guards';
import { revokeSession } from '@/api/haSession';

async function request(path: string, body?: RegistrationInput): Promise<unknown> {
  const response = await fetch(`./api/v2/registration${path}`, { cache: 'no-store',
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(isObject(value) && typeof value.error === 'string' ? value.error : 'La registrazione non è disponibile. Riprova fra poco.');
  return value;
}
const result = (value: unknown): RegistrationResult => {
  if (!isObject(value) || typeof value.attemptId !== 'string' || !['created', 'pending', 'failed'].includes(String(value.status))
    || (value.userId !== null && typeof value.userId !== 'string')) throw new Error('Risposta di registrazione non valida.');
  return value as unknown as RegistrationResult;
};
export async function readRegistrationStatus(): Promise<RegistrationStatus> {
  const value = await request('/status');
  if (!isObject(value) || typeof value.ready !== 'boolean') throw new Error('Aggiorna ACA sulla centrale per creare un nuovo utente.');
  return { ready: value.ready };
}
export async function createHouseMember(input: RegistrationInput): Promise<RegistrationResult> {
  return result(await request('/attempts', input));
}
export async function readRegistrationAttempt(id: string): Promise<RegistrationResult | null> {
  const response = await fetch(`./api/v2/registration/attempts/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Non riesco a verificare il tentativo. Riprova fra poco.');
  return result(await response.json());
}
/** Prima di salvare i token, conferma sul server l'identità appena creata. */
export async function verifyRegisteredSession(tokens: AuthData, expectedUserId: string, revokeOnFailure = true): Promise<void> {
  const response = await fetch('./api/v2/bootstrap', { cache: 'no-store', headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok || !isObject(value) || !isObject(value.user) || value.user.id !== expectedUserId) {
    if (revokeOnFailure) await revokeSession(tokens);
    throw new Error('L’accesso non corrisponde all’utente appena creato. Accedi con il suo nome utente.');
  }
}
