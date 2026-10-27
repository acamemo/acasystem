import type {
  CardSettings,
  CardSettingsMap,
  GetCardSettingsKey,
  PagesConfig,
} from '@/@types/dashboard';

type Select<T> = (value: T) => void;

/** Stato e setter necessari ad aggiungere le card selezionate. */
export interface AddSelectedContext {
  pagesConfig: PagesConfig;
  persistConfig: (config: PagesConfig) => void;
  addCardTargetPage: string;
  addCardType: string;
  selectedEntities: string[];
  selectedWeatherId?: string | null;
  selectedTempId?: string | null;
  selectedAndroidTVMediaId?: string | null;
  selectedAndroidTVRemoteId?: string | null;
  selectedAppleTVMediaId?: string | null;
  selectedAppleTVRemoteId?: string | null;
  selectedCostTodayId?: string | null;
  selectedCostMonthId?: string | null;
  selectedNordpoolId?: string | null;
  nordpoolDecimals?: number;
  selectedSpacerVariant?: string;
  cardSettings: CardSettingsMap;
  persistCardSettings: (settings: CardSettingsMap) => void;
  getCardSettingsKey: GetCardSettingsKey;
  saveCardSetting?: (id: string, setting: string, value: unknown) => void;
  setSelectedEntities: Select<string[]>;
  setShowAddCardModal: Select<boolean>;
  setSelectedWeatherId: Select<string | null>;
  setSelectedTempId: Select<string | null>;
  setSelectedAndroidTVMediaId: Select<string | null>;
  setSelectedAndroidTVRemoteId: Select<string | null>;
  setSelectedAppleTVMediaId?: Select<string | null> | null;
  setSelectedAppleTVRemoteId?: Select<string | null> | null;
  setSelectedCostTodayId: Select<string | null>;
  setSelectedCostMonthId: Select<string | null>;
  setCostSelectionTarget: Select<string>;
  setSelectedNordpoolId: Select<string | null>;
  setNordpoolDecimals: Select<number>;
  setShowEditCardModal: Select<string | null>;
  setEditCardSettingsKey: Select<string | null>;
}

/**
 * Handles adding selected entities/cards to the dashboard configuration.
 * Extracted from App.jsx to keep the main component lean.
 *
 * @param ctx - Context object with all required state & setters
 */
export const handleAddSelected = (ctx: AddSelectedContext): void => {
  const {
    pagesConfig,
    persistConfig,
    addCardTargetPage,
    addCardType,
    selectedEntities,
    selectedWeatherId,
    selectedTempId,
    selectedAndroidTVMediaId,
    selectedAndroidTVRemoteId,
    selectedAppleTVMediaId,
    selectedAppleTVRemoteId,
    selectedCostTodayId,
    selectedCostMonthId,
    selectedNordpoolId,
    nordpoolDecimals,
    selectedSpacerVariant,
    cardSettings,
    persistCardSettings,
    getCardSettingsKey,
    setSelectedEntities,
    setShowAddCardModal,
    setSelectedWeatherId,
    setSelectedTempId,
    setSelectedAndroidTVMediaId,
    setSelectedAndroidTVRemoteId,
    setSelectedAppleTVMediaId,
    setSelectedAppleTVRemoteId,
    setSelectedCostTodayId,
    setSelectedCostMonthId,
    setCostSelectionTarget,
    setSelectedNordpoolId,
    setNordpoolDecimals,
    setShowEditCardModal,
    setEditCardSettingsKey,
  } = ctx;

  const newConfig: PagesConfig = { ...pagesConfig };

  const selectedEntitiesForType = () => {
    switch (addCardType) {
      case 'light':
        return selectedEntities.filter((id) => id.startsWith('light.'));
      case 'lock':
        return selectedEntities.filter((id) => id.startsWith('lock.'));
      case 'vacuum':
        return selectedEntities.filter((id) => id.startsWith('vacuum.'));
      case 'fan':
        return selectedEntities.filter((id) => id.startsWith('fan.'));
      case 'climate':
        return selectedEntities.filter((id) => id.startsWith('climate.'));
      case 'camera':
        return selectedEntities.filter((id) => id.startsWith('camera.'));
      case 'cover':
        return selectedEntities.filter((id) => id.startsWith('cover.'));
      case 'media':
        return selectedEntities.filter((id) => id.startsWith('media_player.'));
      case 'sonos':
        return selectedEntities.filter((id) => id.startsWith('media_player.'));
      case 'alarm':
        return selectedEntities.filter((id) => id.startsWith('alarm_control_panel.'));
      default:
        return selectedEntities;
    }
  };

  // -- Helpers ---------------------------------------------------------------

  /** Append card(s) to page, persist config, and close the add-card modal. */
  const commitCards = (cardIds: string[]) => {
    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), ...cardIds];
    persistConfig(newConfig);
    setShowAddCardModal(false);
  };

  /** Save card settings for a single card and commit it to the page. */
  const commitSingleCard = (
    cardId: string,
    settingsPayload: CardSettings,
    { openEdit = false }: { openEdit?: boolean } = {}
  ) => {
    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const newSettings: CardSettingsMap = {
      ...cardSettings,
      [settingsKey]: { ...(cardSettings[settingsKey] || {}), ...settingsPayload },
    };
    persistCardSettings(newSettings);
    commitCards([cardId]);
    if (openEdit) {
      setShowEditCardModal(cardId);
      setEditCardSettingsKey(settingsKey);
    }
  };

  // -- Header (special case: plain entities) ---------------------------------

  if (addCardTargetPage === 'header') {
    newConfig.header = [...(newConfig.header || []), ...selectedEntities];
    persistConfig(newConfig);
    setSelectedEntities([]);
    setShowAddCardModal(false);
    return;
  }

  // -- Card-type handlers ----------------------------------------------------

  switch (addCardType) {
    case 'weather': {
      if (!selectedWeatherId) return;
      const cardId = `weather_temp_${Date.now()}`;
      commitSingleCard(cardId, { weatherId: selectedWeatherId, tempId: selectedTempId || null });
      setSelectedWeatherId(null);
      setSelectedTempId(null);
      return;
    }

    case 'calendar': {
      const calendars = selectedEntities.filter((id) => id.startsWith('calendar.'));
      if (calendars.length === 0) return;
      const cardId = `calendar_card_${Date.now()}`;
      commitSingleCard(cardId, { calendars });
      setSelectedEntities([]);
      return;
    }

    // Cards of the cover as widgets (REP-20261007-030): nothing to choose.
    case 'cover_clock':
    case 'cover_calendar':
    case 'cover_weather': {
      commitSingleCard(`${addCardType}_${Date.now()}`, {});
      return;
    }

    case 'todo': {
      const cardId = `todo_card_${Date.now()}`;
      commitSingleCard(cardId, { size: 'large' }, { openEdit: true });
      return;
    }

    case 'media': {
      const mediaEntities = selectedEntitiesForType();
      if (mediaEntities.length === 0) return;
      const cardId = `media_group_${Date.now()}`;
      commitSingleCard(cardId, { mediaIds: mediaEntities });
      setSelectedEntities([]);
      return;
    }

    case 'sonos': {
      const mediaEntities = selectedEntitiesForType();
      if (mediaEntities.length === 0) return;
      const cardId = `sonos_group_${Date.now()}`;
      commitSingleCard(cardId, { mediaIds: mediaEntities });
      setSelectedEntities([]);
      return;
    }

    case 'climate': {
      const climateEntities = selectedEntitiesForType();
      if (climateEntities.length === 0) return;
      const newSettings: CardSettingsMap = { ...cardSettings };
      const newCardIds = climateEntities.map((entityId) => {
        const cardId = `climate_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), climateId: entityId };
        return cardId;
      });
      persistCardSettings(newSettings);
      commitCards(newCardIds);
      setSelectedEntities([]);
      return;
    }

    case 'lock': {
      const lockEntities = selectedEntitiesForType();
      if (lockEntities.length === 0) return;
      const newSettings: CardSettingsMap = { ...cardSettings };
      const newCardIds = lockEntities.map((entityId) => {
        const cardId = `lock_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), lockId: entityId };
        return cardId;
      });
      persistCardSettings(newSettings);
      commitCards(newCardIds);
      setSelectedEntities([]);
      return;
    }

    case 'camera': {
      const cameraEntities = selectedEntitiesForType();
      if (cameraEntities.length === 0) return;
      const newSettings: CardSettingsMap = { ...cardSettings };
      const newCardIds = cameraEntities.map((entityId) => {
        const cardId = `camera_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), cameraId: entityId };
        return cardId;
      });
      persistCardSettings(newSettings);
      commitCards(newCardIds);
      setSelectedEntities([]);
      return;
    }

    case 'cover': {
      const coverEntities = selectedEntitiesForType();
      if (coverEntities.length === 0) return;
      const newSettings: CardSettingsMap = { ...cardSettings };
      const newCardIds = coverEntities.map((entityId) => {
        const cardId = `cover_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), coverId: entityId };
        return cardId;
      });
      persistCardSettings(newSettings);
      commitCards(newCardIds);
      setSelectedEntities([]);
      return;
    }

    case 'alarm': {
      const alarmEntities = selectedEntitiesForType();
      if (alarmEntities.length === 0) return;
      const newSettings: CardSettingsMap = { ...cardSettings };
      const newCardIds = alarmEntities.map((entityId) => {
        const cardId = `alarm_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), alarmId: entityId };
        return cardId;
      });
      persistCardSettings(newSettings);
      commitCards(newCardIds);
      setSelectedEntities([]);
      return;
    }

    case 'androidtv': {
      if (!selectedAndroidTVMediaId) return;
      const cardId = `androidtv_card_${Date.now()}`;
      commitSingleCard(cardId, {
        mediaPlayerId: selectedAndroidTVMediaId,
        remoteId: selectedAndroidTVRemoteId || null,
      });
      setSelectedAndroidTVMediaId(null);
      setSelectedAndroidTVRemoteId(null);
      return;
    }

    case 'appletv': {
      if (!selectedAppleTVMediaId) return;
      const cardId = `appletv_card_${Date.now()}`;
      commitSingleCard(cardId, {
        mediaPlayerId: selectedAppleTVMediaId,
        remoteId: selectedAppleTVRemoteId || null,
      });
      if (typeof setSelectedAppleTVMediaId === 'function') setSelectedAppleTVMediaId(null);
      if (typeof setSelectedAppleTVRemoteId === 'function') setSelectedAppleTVRemoteId(null);
      return;
    }

    case 'cost': {
      if (!selectedCostTodayId || !selectedCostMonthId) return;
      const cardId = `cost_card_${Date.now()}`;
      commitSingleCard(cardId, { todayId: selectedCostTodayId, monthId: selectedCostMonthId });
      setSelectedCostTodayId(null);
      setSelectedCostMonthId(null);
      setCostSelectionTarget('today');
      return;
    }

    case 'nordpool': {
      if (!selectedNordpoolId) return;
      const cardId = `nordpool_card_${Date.now()}`;
      commitSingleCard(cardId, { nordpoolId: selectedNordpoolId, decimals: nordpoolDecimals });
      setSelectedNordpoolId(null);
      setNordpoolDecimals(2);
      return;
    }

    case 'car': {
      const cardId = `car_card_${Date.now()}`;
      commitSingleCard(cardId, { type: 'car', size: 'large' }, { openEdit: true });
      return;
    }

    // Lists the devices of Home Assistant no widget shows yet: nothing to choose.
    case 'rileva': {
      commitSingleCard(`rileva_card_${Date.now()}`, {});
      return;
    }

    case 'spacer': {
      const cardId = `spacer_card_${Date.now()}`;
      const variant = selectedSpacerVariant || 'spacer';
      const initialSettings: CardSettings = {
        variant,
        colSpan: 'full',
        heightPx: 40,
        headingAlign: 'center',
      };
      commitSingleCard(cardId, initialSettings);
      return;
    }

    case 'sensor': {
      if (selectedEntities.length === 0) return;
      const newSettings: CardSettingsMap = { ...cardSettings };
      const existingIds = new Set<string>(Object.values(pagesConfig).filter(Array.isArray).flat());
      const newCardIds = selectedEntities.map((entityId) => {
        const uniqueId =
          globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const baseId = `entity_card_${uniqueId}`;
        let cardId = baseId;
        let suffix = 1;
        while (existingIds.has(cardId)) cardId = `${baseId}_${suffix++}`;
        existingIds.add(cardId);
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { type: 'sensor', entityId, size: 'large' };
        return cardId;
      });
      persistCardSettings(newSettings);
      commitCards(newCardIds);
      setSelectedEntities([]);
      return;
    }

    // entity / toggle — legacy path for plain HA entities
    default: {
      const validSelectedEntities = selectedEntitiesForType();

      if (addCardType === 'entity' || addCardType === 'toggle') {
        const newSettings: CardSettingsMap = { ...cardSettings };
        validSelectedEntities.forEach((id) => {
          const settingsKey = getCardSettingsKey(id, addCardTargetPage);
          newSettings[settingsKey] = {
            ...(newSettings[settingsKey] || {}),
            type: addCardType,
            size: newSettings[settingsKey]?.size || 'large',
          };
        });
        persistCardSettings(newSettings);
      }

      commitCards(validSelectedEntities);
      setSelectedEntities([]);
    }
  }
};
