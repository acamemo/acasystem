import { useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { HaConfig } from '@/@types/ha';
import { Body, Button, Caption, Slider } from '@/components/primitives';
import { formatCompact, humanizeState } from '../shared/format';
import {
  domainOf,
  friendlyName,
  isUnavailableState,
  stringAttr,
} from '../shared/entity';
import { CommandButton } from '../shared/controls';
import { Notice, commandNotice } from '../shared/UtilityCard';
import { UtilityIcon, type UtilityIconName } from '../shared/UtilityIcon';
import { stateIn, useCommand } from '../shared/useCommand';
import { useRequestedValue } from '../shared/useRequestedValue';
import { brightnessPercent, isDimmable, roomNumber, roomNumberAttr as numberAttr } from './roomData';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { roomServiceAllowed } from './roomCapabilities';
import { RoomToggle } from './RoomToggle';
import { hvacActionLabel, hvacModeLabel } from '../../home/climate/climateModel';
import { stateLabel } from '../../controls/shared/labels';

const TOGGLE_DOMAINS = new Set(['light', 'switch', 'fan', 'input_boolean', 'automation']);

const DOMAIN_ICON: Record<string, UtilityIconName> = {
  light: 'light',
  climate: 'thermostat',
  media_player: 'speaker',
  cover: 'blinds',
  lock: 'lock',
  fan: 'fan',
  switch: 'switch',
  input_boolean: 'switch',
  automation: 'energy',
  vacuum: 'vacuum',
  sensor: 'sensor',
  binary_sensor: 'sensor',
  scene: 'play',
  script: 'play',
};

export function domainIcon(domain: string): UtilityIconName {
  return DOMAIN_ICON[domain] ?? 'sensor';
}

const STATE_TEXT: Record<string, string> = {
  on: 'Acceso',
  off: 'Spento',
  open: 'Aperta',
  closed: 'Chiusa',
  opening: 'In apertura',
  closing: 'In chiusura',
  locked: 'Bloccata',
  unlocked: 'Sbloccata',
  playing: 'In riproduzione',
  paused: 'In pausa',
  idle: 'Inattivo',
  cleaning: 'Pulizia in corso',
  docked: 'Alla base',
  home: 'A casa',
  not_home: 'Fuori casa',
  unavailable: 'Non disponibile',
  unknown: 'Sconosciuto',
};

/**
 * Second line of a row: value with unit, climate temperatures (in the unit of Home Assistant),
 * media title or the state.
 */
export function entityStateText(
  entityId: string,
  entity: HassEntity,
  haConfig: HaConfig | null
): string {
  const domain = domainOf(entityId);
  const state = entity.state;
  const unit = stringAttr(entity, 'unit_of_measurement');
  if (isUnavailableState(state)) return STATE_TEXT[state] ?? 'Non disponibile';
  if ((domain === 'sensor' || domain === 'binary_sensor') && !isUnavailableState(state)) {
    const value = roomNumber(state);
    if (value !== null)
      return `${formatCompact(value, 1)}${unit ? ` ${unit}` : ''}`;
  }
  if (domain === 'climate') {
    const tempUnit = stringAttr(entity, 'temperature_unit') ?? stringAttr(entity, 'unit_of_measurement')
      ?? haConfig?.unit_system?.temperature ?? '';
    const current = numberAttr(entity, 'current_temperature');
    const target = numberAttr(entity, 'temperature');
    const action = stringAttr(entity, 'hvac_action');
    return [
      current !== null ? `${formatCompact(current, 1)}${tempUnit}` : null,
      target !== null ? `→ ${formatCompact(target, 1)}${tempUnit}` : null,
      action ? hvacActionLabel(action) : hvacModeLabel(state),
    ]
      .filter(Boolean)
      .join(' ');
  }
  if (domain === 'media_player') {
    const title = stringAttr(entity, 'media_title');
    const artist = stringAttr(entity, 'media_artist');
    if (title || artist) return [artist, title].filter(Boolean).join(' – ');
  }
  if (domain === 'light' && state === 'on' && isDimmable(entity) && brightnessPercent(entity) !== null)
    return `${brightnessPercent(entity)}%`;
  const text = domain === 'binary_sensor' ? stateLabel(state, stringAttr(entity, 'device_class') ?? undefined)
    : STATE_TEXT[state] ?? humanizeState(state);
  const battery = domain === 'vacuum' ? numberAttr(entity, 'battery_level') : null;
  return battery !== null ? `${text} · ${formatCompact(battery, 0)}%` : text;
}

function LightBrightness({
  entityId,
  entity,
  name,
}: {
  entityId: string;
  entity: HassEntity;
  name: string;
}) {
  const runtime = useWidgetRuntime();
  const brightness = useRequestedValue({
    confirmed: brightnessPercent(entity),
    tolerance: 1,
    delay: 200,
    toCall: (value) =>
      value <= 0
        ? { domain: 'light', service: 'turn_off', data: { entity_id: entityId } }
        : {
            domain: 'light',
            service: 'turn_on',
            data: { entity_id: entityId, brightness_pct: value },
          },
  });
  return (
    <span className="utility-list__wide utility-stack" data-no-long-press>
      <Slider
        label={`Luminosità di ${name}`}
        value={brightness.value ?? 0}
        min={0}
        max={100}
        valueText={`${Math.round(brightness.value ?? 0)}%`}
        pending={brightness.pending}
        error={brightness.error}
        disabled={!runtime.conn || runtime.conn.connected === false || runtime.editMode || !roomServiceAllowed(entity, runtime.services ?? null, 'light', 'turn_on')}
        onValueChange={brightness.request}
      />
      {brightness.error && (
        <Notice tone="danger" icon="warning" live>
          Luminosità non impostata. Riprova.
        </Notice>
      )}
    </span>
  );
}

function IconCommand({
  entityId,
  entity,
  domain,
  service,
  icon,
  label,
  confirm,
  commandKey,
}: {
  entityId: string;
  entity: HassEntity;
  domain: string;
  service: string;
  icon: UtilityIconName;
  label: string;
  confirm?: string[];
  commandKey: string;
}) {
  const runtime = useWidgetRuntime();
  const command = useCommand(entity);
  const notice = commandNotice(command.errorKey, command.unconfirmedKey);
  const supported = roomServiceAllowed(entity, runtime.services ?? null, domain, service);
  if (!supported) return null;
  return (
    <span className="utility-stack"><Button
      variant="control"
      shape="circle"
      size="md"
      aria-label={label}
      loading={command.pendingKey === commandKey}
      disabled={isUnavailableState(entity.state) || !runtime.conn || runtime.conn.connected === false || runtime.editMode || command.pendingKey !== null}
      onClick={() =>
        command.run({
          key: commandKey,
          domain,
          service,
          data: { entity_id: entityId },
          confirm: confirm ? stateIn(...confirm) : undefined,
        })
      }
    >
      <UtilityIcon name={icon} size="md" />
    </Button>{notice && <Notice tone={notice.tone} icon="warning" live>{notice.text}</Notice>}</span>
  );
}

/**
 * Row of an entity with its quick control by domain (legacy RoomModal «other entities» and
 * RoomExplorerPage EntityRow): same services and data as the legacy rows.
 */
export function EntityRow({
  entityId,
  entity,
  brightness = 'whenOn',
  playPause = false,
}: {
  entityId: string;
  entity: HassEntity;
  /** Brightness slider of dimmable lights: only while on (explorer) or always (room sheet). */
  brightness?: 'whenOn' | 'always';
  /** Media: one media_play_pause call (room sheet) instead of media_play / media_pause. */
  playPause?: boolean;
}) {
  const runtime = useWidgetRuntime();
  const [pictureFailed, setPictureFailed] = useState(false);
  const domain = domainOf(entityId);
  const baseName = friendlyName(entity, (entityId.split('.')[1] ?? entityId).replace(/_/g, ' '));
  const duplicateName = Object.values(runtime.entities).filter(other => other && domainOf(other.entity_id) === domainOf(entityId)
    && friendlyName(other, other.entity_id) === baseName).length > 1;
  const name = duplicateName ? `${baseName} (${entityId})` : baseName;
  const state = entity.state;
  const unavailable = isUnavailableState(state);
  const shared = { entityId, entity };
  const supports = (service: string) => roomServiceAllowed(entity, runtime.services ?? null, domain, service);
  const blocked = !runtime.conn || runtime.conn.connected === false || runtime.editMode;

  let controls = null;
  if (!unavailable) {
    if (TOGGLE_DOMAINS.has(domain)) {
      controls = <RoomToggle entity={entity} entityId={entityId} domain={domain} label={name} />;
    } else if (domain === 'cover') {
      controls = (
        <>
          <IconCommand
            {...shared}
            domain="cover"
            service="open_cover"
            icon="trendUp"
            label={`Apri ${name}`}
            commandKey="open"
            confirm={['open', 'opening']}
          />
          <IconCommand
            {...shared}
            domain="cover"
            service="stop_cover"
            icon="stop"
            label={`Ferma ${name}`}
            commandKey="stop"
          />
          <IconCommand
            {...shared}
            domain="cover"
            service="close_cover"
            icon="trendDown"
            label={`Chiudi ${name}`}
            commandKey="close"
            confirm={['closed', 'closing']}
          />
        </>
      );
    } else if (domain === 'lock') {
      const locked = state === 'locked';
      controls = (
        <CommandButton
          entity={entity}
          domain="lock"
          service={locked ? 'unlock' : 'lock'}
          data={{ entity_id: entityId }}
          icon={locked ? 'unlock' : 'lock'}
          label={`${locked ? 'Sblocca' : 'Blocca'} ${name}`}
          confirm={(current) => current?.state === (locked ? 'unlocked' : 'locked')}
          disabled={blocked || !supports(locked ? 'unlock' : 'lock')}
        >
          {locked ? 'Sblocca' : 'Blocca'}
        </CommandButton>
      );
    } else if (domain === 'media_player') {
      const playing = state === 'playing';
      controls = (
        <>
          <IconCommand
            {...shared}
            domain="media_player"
            service="media_previous_track"
            icon="previous"
            label={`Brano precedente su ${name}`}
            commandKey="previous"
          />
          <IconCommand
            {...shared}
            domain="media_player"
            service={playPause ? 'media_play_pause' : playing ? 'media_pause' : 'media_play'}
            icon={playing ? 'pause' : 'play'}
            label={`${playing ? 'Metti in pausa' : 'Riproduci'} ${name}`}
            commandKey="play"
            confirm={playing ? ['paused', 'idle'] : ['playing']}
          />
          <IconCommand
            {...shared}
            domain="media_player"
            service="media_next_track"
            icon="next"
            label={`Brano successivo su ${name}`}
            commandKey="next"
          />
        </>
      );
    } else if (domain === 'vacuum') {
      const cleaning = state === 'cleaning';
      controls = (
        <>
          <IconCommand
            {...shared}
            domain="vacuum"
            service={cleaning ? 'pause' : 'start'}
            icon={cleaning ? 'pause' : 'play'}
            label={`${cleaning ? 'Metti in pausa' : 'Avvia'} ${name}`}
            commandKey="start"
            confirm={cleaning ? ['paused', 'idle', 'stopped'] : ['cleaning']}
          />
          <IconCommand
            {...shared}
            domain="vacuum"
            service="return_to_base"
            icon="home"
            label={`${name} alla base`}
            commandKey="dock"
            confirm={['returning', 'docked', 'charging']}
          />
        </>
      );
    } else if (domain === 'scene' || domain === 'script') {
      controls = (
        <CommandButton
          entity={entity}
          domain={domain}
          service="turn_on"
          data={{ entity_id: entityId }}
          label={`Esegui ${name}`}
          disabled={blocked || !supports('turn_on')}
        >
          Esegui
        </CommandButton>
      );
    } else if (domain === 'button' || domain === 'input_button') {
      controls = (
        <CommandButton
          entity={entity}
          domain={domain}
          service="press"
          data={{ entity_id: entityId }}
          label={`Premi ${name}`}
          disabled={blocked || !supports('press')}
        >
          Premi
        </CommandButton>
      );
    }
  }

  const picture =
    domain === 'media_player' && !pictureFailed
      ? runtime.getEntityImageUrl(
          stringAttr(entity, 'entity_picture') ?? stringAttr(entity, 'media_image_url')
        )
      : null;

  return (
    <li className="utility-list__row" data-room-entity={entityId}>
      {picture && (
        <img
          className="utility-thumb"
          src={picture}
          alt=""
          onError={() => setPictureFailed(true)}
        />
      )}
      <span className="utility-list__main">
        <Body as="span" size="sm" tone="ink" className="utility-truncate" title={entityId}>
          {name}
        </Body>
        <Caption className="utility-truncate">
          {entityStateText(entityId, entity, runtime.haConfig)}
        </Caption>
      </span>
      {controls && <span className="utility-list__end">{controls}</span>}
      {domain === 'light' &&
        !unavailable &&
        isDimmable(entity) &&
        brightnessPercent(entity) !== null &&
        (brightness === 'always' || state === 'on') && (
          <LightBrightness entityId={entityId} entity={entity} name={name} />
        )}
    </li>
  );
}
