import { Button, Caption, Skeleton } from '@/components/primitives';
import { OptionPicker, Section } from '../../shared/details';
import { CommandButton } from '../../shared/controls';
import { robotActionSupported } from '../robotSpecs';
import type { VacuumState } from './useVacuumDetailsState';

export function VacuumRoomsSection({ v }: { v: VacuumState }) {
  const {
    id,
    entity,
    entities,
    services,
    registry,
    roomSelect,
    roomOptions,
    roomScripts,
    roomDomain,
    hasRooms,
    selectedRoom,
    setSelectedRoom,
    selectedAreas,
    setSelectedAreas,
    pending,
    unavailable,
    send,
  } = v;
  return (
    <>
      {(hasRooms || registry.loading) && (
        <Section title="Stanze" icon="room">
          {registry.loading && registry.areas.length === 0 ? (
            <Skeleton variant="list" rows={1} label="Caricamento delle stanze…" />
          ) : null}
          {registry.areas.length > 0 &&
            robotActionSupported(entity, 'vacuum', 'clean_area', services) && (
              <div className="utility-stack">
                <Caption>Scegli le aree da pulire</Caption>
                <div className="utility-toolbar" role="group" aria-label="Aree da pulire">
                  {registry.areas.map((area) => {
                    const chosen = selectedAreas.includes(area.area_id);
                    return (
                      <Button
                        key={area.area_id}
                        variant="control"
                        size="sm"
                        aria-pressed={chosen}
                        onClick={() =>
                          setSelectedAreas((current) =>
                            chosen
                              ? current.filter((item) => item !== area.area_id)
                              : [...current, area.area_id]
                          )
                        }
                      >
                        {area.name ?? area.area_id}
                      </Button>
                    );
                  })}
                </div>
                <div className="utility-toolbar">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={selectedAreas.length === 0 || unavailable}
                    loading={pending === 'areas'}
                    onClick={() => {
                      send({
                        key: 'areas',
                        domain: 'vacuum',
                        service: 'clean_area',
                        data: { target: { entity_id: id }, cleaning_area_id: selectedAreas },
                      });
                      setSelectedAreas([]);
                    }}
                  >
                    {selectedAreas.length > 0
                      ? `Pulisci ${selectedAreas.length} ${selectedAreas.length === 1 ? 'area' : 'aree'}`
                      : 'Pulisci le aree scelte'}
                  </Button>
                </div>
              </div>
            )}
          {roomSelect && roomOptions.length > 0 && (
            <div className="utility-toolbar">
              <OptionPicker
                label="Stanza"
                value={
                  selectedRoom ??
                  (roomOptions.includes(entities[roomSelect]?.state ?? '')
                    ? (entities[roomSelect]?.state ?? null)
                    : (roomOptions[0] ?? null))
                }
                options={roomOptions.map((option) => ({ value: option, label: option }))}
                onSelect={setSelectedRoom}
              />
              <Button
                variant="control"
                size="md"
                loading={pending === 'room'}
                disabled={unavailable}
                onClick={() => {
                  const fallback = roomOptions.includes(entities[roomSelect]?.state ?? '')
                    ? entities[roomSelect]?.state
                    : roomOptions[0];
                  const option = selectedRoom ?? fallback;
                  if (!option) return;
                  send({
                    key: 'room',
                    domain: roomDomain,
                    service: 'select_option',
                    data: { entity_id: roomSelect, option },
                  });
                }}
              >
                Pulisci la stanza
              </Button>
            </div>
          )}
          {roomScripts.length > 0 && (
            <div className="utility-toolbar">
              {roomScripts.map((script) => (
                <CommandButton
                  key={script.entityId}
                  entity={entities[script.entityId]}
                  domain="script"
                  service="turn_on"
                  data={{ entity_id: script.entityId }}
                  icon="play"
                >
                  {script.label}
                </CommandButton>
              ))}
            </div>
          )}
          {!registry.loading && !hasRooms && (
            <Caption>Nessuna stanza configurata per questo dispositivo.</Caption>
          )}
        </Section>
      )}
    </>
  );
}
