import { useEffect, useRef } from 'react';
import type {
  CardSettings,
  CardSettingsMap,
  EntityModalActions,
  MediaModalActions,
} from '@/@types/dashboard';
import type { EntityLikeMap } from '@/@types/ha';
import {
  evaluateVisibilityConditionConfig,
  isConditionConfigured,
  resolveConditionEntityId,
} from '@/utils';
import { readKey } from '@/validators/guards';

type IdSetter = (id: string | null) => void;

/** Azioni usate per aprire il popup di una card (tutte facoltative). */
export type PopupModalActions = Partial<EntityModalActions & MediaModalActions> & {
  closeAllModals?: (() => void) | null;
  setActiveVacuumId?: IdSetter | null;
  setActiveMowerId?: IdSetter | null;
};

export interface PopupTriggersOptions {
  entities: EntityLikeMap | null | undefined;
  entitiesLoaded: boolean;
  pagesConfig: Record<string, unknown> | null | undefined;
  activePage: string;
  cardSettings: CardSettingsMap | null | undefined;
  getCardSettingsKey: (cardId: string, pageId?: string) => string;
  editMode: boolean;
  modalActions: PopupModalActions;
  enabled?: boolean;
}

const STARTUP_SUPPRESSION_MS = 15000;
const MIN_REOPEN_SUPPRESSION_MS = 10000;
const MAX_REOPEN_SUPPRESSION_MS = 3600000;
const MAX_AUTO_CLOSE_MS = 3600000;

function normalizeCooldownMs(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MIN_REOPEN_SUPPRESSION_MS;
  const clampedSeconds = Math.min(3600, Math.max(10, Math.floor(parsed)));
  return Math.min(
    MAX_REOPEN_SUPPRESSION_MS,
    Math.max(MIN_REOPEN_SUPPRESSION_MS, clampedSeconds * 1000)
  );
}

function normalizeAutoCloseMs(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(MAX_AUTO_CLOSE_MS, Math.floor(parsed) * 1000);
}

function getCardSettingsForPage(
  cardId: string,
  pageId: string,
  cardSettings: CardSettingsMap | null | undefined,
  getCardSettingsKey: (cardId: string, pageId?: string) => string
): CardSettings | null {
  const scopedKey = getCardSettingsKey(cardId, pageId);
  return cardSettings?.[scopedKey] || cardSettings?.[cardId] || null;
}

function openPopupForCard(
  cardId: unknown,
  settings: CardSettings | null,
  modalActions: PopupModalActions,
  entities: EntityLikeMap | null | undefined
): boolean {
  const {
    closeAllModals,
    setShowLightModal,
    setShowSensorInfoModal,
    setActiveClimateEntityModal,
    setShowCostModal,
    setActiveVacuumId,
    setShowVacuumModal,
    setActiveMowerId,
    setShowMowerModal,
    setShowFanModal,
    setShowAndroidTVModal,
    setShowAppleTVModal,
    setActiveCarModal,
    setShowWeatherModal,
    setShowNordpoolModal,
    setShowCalendarModal,
    setShowTodoModal,
    setShowRoomModal,
    setShowCoverModal,
    setShowAlarmModal,
    setShowCameraModal,
    setActiveMediaModal,
    setActiveMediaId,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds,
  } = modalActions;

  if (typeof cardId !== 'string' || !cardId.trim()) return false;

  const safeClose = typeof closeAllModals === 'function' ? closeAllModals : null;
  const closeAndOpen = (openFn: () => void) => {
    safeClose?.();
    openFn();
  };

  if (cardId.startsWith('entity_card_')) {
    const entityId = typeof settings?.entityId === 'string' ? settings.entityId : null;
    if (!entityId) return false;
    closeAndOpen(() => setShowSensorInfoModal?.({ entityId, cardId }));
    return true;
  }

  if (cardId.startsWith('light_') || cardId.startsWith('light.')) {
    const resolvedLightId = resolveConditionEntityId(cardId, settings || {}, entities || {});
    const lightId =
      typeof resolvedLightId === 'string' && resolvedLightId.startsWith('light.')
        ? resolvedLightId
        : cardId.startsWith('light.')
          ? cardId
          : null;
    if (!lightId) return false;
    closeAndOpen(() => setShowLightModal?.(lightId));
    return true;
  }

  if (cardId.startsWith('vacuum.')) {
    closeAndOpen(() => {
      setActiveVacuumId?.(cardId);
      setShowVacuumModal?.(true);
    });
    return true;
  }

  if (cardId.startsWith('lawn_mower.')) {
    closeAndOpen(() => {
      setActiveMowerId?.(cardId);
      setShowMowerModal?.(true);
    });
    return true;
  }

  if (cardId.startsWith('fan.') || cardId.startsWith('fan_card_')) {
    closeAndOpen(() => setShowFanModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('lock_card_')) {
    const lockId = typeof settings?.lockId === 'string' ? settings.lockId : null;
    if (!lockId) return false;
    closeAndOpen(() => setShowSensorInfoModal?.(lockId));
    return true;
  }

  if (cardId.startsWith('climate_card_')) {
    const climateId = typeof settings?.climateId === 'string' ? settings.climateId : null;
    if (!climateId) return false;
    closeAndOpen(() => setActiveClimateEntityModal?.({ entityId: climateId, cardId }));
    return true;
  }

  if (cardId.startsWith('cost_card_')) {
    closeAndOpen(() => setShowCostModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('androidtv_card_')) {
    closeAndOpen(() => setShowAndroidTVModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('appletv_card_')) {
    closeAndOpen(() => setShowAppleTVModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('calendar_card_')) {
    closeAndOpen(() => setShowCalendarModal?.(true));
    return true;
  }

  if (cardId.startsWith('todo_card_')) {
    closeAndOpen(() => setShowTodoModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('nordpool_card_')) {
    closeAndOpen(() => setShowNordpoolModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('cover_card_')) {
    closeAndOpen(() => setShowCoverModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('alarm_card_')) {
    closeAndOpen(() => setShowAlarmModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('room_card_')) {
    closeAndOpen(() => setShowRoomModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('camera_card_')) {
    closeAndOpen(() => setShowCameraModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('weather_temp_')) {
    closeAndOpen(() => setShowWeatherModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('car_card_') || cardId === 'car') {
    closeAndOpen(() => setActiveCarModal?.(cardId));
    return true;
  }

  if (cardId.startsWith('media_player.')) {
    closeAndOpen(() => {
      setActiveMediaSessionSensorIds?.(null);
      setActiveMediaGroupKey?.(null);
      setActiveMediaGroupIds?.(null);
      setActiveMediaId?.(cardId);
      setActiveMediaModal?.('media');
    });
    return true;
  }

  if (cardId.startsWith('media_group_') || cardId.startsWith('sonos_group_')) {
    const mediaIds = settings?.mediaIds;
    const entityIds = Array.isArray(mediaIds)
      ? mediaIds.filter((id): id is string => typeof id === 'string')
      : [];
    const firstEntityId = entityIds[0] || null;
    closeAndOpen(() => {
      setActiveMediaSessionSensorIds?.(null);
      setActiveMediaGroupKey?.(cardId);
      setActiveMediaGroupIds?.(entityIds);
      setActiveMediaId?.(firstEntityId);
      setActiveMediaModal?.('media');
    });
    return true;
  }

  if (cardId.includes('.')) {
    const entityId = String(settings?.type === 'sensor' ? settings.entityId || cardId : cardId);
    closeAndOpen(() =>
      setShowSensorInfoModal?.(entityId === cardId ? cardId : { entityId, cardId })
    );
    return true;
  }

  return false;
}

export function usePopupTriggers({
  entities,
  entitiesLoaded,
  pagesConfig,
  activePage,
  cardSettings,
  getCardSettingsKey,
  editMode,
  modalActions,
  enabled = true,
}: PopupTriggersOptions): void {
  const previousMatchRef = useRef<Record<string, boolean>>({});
  const seenTriggerRef = useRef<Record<string, boolean>>({});
  const lastOpenedAtRef = useRef<Record<string, number>>({});
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);
  const hasLoadedEntitiesRef = useRef(false);
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    const now = Date.now();

    if (!enabled) {
      previousMatchRef.current = {};
      seenTriggerRef.current = {};
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      return;
    }

    if (!entitiesLoaded) {
      hasLoadedEntitiesRef.current = false;
      isInitializedRef.current = false;
      previousMatchRef.current = {};
      seenTriggerRef.current = {};
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      return;
    }

    if (!hasLoadedEntitiesRef.current) {
      hasLoadedEntitiesRef.current = true;
      suppressUntilRef.current = now + STARTUP_SUPPRESSION_MS;
    }

    if (editMode) return;

    const pageCards = pagesConfig?.[activePage];
    const cardIds: unknown[] = Array.isArray(pageCards) ? pageCards : [];
    const nextMatchState = { ...previousMatchRef.current };
    // Assigned inside the forEach callback below.
    const pending: {
      cardId: unknown;
      settings: CardSettings | null;
      triggerId: string | null;
    } = { cardId: null, settings: null, triggerId: null };
    const startupSuppressed = now < suppressUntilRef.current;

    cardIds.forEach((rawCardId) => {
      const cardId = String(rawCardId);
      const settings = getCardSettingsForPage(cardId, activePage, cardSettings, getCardSettingsKey);
      const triggerConfig = settings?.popupTrigger;
      const isEnabled = readKey(triggerConfig, 'enabled') === true;
      const condition = readKey(triggerConfig, 'condition') || null;
      const reopenSuppressionMs = normalizeCooldownMs(readKey(triggerConfig, 'cooldownSeconds'));
      const triggerId = `${activePage}::${cardId}`;

      if (!isEnabled || !isConditionConfigured(condition)) {
        nextMatchState[triggerId] = false;
        return;
      }

      const fallbackEntityId = resolveConditionEntityId(cardId, settings || {}, entities || {});
      const fallbackEntity = fallbackEntityId ? entities?.[fallbackEntityId] : null;
      const matchesNow = evaluateVisibilityConditionConfig({
        condition,
        entity: fallbackEntity,
        entities,
        getAttribute: undefined,
        fallbackEntityId,
      });

      nextMatchState[triggerId] = matchesNow;

      if (!seenTriggerRef.current[triggerId]) {
        seenTriggerRef.current[triggerId] = true;
        return;
      }

      if (!isInitializedRef.current || startupSuppressed) return;

      const matchedBefore = Boolean(previousMatchRef.current[triggerId]);
      const lastOpenedAt = Number(lastOpenedAtRef.current[triggerId]) || 0;
      const isCoolingDown = now - lastOpenedAt < reopenSuppressionMs;

      if (matchesNow && !matchedBefore && !isCoolingDown && !pending.cardId) {
        pending.cardId = rawCardId;
        pending.settings = settings;
        pending.triggerId = triggerId;
      }
    });

    previousMatchRef.current = nextMatchState;

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    if (pending.cardId) {
      const opened = openPopupForCard(pending.cardId, pending.settings, modalActions, entities);
      if (pending.triggerId) {
        lastOpenedAtRef.current[pending.triggerId] = now;
      }

      if (opened) {
        if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = null;
        }

        const autoCloseMs = normalizeAutoCloseMs(
          readKey(pending.settings?.popupTrigger, 'autoCloseSeconds')
        );
        const closeAllModals = modalActions?.closeAllModals;
        if (autoCloseMs > 0 && typeof closeAllModals === 'function') {
          autoCloseTimerRef.current = setTimeout(() => {
            closeAllModals();
            autoCloseTimerRef.current = null;
          }, autoCloseMs);
        }
      }
    }
  }, [
    entities,
    entitiesLoaded,
    pagesConfig,
    activePage,
    cardSettings,
    getCardSettingsKey,
    editMode,
    modalActions,
    enabled,
  ]);

  useEffect(
    () => () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    },
    []
  );
}
