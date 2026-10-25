import {
  Button,
  Caption,
  Display,
  MaterialLayers,
  Numeric,
  Slider,
  Text,
  materialClass,
} from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon, aliasIcon } from '../shared/ControlIcon';
import { densityOf, entityName, settingString } from '../shared/entity';
import { COMMAND_LABELS } from '../shared/labels';
import { WidgetContent, WidgetLoading, WidgetMissing } from '../shared/WidgetContent';
import { useCoverControl, type CoverControl } from './useCoverControl';

/** Open / stop / close: the legacy ButtonControl, always available as in the card. */
export function CoverButtons({
  cover,
  name,
  disabled,
}: {
  cover: CoverControl;
  name: string;
  disabled: boolean;
}) {
  const blocked = disabled || !cover.available;
  const busy = (target: string) =>
    cover.motion.pending && cover.motion.value === target ? true : undefined;
  return (
    <div className="ctl-cover-buttons" role="group" aria-label={`Comandi di ${name}`}>
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label={`Apri ${name}`}
        aria-busy={busy('open')}
        disabled={blocked}
        onClick={cover.open}
      >
        <ControlIcon name="arrowUp" size="md" />
      </Button>
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label={`Ferma ${name}`}
        aria-busy={busy('stop')}
        disabled={blocked}
        onClick={cover.stop}
      >
        <ControlIcon name="stop" size="md" />
      </Button>
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label={`Chiudi ${name}`}
        aria-busy={busy('closed')}
        disabled={blocked}
        onClick={cover.close}
      >
        <ControlIcon name="chevronDown" size="md" />
      </Button>
    </div>
  );
}

/** Cover widget (legacy CoverCard): position, state and open/stop/close. */
export function CoverWidget({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const entityId = settingString(settings, 'coverId') || undefined;
  const cover = useCoverControl(entityId, editMode);
  const density = densityOf(size);
  const name = entityName(runtime, id, cover.entity, entityId ?? id);

  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  if (!cover.entity) return <WidgetMissing size={size} name={name} editMode={editMode} />;

  const icon =
    aliasIcon(runtime.customIcons[id]) ?? aliasIcon(cover.entity.attributes.icon) ?? 'blinds';
  const valueClass = cover.positionCommand.pending ? 'ctl-value ctl-value--pending' : 'ctl-value';
  const large = density === 'large' || density === 'tall';
  const status = (
    <Caption
      className={
        cover.moving || cover.motion.pending ? 'ctl-status ctl-value--pending' : 'ctl-status'
      }
    >
      {cover.available ? (
        cover.stateLabel
      ) : (
        <span className="ctl-unavailable">
          <ControlIcon name="warning" size="sm" color="var(--aca-danger-ink-icon)" />
          <span>{cover.stateLabel}</span>
        </span>
      )}
    </Caption>
  );
  const figure = cover.hasPosition ? (
    <Display as="span" size={large ? 'md' : 'sm'} className="ctl-figure">
      <Numeric className={valueClass}>
        {cover.position}
        <span className="ctl-unit">%</span>
      </Numeric>
    </Display>
  ) : null;
  const feedback = (
    <CommandFeedback
      message={cover.message}
      pendingText={cover.pending && large ? COMMAND_LABELS.pending : null}
    />
  );
  // 2×1: position next to the commands; 2×2: commands under the slider.
  const commands = (
    <div className="ctl-row ctl-row--bottom">
      {!large && figure}
      <CoverButtons cover={cover} name={name} disabled={editMode} />
    </div>
  );

  return (
    <WidgetContent
      size={size}
      name={name}
      editMode={editMode}
      onOpen={() => runtime.openDetails(id)}
      className="ctl-cover"
    >
      <div className="ctl-row ctl-row--top">
        <span
          className={materialClass(
            { behavior: 'static', shape: 'circle', size: 'md' },
            'ctl-badge-icon',
            cover.failed && 'aca-m--error'
          )}
          aria-hidden="true"
        >
          <MaterialLayers>
            <ControlIcon
              name={cover.available ? icon : 'warning'}
              size="md"
              color={cover.available ? undefined : 'var(--aca-danger-ink-icon)'}
            />
          </MaterialLayers>
        </span>
        <div className="ctl-heading ctl-grow">
          <Text className="ctl-name ctl-clamp-2">{name}</Text>
          {status}
        </div>
      </div>
      {large ? (
        // 2×2 (L-19): position, slider and commands together at the bottom, under the name.
        <div className="ctl-pole">
          {figure}
          {cover.supportsPosition && (
            <Slider
              className="ctl-slider"
              size="sm"
              value={cover.position}
              min={0}
              max={100}
              label={`Apertura di ${name}`}
              valueText={`${cover.position}% aperta`}
              pending={cover.positionCommand.pending}
              error={cover.positionCommand.failed}
              disabled={editMode || !cover.available}
              onValueChange={cover.setPosition}
              data-no-long-press
            />
          )}
          {feedback}
          {commands}
        </div>
      ) : (
        <>
          {feedback}
          {commands}
        </>
      )}
    </WidgetContent>
  );
}
