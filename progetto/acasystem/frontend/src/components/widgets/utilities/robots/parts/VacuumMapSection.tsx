import { Button, Caption, MaterialLayers, Toggle, materialClass } from '@/components/primitives';
import { OptionPicker, Section } from '../../shared/details';
import { friendlyName } from '../../shared/entity';
import { Notice } from '../../shared/UtilityCard';
import { UtilityIcon } from '../../shared/UtilityIcon';
import { writeStorage, type VacuumState } from './useVacuumDetailsState';

export function VacuumMapSection({ v }: { v: VacuumState }) {
  const {
    entity,
    entities,
    keys,
    showMap,
    setShowMap,
    setSelectedMap,
    mapScale,
    setMapScale,
    setRefreshKey,
    refreshKey,
    mapIds,
    activeMap,
    mapUrl,
  } = v;
  return (
    <>
      {mapIds.length > 0 && (
        <Section
          title="Mappa"
          icon="map"
          aside={
            <span className="utility-inline">
              <Caption>{showMap ? 'Visibile' : 'Nascosta'}</Caption>
              <Toggle
                checked={showMap}
                compact
                onLabel="Visibile"
                offLabel="Nascosta"
                aria-label="Mostra la mappa"
                onClick={() => {
                  const next = !showMap;
                  setShowMap(next);
                  writeStorage(keys.showMap, String(next));
                }}
              />
            </span>
          }
        >
          {showMap && (
            <>
              <div className="utility-toolbar">
                {mapIds.length > 1 && (
                  <OptionPicker
                    label="Mappa"
                    value={activeMap}
                    options={mapIds.map((mapId) => ({
                      value: mapId,
                      label: friendlyName(entities[mapId], mapId),
                    }))}
                    onSelect={(value) => {
                      setSelectedMap(value);
                      writeStorage(keys.selectedMap, value);
                    }}
                  />
                )}
                <Button
                  variant="control"
                  shape="circle"
                  size="md"
                  aria-label="Riduci la mappa"
                  disabled={mapScale <= 1}
                  onClick={() => setMapScale((value) => Math.max(1, value - 0.25))}
                >
                  <UtilityIcon name="minus" size="md" />
                </Button>
                <Button
                  variant="control"
                  shape="circle"
                  size="md"
                  aria-label="Ingrandisci la mappa"
                  disabled={mapScale >= 4}
                  onClick={() => setMapScale((value) => Math.min(4, value + 0.25))}
                >
                  <UtilityIcon name="add" size="md" />
                </Button>
                <Button
                  variant="control"
                  shape="circle"
                  size="md"
                  aria-label="Aggiorna la mappa"
                  onClick={() => setRefreshKey((value) => value + 1)}
                >
                  <UtilityIcon name="refresh" size="md" />
                </Button>
              </div>
              {mapUrl ? (
                <div
                  className={materialClass(
                    { behavior: 'well', shape: 'card', size: 'inherit' },
                    'utility-map'
                  )}
                >
                  <MaterialLayers element="div">
                    <div
                      className="utility-map__viewport"
                      tabIndex={0}
                      role="region"
                      aria-label="Mappa dell’aspirapolvere, scorrevole quando ingrandita"
                    >
                      <img
                        src={`${mapUrl}${mapUrl.includes('?') ? '&' : '?'}t=${refreshKey}`}
                        alt={`Mappa di ${friendlyName(entity, 'aspirapolvere')}`}
                        style={{ width: `${mapScale * 100}%` }}
                      />
                    </div>
                  </MaterialLayers>
                </div>
              ) : (
                <Notice icon="map">La mappa scelta non ha un’immagine disponibile.</Notice>
              )}
            </>
          )}
        </Section>
      )}
    </>
  );
}
