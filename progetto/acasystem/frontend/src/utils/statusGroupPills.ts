import type { EntityLike, HassEntity } from '@/@types/ha';
import { isFiniteNumber, isObject, readKey } from '@/validators/guards';

export const STATUS_GROUP_PILL_TYPE = 'group_status';
export const STATUS_GROUP_SELECTION_ALL = 'all';
export const STATUS_GROUP_SELECTION_INCLUDE = 'include';
export const STATUS_GROUP_SELECTION_EXCLUDE = 'exclude';
export const DEFAULT_LOW_BATTERY_THRESHOLD = 20;

export type StatusGroupSelectionMode = 'all' | 'include' | 'exclude';

/** Riga entità usata dai gruppi di stato; conserva il tipo di entità del chiamante. */
export interface StatusGroupEntityRow<T extends EntityLike = EntityLike> {
  id: string;
  entity: T;
}

type EntitySource<T> = Record<string, T | null | undefined> | null | undefined;

/** Pillola di gruppo: configurazione salvata, letta con guardie. */
export type StatusGroupPillInput = Record<string, unknown> | null | undefined;

export interface StatusGroupPreset {
  id: string;
  labelKey: string;
  fallbackLabel: string;
  emptyLabelKey: string;
  fallbackEmptyLabel: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  actionDomain?: string;
  actionService?: string;
  actionLabelKey?: string;
  fallbackActionLabel?: string;
  rowActionLabelKey?: string;
  fallbackRowActionLabel?: string;
  defaultThreshold?: number;
  minThreshold?: number;
  maxThreshold?: number;
  candidates?: (id: string, entity: EntityLike) => boolean;
  matches: (id: string, entity: EntityLike, pill?: StatusGroupPillInput) => boolean;
}

const VALID_GROUP_SELECTION_MODES = new Set<unknown>([
  STATUS_GROUP_SELECTION_ALL,
  STATUS_GROUP_SELECTION_INCLUDE,
  STATUS_GROUP_SELECTION_EXCLUDE,
]);

const isGroupSelectionMode = (mode: unknown): mode is StatusGroupSelectionMode =>
  VALID_GROUP_SELECTION_MODES.has(mode);

const OPENING_DEVICE_CLASSES = new Set(['door', 'garage_door', 'opening', 'window']);
const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown']);

const toEntityRows = <T extends EntityLike>(entities: EntitySource<T>): StatusGroupEntityRow<T>[] =>
  Object.entries(entities || {})
    .map(([id, entity]) => ({ id, entity }))
    .filter((row): row is StatusGroupEntityRow<T> => isObject(row.entity));

const friendlyNameOf = (row: StatusGroupEntityRow): string => {
  const name = row.entity?.attributes?.friendly_name;
  return typeof name === 'string' && name ? name : row.id;
};

const sortByFriendlyName = (left: StatusGroupEntityRow, right: StatusGroupEntityRow) => {
  const leftName = friendlyNameOf(left);
  const rightName = friendlyNameOf(right);
  return leftName.localeCompare(rightName);
};

const isUnavailable = (entity: EntityLike | null | undefined) =>
  UNAVAILABLE_STATES.has(String(entity?.state || '').toLowerCase());

const isOpeningSensor = (id: string, entity: EntityLike | null | undefined) => {
  if (!id.startsWith('binary_sensor.')) return false;
  const deviceClass = String(entity?.attributes?.device_class || '').toLowerCase();
  return OPENING_DEVICE_CLASSES.has(deviceClass);
};

const isBatteryEntity = (_id: string, entity: EntityLike | null | undefined) =>
  String(entity?.attributes?.device_class || '').toLowerCase() === 'battery';

const getBatteryLevel = (entity: EntityLike | null | undefined) => {
  const level = Number.parseFloat(String(entity?.state));
  return Number.isFinite(level) ? level : null;
};

const normalizeGroupSelectionMode = (mode: unknown): StatusGroupSelectionMode =>
  isGroupSelectionMode(mode) ? mode : STATUS_GROUP_SELECTION_ALL;

const getGroupEntityIdSet = (pill: StatusGroupPillInput) => {
  const ids = pill?.groupEntityIds;
  return new Set<unknown>(
    Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id.trim()) : []
  );
};

const isAllowedBySelection = (pill: StatusGroupPillInput, id: string) => {
  const mode = normalizeGroupSelectionMode(pill?.groupSelectionMode);
  if (mode === STATUS_GROUP_SELECTION_ALL) return true;

  const selectedIds = getGroupEntityIdSet(pill);
  if (mode === STATUS_GROUP_SELECTION_INCLUDE) return selectedIds.has(id);
  return !selectedIds.has(id);
};

export const STATUS_GROUP_PRESETS: StatusGroupPreset[] = [
  {
    id: 'lights_on',
    labelKey: 'statusPills.groupPresetLightsOn',
    fallbackLabel: 'Lights on',
    emptyLabelKey: 'statusPills.groupPresetLightsOnEmpty',
    fallbackEmptyLabel: 'No lights on',
    icon: 'Lightbulb',
    iconBgColor: 'rgba(245, 158, 11, 0.14)',
    iconColor: 'text-amber-300',
    actionDomain: 'light',
    actionService: 'turn_off',
    actionLabelKey: 'statusPills.groupActionTurnOffAll',
    fallbackActionLabel: 'Turn off all',
    rowActionLabelKey: 'statusPills.groupActionTurnOff',
    fallbackRowActionLabel: 'Turn off',
    candidates: (id) => id.startsWith('light.'),
    matches: (id, entity) => id.startsWith('light.') && entity?.state === 'on',
  },
  {
    id: 'openings_open',
    labelKey: 'statusPills.groupPresetOpeningsOpen',
    fallbackLabel: 'Open doors/windows',
    emptyLabelKey: 'statusPills.groupPresetOpeningsOpenEmpty',
    fallbackEmptyLabel: 'All doors/windows closed',
    icon: 'DoorOpen',
    iconBgColor: 'rgba(14, 165, 233, 0.14)',
    iconColor: 'text-sky-300',
    candidates: isOpeningSensor,
    matches: (id, entity) => {
      if (entity?.state !== 'on') return false;
      return isOpeningSensor(id, entity);
    },
  },
  {
    id: 'covers_open',
    labelKey: 'statusPills.groupPresetCoversOpen',
    fallbackLabel: 'Open covers',
    emptyLabelKey: 'statusPills.groupPresetCoversOpenEmpty',
    fallbackEmptyLabel: 'All covers closed',
    icon: 'Columns',
    iconBgColor: 'rgba(16, 185, 129, 0.14)',
    iconColor: 'text-emerald-300',
    actionDomain: 'cover',
    actionService: 'close_cover',
    actionLabelKey: 'statusPills.groupActionCloseAll',
    fallbackActionLabel: 'Close all',
    rowActionLabelKey: 'statusPills.groupActionClose',
    fallbackRowActionLabel: 'Close',
    candidates: (id) => id.startsWith('cover.'),
    matches: (id, entity) =>
      id.startsWith('cover.') && !isUnavailable(entity) && entity?.state !== 'closed',
  },
  {
    id: 'low_battery',
    labelKey: 'statusPills.groupPresetLowBattery',
    fallbackLabel: 'Low battery',
    emptyLabelKey: 'statusPills.groupPresetLowBatteryEmpty',
    fallbackEmptyLabel: 'No low batteries',
    icon: 'Battery',
    iconBgColor: 'rgba(239, 68, 68, 0.14)',
    iconColor: 'text-red-400',
    defaultThreshold: DEFAULT_LOW_BATTERY_THRESHOLD,
    minThreshold: 0,
    maxThreshold: 100,
    candidates: isBatteryEntity,
    matches: (id, entity, pill) => {
      if (!isBatteryEntity(id, entity) || isUnavailable(entity)) return false;
      if (id.startsWith('binary_sensor.')) return entity?.state === 'on';
      const level = getBatteryLevel(entity);
      const threshold = getStatusGroupThreshold(pill);
      return level !== null && threshold !== undefined && level <= threshold;
    },
  },
];

export const DEFAULT_STATUS_GROUP_PRESET = STATUS_GROUP_PRESETS[0].id;

export function getStatusGroupPreset(presetId: unknown): StatusGroupPreset {
  return STATUS_GROUP_PRESETS.find((preset) => preset.id === presetId) || STATUS_GROUP_PRESETS[0];
}

export function getStatusGroupThreshold(pill: StatusGroupPillInput): number | undefined {
  const preset = getStatusGroupPreset(pill?.groupPreset);
  const { defaultThreshold, minThreshold, maxThreshold } = preset;
  if (!isFiniteNumber(defaultThreshold)) return undefined;

  const parsed = Number.parseFloat(String(pill?.groupThreshold));
  const threshold = Number.isFinite(parsed) ? parsed : defaultThreshold;
  return Math.min(Number(maxThreshold), Math.max(Number(minThreshold), threshold));
}

export function getStatusGroupPresetText(
  presetId: unknown,
  t?: unknown,
  mode: 'label' | 'empty' = 'label'
): string {
  const preset = getStatusGroupPreset(presetId);
  const key = mode === 'empty' ? preset.emptyLabelKey : preset.labelKey;
  const fallback = mode === 'empty' ? preset.fallbackEmptyLabel : preset.fallbackLabel;
  const translated: unknown = typeof t === 'function' ? t(key) : key;
  return translated && translated !== key ? String(translated) : fallback;
}

export function buildStatusGroupPillVisuals(presetId: unknown) {
  const preset = getStatusGroupPreset(presetId);
  return {
    icon: preset.icon,
    iconBgColor: preset.iconBgColor,
    iconColor: preset.iconColor,
  };
}

export function getStatusGroupSelectionMode(pill: StatusGroupPillInput): StatusGroupSelectionMode {
  return normalizeGroupSelectionMode(pill?.groupSelectionMode);
}

export function resolveStatusGroupCandidates<T extends EntityLike = HassEntity>(
  presetId: unknown,
  entities: EntitySource<T>
): StatusGroupEntityRow<T>[] {
  const preset = getStatusGroupPreset(presetId);
  const candidates = toEntityRows(entities).filter(({ id, entity }) =>
    typeof preset.candidates === 'function'
      ? preset.candidates(id, entity)
      : preset.matches(id, entity)
  );
  candidates.sort(sortByFriendlyName);
  return candidates;
}

export function resolveStatusGroupPill<T extends EntityLike = HassEntity>(
  pill: StatusGroupPillInput,
  entities: EntitySource<T>,
  t?: unknown
) {
  const preset = getStatusGroupPreset(pill?.groupPreset);
  const matchedEntities = toEntityRows(entities).filter(
    ({ id, entity }) => preset.matches(id, entity, pill) && isAllowedBySelection(pill, id)
  );
  matchedEntities.sort(sortByFriendlyName);

  const count = matchedEntities.length;
  const rawLabel = readKey(pill, 'label');
  const rawName = readKey(pill, 'name');
  const rawSublabel = readKey(pill, 'sublabel');
  const customLabel = typeof rawLabel === 'string' ? rawLabel.trim() : '';
  const customName = typeof rawName === 'string' ? rawName.trim() : '';
  const customSublabel = typeof rawSublabel === 'string' ? rawSublabel.trim() : '';
  const label = customLabel || customName || getStatusGroupPresetText(preset.id, t);
  const emptyLabel = getStatusGroupPresetText(preset.id, t, 'empty');

  return {
    preset,
    count,
    matchedEntities,
    shouldRender: pill?.hideWhenEmpty === false || count > 0,
    syntheticEntity: {
      entity_id: `status_group.${preset.id}`,
      state: String(count),
      attributes: {
        friendly_name: label,
        statusPillSublabel: customSublabel || (count > 0 ? String(count) : emptyLabel),
        statusPillCount: count,
        statusPillPreset: preset.id,
      },
    },
  };
}
