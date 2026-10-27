import type { CardSettings } from '@/@types/dashboard';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { Body, Button } from '@/components/primitives';
import { useState } from 'react';
import { RoomPicker, type RoomSelection } from './RoomPicker';
import { BINDING_KEYS } from './categoryPages';
import { candidateEntityIds } from './catalog';
import { AddDeviceEntry } from '../devices/AddDeviceEntry';
import { AddDeviceFlow } from '../devices/AddDeviceFlow';
import { RemoveDevice } from '../devices/RemoveDevice';
import { deviceTexts } from '../devices/deviceTexts';
import { EntitySelect } from './parts/EntityPicker';
import { SheetSection } from './parts/Form';

export function CategoryBindingSection({
  settings,
  save,
}: {
  settings: CardSettings;
  save: (key: string, value: unknown) => void;
}) {
  const { entities, entitiesLoaded } = useWidgetRuntime();
  const [adding, setAdding] = useState(false);
  const type = String(settings.categoryWidgetType);
  const key = BINDING_KEYS[type];
  if (!key) return null;
  if (type === 'room') return <RoomBinding save={save} />;
  const ids =
    type === 'todo'
      ? Object.keys(entities).filter((id) => id.startsWith('todo.'))
      : type === 'car'
        ? Object.keys(entities).filter((id) =>
            ['sensor.', 'input_number.'].some((prefix) => id.startsWith(prefix))
          )
        : candidateEntityIds(
            type === 'androidtv' || type === 'appletv' ? 'tv' : type,
            entities,
            new Set()
          );
  const multiple = key === 'mediaIds' || key === 'calendars';
  const value =
    multiple && Array.isArray(settings[key])
      ? String(settings[key][0] ?? '')
      : typeof settings[key] === 'string'
        ? (settings[key] as string)
        : null;
  // A new TV can be added from here (REQ-18, D-D2): the way in is the Android TV widget.
  const canAddDevice = type === 'androidtv';
  const link = (id: string | null) => save(key, multiple ? (id ? [id] : []) : id);
  if (canAddDevice && adding) {
    return (
      <SheetSection title="Dispositivo">
        <AddDeviceFlow
          kind="tv"
          onExit={() => setAdding(false)}
          onDone={(id) => {
            if (id) link(id);
            setAdding(false);
          }}
        />
      </SheetSection>
    );
  }
  return (
    <SheetSection title="Dispositivo">
      {!entitiesLoaded && (
        <Body size="sm" tone="muted">
          Attendo i dispositivi di Home Assistant.
        </Body>
      )}
      {canAddDevice && entitiesLoaded && ids.length === 0 ? (
        <Body size="sm" tone="muted">
          {deviceTexts.noTv}
        </Body>
      ) : (
        <EntitySelect
          label={type === 'car' ? 'Sensore batteria dell’auto' : 'Dispositivo da collegare'}
          entities={entities}
          ids={ids}
          value={value}
          onChange={link}
          noneLabel="Non collegato"
        />
      )}
      {canAddDevice && <AddDeviceEntry onClick={() => setAdding(true)} />}
      {value && <RemoveDevice entityId={value} onRemoved={() => link(null)} />}
    </SheetSection>
  );
}

function RoomBinding({ save }: { save: (key: string, value: unknown) => void }) {
  const { conn } = useWidgetRuntime();
  const [selection, setSelection] = useState<RoomSelection>({ areas: [], entitiesById: {} });
  const area = selection.areas[0];
  return (
    <SheetSection title="Stanza da collegare">
      <RoomPicker
        conn={conn}
        query=""
        selection={selection}
        onChange={(next) =>
          setSelection((previous) => {
            const value = typeof next === 'function' ? next(previous) : next;
            return { ...value, areas: value.areas.slice(-1) };
          })
        }
      />
      <Button
        variant="control"
        disabled={!area || !selection.entitiesById[area.area_id]}
        onClick={() => {
          if (!area) return;
          save('entityIds', selection.entitiesById[area.area_id]);
          save('areaName', area.name);
          save('areaId', area.area_id);
        }}
      >
        Collega la stanza
      </Button>
    </SheetSection>
  );
}
