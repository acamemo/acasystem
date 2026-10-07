import { useEffect, useState } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import type { HaAreaEntry } from '@/@types/ha';
import { getAreas, getEntityRegistry, getRelatedEntityIds } from '@/api/haClient';
import { isRecord, readKey } from '@/validators/guards';
import { NO_RELATIONS, type Relations } from './vacuumData';

export interface VacuumRegistry {
  relations: Relations;
  /** Areas mapped to the vacuum in Home Assistant (`options.vacuum.area_mapping`). */
  areas: HaAreaEntry[];
  loading: boolean;
}

/**
 * Entities of the same device or integration as the vacuum, and its mapped areas, from the
 * Home Assistant registries (legacy VacuumModal). Without a connection nothing is loaded.
 */
export function useVacuumRegistry(conn: Connection | null, vacuumId: string): VacuumRegistry {
  const [state, setState] = useState<VacuumRegistry>({
    relations: NO_RELATIONS,
    areas: [],
    loading: Boolean(conn),
  });

  useEffect(() => {
    if (!conn) {
      setState({ relations: NO_RELATIONS, areas: [], loading: false });
      return undefined;
    }
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true }));
    (async () => {
      let relations: Relations = NO_RELATIONS;
      let areas: HaAreaEntry[] = [];
      try {
        const ids = await getRelatedEntityIds(conn, vacuumId, {
          domains: ['sensor', 'binary_sensor', 'select', 'input_select', 'button'],
        });
        relations = {
          sensors: ids.filter((id) => id.startsWith('sensor.') || id.startsWith('binary_sensor.')),
          selects: ids.filter((id) => id.startsWith('select.') || id.startsWith('input_select.')),
          buttons: ids.filter((id) => id.startsWith('button.')),
        };
      } catch {
        relations = NO_RELATIONS;
      }
      try {
        const [registry, areaList] = await Promise.all([getEntityRegistry(conn), getAreas(conn)]);
        const entry = registry.find((item) => item.entity_id === vacuumId);
        const mapping = readKey(readKey(readKey(entry, 'options'), 'vacuum'), 'area_mapping');
        const mapped = isRecord(mapping) ? Object.keys(mapping) : [];
        areas = mapped.length > 0 ? areaList.filter((area) => mapped.includes(area.area_id)) : [];
      } catch {
        areas = [];
      }
      if (!cancelled) setState({ relations, areas, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [conn, vacuumId]);

  return state;
}
