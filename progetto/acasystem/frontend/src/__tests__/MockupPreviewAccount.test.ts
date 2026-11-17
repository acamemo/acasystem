import { describe, expect, it } from 'vitest';
import { createMockBackend } from '@/utils/mockup/backendFacade';
import type { AccountMetadata } from '../../../contracts/account';
import type { ActivityExport, ActivityPage } from '../../../contracts/activity';

const now = () => Date.parse('2026-11-04T12:00:00Z');
const create = () => createMockBackend({ handle: async () => ({ status: 404, body: null }), reset: () => undefined }, { now });
describe('account e Tavano della dimostrazione', () => {
  it('mantiene account e immagini solo nella visita, rifiutando revisioni obsolete', async () => {
    const backend = create();
    const initial = (await backend.handle({ path: '/v2/account' })).body as AccountMetadata;
    expect(initial).toMatchObject({ userId: 'mockup-user', name: 'Demo', revision: 1 });
    expect((await backend.handle({ path: '/v2/account', method: 'PATCH', body: JSON.stringify({ baseRevision: 0, color: '#aabbcc' }) })).status).toBe(409);
    const updated = await backend.handle({ path: '/v2/account', method: 'PATCH', body: JSON.stringify({ baseRevision: 1, color: '#aabbcc' }) });
    expect(updated.body).toMatchObject({ revision: 2, color: '#aabbcc' });
    expect((await create().handle({ path: '/v2/account' })).body).toMatchObject({ revision: 1, color: '#8b7bff' });
    const image = 'data:image/png;base64,AQID';
    expect((await backend.handle({ path: '/v2/account/images/cover', method: 'PUT', body: JSON.stringify({ baseRevision: 2, dataUrl: image }) })).body).toMatchObject({ revision: 3, coverRevision: 3 });
    const stored = await backend.handle({ path: '/v2/account/images/cover' });
    expect(stored.blob?.type).toBe('image/png');
    expect(stored.blob?.size).toBe(3);
    expect((await backend.handle({ path: '/v2/account/images/cover', method: 'DELETE', body: JSON.stringify({ baseRevision: 3 }) })).body).toMatchObject({ revision: 4, coverRevision: null });
    expect((await backend.handle({ path: '/v2/account/images/cover' })).status).toBe(404);
  });
  it('filtra e pagina attività sintetiche senza dichiarare comandi reali', async () => {
    const backend = create();
    const first = (await backend.handle({ path: '/v2/activity?limit=2' })).body as ActivityPage;
    expect(first.events).toHaveLength(2);
    expect(first.nextCursor).toBe(47);
    const next = (await backend.handle({ path: '/v2/activity?before=47&limit=2' })).body as ActivityPage;
    expect(next.events.map((event) => event.id)).toEqual([46, 45]);
    const commands = (await backend.handle({ path: '/v2/activity?kind=command' })).body as ActivityPage;
    expect(commands.events).toHaveLength(1);
    expect(commands.events[0]).toMatchObject({ code: 'DEMO_SYNTHETIC', actor: { userName: 'Demo · dati simulati' } });
    const old = (await backend.handle({ path: '/v2/activity?to=2026-11-03T00%3A00%3A00Z' })).body as ActivityPage;
    expect(old.events.length).toBeGreaterThan(0);
    expect(old.events.every((event) => event.at <= '2026-11-03T00:00:00Z')).toBe(true);
  });
  it('offre pagine da30, età0–6 e faccette oltre la pagina, scartando solo eventi scaduti', async () => {
    let clock = now();
    const backend = createMockBackend({ handle: async () => ({ status: 404, body: null }), reset: () => undefined }, { now: () => clock });
    const first = (await backend.handle({ path: '/v2/activity' })).body as ActivityPage;
    expect(first.events).toHaveLength(30);
    expect(first.facets?.users.some((user) => user.id === 'demo-member')).toBe(true);
    const next = (await backend.handle({ path: `/v2/activity?before=${first.nextCursor}&asOf=${first.asOf}` })).body as ActivityPage;
    expect(next.events).toHaveLength(18);
    expect(next.events.some((event) => first.events.some((row) => row.id === event.id))).toBe(false);
    const oldest = (await backend.handle({ path: '/v2/activity?ageDays=6' })).body as ActivityPage;
    expect(oldest.events).toHaveLength(6);
    clock += 7 * 24 * 60 * 60 * 1000;
    expect(((await backend.handle({ path: '/v2/activity' })).body as ActivityPage).events).toEqual([]);
  });
  it('esporta solo le attività filtrate con identità pseudonimizzate', async () => {
    const exported = (await create().handle({ path: '/v2/activity/export?outcome=unknown' })).body as ActivityExport;
    expect(exported.events).toHaveLength(1);
    expect(exported).toMatchObject({ pseudonymized: true, truncated: false });
    expect(exported.events[0]?.actor?.userName).toMatch(/^utente_/);
    expect(JSON.stringify(exported)).not.toContain('PC dimostrativo');
    expect(JSON.stringify(exported)).not.toContain('mockup-user');
  });
});
