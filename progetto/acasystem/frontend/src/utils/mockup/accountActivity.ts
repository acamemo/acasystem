/** Account e registro di sola dimostrazione: dati della visita, mai inviati alla centrale. */
import { AVATAR_MAX_BYTES, COVER_MAX_BYTES, type AccountMetadata } from '../../../../contracts/account';
import { ACTIVITY_DAY_MS, ACTIVITY_QUOTA_BYTES, activityAgeDays, pseudonymizeActivities, type ActivityEvent, type ActivityExport, type ActivityFacets, type ActivityPage } from '../../../../contracts/activity';
import type { MockResponse } from './deviceFacade';

type Row = Record<string, unknown>;
const reply = (body: unknown, status = 200): MockResponse => ({ body, status });

export function createMockAccountActivity(now: () => number) {
  let account: AccountMetadata = {
    userId: 'mockup-user', name: 'Demo', color: '#8b7bff', revision: 1,
    avatarRevision: null, coverRevision: null,
  };
  const images = new Map<string, Blob>();
  const actor = { userId: 'mockup-user', userName: 'Demo · dati simulati', clientId: 'demo-pc',
    clientName: 'PC dimostrativo', sessionId: null, userColor: account.color, clientPlatform: 'web' as const };
  const events: ActivityEvent[] = [
    { kind: 'configuration', action: 'profile.saved', outcome: 'accepted', profileId: 'profilo-demo', revision: 4 },
    { kind: 'command', action: 'ha.light.turn_on', outcome: 'accepted', targetId: 'light.luce_soggiorno', widgetId: 'luce-demo' },
    { kind: 'configuration', action: 'account.color', outcome: 'accepted' },
    { kind: 'diagnostic', action: 'client.command_unknown', outcome: 'unknown', targetId: 'cover.tapparella_soggiorno' },
    { kind: 'configuration', action: 'client.connected', outcome: 'accepted' },
    { kind: 'diagnostic', action: 'client.error', outcome: 'error' },
  ].map((entry, index) => ({ ...entry, id: 48 - index,
    at: new Date(now() - (index + 1) * 120_000).toISOString(), code: 'DEMO_SYNTHETIC',
    actor: index % 2 === 0 ? { ...actor } : { ...actor, clientId: 'demo-telefono', clientName: 'Telefono dimostrativo' },
  } as ActivityEvent));
  // Older synthetic history makes the real pagination and each rolling-day filter testable.
  for (let index = 0; index < 42; index += 1) {
    const day = Math.floor(index / 6);
    events.push({ id: 42 - index, at: new Date(now() - day * ACTIVITY_DAY_MS - (index % 6 + 1) * 3_600_000).toISOString(),
      kind: 'configuration', action: 'profile.saved', outcome: 'accepted', profileId: 'profilo-demo',
      widgetId: 'tavano_card_preset_utilita', revision: 3, code: 'DEMO_SYNTHETIC',
      actor: { ...actor, ...(index >= 24 ? { userId: 'demo-member', userName: 'Ospite · dati simulati', clientId: 'demo-tablet', clientName: 'Tablet dimostrativo' } : {}) } });
  }
  let nextId = 49;
  const changed = (action: string) => {
    events.unshift({ id: nextId++, at: new Date(now()).toISOString(), kind: 'configuration',
      action, outcome: 'accepted', code: 'DEMO_SYNTHETIC', actor: { ...actor, userColor: account.color } });
    return reply({ ...account });
  };

  return (method: string, rest: string[], params: URLSearchParams, body: Row): MockResponse => {
    const [area, sub, kind] = rest;
    if (area === 'account') {
      if (!sub && method === 'GET') return reply({ ...account });
      if (sub === 'avatars' && method === 'GET') return reply(account.avatarRevision === null ? []
        : [{ userId: account.userId, avatarRevision: account.avatarRevision }]);
      if (sub === 'images' && (kind === 'avatar' || kind === 'cover') && method === 'GET') {
        const blob = images.get(kind);
        return blob ? { status: 200, body: null, blob } : reply({ error: 'Immagine demo assente' }, 404);
      }
      const colorWrite = !sub && method === 'PATCH';
      const imageWrite = sub === 'images' && (kind === 'avatar' || kind === 'cover') && ['PUT', 'DELETE'].includes(method);
      if (colorWrite || imageWrite) {
        if (body.baseRevision !== account.revision) return reply({ error: 'Revisione demo superata', revision: account.revision }, 409);
        if (colorWrite) {
          if (typeof body.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(body.color)) return reply({ error: 'Colore non valido' }, 400);
          account = { ...account, color: body.color, revision: account.revision + 1 };
          return changed('account.color');
        }
        if (method === 'PUT') {
          const match = typeof body.dataUrl === 'string' ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl) : null;
          if (!match) return reply({ error: 'Formato immagine demo non valido' }, 400);
          let bytes: Uint8Array;
          try { bytes = Uint8Array.from(atob(match[2]!), (character) => character.charCodeAt(0)); }
          catch { return reply({ error: 'Immagine demo non valida' }, 400); }
          if (bytes.byteLength > (kind === 'avatar' ? AVATAR_MAX_BYTES : COVER_MAX_BYTES)) return reply({ error: 'Immagine demo troppo grande' }, 413);
          images.set(kind!, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: match[1] }));
        } else images.delete(kind!);
        const revision = account.revision + 1;
        account = { ...account, revision, [kind === 'avatar' ? 'avatarRevision' : 'coverRevision']: method === 'PUT' ? revision : null };
        return changed(`account.${kind}.${method === 'PUT' ? 'saved' : 'removed'}`);
      }
    }
    if (area === 'activity' && method === 'GET' && (!sub || sub === 'export')) {
      const clock = now();
      const asOf = params.has('asOf') ? Date.parse(params.get('asOf')!) : clock;
      const ageDays = params.has('ageDays') ? Number(params.get('ageDays')) : undefined;
      if (!Number.isFinite(asOf) || asOf > clock || (ageDays !== undefined && (!Number.isInteger(ageDays) || ageDays < 0 || ageDays > 6))) return reply({ error: 'Filtro dei giorni non valido' }, 400);
      const retained = events.filter((event) => activityAgeDays(event.at, clock) !== null);
      const before = Number(params.get('before'));
      const filtered = retained.filter((event) => {
        if (params.has('before') && event.id >= before) return false;
        if (ageDays !== undefined && activityAgeDays(event.at, asOf) !== ageDays) return false;
        for (const key of ['kind', 'outcome', 'profileId', 'widgetId'] as const) if (params.get(key) && params.get(key) !== event[key]) return false;
        if (params.get('userId') && params.get('userId') !== event.actor?.userId) return false;
        if (params.get('clientId') && params.get('clientId') !== event.actor?.clientId) return false;
        const at = Date.parse(event.at);
        if (params.get('from') && at < Date.parse(params.get('from')!)) return false;
        return !(params.get('to') && at > Date.parse(params.get('to')!));
      });
      if (sub === 'export') {
        const data: ActivityExport = { schema: 1, generatedAt: new Date(clock).toISOString(), asOf: new Date(asOf).toISOString(), retentionDays: 7,
          pseudonymized: true, truncated: filtered.length > 5000, events: pseudonymizeActivities(filtered.slice(0, 5000)) };
        return reply(data);
      }
      const facets: ActivityFacets = { users: [], clients: [], profiles: [], widgets: [], truncated: false };
      for (const key of ['users', 'clients', 'profiles', 'widgets'] as const) {
        const values = new Map<string, string>();
        for (const event of retained) {
          const id = key === 'users' ? event.actor?.userId : key === 'clients' ? event.actor?.clientId : key === 'profiles' ? event.profileId : event.widgetId;
          if (id && !values.has(id)) values.set(id, key === 'users' ? event.actor?.userName || id : key === 'clients' ? event.actor?.clientName || id : id);
        }
        facets[key] = [...values].map(([id, label]) => ({ id, label }));
      }
      const limit = Math.min(Math.max(Number(params.get('limit')) || 30, 1), 100);
      const rows = filtered.slice(0, limit);
      const data: ActivityPage = { events: rows, nextCursor: filtered.length > limit ? rows.at(-1)!.id : null,
        availableFrom: retained.at(-1)?.at ?? null, retentionDays: 7, quotaBytes: ACTIVITY_QUOTA_BYTES,
        serverNow: new Date(clock).toISOString(), asOf: new Date(asOf).toISOString(), facets };
      return reply(data);
    }
    return reply({ error: 'Percorso non disponibile nella dimostrazione' }, 404);
  };
}
