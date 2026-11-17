import { useEffect, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { Body, Button, Caption } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  RoomPicker,
  useRoomAssociationScope,
  ROOM_PICKER_TIMEOUT_MS,
  type RoomSelection,
} from './RoomPicker';
import { SheetSection } from './parts/Form';

export type SaveRoomBinding = (
  patch: Partial<
    Pick<CardSettings, 'areaId' | 'areaName' | 'entityIds' | 'roomMembershipSource' | 'areaIcon'>
  >
) => Promise<void>;

/** Only the common ACK promise completes an association, including existing legacy rooms. */
export function RoomBindingSection({
  settings,
  saveBinding,
  resourceKey = '',
}: {
  settings: CardSettings;
  saveBinding: SaveRoomBinding;
  resourceKey?: string;
}) {
  const runtime = useWidgetRuntime();
  const pending = useRef<number | null>(null),
    serial = useRef(0);
  const expectedSource = useRef<string | null>(null);
  const rawSource = JSON.stringify([
    resourceKey,
    settings.areaId,
    settings.areaName,
    settings.entityIds,
    settings.roomMembershipSource,
  ]);
  const source = useRef({ value: rawSource, revision: 0 });
  if (source.current.value !== rawSource) {
    if (expectedSource.current !== rawSource) source.current.revision++;
    source.current.value = rawSource;
  }
  const scope = useRoomAssociationScope(runtime.conn, `${resourceKey}|${source.current.revision}`);
  const [selection, setSelection] = useState<RoomSelection>({ areas: [], entitiesById: {} });
  const [available, setAvailable] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const latest = useRef({ selection, available, saveBinding, scope });
  latest.current = { selection, available, saveBinding, scope };
  useEffect(() => {
    pending.current = null;
    expectedSource.current = null;
    setBusy(false);
    setError('');
    setAvailable(false);
    const empty = { areas: [], entitiesById: {} };
    latest.current.selection = empty;
    latest.current.available = false;
    setSelection(empty);
    return () => {
      pending.current = null;
      expectedSource.current = null;
    };
  }, [scope.token]);
  const area = selection.areas[0];
  const choose = async () => {
    const now = latest.current,
      chosen = now.selection.areas[0],
      token = now.scope.token;
    if (pending.current !== null || !chosen || !now.available || !now.scope.isCurrent(token))
      return;
    const ids = now.selection.entitiesById[chosen.area_id];
    if (!Array.isArray(ids)) return;
    const operation = ++serial.current;
    const patch = {
      areaId: chosen.area_id,
      areaName: chosen.name || chosen.area_id,
      areaIcon: chosen.icon ?? null,
      entityIds: ids,
      roomMembershipSource: 'area',
    };
    expectedSource.current = JSON.stringify([
      resourceKey,
      patch.areaId,
      patch.areaName,
      patch.entityIds,
      patch.roomMembershipSource,
    ]);
    pending.current = operation;
    setBusy(true);
    setError('');
    let timer: ReturnType<typeof setTimeout>;
    try {
      await Promise.race([
        now.saveBinding(patch),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Nessuna conferma')), ROOM_PICKER_TIMEOUT_MS);
        }),
      ]);
    } catch {
      if (latest.current.scope.isCurrent(token) && pending.current === operation)
        setError('Associazione non confermata. La bozza è conservata. Riprova.');
    } finally {
      clearTimeout(timer!);
      if (pending.current === operation) {
        pending.current = null;
        expectedSource.current = null;
        if (latest.current.scope.isCurrent(token)) setBusy(false);
      }
    }
  };
  return (
    <SheetSection title="Stanza da collegare">
      {typeof settings.areaId === 'string' && settings.areaId && (
        <Caption as="p">
          {settings.roomMembershipSource === 'area' ? 'Area collegata' : 'Associazione precedente'}:{' '}
          {typeof settings.areaName === 'string' ? settings.areaName : settings.areaId}
        </Caption>
      )}
      {busy ? (
        <Body role="status">Associazione in corso…</Body>
      ) : error ? (
        <Body role="alert">{error}</Body>
      ) : null}
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <RoomPicker
          conn={runtime.conn}
          query=""
          selection={selection}
          onAvailabilityChange={(value) => {
            latest.current.available = value;
            setAvailable(value);
          }}
          onChange={(next) => {
            const value = typeof next === 'function' ? next(latest.current.selection) : next;
            const nextSelection = { ...value, areas: value.areas.slice(-1) };
            latest.current.selection = nextSelection;
            setSelection(nextSelection);
          }}
        />
        <Button
          variant="control"
          disabled={busy || !available || !area || !scope.isCurrent(scope.token)}
          loading={busy}
          onClick={() => {
            void choose();
          }}
        >
          Collega la stanza
        </Button>
      </fieldset>
    </SheetSection>
  );
}
