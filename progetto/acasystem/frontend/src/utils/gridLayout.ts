/**
 * Grid layout algorithm – computes card positions & spans for the dashboard grid.
 * Pure functions with zero React / UI dependencies.
 */

import type { CardSettings, CardSettingsMap } from '@/@types/dashboard';
import { isFiniteNumber, readKey } from '@/validators/guards';
import { getSensorAutomaticActionType, isSensorActionType } from '@/utils/sensorCardConfig';

export type CardSettingsKeyFn = (cardId: string, pageId?: string) => string;

export interface LayoutMetrics {
  rowPx?: number;
  gapPx?: number;
}

export interface GridPosition {
  row: number;
  col: number;
  span: number;
  colSpan: number;
}

type SpanCategory = 'triSize' | 'dualSize';

// Size-to-span mappings per card type category
const SPAN_TABLE: Record<SpanCategory, Record<string, number> & { default: number }> = {
  // { small, medium, large } → row span
  triSize: { small: 1, medium: 2, default: 4 }, // calendar, todo
  dualSize: { small: 1, default: 2 }, // light, car, room
};

const CARD_SPAN_RULES: { prefix: string; category: SpanCategory }[] = [
  // prefix match → category  (checked in order)
  { prefix: 'entity_card_', category: 'dualSize' },
  { prefix: 'calendar_card_', category: 'triSize' },
  { prefix: 'todo_card_', category: 'triSize' },
  { prefix: 'light_', category: 'dualSize' },
  { prefix: 'light.', category: 'dualSize' },
  { prefix: 'lock_card_', category: 'dualSize' },
  { prefix: 'lock.', category: 'dualSize' },
  { prefix: 'car_card_', category: 'dualSize' },
  { prefix: 'room_card_', category: 'dualSize' },
  { prefix: 'camera_card_', category: 'dualSize' },
  { prefix: 'spacer_card_', category: 'dualSize' },
];

const resolveSettings = (
  cardId: string,
  getCardSettingsKey: CardSettingsKeyFn,
  cardSettings: CardSettingsMap
): CardSettings => cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};

/**
 * Determine how many grid rows a card should span.
 *
 * @param cardId
 * @param getCardSettingsKey  (cardId) => settingsKey
 * @param cardSettings        Full card-settings map
 * @param activePage          Current active page id
 * @param layoutMetrics       Runtime layout metrics
 * @returns 1+
 */
export const getCardGridSpan = (
  cardId: string,
  getCardSettingsKey: CardSettingsKeyFn,
  cardSettings: CardSettingsMap,
  activePage?: string,
  layoutMetrics: LayoutMetrics | null = {}
): number => {
  const settings = resolveSettings(cardId, getCardSettingsKey, cardSettings);
  const rowPx = isFiniteNumber(layoutMetrics?.rowPx) ? layoutMetrics.rowPx : 100;
  const gapPx = isFiniteNumber(layoutMetrics?.gapPx) ? layoutMetrics.gapPx : 20;

  if (cardId.startsWith('spacer_card_')) {
    const rawHeightPx = Number(settings.heightPx);
    if (Number.isFinite(rawHeightPx) && rawHeightPx > 0) {
      const estimatedRows = Math.ceil((rawHeightPx + gapPx) / (rowPx + gapPx));
      return Math.max(1, estimatedRows);
    }

    const rawHeightRows = Number(settings.heightRows);
    if (Number.isFinite(rawHeightRows) && rawHeightRows >= 1) {
      return Math.max(1, Math.round(rawHeightRows));
    }
  }

  // Automations have their own logic based on type sub-setting
  if (cardId.startsWith('automation.')) {
    if (
      typeof settings.type === 'string' &&
      ['sensor', 'entity', 'toggle'].includes(settings.type)
    ) {
      return settings.size === 'small' ? 1 : 2;
    }
    return 1;
  }

  // Exact-match for legacy 'car' id
  if (cardId === 'car') {
    const sizeSetting = settings?.size;
    return sizeSetting === 'small' ? 1 : 2;
  }

  // Table-driven lookup for prefix-matched card types
  for (const rule of CARD_SPAN_RULES) {
    if (cardId.startsWith(rule.prefix)) {
      const sizeSetting = settings?.size;
      const mapping = SPAN_TABLE[rule.category];
      return (
        (typeof sizeSetting === 'string' ? mapping[sizeSetting] : undefined) ?? mapping.default
      );
    }
  }

  // Default behaviour for all other cards
  const sizeSetting = settings?.size;
  if (sizeSetting === 'small') return 1;
  if (cardId.startsWith('weather_temp_')) return 2;
  if (activePage === 'settings' && cardId !== 'car' && !cardId.startsWith('media_player')) return 1;

  return 2;
};

const MOBILE_GRID_HORIZONTAL_PADDING = 16;

const getAutomaticMobileMinWidth = (cardId: string, settings: CardSettings): number | null => {
  if (cardId.startsWith('entity_card_')) {
    const sourceId = typeof settings.entityId === 'string' ? settings.entityId : '';
    const storedAction: unknown = settings.sensorAction || {};
    const storedEntityId = readKey(storedAction, 'entityId');
    const storedType = readKey(storedAction, 'type');
    const storedTrigger = readKey(storedAction, 'trigger');
    const targetId =
      typeof storedEntityId === 'string' && storedEntityId ? storedEntityId : sourceId;
    const configuredType = isSensorActionType(storedType) ? storedType : 'auto';
    const actionType =
      configuredType === 'auto'
        ? getSensorAutomaticActionType({ entity_id: targetId })
        : configuredType;
    const hasButtonAction =
      settings.showControls !== false &&
      !(storedTrigger === 'icon' || storedTrigger === 'card') &&
      actionType !== 'none';
    const usesPrimaryButton =
      configuredType !== 'auto' ||
      Boolean(
        readKey(storedAction, 'label') ||
        readKey(storedAction, 'labelOn') ||
        readKey(storedAction, 'labelOff') ||
        readKey(storedAction, 'icon')
      ) ||
      targetId !== sourceId ||
      ['scene', 'script', 'button', 'input_button', 'climate'].includes(sourceId.split('.')[0]);
    if (hasButtonAction && settings.size === 'small' && usesPrimaryButton) return 280;
    if (settings.size === 'small') return 150;
    return sourceId.startsWith('climate.') ? 280 : 160;
  }
  if (settings.size === 'small') return 150;
  if (
    cardId.startsWith('media_player.') ||
    cardId.startsWith('media_group_') ||
    cardId.startsWith('sonos_group_') ||
    cardId.startsWith('climate_card_')
  ) {
    return 280;
  }
  if (
    cardId.startsWith('weather_temp_') ||
    cardId.startsWith('cost_card_') ||
    cardId.startsWith('nordpool_card_')
  ) {
    return 160;
  }
  return null;
};

export const supportsMobileCardWidth = (cardId: unknown): boolean =>
  typeof cardId === 'string' && getAutomaticMobileMinWidth(cardId, {}) !== null;

export interface ColSpanOptions {
  isMobile?: boolean;
  gridColumns?: number;
  viewportWidth?: number;
  gridGapH?: number;
}

/**
 * Determine how many grid columns a card should occupy horizontally.
 *
 * @returns 1–4, or `Number.MAX_SAFE_INTEGER` for full-width cards
 */
export const getCardColSpan = (
  cardId: string,
  getCardSettingsKey: CardSettingsKeyFn,
  cardSettings: CardSettingsMap,
  { isMobile = false, gridColumns = 1, viewportWidth = 0, gridGapH = 0 }: ColSpanOptions = {}
): number => {
  const settings = resolveSettings(cardId, getCardSettingsKey, cardSettings);
  const configuredColSpan =
    settings.colSpan === 'full' ? Number.MAX_SAFE_INTEGER : Number(settings.colSpan || 1);

  if (!isMobile || !supportsMobileCardWidth(cardId)) return configuredColSpan;
  if (settings.mobileWidth === 'compact') return 1;
  if (settings.mobileWidth === 'full') return Number.MAX_SAFE_INTEGER;
  if (configuredColSpan === Number.MAX_SAFE_INTEGER) return configuredColSpan;

  const minWidth = getAutomaticMobileMinWidth(cardId, settings) ?? 0;
  const columns = Math.max(1, gridColumns);
  const availableWidth = Math.max(0, viewportWidth - MOBILE_GRID_HORIZONTAL_PADDING);
  if (!availableWidth) return configuredColSpan;

  const columnWidth = (availableWidth - Math.max(0, columns - 1) * gridGapH) / columns;
  if (columnWidth <= 0) return configuredColSpan;

  const automaticSpan = Math.ceil((minWidth + gridGapH) / (columnWidth + gridGapH));
  return Math.max(configuredColSpan, Math.min(columns, automaticSpan));
};

/**
 * Build a position map for a list of card ids.
 *
 * @param ids        Ordered card ids
 * @param columns    Number of grid columns
 * @param spanFn     (cardId) => number  – pre-bound getCardGridSpan (row span)
 * @param colSpanFn  (cardId) => number  – pre-bound getCardColSpan
 * @returns { [cardId]: { row, col, span, colSpan } }
 */
export const buildGridLayout = (
  ids: readonly string[],
  columns: number | null | undefined,
  spanFn: (cardId: string) => number,
  colSpanFn?: ((cardId: string) => number) | null
): Record<string, GridPosition> => {
  if (!columns || columns < 1) return {};
  const occupancy: boolean[][] = [];
  const positions: Record<string, GridPosition> = {};

  const ensureRow = (row: number) => {
    if (!occupancy[row]) occupancy[row] = Array<boolean>(columns).fill(false);
  };

  const canPlace = (row: number, col: number, rowSpan: number, colSpan: number) => {
    if (col + colSpan > columns) return false;
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        if (occupancy[r][c]) return false;
      }
    }
    return true;
  };

  const place = (row: number, col: number, rowSpan: number, colSpan: number) => {
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        occupancy[r][c] = true;
      }
    }
  };

  const placeSingle = (id: string, rowSpan: number, colSpan: number) => {
    let placed = false;
    let row = 0;
    while (!placed) {
      ensureRow(row);
      for (let col = 0; col < columns; col += 1) {
        if (canPlace(row, col, rowSpan, colSpan)) {
          place(row, col, rowSpan, colSpan);
          positions[id] = { row: row + 1, col: col + 1, span: rowSpan, colSpan };
          placed = true;
          break;
        }
      }
      if (!placed) row += 1;
    }
  };

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const rowSpan = spanFn(id);
    const colSpan = colSpanFn ? Math.min(colSpanFn(id), columns) : 1;
    placeSingle(id, rowSpan, colSpan);
  }

  return positions;
};
