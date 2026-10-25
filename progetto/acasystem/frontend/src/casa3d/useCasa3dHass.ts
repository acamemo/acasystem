/**
 * Builds the `hass` object of the Casa 3D elements from the Home Assistant context of the app
 * (ADR-0014, T3): the entity map, the connection, the signed-in user and the config come from the
 * existing provider; the four registries are read once per connection. Home Assistant stays
 * read-only unless the page gives `commands` (T7, Esplora only); the plan commands go to the backend plan API when one is given (T6), and the local
 * draft of an editor that someone else began is removed when another user signs in.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  useHomeAssistantEntities,
  useHomeAssistantMeta,
} from '@/hooks/context/HomeAssistantContext';
import {
  EMPTY_REGISTRIES,
  createCasa3dHass,
  loadRegistries,
  type Casa3dCommands,
  type Casa3dHass,
  type Casa3dPlan,
  type LoadedRegistries,
  type RegistryName,
} from './haShim';
import { forgetDraftOfOtherUser, type Casa3dPlanApi } from './planApi';

export interface Casa3dHassState {
  /** Null until the connection, the entities and the registries are there. */
  hass: Casa3dHass | null;
  registriesLoaded: boolean;
  /** Registries Home Assistant did not deliver (empty ones). */
  failed: RegistryName[];
}

const NOT_LOADED: LoadedRegistries = { registries: EMPTY_REGISTRIES, failed: [] };

export function useCasa3dHass(
  plan: Casa3dPlan | null,
  onRefused?: (what: string) => void,
  planApi?: Casa3dPlanApi | null,
  commands?: Casa3dCommands | null
): Casa3dHassState {
  const entities = useHomeAssistantEntities();
  const { conn, haUser, haConfig, activeUrl, entitiesLoaded } = useHomeAssistantMeta();
  const [loaded, setLoaded] = useState<LoadedRegistries | null>(null);
  const userId = haUser?.id ?? null;

  // An unsaved draft of the plan belongs to the person who made it (ADR-0014, section 4).
  useEffect(() => {
    forgetDraftOfOtherUser(userId);
  }, [userId]);

  useEffect(() => {
    setLoaded(null);
    if (!conn) return undefined;
    let cancelled = false;
    loadRegistries(conn)
      .then((result) => {
        if (!cancelled) setLoaded(result);
      })
      .catch(() => {
        if (!cancelled)
          setLoaded({
            registries: EMPTY_REGISTRIES,
            failed: ['areas', 'floors', 'devices', 'entities'],
          });
      });
    return () => {
      cancelled = true;
    };
  }, [conn]);

  const hass = useMemo(() => {
    if (!conn || !entitiesLoaded || !loaded) return null;
    // The plan (and the local draft, which belongs to a user) is not handed out before the user is known.
    if (planApi && !userId) return null;
    return createCasa3dHass({
      states: entities,
      registries: loaded.registries,
      user: haUser,
      config: haConfig,
      conn,
      hassUrl: activeUrl,
      plan,
      planApi,
      onRefused,
      commands,
    });
  }, [
    conn,
    entitiesLoaded,
    loaded,
    entities,
    haUser,
    userId,
    haConfig,
    activeUrl,
    plan,
    planApi,
    onRefused,
    commands,
  ]);

  const status = loaded ?? NOT_LOADED;
  return { hass, registriesLoaded: loaded !== null, failed: status.failed };
}
