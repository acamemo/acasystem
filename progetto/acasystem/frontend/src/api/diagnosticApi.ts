import { backendRequest, getBackendOverride } from './backendClient';
import { getClientSession, CLIENT_SESSION_EVENT } from './clientSession';
import type { ClientDiagnostic } from '../../../contracts/activity';

const KEY = 'aca_diagnostics_v2';
const MAX_EVENTS = 100;
const MAX_BYTES = 64 * 1024;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
interface DiagnosticQueue { owner: string; events: ClientDiagnostic[] }
let busy = false;
let lastCode = '';
let lastAt = 0;
let previousOwner: string | null = null;
const CODES: readonly ClientDiagnostic['code'][] = ['client.error', 'client.command_error', 'client.command_unknown', 'client.activity_unavailable'];
const owner = () => {
  const context = getClientSession();
  return context ? `${context.houseId}:${context.user.id}:${context.client.id}` : null;
};
const readQueue = (): DiagnosticQueue | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as DiagnosticQueue | null;
    if (!parsed || typeof parsed.owner !== 'string' || !Array.isArray(parsed.events)) return null;
    return { owner: parsed.owner, events: parsed.events.filter((event) => event && typeof event.eventId === 'string'
      && /^[A-Za-z0-9_-]{1,80}$/.test(event.eventId) && CODES.includes(event.code)
      && typeof event.occurredAt === 'string' && Number.isFinite(Date.parse(event.occurredAt)))
      .map(({ eventId, code, occurredAt }) => ({ eventId, code, occurredAt })).slice(-MAX_EVENTS) };
  } catch { return null; }
};
export const flushDiagnostics = async (): Promise<void> => {
  const current = owner();
  if (busy || !current || navigator.onLine === false || getBackendOverride()) return;
  const queue = readQueue();
  if (!queue || queue.owner !== current || !queue.events.length) return;
  const batch = queue.events.filter((event) => Date.parse(event.occurredAt) > Date.now() - MAX_AGE).slice(0, 50);
  if (!batch.length) { try { localStorage.removeItem(KEY); } catch { /* Storage disabilitato. */ } return; }
  busy = true;
  let more = false;
  try {
    await backendRequest('/v2/activity/diagnostics', { method: 'POST', body: JSON.stringify({ events: batch }) }, { retryOnOAuthUnauthorized: false });
    const latest = readQueue();
    if (latest?.owner === current) {
      const sent = new Set(batch.map((event) => event.eventId));
      const remaining = latest.events.filter((event) => !sent.has(event.eventId));
      localStorage.setItem(KEY, JSON.stringify({ owner: current, events: remaining }));
      more = remaining.length > 0;
    }
  } catch { /* La coda limitata rimane locale: nessun retry di comandi fisici. */ }
  finally { busy = false; }
  if (more) void flushDiagnostics();
};
export const reportDiagnostic = (code: ClientDiagnostic['code']): void => {
  const current = owner();
  if (!current || getBackendOverride()) return;
  if (lastCode === code && Date.now() - lastAt < 10_000) return;
  lastCode = code; lastAt = Date.now();
  try {
    const old = readQueue();
    const events = old?.owner === current ? old.events.filter((event) => Date.parse(event.occurredAt) > Date.now() - MAX_AGE) : [];
    const eventId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, '0')).join('');
    events.push({ eventId, code, occurredAt: new Date().toISOString() });
    while (events.length > MAX_EVENTS || new Blob([JSON.stringify(events)]).size > MAX_BYTES) events.shift();
    localStorage.setItem(KEY, JSON.stringify({ owner: current, events }));
    void flushDiagnostics();
  } catch { /* Storage non disponibile: la diagnostica non interrompe l'app. */ }
};
// Le notifiche permettono di svuotare anche una coda conservata prima della riapertura.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flushDiagnostics(); });
  window.addEventListener(CLIENT_SESSION_EVENT, () => {
    const current = owner(); const queue = readQueue();
    if ((!current && previousOwner) || (current && queue && queue.owner !== current)) {
      try { localStorage.removeItem(KEY); } catch { /* Storage disabilitato. */ }
      lastCode = '';
    }
    previousOwner = current;
    if (current) void flushDiagnostics();
  });
}
