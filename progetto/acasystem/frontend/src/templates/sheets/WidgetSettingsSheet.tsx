import { useState } from 'react';
import { Button, Field, Sheet } from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { usePages } from '@/hooks/context';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { normalizeVisibilityConditionConfig } from '@/utils/conditionUtils';
import { cardSettingsKey } from './cardKeys';
import { resolveEditTarget, type EditKind, type EditTarget } from './editTarget';
import { ConditionEditor, createDefaultRule } from './parts/ConditionEditor';
import { entityName } from './parts/EntityPicker';
import { FormRow, SheetSection, ToggleRow } from './parts/Form';
import { usePresence } from './parts/hooks';
import { IconPicker } from './parts/IconPicker';
import { SensorSection } from './sections/SensorSection';
import { AdditionalTypeSections } from './sections/AdditionalTypeSections';
import {
  CarSection,
  ClimateSection,
  MediaSection,
  RoomSection,
  StatusSection,
  TapActionSection,
} from './sections/TypeSections';
import type { WidgetSettingsSheetProps } from './types';
import './sheets.css';

const KIND_LABELS: Record<EditKind, string> = {
  sensor: 'Sensore',
  light: 'Luce',
  media: 'Multimedia',
  calendar: 'Calendario',
  todo: 'Attività',
  cost: 'Costi',
  nordpool: 'Nordpool',
  androidtv: 'Android TV',
  appletv: 'Apple TV',
  vacuum: 'Aspirapolvere',
  car: 'Auto',
  room: 'Stanza',
  lock: 'Serratura',
  cover: 'Tapparella',
  alarm: 'Allarme',
  spacer: 'Separatore',
  camera: 'Videocamera',
  fan: 'Ventilatore',
  climate: 'Clima',
  weather: 'Meteo',
  person: 'Persona',
  other: 'Widget',
};

/**
 * Settings of one widget: general (name, heading, icon, hidden), the sections of its type and
 * conditional visibility. Every change is saved at once with the legacy keys: customNames and
 * customIcons by widget id, cardSettings by settingsKey through saveCardSetting.
 */
export function WidgetSettingsSheet({
  open,
  onClose,
  widgetId,
  settingsKey,
  pageId,
}: WidgetSettingsSheetProps) {
  const runtime = useWidgetRuntime();
  const mounted = usePresence(open);
  const key = settingsKey || cardSettingsKey(pageId, widgetId);
  const target = resolveEditTarget(widgetId, key, runtime.cardSettings, runtime.entities);
  const definition = findWidgetDefinition(widgetId, target.settings);
  const name =
    runtime.customNames[widgetId] || entityName(runtime.entities, target.nameEntityId) || widgetId;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Impostazioni del widget"
      description={`${definition?.label ?? KIND_LABELS[target.kind]}: ${name}`}
      footer={
        <Button variant="primary" size="md" onClick={onClose}>
          Fatto
        </Button>
      }
      className="aca-widget-settings"
    >
      {mounted && widgetId && (
        <SettingsBody
          key={`${widgetId}:${String(open)}`}
          widgetId={widgetId}
          settingsKey={key}
          target={target}
        />
      )}
    </Sheet>
  );
}

function SettingsBody({
  widgetId,
  settingsKey,
  target,
}: {
  widgetId: string;
  settingsKey: string;
  target: EditTarget;
}) {
  const runtime = useWidgetRuntime();
  const pages = usePages();
  const { settings, kind } = target;
  const save = (setting: string, value: unknown) =>
    runtime.saveCardSetting(settingsKey, setting, value);
  const [name, setName] = useState(runtime.customNames[widgetId] ?? '');
  const [heading, setHeading] = useState(
    typeof settings.heading === 'string' ? settings.heading : ''
  );
  const defaultName = entityName(runtime.entities, target.nameEntityId);
  const hidden = pages.hiddenCards.includes(widgetId);
  const icon = runtime.customIcons[widgetId] ?? null;

  const clearIcon = () => {
    const next = { ...pages.customIcons };
    delete next[widgetId];
    pages.persistCustomIcons(next);
  };

  return (
    <div className="aca-settings">
      <SheetSection title="Generali">
        {target.canEditName && (
          <FormRow label="Nome" hint="Vuoto usa il nome di Home Assistant.">
            {({ labelId, hintId }) => (
              <Field
                label="Nome"
                aria-labelledby={labelId}
                aria-describedby={hintId}
                placeholder={defaultName || 'Nome del widget'}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  pages.saveCustomName(widgetId, event.target.value);
                }}
              />
            )}
          </FormRow>
        )}
        <FormRow label="Intestazione" hint="Testo facoltativo mostrato sopra il widget.">
          {({ labelId, hintId }) => (
            <Field
              label="Intestazione"
              aria-labelledby={labelId}
              aria-describedby={hintId}
              value={heading}
              onChange={(event) => setHeading(event.target.value)}
              onBlur={() => save('heading', heading.trim() || null)}
            />
          )}
        </FormRow>
        {target.canEditIcon && (
          <IconPicker
            value={icon}
            onSelect={(iconName) => pages.saveCustomIcon(widgetId, iconName)}
            onClear={clearIcon}
          />
        )}
        <ToggleRow
          label="Nascondi il widget"
          hint="Resta visibile in modalità modifica, per poterlo mostrare di nuovo."
          checked={hidden}
          onChange={() => pages.toggleCardVisibility(widgetId)}
        />
      </SheetSection>

      <TypeSettings
        kind={kind}
        widgetId={widgetId}
        settings={settings}
        canEditStatus={target.canEditStatus}
        save={save}
      />

      <VisibilitySection widgetId={widgetId} settings={settings} save={save} />
    </div>
  );
}

function TypeSettings({
  kind,
  widgetId,
  settings,
  canEditStatus,
  save,
}: {
  kind: EditKind;
  widgetId: string;
  settings: CardSettings;
  canEditStatus: boolean;
  save: (key: string, value: unknown) => void;
}) {
  const { entities, conn } = useWidgetRuntime();
  const { pagesConfig, pageSettings } = usePages();
  return (
    <>
      {kind === 'sensor' && (
        <SensorSection widgetId={widgetId} settings={settings} entities={entities} save={save} />
      )}
      {kind === 'climate' && <ClimateSection settings={settings} entities={entities} save={save} />}
      {kind === 'appletv' && (
        <SheetSection title="Apple TV">
          <TapActionSection settings={settings} save={save} />
        </SheetSection>
      )}
      {kind === 'media' && <MediaSection settings={settings} save={save} />}
      {kind === 'room' && (
        <RoomSection
          settings={settings}
          entities={entities}
          conn={conn}
          pageIds={pagesConfig.pages ?? []}
          pageSettings={pageSettings}
          save={save}
        />
      )}
      {kind === 'car' && <CarSection settings={settings} entities={entities} save={save} />}
      {canEditStatus && kind !== 'sensor' && <StatusSection settings={settings} save={save} />}
      <AdditionalTypeSections kind={kind} settings={settings} entities={entities} save={save} />
    </>
  );
}

function VisibilitySection({
  widgetId,
  settings,
  save,
}: {
  widgetId: string;
  settings: CardSettings;
  save: (key: string, value: unknown) => void;
}) {
  const { entities } = useWidgetRuntime();
  const normalized = normalizeVisibilityConditionConfig(settings.visibilityCondition);
  const enabled = normalized.enabled && normalized.rules.length > 0;
  return (
    <SheetSection
      title="Visibilità condizionale"
      description="Mostra il widget soltanto quando le regole sono vere."
    >
      <ToggleRow
        label="Usa le regole di visibilità"
        checked={enabled}
        onChange={(next) =>
          save('visibilityCondition', {
            ...normalized,
            enabled: next,
            rules: normalized.rules.length > 0 ? normalized.rules : [createDefaultRule()],
          })
        }
      />
      {enabled && (
        <ConditionEditor
          widgetId={widgetId}
          settings={settings}
          condition={settings.visibilityCondition}
          entities={entities}
          onChange={(next) => save('visibilityCondition', next)}
        />
      )}
    </SheetSection>
  );
}
