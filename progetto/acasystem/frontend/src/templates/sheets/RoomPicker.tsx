import { useEffect, useState } from 'react';
import { Body, Caption, Skeleton } from '@/components/primitives';
import type { Connection } from '@/@types/ha';
import { getAreas, getEntitiesForArea } from '@/api/haClient';
import { PickRow } from './parts/EntityPicker';
import { Notice } from './parts/Form';
import { useDomId } from './parts/hooks';
import type { RoomArea } from './roomCards';

export interface RoomSelection {
  areas: RoomArea[];
  entitiesById: Record<string, string[]>;
}

type AreaLoad =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; areas: RoomArea[] };

/**
 * Areas of Home Assistant to turn into room widgets (legacy RoomSection): choosing an area
 * loads its entities, which the room widget keeps in its settings.
 */
export function RoomPicker({
  conn,
  query,
  selection,
  onChange,
}: {
  conn: Connection | null;
  query: string;
  selection: RoomSelection;
  onChange: (next: RoomSelection | ((previous: RoomSelection) => RoomSelection)) => void;
}) {
  const labelId = useDomId('stanze');
  const [load, setLoad] = useState<AreaLoad>({ status: 'loading' });
  const [entityState, setEntityState] = useState<Record<string, 'loading' | 'error'>>({});

  useEffect(() => {
    if (!conn) return undefined;
    let cancelled = false;
    getAreas(conn)
      .then((areas) => {
        if (cancelled) return;
        const rooms = areas
          .map((area) => ({
            area_id: area.area_id,
            name: area.name,
            icon: typeof area.icon === 'string' ? area.icon : null,
          }))
          .sort((left, right) => (left.name || '').localeCompare(right.name || ''));
        setLoad({ status: 'ready', areas: rooms });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [conn]);

  const toggleArea = async (area: RoomArea) => {
    const selected = selection.areas.some((item) => item.area_id === area.area_id);
    if (selected) {
      onChange((previous) => ({
        ...previous,
        areas: previous.areas.filter((item) => item.area_id !== area.area_id),
      }));
      return;
    }
    onChange((previous) => ({ ...previous, areas: [...previous.areas, area] }));
    if (!conn || Array.isArray(selection.entitiesById[area.area_id])) return;
    setEntityState((previous) => ({ ...previous, [area.area_id]: 'loading' }));
    try {
      const ids = await getEntitiesForArea(conn, area.area_id);
      onChange((previous) => ({
        ...previous,
        entitiesById: { ...previous.entitiesById, [area.area_id]: ids },
      }));
      setEntityState((previous) => {
        const next = { ...previous };
        delete next[area.area_id];
        return next;
      });
    } catch {
      setEntityState((previous) => ({ ...previous, [area.area_id]: 'error' }));
    }
  };

  if (!conn) {
    return <Notice>Collega Home Assistant per vedere le sue aree.</Notice>;
  }
  if (load.status === 'loading') {
    return <Skeleton rows={3} label="Caricamento delle stanze…" />;
  }
  if (load.status === 'error') {
    return (
      <Notice tone="danger">
        Impossibile caricare le aree di Home Assistant. Riprova più tardi.
      </Notice>
    );
  }

  const needle = query.trim().toLowerCase();
  const visible = load.areas.filter(
    (area) => !needle || (area.name || area.area_id).toLowerCase().includes(needle)
  );

  const subtitle = (area: RoomArea, selected: boolean): string => {
    if (!selected) return area.area_id;
    const state = entityState[area.area_id];
    if (state === 'loading') return 'Caricamento delle entità…';
    if (state === 'error') return 'Entità non disponibili: la stanza nasce vuota';
    const count = selection.entitiesById[area.area_id]?.length ?? 0;
    return `${count} ${count === 1 ? 'entità trovata' : 'entità trovate'}`;
  };

  return (
    <div className="aca-pick" role="group" aria-labelledby={labelId}>
      <Body as="span" size="sm" id={labelId} className="aca-form-row__label">
        Aree di Home Assistant
      </Body>
      {load.areas.length === 0 ? (
        <Caption as="p" className="aca-pick__empty">
          Nessuna area trovata in Home Assistant.
        </Caption>
      ) : visible.length === 0 ? (
        <Caption as="p" className="aca-pick__empty">
          Nessuna area per «{query.trim()}».
        </Caption>
      ) : (
        <ul className="aca-pick__list">
          {visible.map((area) => {
            const selected = selection.areas.some((item) => item.area_id === area.area_id);
            return (
              <li key={area.area_id}>
                <PickRow
                  title={area.name || area.area_id}
                  subtitle={subtitle(area, selected)}
                  selected={selected}
                  onClick={() => {
                    void toggleArea(area);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
