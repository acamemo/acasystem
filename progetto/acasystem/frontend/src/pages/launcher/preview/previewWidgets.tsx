/**
 * Placeholder widgets of the development preview (launcher.html): they only exist to try
 * edit mode, sizes, swipe, the ball and the details sheet without Home Assistant.
 */
import { useState } from 'react';
import {
  Body,
  Caption,
  Display,
  Heading,
  Icon,
  Numeric,
  Toggle,
  type IconName,
} from '@/components/primitives';
import type { WidgetDefinition, WidgetDetailsProps, WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';

const entityOf = (id: string, settings: Record<string, unknown>) =>
  typeof settings.entityId === 'string' ? settings.entityId : id;

function nameOf(entityId: string, entities: ReturnType<typeof useWidgetRuntime>['entities']) {
  const name = entities[entityId]?.attributes?.friendly_name;
  return typeof name === 'string' ? name : entityId;
}

function PreviewToggle({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const entityId = entityOf(id, settings);
  const entity = runtime.entities[entityId];
  const [pending, setPending] = useState<boolean | null>(null);
  const confirmed = entity?.state === 'on';
  const shown = pending ?? confirmed;
  const name = nameOf(entityId, runtime.entities);
  if (pending !== null && pending === confirmed) setPending(null);

  const toggle = (
    <Toggle
      compact={size.w < 2}
      checked={shown}
      pending={pending !== null}
      disabled={editMode || !entity}
      aria-label={`${name}: ${shown ? 'acceso' : 'spento'}`}
      onClick={() => {
        setPending(!shown);
        void runtime.callService('light', shown ? 'turn_off' : 'turn_on', {
          entity_id: entityId,
        });
      }}
    />
  );

  if (size.w < 2) {
    return (
      <div className="aca-preview-widget aca-preview-widget--center">
        <Icon name="light" size="lg" />
        {toggle}
      </div>
    );
  }
  return (
    <div className="aca-preview-widget">
      <button
        type="button"
        className="aca-preview-widget__title"
        onClick={() => runtime.openDetails(id)}
        disabled={editMode}
      >
        <Icon name="light" size="md" />
        <Heading level={3} size="sm" tone="ink">
          {name}
        </Heading>
      </button>
      {size.h > 1 && (
        <Body size="sm" tone="muted">
          {!entity ? 'Entità non trovata' : shown ? 'Acceso' : 'Spento'}
        </Body>
      )}
      <div className="aca-preview-widget__foot">{toggle}</div>
    </div>
  );
}

function PreviewValue({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const entityId = entityOf(id, settings);
  const entity = runtime.entities[entityId];
  const unit = entity?.attributes?.unit_of_measurement;
  const name = nameOf(entityId, runtime.entities);
  if (!runtime.entitiesLoaded) return <Caption>Caricamento…</Caption>;
  return (
    <button
      type="button"
      className="aca-preview-widget aca-preview-widget--button"
      onClick={() => runtime.openDetails(id)}
      disabled={editMode}
    >
      {size.h > 1 && (
        <Caption tone="muted" className="aca-preview-widget__caption">
          {name}
        </Caption>
      )}
      <Display as="span" size={size.w * size.h >= 4 ? 'lg' : 'sm'} tone="ink">
        <Numeric>{entity ? entity.state : '—'}</Numeric>
      </Display>
      {typeof unit === 'string' && <Caption>{unit}</Caption>}
    </button>
  );
}

function PreviewNote({ size }: WidgetProps) {
  return (
    <div className="aca-preview-widget">
      <Heading level={3} size="md" tone="ink">
        Benvenuto
      </Heading>
      {size.h > 1 && (
        <Body size="sm" tone="muted">
          Tieni premuto per modificare la disposizione. Trascina i widget e cambia le dimensioni con
          i pallini.
        </Body>
      )}
      <Caption tone="info">{`${size.w} per ${size.h} celle`}</Caption>
    </div>
  );
}

function PreviewDetails({ id, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const entityId = entityOf(id, settings);
  const entity = runtime.entities[entityId];
  return (
    <div className="aca-preview-details">
      <Body tone="ink">{`Entità: ${entityId}`}</Body>
      <Body tone="muted">{`Stato: ${entity?.state ?? 'non disponibile'}`}</Body>
      <Caption>Contenuto di prova: i dettagli veri arrivano dai widget dei gruppi.</Caption>
    </div>
  );
}

function definition(
  type: string,
  label: string,
  icon: IconName,
  Widget: WidgetDefinition['Widget'],
  sizes: WidgetDefinition['sizes'],
  withDetails = true
): WidgetDefinition {
  return {
    type,
    label,
    icon,
    sizes,
    matches: (id) => id.startsWith(`${type}_`),
    Widget,
    ...(withDetails ? { Details: PreviewDetails } : {}),
  };
}

export const previewDefinitions: readonly WidgetDefinition[] = [
  definition('preview_toggle', 'Luce di prova', 'light', PreviewToggle, {
    min: { w: 1, h: 1 },
    max: { w: 4, h: 2 },
    default: { w: 2, h: 1 },
  }),
  definition('preview_value', 'Valore di prova', 'activity', PreviewValue, {
    min: { w: 1, h: 1 },
    max: { w: 4, h: 4 },
    default: { w: 2, h: 2 },
  }),
  definition(
    'preview_note',
    'Nota di prova',
    'info',
    PreviewNote,
    { min: { w: 2, h: 1 }, max: { w: 8, h: 4 }, default: { w: 4, h: 2 } },
    false
  ),
];
