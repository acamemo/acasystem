import type { ActivityEvent, ActivityFacet, ActivityFacets, ActivityQuery } from '../../../contracts/activity.ts';
import { ACTIVITY_FACET_LIMIT, ACTIVITY_RETENTION_MS } from '../../../contracts/activity.ts';
import type { SqliteDatabase } from '../models/database.ts';

type FacetKey = Exclude<keyof ActivityFacets, 'truncated'>;
const definitions = [
  { key: 'users', column: 'user_id', query: 'userId', actor: 'userName' },
  { key: 'clients', column: 'client_id', query: 'clientId', actor: 'clientName' },
  { key: 'profiles', column: 'profile_id', query: 'profileId', actor: null },
  { key: 'widgets', column: 'widget_id', query: 'widgetId', actor: null },
] as const;

/** Metadati del solo registro valido: niente caricamento dei profili o scansioni dei payload completi. */
export function createActivityFacets(database: SqliteDatabase) {
  const fields = definitions.map((definition) => {
    const index = `aca_activity_facet_${definition.column}`;
    database.exec(`CREATE INDEX IF NOT EXISTS ${index} ON aca_activity(${definition.column},at,id) WHERE ${definition.column} IS NOT NULL`);
    return { ...definition,
      ids: database.prepare<[number, number, number], { id: string }>(`SELECT DISTINCT ${definition.column} AS id
        FROM aca_activity INDEXED BY ${index} WHERE ${definition.column} IS NOT NULL AND at>? AND at<=?
        ORDER BY ${definition.column} LIMIT ?`),
      latest: database.prepare<[string, number, number], { id: number }>(`SELECT id FROM aca_activity INDEXED BY ${index}
        WHERE ${definition.column}=? AND at>? AND at<=? ORDER BY at DESC,id DESC LIMIT 1`),
    };
  });
  const byId = database.prepare<[number], { event: string }>('SELECT event FROM aca_activity WHERE id=?');
  const nextFuture = database.prepare<[number], { at: number | null }>('SELECT MIN(at) AS at FROM aca_activity WHERE at>?');
  let cached: { at: number; expiresAt: number; value: ActivityFacets } | null = null;
  const invalidate = () => { cached = null; };
  const facet = (field: typeof fields[number], id: string, now: number, events: Map<number, Partial<ActivityEvent>>): ActivityFacet | null => {
    const latest = field.latest.get(id, now - ACTIVITY_RETENTION_MS, now);
    if (!latest) return null;
    let event = events.get(latest.id);
    if (!event) {
      try { event = JSON.parse(byId.get(latest.id)?.event ?? '{}') as Partial<ActivityEvent>; }
      catch { event = {}; }
      events.set(latest.id, event);
    }
    const historical = field.actor ? event.actor?.[field.actor] : null;
    return { id, label: typeof historical === 'string' && historical ? historical : id };
  };
  const build = (now: number) => {
    const value: ActivityFacets = { users: [], clients: [], profiles: [], widgets: [], truncated: false };
    const events = new Map<number, Partial<ActivityEvent>>();
    for (const field of fields) {
      const ids = field.ids.all(now - ACTIVITY_RETENTION_MS, now, ACTIVITY_FACET_LIMIT + 1);
      if (ids.length > ACTIVITY_FACET_LIMIT) value.truncated = true;
      value[field.key] = ids.slice(0, ACTIVITY_FACET_LIMIT).flatMap(({ id }) => {
        const entry = facet(field, id, now, events);
        return entry ? [entry] : [];
      });
    }
    return value;
  };
  return {
    invalidate,
    get(query: ActivityQuery, now: number): ActivityFacets {
      const transactional = database.inTransaction;
      if (!cached || now < cached.at || now >= cached.expiresAt || transactional) {
        const value = build(now);
        if (!transactional) cached = { at: now, expiresAt: Math.min(now + 60_000, nextFuture.get(now)?.at ?? Infinity), value };
        else return withSelection(value, query, now);
      }
      return withSelection(cached!.value, query, now);
    },
  };
  function withSelection(value: ActivityFacets, query: ActivityQuery, now: number): ActivityFacets {
    const result: ActivityFacets = { users: [], clients: [], profiles: [], widgets: [], truncated: value.truncated };
    const events = new Map<number, Partial<ActivityEvent>>();
    for (const field of fields) {
      const key: FacetKey = field.key;
      result[key] = value[key].map((item) => ({ ...item }));
      const selected = query[field.query];
      if (selected && !result[key].some((item) => item.id === selected)) {
        const entry = facet(field, selected, now, events);
        if (entry) result[key].push(entry);
      }
    }
    return result;
  }
}
