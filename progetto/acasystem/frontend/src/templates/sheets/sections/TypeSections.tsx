import { useMemo, useState } from 'react';
import { Body, Button, Caption, Field, IconText } from '@/components/primitives';
import type { CardSettings, PageSettingsMap } from '@/@types/dashboard';
import type { Connection, EntityMap } from '@/@types/ha';
import { getEntitiesForArea } from '@/api/haClient';
import { matchCarEntities, type CarEntityField } from '@/utils/carEntityMatcher';
import {
  MAX_CLIMATE_FAVORITE_MODES,
  resolveClimateFavoriteModes,
  toggleClimateFavoriteMode,
} from '@/utils/climateFavorites';
import { EntitySelect } from '../parts/EntityPicker';
import { ChoiceGroup, FormRow, Notice, SheetSection, ToggleRow } from '../parts/Form';
import { useDomId } from '../parts/hooks';

type Save = (key: string, value: unknown) => void;

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Tap action of climate and Apple TV widgets: open the details or switch on and off. */
export function TapActionSection({ settings, save }: { settings: CardSettings; save: Save }) {
  return (
    <ChoiceGroup<'modal' | 'toggle'>
      label="Al tocco"
      hint="Che cosa succede toccando il widget."
      options={[
        { value: 'modal', label: 'Apri i dettagli' },
        { value: 'toggle', label: 'Accendi o spegni' },
      ]}
      value={settings.tapAction === 'toggle' ? 'toggle' : 'modal'}
      onChange={(value) => save('tapAction', value)}
    />
  );
}

const HVAC_LABELS: Record<string, string> = {
  off: 'Spento',
  auto: 'Automatico',
  cool: 'Raffrescamento',
  dry: 'Deumidificazione',
  fan_only: 'Solo ventilazione',
  heat: 'Riscaldamento',
  heat_cool: 'Caldo e freddo',
};

const hvacLabel = (mode: string) =>
  HVAC_LABELS[mode] ??
  mode.replaceAll('_', ' ').replace(/^./, (first) => first.toLocaleUpperCase('it'));

/** Climate widget: tap action and up to two favourite HVAC modes (legacy keys). */
export function ClimateSection({
  settings,
  entities,
  save,
}: {
  settings: CardSettings;
  entities: EntityMap;
  save: Save;
}) {
  const labelId = useDomId('modi');
  const climateId = typeof settings.climateId === 'string' ? settings.climateId : '';
  const modes = stringList(entities[climateId]?.attributes?.hvac_modes);
  const favourites = resolveClimateFavoriteModes(settings.climateFavoriteModes, modes);
  return (
    <SheetSection title="Clima">
      <TapActionSection settings={settings} save={save} />
      {modes.length > 0 && (
        <div className="aca-form-row">
          <Body as="span" size="sm" id={labelId} className="aca-form-row__label">
            Modalità preferite
          </Body>
          <Caption as="p">
            Al massimo {MAX_CLIMATE_FAVORITE_MODES}, mostrate come scorciatoie nel widget.
          </Caption>
          <div className="aca-chips" role="group" aria-labelledby={labelId}>
            {modes.map((mode) => {
              const selected = favourites.includes(mode);
              return (
                <Button
                  key={mode}
                  variant="control"
                  size="sm"
                  aria-pressed={selected}
                  disabled={!selected && favourites.length >= MAX_CLIMATE_FAVORITE_MODES}
                  onClick={() =>
                    save(
                      'climateFavoriteModes',
                      toggleClimateFavoriteMode(settings.climateFavoriteModes, mode, modes)
                    )
                  }
                >
                  {hvacLabel(mode)}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </SheetSection>
  );
}

/** Media widgets: artwork style and background motion while playing. */
export function MediaSection({ settings, save }: { settings: CardSettings; save: Save }) {
  return (
    <SheetSection title="Multimedia">
      <ChoiceGroup<'default' | 'cover'>
        label="Copertina"
        hint={
          settings.artworkMode === 'cover'
            ? 'La copertina riempie il widget.'
            : 'Icona e sfondo standard.'
        }
        options={[
          { value: 'default', label: 'Standard' },
          { value: 'cover', label: 'A tutto widget' },
        ]}
        value={settings.artworkMode === 'cover' ? 'cover' : 'default'}
        onChange={(value) => save('artworkMode', value)}
      />
    </SheetSection>
  );
}

/** Entity widgets of the settings page: status and last change. */
export function StatusSection({ settings, save }: { settings: CardSettings; save: Save }) {
  return (
    <SheetSection title="Stato">
      <ToggleRow
        label="Mostra lo stato"
        checked={settings.showStatus !== false}
        onChange={(value) => save('showStatus', value)}
      />
      <ToggleRow
        label="Mostra l’ultima modifica"
        checked={settings.showLastChanged !== false}
        onChange={(value) => save('showLastChanged', value)}
      />
    </SheetSection>
  );
}

const ROOM_FEATURES: ReadonlyArray<{ key: string; label: string; fallback: boolean }> = [
  { key: 'showLights', label: 'Luci', fallback: true },
  { key: 'showTemp', label: 'Temperatura', fallback: true },
  { key: 'showMotion', label: 'Movimento', fallback: true },
  { key: 'showLightChip', label: 'Indicatore delle luci', fallback: true },
  { key: 'showMediaChip', label: 'Indicatore multimediale', fallback: true },
  { key: 'showActiveChip', label: 'Dispositivi attivi', fallback: true },
  { key: 'showVacuumChip', label: 'Indicatore aspirapolvere', fallback: true },
  { key: 'showCoverChip', label: 'Indicatore tapparelle', fallback: true },
  { key: 'showDoorChip', label: 'Porte e finestre', fallback: true },
  { key: 'showOccupiedIndicator', label: 'Stanza occupata', fallback: true },
  { key: 'showIconWatermark', label: 'Icona di sfondo', fallback: true },
];

const deviceClassOf = (entities: EntityMap, id: string): unknown =>
  entities[id]?.attributes?.device_class;

/**
 * Room widget: the features it shows (only those with a source in the room, as the legacy
 * section), tap navigation to a page and a refresh of the entities from the HA area.
 */
export function RoomSection({
  settings,
  entities,
  conn,
  pageIds,
  pageSettings,
  save,
}: {
  settings: CardSettings;
  entities: EntityMap;
  conn: Connection | null;
  pageIds: readonly string[];
  pageSettings: PageSettingsMap;
  save: Save;
}) {
  const [refresh, setRefresh] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const roomIds = stringList(settings.entityIds);
  const excluded = new Set(stringList(settings.excludedEntityIds));
  const active = roomIds.filter((id) => !excluded.has(id));
  const has = (test: (id: string) => boolean) => active.some(test);
  const lightSource = Boolean(settings.mainLightEntityId) || has((id) => id.startsWith('light.'));
  const tempSource =
    Boolean(settings.tempEntityId) ||
    has(
      (id) =>
        Boolean(entities[id]) &&
        (deviceClassOf(entities, id) === 'temperature' ||
          id.includes('temperature') ||
          id.includes('temp'))
    );
  const motionSource =
    Boolean(settings.motionEntityId) ||
    has((id) => ['motion', 'occupancy', 'presence'].includes(String(deviceClassOf(entities, id))));
  const sources: Record<string, boolean> = {
    showLights: lightSource,
    showLightChip: lightSource,
    showTemp: tempSource,
    showMotion: motionSource,
    showOccupiedIndicator: motionSource,
    showVacuumChip: Boolean(settings.vacuumEntityId) || has((id) => id.startsWith('vacuum.')),
    showCoverChip: Boolean(settings.coverEntityId) || has((id) => id.startsWith('cover.')),
    showDoorChip:
      Boolean(settings.doorEntityId) ||
      has((id) => ['door', 'window', 'garage_door'].includes(String(deviceClassOf(entities, id)))),
    showMediaChip: has((id) => id.startsWith('media_player.')),
    showActiveChip: active.length > 0,
    showIconWatermark: true,
  };
  const features = ROOM_FEATURES.filter((feature) => sources[feature.key]);
  const navigateOnTap = settings.navigateOnTap === true;
  const areaId = typeof settings.areaId === 'string' ? settings.areaId : '';

  const refreshEntities = async () => {
    if (!conn || !areaId) return;
    setRefresh('busy');
    try {
      save('entityIds', await getEntitiesForArea(conn, areaId));
      setRefresh('done');
    } catch {
      setRefresh('error');
    }
  };

  return (
    <SheetSection
      title="Stanza"
      description={`${roomIds.length} entità dell’area, ${excluded.size} escluse dal widget.`}
    >
      {features.length === 0 ? (
        <Caption as="p">Nella stanza non ci sono ancora entità da mostrare.</Caption>
      ) : (
        features.map((feature) => (
          <ToggleRow
            key={feature.key}
            label={feature.label}
            checked={
              typeof settings[feature.key] === 'boolean'
                ? settings[feature.key] === true
                : feature.fallback
            }
            onChange={(value) => save(feature.key, value)}
          />
        ))
      )}
      <ToggleRow
        label="Apri una pagina al tocco"
        hint="Al posto dei dettagli della stanza."
        checked={navigateOnTap}
        onChange={(value) => save('navigateOnTap', value)}
      />
      {navigateOnTap && (
        <ChoiceGroup<string>
          label="Pagina da aprire"
          options={[
            { value: '', label: 'Da scegliere' },
            ...pageIds.map((id) => ({ value: id, label: pageSettings[id]?.label || id })),
          ]}
          value={typeof settings.navigateToPageId === 'string' ? settings.navigateToPageId : ''}
          onChange={(value) => save('navigateToPageId', value || null)}
        />
      )}
      {areaId && (
        <div className="aca-form-row">
          <Button
            variant="control"
            size="sm"
            loading={refresh === 'busy'}
            disabled={!conn}
            onClick={() => {
              void refreshEntities();
            }}
          >
            <IconText icon="refresh">Aggiorna le entità dall’area</IconText>
          </Button>
          {refresh === 'done' && <Notice tone="success">Entità aggiornate.</Notice>}
          {refresh === 'error' && (
            <Notice tone="danger">
              Aggiornamento non riuscito: le entità restano quelle di prima.
            </Notice>
          )}
        </div>
      )}
    </SheetSection>
  );
}

const CAR_FIELDS: ReadonlyArray<{ key: string; label: string; match: CarEntityField }> = [
  { key: 'batteryId', label: 'Batteria', match: 'batteryId' },
  { key: 'rangeId', label: 'Autonomia', match: 'rangeId' },
  { key: 'chargingId', label: 'Stato della ricarica', match: 'chargingStateId' },
  { key: 'pluggedId', label: 'Cavo collegato', match: 'pluggedId' },
  { key: 'locationId', label: 'Posizione', match: 'locationId' },
  { key: 'climateId', label: 'Clima', match: 'climateId' },
  { key: 'lockId', label: 'Serratura', match: 'lockId' },
  { key: 'odometerId', label: 'Contachilometri', match: 'odometerId' },
  { key: 'fuelLevelId', label: 'Carburante', match: 'fuelLevelId' },
  { key: 'chargingPowerId', label: 'Potenza di ricarica', match: 'chargingPowerId' },
  { key: 'timeToFullId', label: 'Tempo alla carica completa', match: 'timeToFullId' },
  { key: 'lastUpdatedId', label: 'Ultimo aggiornamento', match: 'lastUpdatedId' },
  { key: 'updateButtonId', label: 'Pulsante di aggiornamento', match: 'updateButtonId' },
];

/** Car widget: picture and the main entity mappings, with the legacy setting keys. */
export function CarSection({
  settings,
  entities,
  save,
}: {
  settings: CardSettings;
  entities: EntityMap;
  save: Save;
}) {
  const match = useMemo(() => matchCarEntities(entities), [entities]);
  const allIds = useMemo(() => Object.keys(entities), [entities]);
  const [imageUrl, setImageUrl] = useState(
    typeof settings.imageUrl === 'string' ? settings.imageUrl : ''
  );
  return (
    <SheetSection title="Auto" description="Associa le entità che il widget mostra.">
      <FormRow
        label="Immagine dell’auto"
        hint="Metti l’immagine nella cartella www di Home Assistant e usa /local/nome.png."
      >
        {({ labelId, hintId }) => (
          <Field
            label="Immagine dell’auto"
            aria-labelledby={labelId}
            aria-describedby={hintId}
            placeholder="/local/auto.png"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            onBlur={() => save('imageUrl', imageUrl.trim() || null)}
          />
        )}
      </FormRow>
      {CAR_FIELDS.map((field) => {
        const suggested = match.options[field.match];
        const value = typeof settings[field.key] === 'string' ? String(settings[field.key]) : null;
        return (
          <EntitySelect
            key={field.key}
            label={field.label}
            value={value}
            entities={entities}
            ids={suggested.length > 0 ? suggested : allIds}
            onChange={(id) => save(field.key, id)}
          />
        );
      })}
    </SheetSection>
  );
}
