import type { ReactNode } from 'react';
import {
  CellLabel,
  CellOrb,
  CellTile,
  FillSlider,
  Skeleton,
  cellFormat,
  type CellFormat,
} from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { isProductDeviceBinding } from '@/utils/devices/productBinding';
import { pagerMoving } from '@/utils/launcher/pagerMoving';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon, aliasIcon, type ControlIconName } from '../shared/ControlIcon';
import { entityName } from '../shared/entity';
import { COMMAND_LABELS, COMMON_LABELS } from '../shared/labels';
import { groupMembers } from './lightModel';
import { useLightControl, type LightControl } from './useLightControl';

/** Status line of the details: unavailable, members on in a group, or on/off. */
export function lightStatusText(
  control: LightControl,
  entities: Record<string, { state?: string } | undefined>
): string {
  if (!control.available) return COMMON_LABELS.unavailable;
  const members = groupMembers(control.entity);
  if (members.length > 0) {
    const on = members.filter((member) => entities[member]?.state === 'on').length;
    return on > 0 ? `${on} di ${members.length} accese` : COMMON_LABELS.off;
  }
  return control.on ? COMMON_LABELS.on : COMMON_LABELS.off;
}

/** On the tile the state agrees with «luce»: «Accesa», «Spenta». */
const TILE_ON = 'Accesa';
const TILE_OFF = 'Spenta';

function tileStatusText(
  control: LightControl,
  entities: Record<string, { state?: string } | undefined>
): string {
  if (!control.available) return COMMON_LABELS.unavailable;
  const members = groupMembers(control.entity);
  if (members.length > 0) {
    const on = members.filter((member) => entities[member]?.state === 'on').length;
    return on > 0 ? `${on} di ${members.length} accese` : TILE_OFF;
  }
  return control.on ? TILE_ON : TILE_OFF;
}

/**
 * Without a connection to the house the commands are off and readers hear it; the state line
 * keeps the last known state, so the not yet linked preview of the catalog (no connection by
 * design) still reads «Spenta».
 */
const OFFLINE = 'Collegamento assente';

/** The state under the name: «Richiesto…» while pending, the brightness when it has one. */
function stateLine(control: LightControl, status: string, short = false): ReactNode {
  if (!control.available)
    return (
      <>
        <ControlIcon name="warning" size="sm" className="aca-cell-warning" />
        {status}
      </>
    );
  if (control.message)
    return (
      <>
        <ControlIcon name="warning" size="sm" className="aca-cell-warning" />
        {control.message}
      </>
    );
  if (control.pending) return COMMAND_LABELS.pending;
  if (control.on && control.dimmable && groupMembers(control.entity).length === 0)
    return short ? `${control.percent}%` : `${TILE_ON} · ${control.percent}%`;
  return status;
}

/** Up to four round controls in a 2×2: the lights of a group or the channels of a device. */
const MODULE_MAX = 4;

function moduleIds(control: LightControl, settings: CardSettings): string[] {
  const binding = settings.productDevice;
  if (isProductDeviceBinding(binding) && binding.family === 'light') {
    const technical = new Set(binding.technicalEntityIds ?? []);
    const channels = binding.channelEntityIds.filter((id) => !technical.has(id));
    if (channels.length > 1) return channels;
  }
  return groupMembers(control.entity);
}

function MemberOrb({ entityId, disabled }: { entityId: string; disabled: boolean }) {
  const runtime = useWidgetRuntime();
  const control = useLightControl(entityId, disabled || !runtime.conn);
  const name = entityName(runtime, entityId, control.entity);
  const icon = aliasIcon(control.entity?.attributes.icon) ?? 'light';
  return (
    <CellOrb
      size="lg"
      tone="warm"
      on={control.on}
      pending={control.pending}
      disabled={disabled || !runtime.conn || !control.available}
      label={`${name}: ${control.on ? 'spegni' : 'accendi'}`}
      title={name}
      icon={<ControlIcon name={icon} size="md" />}
      onClick={control.toggle}
    />
  );
}

/** Loading: the shape of the format while Home Assistant sends the entities. */
function TileLoading({ format }: { format: CellFormat }) {
  return (
    <CellTile format={format}>
      <Skeleton variant="compact" rows={1} label={COMMON_LABELS.loading} />
    </CellTile>
  );
}

export interface LightTileProps extends WidgetProps {
  /** Entity to control; the widget id by default (legacy `light.*` cards). */
  entityId?: string;
  /** Opens the details; `runtime.openDetails(id)` by default. */
  openDetails?: () => void;
}

/**
 * The light on the Home grid, one layout per format (REP-20261127-001):
 * - 1×1: the whole circle switches the light and fills when it is on;
 * - 2×1: the circle switches, name and state open the details;
 * - 1×2: a fill that rises with the brightness (tap switches, drag sets); not dimmable, the
 *   circle above and the text below;
 * - 2×2: the circle at the top left, name and state at the bottom; a group or a device with
 *   several channels shows a module of up to four circles instead.
 * Commands go through useLightControl: requested state until Home Assistant confirms it.
 */
export function LightTile({ id, entityId = id, size, settings, editMode, openDetails }: LightTileProps) {
  const runtime = useWidgetRuntime();
  // No connection to the house: no command is sent (the state stays readable).
  const offline = !runtime.conn;
  const control = useLightControl(entityId, editMode || offline);
  const format = cellFormat(size);
  const name = entityName(runtime, entityId, control.entity);
  const openTarget = openDetails ?? (() => runtime.openDetails(id));
  // A tap that only stops the fling of the pager opens nothing (ADR-0016, G3).
  const open = (event: { currentTarget: Element }) => {
    if (pagerMoving(event.currentTarget)) return;
    openTarget();
  };

  if (!runtime.entitiesLoaded) return <TileLoading format={format} />;
  if (!control.entity) {
    return (
      <CellTile format={format} className="aca-cell-tile--missing">
        {format === 'round' ? (
          <span className="aca-cell-round" role="img" aria-label={`${name}: ${COMMON_LABELS.missing}`}>
            <ControlIcon name="warning" size="md" className="aca-cell-warning" />
          </span>
        ) : (
          <CellLabel name={name} state={COMMON_LABELS.missing} nameLines={2} />
        )}
      </CellTile>
    );
  }

  const icon: ControlIconName =
    aliasIcon(runtime.customIcons[id]) ?? aliasIcon(control.entity.attributes.icon) ?? 'light';
  const blocked = editMode || offline || !control.available;
  const status = tileStatusText(control, runtime.entities);
  const state = stateLine(control, status);
  const command = `${name}: ${control.on ? 'spegni' : 'accendi'}`;
  const feedback = (
    <>
      <CommandFeedback message={control.message} className="aca-cell-feedback" />
      {offline && <span className="sr-only">{OFFLINE}</span>}
    </>
  );
  const opener = (
    <button
      type="button"
      className="aca-cell-open"
      data-widget-open=""
      aria-label={`${COMMON_LABELS.details}: ${name}`}
      disabled={editMode}
      onClick={open}
    />
  );
  const orb = (
    <CellOrb
      tone="warm"
      on={control.on}
      pending={control.pending}
      disabled={blocked}
      label={command}
      icon={<ControlIcon name={icon} size="md" />}
      onClick={control.toggle}
    />
  );
  const error = control.failed || undefined;

  if (format === 'round') {
    return (
      <CellTile format="round" tone="warm" on={control.on} className={control.pending ? 'is-pending' : undefined} data-widget-error={error} role="group" aria-label={name}>
        <button
          type="button"
          className="aca-cell-round"
          aria-pressed={control.on}
          aria-label={`${command} (${status})`}
          aria-busy={control.pending || undefined}
          disabled={blocked}
          data-no-long-press=""
          onClick={control.toggle}
        >
          <ControlIcon name={control.available ? icon : 'warning'} size="md" />
        </button>
        {feedback}
      </CellTile>
    );
  }

  if (format === 'pill') {
    return (
      <CellTile format="pill" tone="warm" on={control.on} data-widget-error={error} role="group" aria-label={name}>
        {opener}
        {orb}
        <CellLabel name={name} state={stateLine(control, status, true)} nameLines={2} />
        {feedback}
      </CellTile>
    );
  }

  if (format === 'tall' && control.dimmable && control.available) {
    return (
      <CellTile format="tall" tone="warm" on={control.on} data-widget-error={error} role="group" aria-label={name}>
        <FillSlider
          tone="warm"
          value={control.percent}
          label={`Luminosità di ${name}`}
          valueText={control.on ? `${control.percent}%` : TILE_OFF}
          pending={control.pending}
          disabled={blocked}
          onValueChange={(value, phase) => control.setPercent(value, phase)}
          onTap={control.toggle}
        >
          <ControlIcon name={icon} size="md" />
        </FillSlider>
        <div className="aca-cell-tall-head">
          <button
            type="button"
            className="aca-cell-open"
            data-widget-open=""
            aria-label={`${COMMON_LABELS.details}: ${name}`}
            disabled={editMode}
            onClick={open}
          >
            <CellLabel
              name={name}
              nameLines={2}
              state={control.pending ? COMMAND_LABELS.pending : control.on ? `${control.percent}%` : TILE_OFF}
            />
          </button>
        </div>
        {feedback}
      </CellTile>
    );
  }

  const members = format === 'square' ? moduleIds(control, settings) : [];
  if (members.length > 1) {
    return (
      <CellTile format="square" module tone="warm" on={control.on} data-widget-error={error} aria-label={name} aria-description={status} role="group">
        {opener}
        {members.slice(0, MODULE_MAX).map((member) => (
          <MemberOrb key={member} entityId={member} disabled={editMode} />
        ))}
        {feedback}
      </CellTile>
    );
  }

  // 2×2 (and 1×2 of a light without brightness): circle above, name and state below.
  return (
    <CellTile format={format} tone="warm" on={control.on} data-widget-error={error} role="group" aria-label={name}>
      {opener}
      {orb}
      <CellLabel name={name} state={state} nameLines={2} />
      {feedback}
    </CellTile>
  );
}
