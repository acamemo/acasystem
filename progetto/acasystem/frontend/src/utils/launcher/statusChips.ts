/**
 * Chips of the status bar: the pinned people of the legacy header (`pagesConfig.header`) and
 * the configured status pills (`statusPillsConfig`), reduced to a compact description.
 * Visibility, conditions, labels and counts follow the legacy StatusBar/StatusPill; colours and
 * animations of the old pills are not carried over (the kit has two accents).
 */
import type { CardSettingsMap, StatusPillConfig, Translate } from '@/@types/dashboard';
import type { EntityLike, EntityMap, HaConfig } from '@/@types/ha';
import { evaluateEntityCondition } from '@/utils/conditionUtils';
import { ENTITY_UPDATE_THRESHOLD, MEDIA_TIMEOUT } from '@/utils/config/constants';
import { isSonosMediaEntity } from '@/utils/mediaEntityClassification';
import {
  applyPlayerNameDisplayFilter,
  hasCandidateMediaMetadata,
  pickBestDisplayEntity,
} from '@/utils/statusLogic';
import { STATUS_GROUP_PILL_TYPE, resolveStatusGroupPill } from '@/utils/statusGroupPills';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  inferUnitKind,
  normalizeDecimalPlaces,
} from '@/utils/units';
import { toDate } from '@/validators/guards';

/** Names of the kit icons a chip may use (a subset of the Icon primitive). */
export type StatusChipIcon =
  'profile' | 'music' | 'speaker' | 'bell' | 'warning' | 'activity' | 'battery' | 'light' | 'home';

/** active = on, at home, playing (orange); danger = alarm triggered; neutral otherwise. */
export type StatusChipTone = 'active' | 'danger' | 'neutral';

export interface StatusChip {
  id: string;
  kind: 'person' | 'alarm' | 'media' | 'group' | 'entity';
  label: string;
  detail?: string;
  icon: StatusChipIcon;
  tone: StatusChipTone;
  /** Badge count (playing players, matched entities) when the pill asks for it. */
  count?: number;
  /** Card or entity whose details the chip opens, when the pill is clickable. */
  targetId?: string;
}

export interface StatusChipInput {
  header: readonly string[];
  pills: readonly StatusPillConfig[];
  entities: EntityMap;
  cardSettings: CardSettingsMap;
  customNames: Record<string, string>;
  t: Translate;
  haConfig?: HaConfig | null;
  /** Current time in ms, for «recently active» media. */
  now: number;
}

const ALARM_STATES: Record<string, string> = {
  disarmed: 'Disinserito',
  armed_home: 'Inserito in casa',
  armed_away: 'Inserito fuori casa',
  armed_night: 'Inserito di notte',
  armed_vacation: 'Inserito in vacanza',
  armed_custom_bypass: 'Inserito con esclusioni',
  arming: 'Inserimento in corso',
  pending: 'In attesa',
  disarming: 'Disinserimento in corso',
  triggered: 'Allarme scattato',
};

const GROUP_ICONS: Record<string, StatusChipIcon> = {
  lights_on: 'light',
  openings_open: 'home',
  covers_open: 'home',
  low_battery: 'battery',
};

const sentence = (text: string) =>
  text ? text.charAt(0).toLocaleUpperCase('it-IT') + text.slice(1) : text;

const textOf = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const attr = (entity: EntityLike | null | undefined, key: string): unknown =>
  entity?.attributes?.[key];

const friendlyName = (entity: EntityLike | null | undefined, fallback: string) =>
  textOf(attr(entity, 'friendly_name')) || fallback;

/** Italian text of a person's state: at home, away, zone name, unavailable. */
export function personStateText(state: string | undefined): string {
  if (!state || state === 'unknown' || state === 'unavailable') return 'Non disponibile';
  if (state === 'home') return 'A casa';
  if (state === 'not_home') return 'Fuori casa';
  return sentence(state.replace(/_/g, ' '));
}

function customLabel(pill: StatusPillConfig) {
  return textOf(pill.label) || textOf(pill.name);
}

function wildcard(pattern: string) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

/** Media filter of the pills: prefixes, «contains», wildcards or regular expressions. */
export function matchesMediaFilter(id: string, filter: unknown, mode: unknown): boolean {
  if (typeof filter !== 'string' || !filter) return true;
  const patterns = filter
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  return patterns.some((pattern) => {
    if (mode === 'regex') {
      try {
        return new RegExp(pattern, 'i').test(id);
      } catch {
        return false;
      }
    }
    if (pattern.includes('*')) return wildcard(pattern).test(id);
    if (mode === 'contains') return id.toLowerCase().includes(pattern.toLowerCase());
    return id.toLowerCase().startsWith(pattern.toLowerCase());
  });
}

function mediaIdsFor(pill: StatusPillConfig, entities: EntityMap): string[] {
  const players = Object.keys(entities).filter((id) => id.startsWith('media_player.'));
  const filtered = players.filter((id) =>
    matchesMediaFilter(id, pill.mediaFilter, pill.mediaFilterMode)
  );
  if (pill.type === 'media_player') return pill.entityId ? [pill.entityId] : filtered;
  if (pill.type === 'emby') {
    return Array.isArray(pill.mediaEntityIds) && pill.mediaEntityIds.length > 0
      ? pill.mediaEntityIds
      : filtered;
  }
  // sonos
  const selected = Array.isArray(pill.mediaEntityIds) ? pill.mediaEntityIds : [];
  const source = pill.mediaSelectionMode === 'select' && selected.length > 0 ? selected : filtered;
  const sonos = players
    .map((id) => entities[id])
    .filter(isSonosMediaEntity)
    .map((entity) => entity.entity_id)
    .filter((id) => source.includes(id));
  return sonos.length > 0 ? sonos : source;
}

function personChip(id: string, input: StatusChipInput): StatusChip | null {
  const entity = input.entities[id];
  if (!entity) return null;
  const settings = input.cardSettings[`header::${id}`] ?? {};
  const name = textOf(input.customNames[id]) || friendlyName(entity, id);
  const state = personStateText(entity.state);
  const showName = settings.showName !== false;
  const showState = settings.showState !== false;
  return {
    id,
    kind: 'person',
    label: showName || !showState ? name : state,
    ...(showName && showState ? { detail: state } : {}),
    icon: 'profile',
    tone: entity.state === 'home' ? 'active' : 'neutral',
    targetId: id,
  };
}

function alarmChip(pill: StatusPillConfig, input: StatusChipInput): StatusChip | null {
  const entityId =
    typeof pill.entityId === 'string' && pill.entityId.startsWith('alarm_control_panel.')
      ? pill.entityId
      : '';
  const entity = entityId ? input.entities[entityId] : undefined;
  if (!entity) return null;
  const getAttribute = (target: string | undefined, key: string) =>
    input.entities[String(target)]?.attributes?.[key];
  if (
    pill.conditionEnabled !== false &&
    !evaluateEntityCondition({ condition: pill.condition, entity, getAttribute })
  ) {
    return null;
  }
  const state = entity.state || 'unknown';
  const status = ALARM_STATES[state] ?? sentence(state.replace(/_/g, ' '));
  const detail = textOf(pill.sublabel) || customLabel(pill) || friendlyName(entity, entityId);
  return {
    id: pill.id,
    kind: 'alarm',
    label: pill.showLabel === false ? detail : status,
    ...(pill.showLabel !== false && pill.showSublabel !== false && detail ? { detail } : {}),
    icon: state === 'triggered' ? 'warning' : 'bell',
    tone: state === 'triggered' ? 'danger' : state.startsWith('armed') ? 'active' : 'neutral',
    ...(pill.clickable !== false ? { targetId: entityId } : {}),
  };
}

function mediaChip(pill: StatusPillConfig, input: StatusChipInput): StatusChip | null {
  const { entities, now } = input;
  const players = mediaIdsFor(pill, entities)
    .map((id) => entities[id])
    .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));
  const isSonos = pill.type === 'sonos';
  const isActive = (entity: EntityLike) => {
    if (entity.state === 'playing') return true;
    const updated = toDate(entity.last_updated).getTime();
    if (isSonos) return entity.state === 'paused' && Date.now() - updated < MEDIA_TIMEOUT;
    return now - updated < ENTITY_UPDATE_THRESHOLD;
  };
  const active = players.filter(isActive);
  const conditionEnabled = pill.conditionEnabled !== false;
  const condition = pill.condition as { type?: unknown } | undefined;
  if (conditionEnabled && condition && condition.type) {
    const getAttribute = (target: string | undefined, key: string) =>
      entities[String(target)]?.attributes?.[key];
    const meets = active.some((entity) =>
      evaluateEntityCondition({ condition: pill.condition, entity, getAttribute })
    );
    if (!meets) return null;
  } else if (conditionEnabled && active.length === 0) {
    return null;
  }

  const shown = conditionEnabled ? active : players;
  const best = pickBestDisplayEntity(shown) ?? pickBestDisplayEntity(players);
  const title =
    textOf(attr(best, 'media_title')) ||
    textOf(attr(best, 'media_channel')) ||
    textOf(attr(best, 'media_album_name'));
  const artist = textOf(attr(best, 'media_artist')) || textOf(attr(best, 'media_album_name'));
  const player = applyPlayerNameDisplayFilter(
    best ? friendlyName(best, best.entity_id) : '',
    pill.playerNameDisplayFilter
  );
  const playing = shown.filter((entity) => entity.state === 'playing').length;

  let label: string;
  let detail: string;
  if (pill.type === 'emby') {
    label = `${shown.length} in riproduzione`;
    detail = title || artist;
  } else if (isSonos) {
    label = title || 'Multimedia';
    detail = hasCandidateMediaMetadata(best) ? [artist, player].filter(Boolean).join(' · ') : '';
  } else {
    label = title || 'Multimedia';
    detail = artist;
  }
  label = customLabel(pill) || label;
  if (textOf(pill.sublabel)) detail = textOf(pill.sublabel);

  let count: number | undefined;
  if (pill.showCount) {
    if (pill.type === 'emby') count = playing >= 2 ? playing : undefined;
    else count = playing > 0 ? playing : undefined;
  }
  const target = shown.find((entity) => entity.state === 'playing') ?? shown[0] ?? best;
  return {
    id: pill.id,
    kind: 'media',
    label: pill.showLabel === false && detail ? detail : label,
    ...(pill.showLabel !== false && pill.showSublabel !== false && detail ? { detail } : {}),
    icon: isSonos ? 'speaker' : 'music',
    tone: best?.state === 'playing' ? 'active' : 'neutral',
    ...(count ? { count } : {}),
    ...(pill.clickable && target ? { targetId: target.entity_id } : {}),
  };
}

function groupChip(pill: StatusPillConfig, input: StatusChipInput): StatusChip | null {
  const group = resolveStatusGroupPill(pill, input.entities, input.t);
  if (!group.shouldRender) return null;
  const name = textOf(attr(group.syntheticEntity, 'friendly_name'));
  const sub = textOf(pill.sublabel) || textOf(attr(group.syntheticEntity, 'statusPillSublabel'));
  return {
    id: pill.id,
    kind: 'group',
    label: pill.showLabel === false && sub ? sub : name,
    ...(pill.showLabel !== false && pill.showSublabel !== false && sub ? { detail: sub } : {}),
    icon: GROUP_ICONS[group.preset.id] ?? 'activity',
    tone: group.count > 0 ? 'active' : 'neutral',
    ...(pill.showCount && group.count > 0 ? { count: group.count } : {}),
  };
}

function entityChip(pill: StatusPillConfig, input: StatusChipInput): StatusChip | null {
  const entityId = textOf(pill.entityId);
  const entity = entityId ? input.entities[entityId] : undefined;
  if (!entity) return null;
  const getAttribute = (target: string | undefined, key: string) =>
    input.entities[String(target)]?.attributes?.[key];
  if (
    pill.conditionEnabled !== false &&
    !evaluateEntityCondition({ condition: pill.condition, entity, getAttribute })
  ) {
    return null;
  }
  const label = customLabel(pill) || friendlyName(entity, entityId);
  const detail = textOf(pill.sublabel) || stateWithUnit(pill, entity, input.haConfig);
  return {
    id: pill.id,
    kind: 'entity',
    label: pill.showLabel === false && detail ? detail : label,
    ...(pill.showLabel !== false && pill.showSublabel !== false && detail ? { detail } : {}),
    icon: 'activity',
    tone: 'active',
  };
}

/** State with its unit, converted to the unit system of Home Assistant (legacy sublabel). */
export function stateWithUnit(
  pill: StatusPillConfig,
  entity: EntityLike,
  haConfig?: HaConfig | null
): string {
  const state = entity.state === undefined || entity.state === null ? '' : String(entity.state);
  if (!state) return '';
  const unitSource = pill.unitSource === 'custom' ? 'custom' : 'ha';
  const haUnit = textOf(attr(entity, 'unit_of_measurement'));
  const customUnit = textOf(pill.customUnit);
  const unit = unitSource === 'custom' ? customUnit : haUnit;
  const kind = inferUnitKind(attr(entity, 'device_class'), haUnit);
  const numeric = Number.parseFloat(state.replace(',', '.'));
  const decimals = normalizeDecimalPlaces(pill.decimals);
  const unitMode = getEffectiveUnitMode('follow_ha', haConfig);

  if (unitSource === 'ha' && kind && Number.isFinite(numeric)) {
    const converted = convertValueByKind(numeric, { kind, fromUnit: haUnit, unitMode });
    const displayUnit = getDisplayUnitForKind(kind, unitMode);
    if (converted !== null && Number.isFinite(converted) && displayUnit) {
      const value = formatUnitValue(converted, {
        fallback: state,
        ...(decimals === null ? {} : { decimals }),
      });
      return `${value} ${displayUnit}`;
    }
  }
  const value =
    decimals !== null && Number.isFinite(numeric)
      ? formatUnitValue(numeric, { fallback: state, decimals })
      : state;
  if (!unit) return value;
  const lower = state.toLowerCase();
  const lowerUnit = unit.toLowerCase();
  return lower.endsWith(` ${lowerUnit}`) || lower === lowerUnit ? state : `${value} ${unit}`;
}

/** Chips in display order: pinned people first, then the visible pills. */
export function buildStatusChips(input: StatusChipInput): StatusChip[] {
  const chips: StatusChip[] = [];
  for (const id of input.header) {
    if (typeof id !== 'string' || !id) continue;
    const chip = personChip(id, input);
    if (chip) chips.push(chip);
  }
  for (const pill of input.pills) {
    if (!pill || pill.visible === false) continue;
    let chip: StatusChip | null;
    if (pill.type === 'alarm') chip = alarmChip(pill, input);
    else if (pill.type === 'media_player' || pill.type === 'emby' || pill.type === 'sonos')
      chip = mediaChip(pill, input);
    else if (pill.type === STATUS_GROUP_PILL_TYPE) chip = groupChip(pill, input);
    else chip = entityChip(pill, input);
    if (chip) chips.push(chip);
  }
  return chips;
}
