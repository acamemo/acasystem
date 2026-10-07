import { useState } from 'react';
import { Body, Button, Caption, Field } from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import {
  normalizeCameraStreamEngine,
  normalizeGo2rtcMode,
} from '@/components/widgets/media/model/camera';
import { readKey } from '@/validators/guards';
import type { EditKind } from '../editTarget';
import { EntityPicker, EntitySelect } from '../parts/EntityPicker';
import { ChoiceGroup, FormRow, SheetSection, ToggleRow } from '../parts/Form';
import { useDomId } from '../parts/hooks';

interface Props {
  kind: EditKind;
  settings: CardSettings;
  entities: EntityMap;
  save: (key: string, value: unknown) => void;
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];

function TextSetting({
  label,
  setting,
  settings,
  save,
  hint,
  placeholder,
}: Omit<Props, 'kind' | 'entities'> & {
  label: string;
  setting: string;
  hint?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(text(settings[setting]));
  return (
    <FormRow label={label} hint={hint}>
      {({ labelId, hintId }) => (
        <Field
          label={label}
          aria-labelledby={labelId}
          aria-describedby={hintId}
          placeholder={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => save(setting, value.trim() || null)}
        />
      )}
    </FormRow>
  );
}

function NumberSetting({
  label,
  setting,
  settings,
  save,
  fallback,
  min,
  max,
}: Omit<Props, 'kind' | 'entities'> & {
  label: string;
  setting: string;
  fallback: number;
  min: number;
  max: number;
}) {
  const initial =
    typeof settings[setting] === 'number' ? String(settings[setting]) : String(fallback);
  const [value, setValue] = useState(initial);
  return (
    <FormRow label={label}>
      {({ labelId }) => (
        <Field
          label={label}
          aria-labelledby={labelId}
          type="number"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => {
            const parsed = value.trim() ? Number(value) : fallback;
            const next = Number.isFinite(parsed)
              ? Math.max(min, Math.min(max, Math.round(parsed)))
              : fallback;
            setValue(String(next));
            save(setting, next);
          }}
        />
      )}
    </FormRow>
  );
}

function MultipleEntities({
  label,
  setting,
  settings,
  entities,
  ids,
  save,
}: Omit<Props, 'kind'> & { label: string; setting: string; ids: string[] }) {
  const selected = list(settings[setting]);
  return (
    <EntityPicker
      label={label}
      entities={entities}
      ids={[...new Set([...ids, ...selected])]}
      selected={selected}
      searchable
      emptyText="Nessuna entità adatta in Home Assistant."
      onToggle={(id) =>
        save(
          setting,
          selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]
        )
      }
    />
  );
}

const VACUUM_MAPPINGS = [
  ['batterySensorId', 'Batteria', 'sensor.'],
  ['currentRoomSensorId', 'Stanza corrente', 'sensor.'],
  ['cleaningTimeSensorId', 'Durata della pulizia', 'sensor.'],
  ['cleanedAreaSensorId', 'Area pulita', 'sensor.'],
  ['totalCleanTimeSensorId', 'Tempo totale di pulizia', 'sensor.'],
  ['totalCleanAreaSensorId', 'Area totale pulita', 'sensor.'],
  ['totalCleanCountSensorId', 'Numero totale di pulizie', 'sensor.'],
  ['lastCleanStartSensorId', 'Inizio ultima pulizia', 'sensor.'],
  ['lastCleanEndSensorId', 'Fine ultima pulizia', 'sensor.'],
  ['roomSelectEntityId', 'Selezione delle stanze', ''],
  ['mopIntensityControlEntityId', 'Intensità del lavaggio', ''],
  ['mapImageEntityId', 'Mappa', ''],
] as const;

type CameraEngineChoice = 'auto' | 'go2rtc' | 'ha' | 'snapshot';

/**
 * Engine shown as chosen, as the legacy EditCardModal read it: go2rtc aliases are go2rtc, an old
 * «webrtc» is go2rtc with a player URL and Home Assistant without.
 */
function cameraEngineChoice(settings: CardSettings): CameraEngineChoice {
  const engine = normalizeCameraStreamEngine(settings.cameraStreamEngine);
  if (engine === 'webrtc') return text(settings.cameraWebrtcUrl).trim() ? 'go2rtc' : 'ha';
  return engine;
}

/** go2rtc mode: the saved one, otherwise the `mode` of the player URL (legacy). */
function go2rtcModeChoice(settings: CardSettings) {
  const fromUrl = /[?&]mode=([^&#]*)/i.exec(text(settings.cameraWebrtcUrl))?.[1];
  return normalizeGo2rtcMode(text(settings.cameraGo2rtcMode) || fromUrl);
}

/** Legacy motion sensor candidates: binary sensors of motion or occupancy. */
function isMotionSensor(entities: EntityMap, id: string): boolean {
  if (!id.startsWith('binary_sensor.')) return false;
  const deviceClass = entities[id]?.attributes?.device_class;
  return (
    deviceClass === 'motion' || deviceClass === 'occupancy' || id.toLowerCase().includes('motion')
  );
}

interface RoomScript {
  label: string;
  entityId: string;
}

const roomScriptList = (value: unknown): RoomScript[] =>
  Array.isArray(value)
    ? value.map((item: unknown) => ({
        label: text(readKey(item, 'label')),
        entityId: text(readKey(item, 'entityId')),
      }))
    : [];

/**
 * Room scripts of the legacy vacuum card (`roomScripts`: label and script), shown as buttons in
 * the details. Names are saved when the field is left.
 */
function RoomScripts({ settings, entities, save }: Omit<Props, 'kind'>) {
  const scripts = roomScriptList(settings.roomScripts);
  const [labels, setLabels] = useState(() => scripts.map((item) => item.label));
  const scriptIds = Object.keys(entities).filter((id) => id.startsWith('script.'));
  const update = (index: number, patch: Partial<RoomScript>) =>
    save(
      'roomScripts',
      scripts.map((item, position) => (position === index ? { ...item, ...patch } : item))
    );
  const remove = (index: number) => {
    setLabels((current) => current.filter((_, position) => position !== index));
    save(
      'roomScripts',
      scripts.filter((_, position) => position !== index)
    );
  };
  const add = () => {
    setLabels((current) => [...current, '']);
    save('roomScripts', [...scripts, { label: '', entityId: '' }]);
  };
  const headingId = useDomId('script-stanze');
  return (
    <div className="aca-entries" role="group" aria-labelledby={headingId}>
      <div className="aca-form-row">
        <Body as="span" size="sm" id={headingId} className="aca-form-row__label">
          Script delle stanze
        </Body>
        <Caption as="p">
          Ogni stanza diventa un pulsante nei dettagli e avvia il suo script.
        </Caption>
      </div>
      {scripts.map((item, index) => (
        <RoomScriptRow
          key={index}
          index={index}
          label={labels[index] ?? item.label}
          entityId={item.entityId || null}
          entities={entities}
          scriptIds={scriptIds}
          onLabel={(value) =>
            setLabels((current) =>
              current.map((entry, position) => (position === index ? value : entry))
            )
          }
          onLabelDone={() => update(index, { label: (labels[index] ?? item.label).trim() })}
          onScript={(id) => update(index, { entityId: id ?? '' })}
          onRemove={() => remove(index)}
        />
      ))}
      <div>
        <Button variant="control" size="md" onClick={add}>
          Aggiungi una stanza
        </Button>
      </div>
    </div>
  );
}

function RoomScriptRow({
  index,
  label,
  entityId,
  entities,
  scriptIds,
  onLabel,
  onLabelDone,
  onScript,
  onRemove,
}: {
  index: number;
  label: string;
  entityId: string | null;
  entities: EntityMap;
  scriptIds: string[];
  onLabel: (value: string) => void;
  onLabelDone: () => void;
  onScript: (id: string | null) => void;
  onRemove: () => void;
}) {
  const headingId = useDomId('stanza');
  const title = `Stanza ${index + 1}`;
  return (
    <div className="aca-entry" role="group" aria-labelledby={headingId}>
      <Body as="span" size="sm" id={headingId} className="aca-form-row__label">
        {title}
      </Body>
      <FormRow label="Nome">
        {({ labelId }) => (
          <Field
            label={`Nome: ${title}`}
            aria-labelledby={`${headingId} ${labelId}`}
            placeholder="Per esempio Cucina"
            value={label}
            onChange={(event) => onLabel(event.target.value)}
            onBlur={onLabelDone}
          />
        )}
      </FormRow>
      <EntitySelect
        label={`Script della stanza ${index + 1}`}
        value={entityId}
        entities={entities}
        ids={scriptIds}
        noneLabel="Nessuno"
        emptyText="Nessuno script in Home Assistant."
        onChange={onScript}
      />
      <div>
        <Button
          variant="control"
          size="md"
          aria-label={`Rimuovi la stanza ${index + 1}`}
          onClick={onRemove}
        >
          Rimuovi
        </Button>
      </div>
    </div>
  );
}

/** Settings still consumed by the migrated widgets, using the original persistence keys. */
export function AdditionalTypeSections({ kind, settings, entities, save }: Props) {
  const ids = (prefix: string) => Object.keys(entities).filter((id) => id.startsWith(prefix));
  const common = { settings, entities, save };
  const entity = (label: string, key: string, candidates: string[]) => (
    <EntitySelect
      label={label}
      value={text(settings[key]) || null}
      entities={entities}
      ids={candidates}
      onChange={(id) => save(key, id)}
    />
  );
  switch (kind) {
    case 'todo':
      return (
        <SheetSection title="Attività">
          {entity('Lista di attività', 'todoEntityId', ids('todo.'))}
        </SheetSection>
      );
    case 'calendar':
      return (
        <SheetSection title="Calendario">
          <MultipleEntities
            {...common}
            label="Calendari"
            setting="calendars"
            ids={ids('calendar.')}
          />
        </SheetSection>
      );
    case 'weather':
      return (
        <SheetSection title="Meteo">
          <TextSetting {...common} label="Sottotitolo" setting="subtitle" />
          <NumberSetting
            {...common}
            label="Ore dello storico"
            setting="graphHistoryHours"
            fallback={12}
            min={1}
            max={168}
          />
        </SheetSection>
      );
    case 'cost':
    case 'nordpool':
      return (
        <SheetSection title={kind === 'cost' ? 'Costi' : 'Nordpool'}>
          {kind === 'cost' && (
            <>
              {entity('Costo di oggi', 'todayId', [...ids('sensor.'), ...ids('input_number.')])}
              {entity('Costo del mese', 'monthId', [...ids('sensor.'), ...ids('input_number.')])}
              <TextSetting
                {...common}
                label="Etichetta di oggi"
                setting="todayLabel"
                placeholder="Oggi"
              />
              <TextSetting
                {...common}
                label="Etichetta del mese"
                setting="monthLabel"
                placeholder="Questo mese"
              />
            </>
          )}
          <TextSetting
            {...common}
            label="Valuta"
            setting="currency"
            hint="Vuota usa la valuta configurata in Home Assistant."
          />
          <NumberSetting
            {...common}
            label="Decimali"
            setting="decimals"
            fallback={kind === 'cost' ? 0 : 2}
            min={0}
            max={6}
          />
          {kind === 'nordpool' && (
            <ChoiceGroup
              label="Grafico"
              value={settings.graphStyle === 'bar' ? 'bar' : 'line'}
              options={[
                { value: 'line', label: 'Linea' },
                { value: 'bar', label: 'Barre' },
              ]}
              onChange={(value) => save('graphStyle', value)}
            />
          )}
          {kind === 'nordpool' && (
            <ToggleRow
              label="Prezzi con sostegno statale"
              hint="Lo stesso interruttore dei dettagli del widget."
              checked={settings.showWithSupport === true}
              onChange={(value) => save('showWithSupport', value)}
            />
          )}
        </SheetSection>
      );
    case 'androidtv':
    case 'appletv':
      return (
        <SheetSection title="Lettori collegati">
          <MultipleEntities
            {...common}
            label="Lettori multimediali"
            setting="linkedMediaPlayers"
            ids={ids('media_player.').filter((id) => id !== settings.mediaPlayerId)}
          />
        </SheetSection>
      );
    case 'spacer':
      return (
        <SheetSection title="Separatore">
          <ChoiceGroup
            label="Variante"
            value={settings.variant === 'divider' ? 'divider' : 'spacer'}
            options={[
              { value: 'spacer', label: 'Spazio' },
              { value: 'divider', label: 'Linea' },
            ]}
            onChange={(value) => save('variant', value)}
          />
          <ChoiceGroup
            label="Allineamento del titolo"
            value={
              settings.headingAlign === 'left' || settings.headingAlign === 'right'
                ? settings.headingAlign
                : 'center'
            }
            options={[
              { value: 'left', label: 'Sinistra' },
              { value: 'center', label: 'Centro' },
              { value: 'right', label: 'Destra' },
            ]}
            onChange={(value) => save('headingAlign', value)}
          />
        </SheetSection>
      );
    case 'camera': {
      const engine = cameraEngineChoice(settings);
      const motion = settings.cameraRefreshMode === 'motion';
      const motionSensor = text(settings.cameraMotionSensor);
      return (
        <SheetSection title="Videocamera">
          <ChoiceGroup<CameraEngineChoice>
            label="Motore video"
            value={engine}
            options={[
              { value: 'auto', label: 'Automatico' },
              { value: 'go2rtc', label: 'go2rtc' },
              { value: 'ha', label: 'Home Assistant' },
              { value: 'snapshot', label: 'Istantanee' },
            ]}
            onChange={(value) => save('cameraStreamEngine', value)}
          />
          {(engine === 'auto' || engine === 'go2rtc') && (
            <>
              <TextSetting
                {...common}
                label="URL del lettore go2rtc"
                setting="cameraWebrtcUrl"
                hint="Può contenere {entity_id} e {entity_object_id}. Le origini ammesse dipendono dalla configurazione del server."
              />
              <ChoiceGroup
                label="Modalità go2rtc"
                value={go2rtcModeChoice(settings)}
                options={[
                  { value: 'auto', label: 'Automatico' },
                  { value: 'webrtc', label: 'WebRTC' },
                  { value: 'mse', label: 'MSE' },
                ]}
                onChange={(value) => save('cameraGo2rtcMode', value)}
              />
            </>
          )}
          <ChoiceGroup
            label="Aggiornamento delle istantanee"
            value={motion ? 'motion' : 'interval'}
            options={[
              { value: 'interval', label: 'Periodico' },
              { value: 'motion', label: 'Su movimento' },
            ]}
            onChange={(value) => save('cameraRefreshMode', value)}
          />
          {!motion && (
            <NumberSetting
              {...common}
              label="Intervallo in secondi"
              setting="cameraRefreshInterval"
              fallback={10}
              min={2}
              max={3600}
            />
          )}
          {motion &&
            entity('Sensore di movimento', 'cameraMotionSensor', [
              ...new Set([
                ...ids('binary_sensor.').filter((id) => isMotionSensor(entities, id)),
                ...(motionSensor ? [motionSensor] : []),
              ]),
            ])}
        </SheetSection>
      );
    }
    case 'vacuum':
      return (
        <SheetSection
          title="Aspirapolvere"
          description="Le associazioni vuote conservano il rilevamento automatico."
        >
          {VACUUM_MAPPINGS.map(([key, label, prefix]) => (
            <EntitySelect
              key={key}
              label={label}
              noneLabel="Automatico"
              value={text(settings[key]) || null}
              entities={entities}
              ids={
                prefix
                  ? ids(prefix)
                  : Object.keys(entities).filter((id) =>
                      key === 'mapImageEntityId'
                        ? /^(image|camera)\./.test(id)
                        : /^(select|input_select)\./.test(id)
                    )
              }
              onChange={(id) => save(key, id)}
            />
          ))}
          <RoomScripts {...common} />
        </SheetSection>
      );
    default:
      return null;
  }
}
