import { useMemo } from 'react';
import type {
  EntityModalActions,
  ManagementModalActions,
  MediaModalActions,
  ModalActions,
  ModalKey,
  ModalSetters,
  ModalState,
  ModalStore,
} from '@/@types/dashboard';

// All modal keys with their "closed" value (null = entity-id modals, false = boolean modals)
const MODAL_DEFAULTS: ModalState = {
  showNordpoolModal: null,
  showCostModal: null,
  activeClimateEntityModal: null,
  showLightModal: null,
  activeCarModal: null,
  showPersonModal: null,
  showAndroidTVModal: null,
  showAppleTVModal: null,
  showVacuumModal: null,
  showMowerModal: null,
  showFanModal: null,
  showSensorInfoModal: null,
  showCalendarModal: null,
  showTodoModal: null,
  showRoomModal: null,
  showCoverModal: null,
  showCameraModal: null,
  showWeatherModal: null,
  showAlarmModal: null,
  showAlarmActionModal: null,
  activeMediaModal: null,
  activeMediaGroupKey: null,
  activeMediaGroupIds: null,
  activeMediaSessionSensorIds: null,
  activeMediaId: null,
  showStatusGroupModal: null,
  showAddCardModal: false,
  showConfigModal: false,
  showAddPageModal: false,
  showHeaderEditModal: false,
  showEditCardModal: null,
  showStatusPillsConfig: false,
};

// Keys checked by hasOpenModal
const OPEN_CHECK_KEYS: ModalKey[] = [
  'showNordpoolModal',
  'showCostModal',
  'activeClimateEntityModal',
  'showLightModal',
  'activeCarModal',
  'showAndroidTVModal',
  'showAppleTVModal',
  'showVacuumModal',
  'showMowerModal',
  'showFanModal',
  'showAddCardModal',
  'showConfigModal',
  'showEditCardModal',
  'showSensorInfoModal',
  'activeMediaModal',
  'showStatusPillsConfig',
  'showPersonModal',
  'showCalendarModal',
  'showTodoModal',
  'showRoomModal',
  'showWeatherModal',
  'showCoverModal',
  'showCameraModal',
  'showAlarmModal',
  'showAlarmActionModal',
  'showStatusGroupModal',
];

type SetModalValue = <K extends ModalKey>(key: K, value: ModalState[K]) => void;

function buildModalActions(
  setModalValue: SetModalValue,
  closeAllModals: () => void,
  hasOpenModal: () => boolean
): ModalActions {
  const setter =
    <K extends ModalKey>(key: K) =>
    (value: ModalState[K]) =>
      setModalValue(key, value);

  // Same order as MODAL_DEFAULTS: `showX` → `setShowX`.
  const setters: ModalSetters = {
    setShowNordpoolModal: setter('showNordpoolModal'),
    setShowCostModal: setter('showCostModal'),
    setActiveClimateEntityModal: setter('activeClimateEntityModal'),
    setShowLightModal: setter('showLightModal'),
    setActiveCarModal: setter('activeCarModal'),
    setShowPersonModal: setter('showPersonModal'),
    setShowAndroidTVModal: setter('showAndroidTVModal'),
    setShowAppleTVModal: setter('showAppleTVModal'),
    setShowVacuumModal: setter('showVacuumModal'),
    setShowMowerModal: setter('showMowerModal'),
    setShowFanModal: setter('showFanModal'),
    setShowSensorInfoModal: setter('showSensorInfoModal'),
    setShowCalendarModal: setter('showCalendarModal'),
    setShowTodoModal: setter('showTodoModal'),
    setShowRoomModal: setter('showRoomModal'),
    setShowCoverModal: setter('showCoverModal'),
    setShowCameraModal: setter('showCameraModal'),
    setShowWeatherModal: setter('showWeatherModal'),
    setShowAlarmModal: setter('showAlarmModal'),
    setShowAlarmActionModal: setter('showAlarmActionModal'),
    setActiveMediaModal: setter('activeMediaModal'),
    setActiveMediaGroupKey: setter('activeMediaGroupKey'),
    setActiveMediaGroupIds: setter('activeMediaGroupIds'),
    setActiveMediaSessionSensorIds: setter('activeMediaSessionSensorIds'),
    setActiveMediaId: setter('activeMediaId'),
    setShowStatusGroupModal: setter('showStatusGroupModal'),
    setShowAddCardModal: setter('showAddCardModal'),
    setShowConfigModal: setter('showConfigModal'),
    setShowAddPageModal: setter('showAddPageModal'),
    setShowHeaderEditModal: setter('showHeaderEditModal'),
    setShowEditCardModal: setter('showEditCardModal'),
    setShowStatusPillsConfig: setter('showStatusPillsConfig'),
  };

  const entityModalActions: EntityModalActions = {
    setShowNordpoolModal: setters.setShowNordpoolModal,
    setShowCostModal: setters.setShowCostModal,
    setActiveClimateEntityModal: setters.setActiveClimateEntityModal,
    setShowLightModal: setters.setShowLightModal,
    setActiveCarModal: setters.setActiveCarModal,
    setShowPersonModal: setters.setShowPersonModal,
    setShowAndroidTVModal: setters.setShowAndroidTVModal,
    setShowAppleTVModal: setters.setShowAppleTVModal,
    setShowVacuumModal: setters.setShowVacuumModal,
    setShowMowerModal: setters.setShowMowerModal,
    setShowFanModal: setters.setShowFanModal,
    setShowSensorInfoModal: setters.setShowSensorInfoModal,
    setShowCalendarModal: setters.setShowCalendarModal,
    setShowTodoModal: setters.setShowTodoModal,
    setShowRoomModal: setters.setShowRoomModal,
    setShowCoverModal: setters.setShowCoverModal,
    setShowCameraModal: setters.setShowCameraModal,
    setShowWeatherModal: setters.setShowWeatherModal,
    setShowAlarmModal: setters.setShowAlarmModal,
    setShowAlarmActionModal: setters.setShowAlarmActionModal,
  };

  const mediaModalActions: MediaModalActions = {
    setActiveMediaModal: setters.setActiveMediaModal,
    setActiveMediaGroupKey: setters.setActiveMediaGroupKey,
    setActiveMediaGroupIds: setters.setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds: setters.setActiveMediaSessionSensorIds,
    setActiveMediaId: setters.setActiveMediaId,
  };

  const managementModalActions: ManagementModalActions = {
    setShowAddCardModal: setters.setShowAddCardModal,
    setShowConfigModal: setters.setShowConfigModal,
    setShowAddPageModal: setters.setShowAddPageModal,
    setShowHeaderEditModal: setters.setShowHeaderEditModal,
    setShowEditCardModal: setters.setShowEditCardModal,
    setShowStatusPillsConfig: setters.setShowStatusPillsConfig,
  };

  return {
    ...setters,
    entityModalActions,
    mediaModalActions,
    managementModalActions,
    hasOpenModal,
    closeAllModals,
  };
}

function createModalStore(): ModalStore {
  let state: ModalState = { ...MODAL_DEFAULTS };
  const listeners = new Set<() => void>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const getSnapshot = () => state;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const hasOpenModal = () => OPEN_CHECK_KEYS.some((key) => !!state[key]);
  const setModalValue: SetModalValue = (key, value) => {
    if (Object.is(state[key], value)) return;
    state = { ...state, [key]: value };
    emit();
  };
  const closeAllModals = () => {
    state = { ...MODAL_DEFAULTS };
    emit();
  };
  const actions = buildModalActions(setModalValue, closeAllModals, hasOpenModal);

  return {
    getSnapshot,
    subscribe,
    actions,
  };
}

/**
 * Centralised modal state via a stable external store.
 * Adding a new modal = one entry in MODAL_DEFAULTS, ModalState and the setter list
 * (+ OPEN_CHECK_KEYS if needed).
 */
export function useModals(): ModalStore {
  return useMemo(() => createModalStore(), []);
}
