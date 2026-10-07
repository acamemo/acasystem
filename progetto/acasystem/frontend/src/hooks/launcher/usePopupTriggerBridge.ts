/**
 * Legacy popup triggers (`cardSettings.popupTrigger`): when a card's condition starts matching,
 * the launcher opens that widget's details sheet instead of the legacy modal. The trigger
 * logic (conditions, cooldown, start-up silence, auto close) is the legacy hook, unchanged.
 */
import { useMemo, useRef } from 'react';
import type { CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import type { EntityLikeMap } from '@/@types/ha';
import { usePopupTriggers, type PopupModalActions } from '@/hooks/usePopupTriggers';
import { isObject, readKey } from '@/validators/guards';

export interface PopupTriggerBridgeOptions {
  entities: EntityLikeMap;
  entitiesLoaded: boolean;
  pagesConfig: PagesConfig;
  /** Page whose cards are watched: the page shown, or the first page while on the cover. */
  pageId: string | null;
  cardSettings: CardSettingsMap;
  editMode: boolean;
  openDetails: (widgetId: string) => void;
  closeDetails: () => void;
}

export function usePopupTriggerBridge({
  entities,
  entitiesLoaded,
  pagesConfig,
  pageId,
  cardSettings,
  editMode,
  openDetails,
  closeDetails,
}: PopupTriggerBridgeOptions) {
  const pending = useRef<{
    mediaId: string | null;
    groupKey: string | null;
    vacuumId: string | null;
    mowerId: string | null;
  }>({ mediaId: null, groupKey: null, vacuumId: null, mowerId: null });

  const page = pageId ?? '';
  const getCardSettingsKey = useMemo(
    () =>
      (cardId: string, target: string = page) =>
        `${target}::${cardId}`,
    [page]
  );

  const enabled = useMemo(
    () =>
      Object.values(cardSettings).some(
        (settings) => readKey(settings?.popupTrigger, 'enabled') === true
      ),
    [cardSettings]
  );

  const modalActions = useMemo<PopupModalActions>(() => {
    const cards = (): string[] => {
      const list = pagesConfig[page];
      return Array.isArray(list) ? list : [];
    };
    const settingsOf = (cardId: string) =>
      cardSettings[`${page}::${cardId}`] ?? cardSettings[cardId] ?? {};
    /** The card on the page that the legacy argument (card id or entity id) refers to. */
    const resolve = (value: unknown): string | null => {
      if (isObject(value) && typeof value.cardId === 'string') return value.cardId;
      const id = isObject(value) && typeof value.entityId === 'string' ? value.entityId : value;
      if (typeof id !== 'string' || !id) return null;
      if (cards().includes(id)) return id;
      return (
        cards().find((cardId) => Object.values(settingsOf(cardId)).some((item) => item === id)) ??
        null
      );
    };
    const open = (value: unknown) => {
      const cardId = resolve(value);
      if (cardId) openDetails(cardId);
    };
    return {
      closeAllModals: closeDetails,
      setShowLightModal: open,
      setShowSensorInfoModal: open,
      setActiveClimateEntityModal: open,
      setShowCostModal: open,
      setShowFanModal: open,
      setShowAndroidTVModal: open,
      setShowAppleTVModal: open,
      setActiveCarModal: open,
      setShowWeatherModal: open,
      setShowNordpoolModal: open,
      setShowTodoModal: open,
      setShowRoomModal: open,
      setShowCoverModal: open,
      setShowAlarmModal: open,
      setShowCameraModal: open,
      setShowCalendarModal: (value) => {
        if (!value) return;
        const cardId =
          typeof value === 'string' ? value : cards().find((id) => id.startsWith('calendar_card_'));
        if (cardId) openDetails(cardId);
      },
      setActiveVacuumId: (id) => {
        pending.current.vacuumId = id;
      },
      setShowVacuumModal: (value) => {
        if (value && pending.current.vacuumId) openDetails(pending.current.vacuumId);
      },
      setActiveMowerId: (id) => {
        pending.current.mowerId = id;
      },
      setShowMowerModal: (value) => {
        if (value && pending.current.mowerId) openDetails(pending.current.mowerId);
      },
      setActiveMediaId: (id) => {
        pending.current.mediaId = id;
      },
      setActiveMediaGroupKey: (key) => {
        pending.current.groupKey = key;
      },
      setActiveMediaGroupIds: () => undefined,
      setActiveMediaSessionSensorIds: () => undefined,
      setActiveMediaModal: (value) => {
        if (!value) return;
        const target = pending.current.groupKey ?? pending.current.mediaId;
        if (target) openDetails(target);
      },
    };
  }, [pagesConfig, page, cardSettings, openDetails, closeDetails]);

  usePopupTriggers({
    entities,
    entitiesLoaded,
    pagesConfig,
    activePage: page,
    cardSettings,
    getCardSettingsKey,
    editMode,
    modalActions,
    enabled: enabled && Boolean(pageId),
  });
}
