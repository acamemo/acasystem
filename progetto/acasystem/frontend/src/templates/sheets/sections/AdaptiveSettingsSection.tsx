import { useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { Body, Button, Caption, Field, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  operationalProfile,
  readControlPreference,
} from '@/components/widgets/adaptive/operationalProfile';
import { useServiceCatalog } from '@/components/widgets/adaptive/useServiceCatalog';
import { categoryEntityId } from '../categoryPages';
import { SheetSection, ToggleRow, FormRow } from '../parts/Form';
import { EntitySelect } from '../parts/EntityPicker';
import { DEVICE_SCOPE_NOTE } from '@/utils/launcher/deviceMemory';

const bindings: Record<string, readonly [string, string, readonly string[]][]> = {
  sensor: [
    ['switch', 'Interruttore associato', ['switch', 'input_boolean']],
    ['button', 'Pulsante associato', ['button', 'input_button']],
    ['script', 'Script o scenario', ['script', 'scene']],
    ['select', 'Selezione associata', ['select', 'input_select']],
    ['number', 'Valore numerico associato', ['number', 'input_number']],
  ],
  vacuum: [
    ['mop', 'Intensità lavaggio', ['select', 'input_select', 'number']],
    ['area', 'Area da pulire', ['select', 'input_select']],
    ['maintenance', 'Manutenzione', ['button', 'sensor']],
  ],
  mower: [
    ['zone', 'Zona di taglio', ['select', 'input_select']],
    ['height', 'Altezza di taglio', ['number', 'input_number']],
  ],
};

function SavedText({
  label,
  setting,
  settings,
  save,
  hint,
}: {
  label: string;
  setting: string;
  settings: CardSettings;
  save: (key: string, value: unknown) => void;
  hint?: string;
}) {
  const [value, setValue] = useState(String(settings[setting] ?? ''));
  return (
    <FormRow label={label} hint={hint}>
      {({ labelId, hintId }) => (
        <Field
          label={label}
          aria-labelledby={labelId}
          aria-describedby={hintId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => save(setting, value.trim() || null)}
        />
      )}
    </FormRow>
  );
}

export function AdaptiveSettingsSection({
  settings,
  save,
}: {
  settings: CardSettings;
  save: (key: string, value: unknown) => void;
}) {
  const runtime = useWidgetRuntime();
  const services = useServiceCatalog();
  const type = String(settings.categoryWidgetType ?? '');
  const entityId = categoryEntityId(type, settings) ?? '';
  const profile = operationalProfile({
    type,
    entityId,
    settings,
    entities: runtime.entities,
    services,
    haConfig: runtime.haConfig,
  });
  const preference = readControlPreference(settings, profile.capabilities);
  const rawBindings =
    settings.adaptiveBindings && typeof settings.adaptiveBindings === 'object'
      ? (settings.adaptiveBindings as Record<string, unknown>)
      : {};
  const savePreference = (order: string[], visible: string[]) =>
    save('adaptiveControls', { order, visible });
  const multi = (key: string, label: string, domains: string[]) => {
    const selected = Array.isArray(settings[key]) ? (settings[key] as string[]) : [];
    const ids = Object.keys(runtime.entities).filter(
      (id) => domains.includes(id.split('.')[0]!) && !selected.includes(id)
    );
    return (
      <div key={key}>
        <EntitySelect
          label={label}
          entities={runtime.entities}
          ids={ids}
          value={null}
          noneLabel="Aggiungi dispositivo"
          onChange={(id) => {
            if (id) save(key, [...selected, id]);
          }}
        />
        {selected.map((id) => (
          <div className="aca-adaptive-binding" key={id}>
            <Caption>{String(runtime.entities[id]?.attributes.friendly_name ?? id)}</Caption>
            <Button
              variant="control"
              size="sm"
              aria-label={'Rimuovi ' + id}
              onClick={() =>
                save(
                  key,
                  selected.filter((value) => value !== id)
                )
              }
            >
              Rimuovi
            </Button>
          </div>
        ))}
      </div>
    );
  };
  return (
    <>
      {type === 'spacer' && (
        <SheetSection title="Separatore">
          <ToggleRow
            label="Mostra la linea"
            checked={settings.variant !== 'spacer'}
            onChange={(checked) => save('variant', checked ? 'divider' : 'spacer')}
          />
          <FormRow label="Spaziatura in pixel">
            {({ labelId }) => (
              <Field
                type="number"
                min={8}
                max={80}
                step={4}
                label="Spaziatura in pixel"
                aria-labelledby={labelId}
                value={Number(settings.adaptiveSpacing ?? 32)}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value >= 8 && value <= 80) save('adaptiveSpacing', value);
                }}
              />
            )}
          </FormRow>
        </SheetSection>
      )}
      <SheetSection title="Controlli nella scheda">
        <Body size="sm" tone="muted">
          Scegli visibilità e ordine. I dettagli conservano tutte le funzioni supportate.
        </Body>
        {!services && type !== 'spacer' && <Caption>Attendo i servizi di Home Assistant.</Caption>}
        {preference.order.map((id, index) => {
          const cap = profile.capabilities.find((candidate) => candidate.id === id)!;
          const move = (direction: -1 | 1) => {
            const next = [...preference.order];
            [next[index], next[index + direction]] = [next[index + direction]!, next[index]!];
            savePreference(next, preference.visible);
          };
          return (
            <div className="aca-adaptive-preference" key={id}>
              <ToggleRow
                label={cap.label}
                checked={preference.visible.includes(id)}
                onChange={() =>
                  savePreference(
                    preference.order,
                    preference.visible.includes(id)
                      ? preference.visible.filter((value) => value !== id)
                      : [...preference.visible, id]
                  )
                }
              />
              <Button
                variant="control"
                shape="circle"
                size="sm"
                disabled={index === 0}
                aria-label={'Sposta su ' + cap.label}
                onClick={() => move(-1)}
              >
                <Icon name="chevronUp" />
              </Button>
              <Button
                variant="control"
                shape="circle"
                size="sm"
                disabled={index === preference.order.length - 1}
                aria-label={'Sposta giù ' + cap.label}
                onClick={() => move(1)}
              >
                <Icon name="chevronDown" />
              </Button>
            </div>
          );
        })}
        {profile.unavailable.map((message) => (
          <Caption key={message}>{message}</Caption>
        ))}
      </SheetSection>
      {(bindings[type]?.length || type === 'camera' || type === 'sonos') && (
        <SheetSection title="Funzioni aggiuntive" description={`${DEVICE_SCOPE_NOTE}.`}>
          {bindings[type]?.map(([key, label, domains]) => (
            <EntitySelect
              key={key}
              label={label}
              entities={runtime.entities}
              ids={Object.keys(runtime.entities).filter((id) =>
                domains.includes(id.split('.')[0]!)
              )}
              value={typeof rawBindings[key] === 'string' ? (rawBindings[key] as string) : null}
              onChange={(id) => save('adaptiveBindings', { ...rawBindings, [key]: id })}
              noneLabel="Non associato"
            />
          ))}
          {type === 'sonos' && multi('sonosAlarmIds', 'Sveglie Sonos', ['switch'])}
          {type === 'camera' && (
            <>
              <SavedText
                label="Cartella privata per foto e video"
                setting="cameraCaptureDirectory"
                settings={settings}
                save={save}
                hint="Percorso assoluto già autorizzato in Home Assistant. Non usare cartelle pubbliche www."
              />
              <SavedText
                label="Durata registrazione in secondi"
                setting="cameraRecordDuration"
                settings={settings}
                save={save}
                hint="Da 1 a 3600 secondi; predefinita 30."
              />
              <ToggleRow
                label="Videocamera con PTZ ONVIF configurato"
                checked={settings.cameraPtz === true}
                onChange={(checked) => save('cameraPtz', checked)}
              />
              {multi('cameraCastIds', 'Lettori per lo stream', ['media_player'])}
            </>
          )}
        </SheetSection>
      )}
    </>
  );
}
