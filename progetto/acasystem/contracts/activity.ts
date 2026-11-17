/** Registro domestico ACA: i payload dei comandi e le credenziali non appartengono al diario. */
export type ActivityKind = 'configuration' | 'command' | 'diagnostic';
export type ActivityOutcome = 'pending' | 'accepted' | 'error' | 'unknown';
export interface ActivityActor {
  userId: string;
  userName: string;
  clientId: string | null;
  clientName: string | null;
  sessionId: string | null;
  userColor?: string;
  clientPlatform?: 'windows' | 'android' | 'web';
}
export interface ActivityInput {
  kind: ActivityKind;
  action: string;
  outcome: ActivityOutcome;
  actor: ActivityActor | null;
  profileId?: string;
  widgetId?: string;
  targetId?: string;
  revision?: number;
  code?: string;
  operationId?: string;
  /** Ora dichiarata dal client, distinta dalla ricezione sulla centrale. */
  originAt?: string;
}
export interface ActivityEvent extends ActivityInput { id: number; at: string; updatedAt?: string }
export type ActivityAgeDays = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export interface ActivityFacet { id: string; label: string }
export interface ActivityFacets {
  users: ActivityFacet[];
  clients: ActivityFacet[];
  profiles: ActivityFacet[];
  widgets: ActivityFacet[];
  /** Gli elenchi sono limitati; la selezione corrente valida viene comunque inclusa. */
  truncated: boolean;
}
export interface ActivityQuery {
  before?: number;
  limit?: number;
  from?: string;
  to?: string;
  userId?: string;
  clientId?: string;
  profileId?: string;
  widgetId?: string;
  kind?: ActivityKind;
  outcome?: ActivityOutcome;
  /** Età in intervalli di 24 ore, non giorni del calendario locale. */
  ageDays?: ActivityAgeDays;
  /** Istante ISO della centrale restituito dalla prima pagina della navigazione. */
  asOf?: string;
}
export interface ActivityPage {
  events: ActivityEvent[];
  nextCursor: number | null;
  availableFrom: string | null;
  retentionDays: 7;
  quotaBytes: number;
  /** Opzionali per riconoscere server/fixture precedenti senza ignorare filtri nuovi. */
  serverNow?: string;
  asOf?: string;
  facets?: ActivityFacets;
}
export interface ActivityExport {
  schema: 1;
  generatedAt: string;
  retentionDays: 7;
  pseudonymized: true;
  truncated: boolean;
  events: ActivityEvent[];
  versions?: { aca: string | null; ha: string | null; client: string | null };
  asOf?: string;
}
export type CommandState = 'prepared' | 'pending' | 'accepted' | 'error' | 'unknown';
export type HaUserCommand =
  | { kind: 'service'; domain: string; service: string; data?: Record<string, unknown> | null }
  | { kind: 'home.location'; latitude: number; longitude: number }
  | { kind: 'zigbee.backup' };
export interface CommandIntent {
  id: string;
  state: CommandState;
  createdAt: string;
  expiresAt: string;
  code: string | null;
}
export interface ClientDiagnostic {
  eventId: string;
  code: 'client.error' | 'client.command_error' | 'client.command_unknown' | 'client.activity_unavailable';
  occurredAt: string;
}
export const ACTIVITY_DAY_MS = 24 * 60 * 60 * 1000;
export const ACTIVITY_RETENTION_MS = 7 * ACTIVITY_DAY_MS;
export const ACTIVITY_FACET_LIMIT = 100;
export const ACTIVITY_QUOTA_BYTES = 50 * 1024 * 1024;
export const DIAGNOSTIC_QUOTA_BYTES = 10 * 1024 * 1024;
export const COMMAND_PREPARE_MS = 60_000;

/** Età derivata dall'istante centrale ricevuto: nessun contatore o orologio client implicito. */
export const activityAgeDays = (at: string, referenceAt: string | number): ActivityAgeDays | null => {
  const received = Date.parse(at);
  const reference = typeof referenceAt === 'number' ? referenceAt : Date.parse(referenceAt);
  if (!Number.isFinite(received) || !Number.isFinite(reference)) return null;
  const days = Math.floor((reference - received) / ACTIVITY_DAY_MS);
  return days >= 0 && days <= 6 ? days as ActivityAgeDays : null;
};

/** Unica proiezione depurata per JSON e testo copiato: nessun campo extra viene propagato. */
export const pseudonymizeActivities = (events: readonly ActivityEvent[]): ActivityEvent[] => {
  const aliases = new Map<string, string>();
  const alias = (kind: string, value: string): string => {
    const key = `${kind}:${value}`;
    if (!aliases.has(key)) aliases.set(key, `${kind}_${aliases.size + 1}`);
    return aliases.get(key)!;
  };
  return events.map((event) => ({
    id: event.id, at: event.at, kind: event.kind, action: event.action, outcome: event.outcome,
    ...(event.updatedAt ? { updatedAt: event.updatedAt } : {}),
    ...(event.originAt ? { originAt: event.originAt } : {}),
    actor: event.actor ? {
      userId: alias('utente', event.actor.userId), userName: alias('utente', event.actor.userId),
      clientId: event.actor.clientId ? alias('client', event.actor.clientId) : null,
      clientName: event.actor.clientId ? alias('client', event.actor.clientId) : null, sessionId: null,
      ...(event.actor.clientPlatform ? { clientPlatform: event.actor.clientPlatform } : {}),
    } : null,
    ...(event.profileId ? { profileId: alias('profilo', event.profileId) } : {}),
    ...(event.widgetId ? { widgetId: alias('widget', event.widgetId) } : {}),
    ...(event.targetId ? { targetId: alias('risorsa', event.targetId) } : {}),
    ...(event.operationId ? { operationId: alias('operazione', event.operationId) } : {}),
    ...(event.code ? { code: event.code } : {}),
    ...(event.revision !== undefined ? { revision: event.revision } : {}),
  }));
};
