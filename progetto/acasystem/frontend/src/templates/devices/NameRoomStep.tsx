import { useEffect, useState } from 'react';
import { Button, Field, Skeleton } from '@/components/primitives';
import type { AreaDto, DeviceDto } from '@/@types/devices';
import { createArea, listAreas, toDeviceError, updateDevice } from '@/api/devicesApi';
import { IdentifyButton } from '@/components/system/identify/IdentifyButton';
import type { IdentifyAction } from '@/utils/devices/identify';
import { ChoiceGroup, FormRow, Notice, SheetSection } from '../sheets/parts/Form';
import { deviceTexts } from './deviceTexts';

/**
 * Name and room of the new device (D1d). Both are optional: «Salta» leaves what Home Assistant
 * chose. The name is proposed as «Televisore»; the room is one that exists or a new one. When the
 * device can show which one it is, «Fai lampeggiare» helps the person name the right one (F4).
 */
export function NameRoomStep({
  device,
  proposal = deviceTexts.nameProposal,
  identify = null,
  onFinished,
}: {
  device: DeviceDto;
  /** How the device can blink, when it can. */
  identify?: IdentifyAction | null;
  /** The name offered first: «Televisore» for a TV, the name Home Assistant gave for the rest. */
  proposal?: string;
  onFinished: () => void;
}) {
  const [name, setName] = useState<string>(proposal);
  const [areas, setAreas] = useState<AreaDto[] | null>(null);
  const [areaId, setAreaId] = useState('');
  const [adding, setAdding] = useState(false);
  const [newRoom, setNewRoom] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listAreas()
      .then((list) => {
        if (!cancelled) setAreas(list);
      })
      .catch(() => {
        // Without the list the person can still name the device.
        if (!cancelled) setAreas([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const create = () => {
    const label = newRoom.trim();
    if (!label || busy) return;
    setBusy(true);
    setRoomError(null);
    setError(null);
    createArea(label)
      .then((area) => {
        setAreas((previous) => [...(previous ?? []).filter((item) => item.id !== area.id), area]);
        setAreaId(area.id);
        setAdding(false);
        setNewRoom('');
      })
      .catch((failure: unknown) => {
        const info = toDeviceError(failure);
        if (info.code === 'AREA_EXISTS' || info.code === 'INVALID_INPUT')
          setRoomError(info.message);
        else setError(info.message);
      })
      .finally(() => setBusy(false));
  };

  const save = () => {
    const label = name.trim();
    if (busy) return;
    if (!label) {
      setNameError(deviceTexts.required);
      return;
    }
    setBusy(true);
    setNameError(null);
    setError(null);
    updateDevice(device.id, { name: label, ...(areaId ? { areaId } : {}) })
      .then(onFinished)
      .catch((failure: unknown) => {
        setBusy(false);
        const info = toDeviceError(failure);
        if (info.code === 'INVALID_INPUT' && info.field === 'name') setNameError(info.message);
        else setError(info.message);
      });
  };

  const options = [
    { value: '', label: deviceTexts.roomNone },
    ...(areas ?? []).map((area) => ({ value: area.id, label: area.name })),
  ];

  return (
    <div className="aca-device-flow">
      {error && <Notice tone="danger">{error}</Notice>}

      <SheetSection title={deviceTexts.nameTitle}>
        <IdentifyButton action={identify} name={device.name} />
        <FormRow label={deviceTexts.nameLabel}>
          {({ labelId }) => (
            <Field
              label={deviceTexts.nameLabel}
              aria-labelledby={labelId}
              maxLength={60}
              autoComplete="off"
              value={name}
              disabled={busy}
              {...(nameError ? { error: nameError } : {})}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(null);
              }}
            />
          )}
        </FormRow>
      </SheetSection>

      <SheetSection title={deviceTexts.roomTitle}>
        {areas === null ? (
          <Skeleton rows={2} label={deviceTexts.roomsLoading} />
        ) : (
          <ChoiceGroup<string>
            label={deviceTexts.roomTitle}
            options={options}
            value={areaId}
            onChange={setAreaId}
          />
        )}
        {adding ? (
          <>
            <Field
              label={deviceTexts.roomNewLabel}
              maxLength={40}
              autoComplete="off"
              placeholder={deviceTexts.roomNewLabel}
              value={newRoom}
              disabled={busy}
              {...(roomError ? { error: roomError } : {})}
              onChange={(event) => {
                setNewRoom(event.target.value);
                setRoomError(null);
              }}
            />
            <div className="aca-device-actions">
              <Button variant="control" size="md" disabled={busy} onClick={() => setAdding(false)}>
                {deviceTexts.cancel}
              </Button>
              <Button
                variant="control"
                size="md"
                disabled={busy || !newRoom.trim()}
                onClick={create}
              >
                {deviceTexts.roomCreate}
              </Button>
            </div>
          </>
        ) : (
          <Button variant="control" size="md" disabled={busy} onClick={() => setAdding(true)}>
            {deviceTexts.roomNew}
          </Button>
        )}
      </SheetSection>

      <div className="aca-device-actions">
        <Button variant="secondary" size="md" disabled={busy} onClick={onFinished}>
          {deviceTexts.skip}
        </Button>
        <Button variant="primary" size="md" loading={busy} onClick={save}>
          {deviceTexts.save}
        </Button>
      </div>
    </div>
  );
}
