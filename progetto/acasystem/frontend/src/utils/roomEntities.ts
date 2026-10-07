import { isNonEmptyString, readKey } from '@/validators/guards';

function normalizeEntityList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isNonEmptyString);
}

export function getEffectiveRoomEntityIds(settings: unknown): string[] {
  const baseEntityIds = normalizeEntityList(readKey(settings, 'entityIds'));
  const includedEntityIds = normalizeEntityList(readKey(settings, 'includedEntityIds'));
  const excluded = new Set(normalizeEntityList(readKey(settings, 'excludedEntityIds')));

  const merged = [...baseEntityIds, ...includedEntityIds];
  const deduped: string[] = [];
  const seen = new Set<string>();

  merged.forEach((entityId) => {
    if (excluded.has(entityId)) return;
    if (seen.has(entityId)) return;
    seen.add(entityId);
    deduped.push(entityId);
  });

  return deduped;
}

export function filterEntitiesByDomain(entityIds: unknown, domains: unknown): string[] {
  const domainSet = new Set<unknown>(Array.isArray(domains) ? domains : []);
  const ids: unknown[] = Array.isArray(entityIds) ? entityIds : [];
  return ids.filter(
    (entityId): entityId is string =>
      typeof entityId === 'string' && domainSet.has(entityId.split('.')[0])
  );
}
