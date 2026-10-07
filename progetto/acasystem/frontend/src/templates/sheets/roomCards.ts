/**
 * Room widgets from Home Assistant areas: same card ids and settings as the legacy
 * buildRoomCardsPayload (rendering/modalSlices/roomCardUtils.js), typed.
 */
import type { CardSettings, CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import { cardSettingsKey } from './cardKeys';

export interface RoomArea {
  area_id: string;
  name?: string;
  icon?: string | null;
}

export interface RoomCardsPayload {
  newConfig: PagesConfig;
  newSettings: CardSettingsMap;
  customNames: Array<{ cardId: string; name: string }>;
  cardIds: string[];
}

export function buildRoomCards({
  areas,
  areaEntitiesById,
  pagesConfig,
  pageId,
  cardSettings,
  timestamp = Date.now(),
}: {
  areas: readonly RoomArea[];
  areaEntitiesById: Readonly<Record<string, string[]>>;
  pagesConfig: PagesConfig;
  pageId: string;
  cardSettings: CardSettingsMap;
  timestamp?: number;
}): RoomCardsPayload | null {
  if (areas.length === 0) return null;
  const newConfig: PagesConfig = { ...pagesConfig };
  const targetCards = [...(newConfig[pageId] ?? [])];
  const newSettings: CardSettingsMap = { ...cardSettings };
  const customNames: RoomCardsPayload['customNames'] = [];
  const cardIds: string[] = [];

  areas.forEach((area, index) => {
    const cardId = `room_card_${timestamp}_${index}`;
    const settingsKey = cardSettingsKey(pageId, cardId);
    const areaName = area.name || area.area_id;
    const settings: CardSettings = {
      areaId: area.area_id,
      areaName,
      areaIcon: area.icon || null,
      icon: area.icon || null,
      entityIds: areaEntitiesById[area.area_id] ?? [],
      includedEntityIds: [],
      excludedEntityIds: [],
      showLights: true,
      showTemp: true,
      showMotion: true,
      showHumidity: false,
      showClimate: false,
      showLightChip: true,
      showMediaChip: true,
      showActiveChip: true,
      showVacuumChip: true,
      showCoverChip: true,
      showDoorChip: true,
      showOccupiedIndicator: false,
      showIconWatermark: true,
      showPopupClimate: true,
      showPopupLights: true,
      showPopupTempOverview: true,
      showPopupMedia: true,
      showPopupVacuum: true,
      size: 'large',
    };
    targetCards.push(cardId);
    newSettings[settingsKey] = settings;
    customNames.push({ cardId, name: areaName });
    cardIds.push(cardId);
  });

  newConfig[pageId] = targetCards;
  return { newConfig, newSettings, customNames, cardIds };
}
