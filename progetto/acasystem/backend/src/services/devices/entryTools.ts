import type { HaDevice, HaEntity, HaEntry, HaWsApi } from './haAdapter.ts';
import type { DeviceContext } from './deviceContext.ts';

/**
 * Helpers shared by the flows and the power-on recipe: waiting for a new config entry to be
 * `loaded`, and finding its device and entities in the registries of HA. Ids always come from
 * HA, never from the browser.
 */

/** Entry states that will not become `loaded` by waiting. */
const FAILED_STATES: ReadonlySet<string> = new Set([
  'setup_error',
  'migration_error',
  'failed_unload',
]);

/**
 * Polls the entry until it is `loaded`, fails for good, disappears (null) or the time is up
 * (the last state seen is returned). `setup_retry` is waited on: it is what a TV that is
 * switched off right after pairing shows, and it can recover.
 */
export const waitForEntry = async (
  ctx: DeviceContext,
  api: HaWsApi,
  domain: string | undefined,
  entryId: string,
  timeoutMs: number
): Promise<HaEntry | null> => {
  const deadline = ctx.now() + timeoutMs;
  for (;;) {
    const entry =
      (await api.entries(domain)).find((candidate) => candidate.entryId === entryId) ?? null;
    if (!entry) return null;
    if (entry.state === 'loaded' || FAILED_STATES.has(entry.state)) return entry;
    if (ctx.now() >= deadline) return entry;
    await ctx.delay(ctx.settings.pollIntervalMs);
  }
};

export const devicesOfEntry = (devices: readonly HaDevice[], entryId: string): HaDevice[] =>
  devices.filter((device) => device.entryIds.includes(entryId));

export const entitiesOfEntry = (entities: readonly HaEntity[], entryId: string): HaEntity[] =>
  entities.filter((entity) => entity.entryId === entryId);

export const firstEntityOfDomain = (
  entities: readonly HaEntity[],
  domain: 'media_player' | 'button'
): HaEntity | null =>
  entities.find(
    (entity) => entity.entityId.startsWith(`${domain}.`) && entity.disabledBy === null
  ) ?? null;
