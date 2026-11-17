import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ request: vi.fn(), session: null as null | { houseId: string; user: { id: string }; client: { id: string } } }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.request, getBackendOverride: () => null }));
vi.mock('@/api/clientSession', () => ({ getClientSession: () => mocks.session, CLIENT_SESSION_EVENT: 'test:diagnostic-session' }));
import { flushDiagnostics, reportDiagnostic } from '@/api/diagnosticApi';
import { logger } from '@/utils/logger';
const KEY = 'aca_diagnostics_v2';
beforeEach(() => {
  vi.restoreAllMocks(); mocks.request.mockReset().mockResolvedValue({ accepted: 1 });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  mocks.session = null; window.dispatchEvent(new Event('test:diagnostic-session')); localStorage.clear();
  mocks.session = { houseId: 'home', user: { id: 'user-a' }, client: { id: 'phone-a' } };
  window.dispatchEvent(new Event('test:diagnostic-session'));
});
describe('diagnostica controllata', () => {
  it('salva solo codici, limita ripetizioni e invia la coda quando torna online', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logger.error('TOKEN_DA_NON_ARCHIVIARE', { password: 'PIN_SEGRETO', url: 'http://indirizzo-privato' });
    reportDiagnostic('client.error');
    const queued = JSON.parse(localStorage.getItem(KEY)!);
    expect(queued.events).toHaveLength(1);
    expect(JSON.stringify(queued)).not.toMatch(/TOKEN_DA_NON_ARCHIVIARE|PIN_SEGRETO|indirizzo-privato/);
    expect(mocks.request).not.toHaveBeenCalled();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); await flushDiagnostics();
    expect(mocks.request).toHaveBeenCalledOnce();
    expect(JSON.parse(mocks.request.mock.calls[0]![1].body).events).toEqual([expect.objectContaining({ code: 'client.error' })]);
    expect(JSON.parse(localStorage.getItem(KEY)!).events).toEqual([]);
  });
  it('non attribuisce all’account successivo le segnalazioni offline del precedente', async () => {
    reportDiagnostic('client.command_unknown');
    mocks.session = { houseId: 'home', user: { id: 'user-b' }, client: { id: 'phone-b' } };
    window.dispatchEvent(new Event('test:diagnostic-session'));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); await flushDiagnostics();
    expect(mocks.request).not.toHaveBeenCalled(); expect(localStorage.getItem(KEY)).toBeNull();
  });
  it('ha una quota locale e non carica eventi scaduti o campi arbitrari', async () => {
    const events = Array.from({ length: 120 }, (_, i) => ({ eventId: `event-${i}`, code: 'client.error',
      occurredAt: new Date(Date.now() - (i === 119 ? 8 * 86400000 : 0)).toISOString(), raw: 'NON_INVIARE' }));
    localStorage.setItem(KEY, JSON.stringify({ owner: 'home:user-a:phone-a', events }));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); await flushDiagnostics();
    await vi.waitFor(() => expect((JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? { events: [] }).events).toHaveLength(0));
    const text = JSON.stringify(mocks.request.mock.calls);
    expect(text).not.toContain('NON_INVIARE'); expect(text).not.toContain('event-119');
    const count = mocks.request.mock.calls.reduce((sum, call) => sum + JSON.parse(call[1].body).events.length, 0);
    expect(count).toBeLessThanOrEqual(100);
  });
});
