import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HaMessageConnection } from '@/@types/ha';
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  diagnostic: vi.fn(),
  demo: null as null | { conn: HaMessageConnection },
}));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.request }));
vi.mock('@/api/diagnosticApi', () => ({ reportDiagnostic: mocks.diagnostic }));
vi.mock('@/api/demoSource', () => ({ getDemoSource: () => mocks.demo }));
import { callService, getForecast, addTodoItem } from '@/api/haClient';
import { CommandResultError, mutateHaConfiguration } from '@/api/commandApi';
import { clearProfileUsageProof, setProfileUsageProof } from '@/api/usageProof';

const intent = (state: string) => ({
  id: 'intent-1',
  state,
  code: null,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60000).toISOString(),
});
const connection = () => ({ connected: true, sendMessagePromise: vi.fn(async () => ({})) });
beforeEach(() => {
  clearProfileUsageProof();
  setProfileUsageProof({
    id: 'usage-test',
    profileId: 'profile',
    usageSessionId: 'tab-test',
    clientId: 'client',
    expiresAt: Date.now() + 180000,
    serverTime: Date.now(),
  });
  vi.restoreAllMocks();
  mocks.request.mockReset();
  mocks.diagnostic.mockReset();
  mocks.demo = null;
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  mocks.request.mockImplementation(async (path: string) =>
    intent(path.endsWith('/prepare') ? 'prepared' : 'accepted')
  );
});
describe('gateway comandi ACA', () => {
  it('senza diritto d’uso non prepara né invia comandi', async () => {
    clearProfileUsageProof();
    await expect(callService(connection(), 'light', 'toggle')).rejects.toMatchObject({
      body: { code: 'PROFILE_USAGE_REQUIRED' },
    });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('un cambio del titolare fra preparazione ed esecuzione non invia il comando preparato', async () => {
    mocks.request.mockImplementationOnce(async () => {
      setProfileUsageProof({
        id: 'new-usage',
        profileId: 'profile',
        usageSessionId: 'other-tab',
        clientId: 'client',
        expiresAt: Date.now() + 180000,
        serverTime: Date.now(),
      });
      return intent('prepared');
    });
    await expect(callService(connection(), 'light', 'toggle')).rejects.toMatchObject({
      body: { code: 'PROFILE_USAGE_EXPIRED' },
    });
    expect(mocks.request).toHaveBeenCalledOnce();
  });
  it('il rifiuto d’uso del backend resta esplicito e non diventa un errore rete o un reinvio', async () => {
    mocks.request.mockRejectedValueOnce(
      Object.assign(new Error('Profilo occupato'), {
        status: 423,
        body: { code: 'PROFILE_IN_USE' },
      })
    );
    await expect(callService(connection(), 'light', 'toggle')).rejects.toMatchObject({
      body: { code: 'PROFILE_IN_USE' },
    });
    expect(mocks.request).toHaveBeenCalledOnce();
  });
  it('prepara ed esegue una volta senza scrivere sul WebSocket e senza retry OAuth', async () => {
    const conn = connection();
    await callService(conn, 'light', 'turn_on', { entity_id: 'light.cucina' });
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(mocks.request).toHaveBeenCalledTimes(2);
    expect(mocks.request.mock.calls.map((call) => call[0])).toEqual([
      '/v2/commands/prepare',
      '/v2/commands/intent-1/execute',
    ]);
    for (const call of mocks.request.mock.calls)
      expect(call[2]).toEqual({ retryOnOAuthUnauthorized: false });
  });
  it('dopo risposta persa consulta soltanto il medesimo ID e non ripete toggle', async () => {
    mocks.request.mockImplementation(async (path: string) => {
      if (path.endsWith('/prepare')) return intent('prepared');
      if (path.endsWith('/execute')) throw new TypeError('connection lost');
      return intent('accepted');
    });
    await callService(connection(), 'light', 'toggle', { entity_id: 'light.cucina' });
    expect(mocks.request.mock.calls.map((call) => call[0])).toEqual([
      '/v2/commands/prepare',
      '/v2/commands/intent-1/execute',
      '/v2/commands/intent-1',
    ]);
  });
  it('mantiene unknown esplicito e non accoda comandi quando offline', async () => {
    mocks.request.mockImplementation(async (path: string) =>
      intent(path.endsWith('/prepare') ? 'prepared' : 'unknown')
    );
    await expect(
      callService(connection(), 'lock', 'unlock', { entity_id: 'lock.porta' })
    ).rejects.toMatchObject({ code: 'RESULT_UNKNOWN', intentId: 'intent-1' });
    expect(mocks.diagnostic).toHaveBeenCalledWith('client.command_unknown');
    mocks.request.mockClear();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(callService(connection(), 'light', 'toggle')).rejects.toMatchObject({
      code: 'NOT_SENT',
    });
    expect(mocks.request).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('online'));
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('un prepare fallito non invia execute e le mutazioni tipizzate usano lo stesso percorso', async () => {
    mocks.request.mockRejectedValueOnce(new Error('no connection'));
    await expect(mutateHaConfiguration('zigbee.backup')).rejects.toBeInstanceOf(CommandResultError);
    expect(mocks.request).toHaveBeenCalledOnce();
    mocks.request.mockClear();
    await mutateHaConfiguration('home.location', { latitude: 45, longitude: 9 });
    expect(JSON.parse(mocks.request.mock.calls[0]![1].body)).toEqual({
      command: { kind: 'home.location', latitude: 45, longitude: 9 },
    });
  });
  it('Todo mutativo passa dal gateway mentre forecast e demo restano letture/locali', async () => {
    const conn = connection();
    await addTodoItem(conn, 'todo.spesa', 'dato da inoltrare ma non registrare');
    expect(mocks.request).toHaveBeenCalledTimes(2);
    mocks.request.mockClear();
    await getForecast(conn, { entityId: 'weather.casa' });
    expect(mocks.request).not.toHaveBeenCalled();
    expect(conn.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'weather',
        service: 'get_forecasts',
        return_response: true,
      })
    );
    mocks.demo = { conn };
    await callService(conn, 'light', 'turn_on', { target: { entity_id: 'light.demo' } });
    expect(mocks.request).not.toHaveBeenCalled();
    expect(conn.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'light', target: { entity_id: 'light.demo' } })
    );
  });
});
