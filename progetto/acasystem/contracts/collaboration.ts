/** Protocollo ACA2: account HA, client, profili personali e riserve di modifica. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Configuration = Record<string, unknown>;
export interface ClientRecord {
  id: string;
  userId: string;
  label: string;
  platform: 'windows' | 'android' | 'web';
  activeProfileId: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  revocationPending: boolean;
}
export interface ProfileChange { path: string[]; value?: unknown; remove?: boolean }
export interface ProfileMigration { sourceId: string; sourceClass?: string; confirmedAt: string }
export interface LiveProfile {
  id: string;
  userId: string;
  name: string;
  revision: number;
  resourceRevisions: Record<string, number>;
  configuration: Configuration;
  migration: ProfileMigration | null;
  createdAt: string;
  updatedAt: string;
}
export interface MigrationSource {
  id: string;
  kind: 'account' | 'device' | 'profile';
  name: string;
  configuration: Configuration;
  profileId?: string;
  deviceLabel?: string | null;
}
export interface EditTarget { kind: 'widget' | 'structure'; pageId?: string; widgetId?: string }
export interface EditLease {
  id: string;
  profileId: string;
  editSessionId: string;
  clientId: string;
  userId: string;
  userName: string;
  clientName: string;
  resources: string[];
  expiresAt: number;
}
/** Diritto funzionale d'uso ACA, distinto dall'editing e dai permessi Home Assistant. */
export interface ProfileUsageLease {
  id: string;
  profileId: string;
  usageSessionId: string;
  clientId: string;
  expiresAt: number;
  serverTime: number;
}
export interface ProfileOperation {
  operationId: string;
  editSessionId: string;
  leaseId: string;
  target: EditTarget;
  expected: Record<string, number>;
  changes: ProfileChange[];
}
export interface CollaborationBootstrap {
  protocol: 2;
  houseId: string;
  user: { id: string; name: string; color?: string };
  client: ClientRecord | null;
  /** Selezione condivisa dell'account; assente soltanto sulle centrali precedenti. */
  accountProfileId?: string | null;
  /** Gli originali divergenti richiedono una scelta prima di allineare i client. */
  profileSelectionRequired?: boolean;
  clients: ClientRecord[];
  profiles: LiveProfile[];
  sources: MigrationSource[];
}
export interface CollaborationEvent {
  type: 'profile' | 'lease' | 'usage' | 'client' | 'activity' | 'resync';
  profileId?: string;
  revision?: number;
}
export interface CollaborationConflict {
  code: string;
  error: string;
  profile?: LiveProfile;
  leases?: EditLease[];
}
export const EDIT_LEASE_MS = 45_000;
export const EDIT_RENEW_MS = 15_000;
export const PROFILE_USAGE_MS = 180_000;
export const PROFILE_USAGE_RENEW_MS = 20_000;
export const PROFILE_USAGE_HANDOFF_MS = 3_000;
export const DRAFT_QUOTA_BYTES = 10 * 1024 * 1024;
