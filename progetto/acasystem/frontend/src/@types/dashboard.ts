/**
 * Tipi di dominio della dashboard: configurazione salvata, contesti React e
 * contratti degli hook. Derivati dai typedef JSDoc di Tunet 1.22.1.
 */
import type {
  ComponentType,
  CSSProperties,
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
} from 'react';
import type { Auth, Connection } from 'home-assistant-js-websocket';
import type { EntityMap, HaConfig, HaUser } from './ha';

export type { EntityMap } from './ha';

export type Setter<T> = Dispatch<SetStateAction<T>>;
export type Translate = (key: string) => string;

// ── Configurazione di connessione ───────────────────────────────────────────

export interface HomeAssistantConfig {
  url: string;
  fallbackUrl: string;
  token: string;
  authMethod: string;
  isIngress?: boolean;
}

export type UnitsMode = 'follow_ha' | 'metric' | 'imperial';

export interface ConfigProviderProps {
  children?: ReactNode;
}

/**
 * Appearance fixed by ADR-0007: one theme, Italian, the unit system of Home Assistant and
 * Inter. Nothing here can be chosen or saved.
 */
export interface FixedAppearance {
  theme: 'acasystem';
  language: 'it';
  unitsMode: 'follow_ha';
  font: 'Inter';
}

/** Configuration context: the fixed appearance plus the Home Assistant connection. */
export interface ConfigContextValue extends FixedAppearance {
  config: HomeAssistantConfig;
  setConfig: Setter<HomeAssistantConfig>;
}

// ── Contesto Home Assistant ─────────────────────────────────────────────────

export interface HomeAssistantProviderProps {
  children?: ReactNode;
  config: HomeAssistantConfig;
}

export interface HomeAssistantContextValue {
  entities: EntityMap;
  connected: boolean;
  haUnavailable: boolean;
  haUnavailableVisible: boolean;
  entitiesLoaded: boolean;
  entityDataStale: boolean;
  oauthExpired: boolean;
  conn: Connection | null;
  activeUrl: string;
  haConfig: HaConfig | null;
  lastEntityUpdateAt: number;
  disconnectedSince: number | null;
  authRef: MutableRefObject<Auth | null>;
  haUser: HaUser | null;
}

export type HomeAssistantMetaValue = Omit<HomeAssistantContextValue, 'entities'>;

// ── Configurazione salvata della dashboard ──────────────────────────────────

/** Ordine delle pagine, chip dell'intestazione e card di ogni pagina. */
export interface PagesConfig {
  pages: string[];
  header: string[];
  [pageId: string]: string[];
}

/** Impostazioni di una card: oggetto libero letto con guardie. */
export type CardSettings = Record<string, unknown>;
export type CardSettingsMap = Record<string, CardSettings>;

export interface PageSettings {
  label?: string;
  icon?: string | null;
  hidden?: boolean;
  hideSinglePagePill?: boolean;
  gridColumns?: number | null;
  type?: string;
  mediaIds?: string[];
  activeId?: string | null;
  batteryFilter?: string;
  batterySort?: string;
  lightsHideUnavailable?: boolean;
  lightsShowGroups?: boolean;
  lightsSort?: string;
  roomSort?: string;
  [key: string]: unknown;
}

export type PageSettingsMap = Record<string, PageSettings>;

export interface SectionSpacing {
  headerToStatus: number;
  statusToNav: number;
  navToGrid: number;
}

export interface HeaderSettings {
  showTitle?: boolean;
  showClock?: boolean;
  showClockOnMobile?: boolean;
  showDate?: boolean;
  showPagePillLabelsOnMobile?: boolean;
  mobileAlignment?: 'left' | 'center' | 'right';
  fontWeight?: string;
  fontFamily?: string;
  headerFont?: string;
  letterSpacing?: string;
  fontStyle?: string;
  clockFormat?: string;
  clockScale?: number;
  dateScale?: number;
  headerStyle?: string;
  batteryVariant?: 'glass' | 'outline' | 'solid';
  showBatteryNub?: boolean;
  [key: string]: unknown;
}

export type VisibilityConditionType = 'state' | 'not_state' | 'numeric' | 'attribute';
export type NumericOperator = '>' | '<' | '>=' | '<=' | '==';
export type VisibilityLogic = 'AND' | 'OR';

export interface VisibilityCondition {
  type?: VisibilityConditionType | string;
  states?: string[] | string;
  operator?: NumericOperator | string;
  value?: string | number | null;
  attribute?: string;
  forSeconds?: number | string;
  entityId?: string | null;
  logic?: VisibilityLogic | string;
  enabled?: boolean;
  rules?: VisibilityCondition[];
  [key: string]: unknown;
}

export interface StatusPillConfig {
  id: string;
  /** 'alarm' | 'media_player' | 'emby' | 'sonos' | 'sensor' | 'group_status' … */
  type: string;
  visible?: boolean;
  clickable?: boolean;
  animated?: boolean;
  showLabel?: boolean;
  showSublabel?: boolean;
  showCover?: boolean;
  showCount?: boolean;
  decimals?: number | null;
  entityId?: string;
  label?: string;
  name?: string;
  sublabel?: string;
  mediaFilter?: string;
  mediaFilterMode?: string;
  mediaEntityIds?: string[];
  groupPreset?: string;
  groupSelectionMode?: string;
  groupEntityIds?: string[];
  groupThreshold?: number | string;
  hideWhenEmpty?: boolean;
  mediaSelectionMode?: string;
  sonosHeadingSource?: string;
  sonosSubheadingSource?: string;
  playerNameDisplayFilter?: string;
  sessionSensorIds?: string[];
  conditionEnabled?: boolean;
  animationPreset?: string;
  icon?: string;
  iconBgColor?: string;
  iconColor?: string;
  [key: string]: unknown;
}

export type SensorActionType =
  | 'auto'
  | 'more-info'
  | 'toggle'
  | 'turn_on'
  | 'turn_off'
  | 'scene'
  | 'script'
  | 'press'
  | 'service'
  | 'none';

export interface SensorCardAction {
  type?: SensorActionType;
  entityId?: string;
  service?: string;
  targetMode?: 'entity' | 'none';
  data?: Record<string, unknown>;
  label?: string | null;
  labelOn?: string | null;
  labelOff?: string | null;
  icon?: string | null;
  trigger?: 'button' | 'icon' | 'card';
}

export interface SensorCardSettings {
  type?: 'sensor';
  entityId?: string;
  size?: 'small' | 'large';
  mobileWidth?: 'auto' | 'compact' | 'full';
  sensorStatusMode?: 'auto' | 'text' | 'entity' | 'attribute' | 'hidden' | null;
  sensorStatusText?: string | null;
  sensorStatusEntityId?: string | null;
  sensorStatusAttribute?: string | null;
  sensorAction?: SensorCardAction | null;
}

// ── Contesto delle pagine ───────────────────────────────────────────────────

export interface PageProviderProps {
  children?: ReactNode;
}

export interface PageContextValue {
  pagesConfig: PagesConfig;
  setPagesConfig: Setter<PagesConfig>;
  persistConfig: (newConfig: PagesConfig) => void;
  cardSettings: CardSettingsMap;
  setCardSettings: Setter<CardSettingsMap>;
  saveCardSetting: (id: string, setting: string, value: unknown) => void;
  customNames: Record<string, string>;
  saveCustomName: (id: string, name: string) => void;
  customIcons: Record<string, string>;
  saveCustomIcon: (id: string, iconName: string) => void;
  hiddenCards: string[];
  toggleCardVisibility: (cardId: string) => void;
  pageSettings: PageSettingsMap;
  setPageSettings: Setter<PageSettingsMap>;
  persistPageSettings: (newSettings: PageSettingsMap) => void;
  persistCustomNames: (newNames: Record<string, string>) => void;
  persistCustomIcons: (newIcons: Record<string, string>) => void;
  persistHiddenCards: (newHidden: string[]) => void;
  savePageSetting: (id: string, setting: string, value: unknown) => void;
  gridColumns: number;
  setGridColumns: (val: number) => void;
  dynamicGridColumns: boolean;
  setDynamicGridColumns: (val: boolean) => void;
  headerScale: number;
  updateHeaderScale: (newScale: number) => void;
  headerTitle: string;
  updateHeaderTitle: (newTitle: string) => void;
  headerSettings: HeaderSettings;
  updateHeaderSettings: (newSettings: HeaderSettings) => void;
  sectionSpacing: SectionSpacing;
  updateSectionSpacing: (partial: Partial<SectionSpacing>) => void;
  cardsOnlyMode: boolean;
  updateCardsOnlyMode: (nextValue: boolean) => void;
  persistCardSettings: (newSettings: CardSettingsMap) => void;
  gridGapH: number;
  setGridGapH: (val: number) => void;
  gridGapV: number;
  setGridGapV: (val: number) => void;
  statusPillsConfig: StatusPillConfig[];
  saveStatusPillsConfig: (newConfig: StatusPillConfig[]) => void;
  cardBorderRadius: number;
  setCardBorderRadius: (val: number) => void;
}

// ── Stato dell'interfaccia ──────────────────────────────────────────────────

export interface AppUiContextValue {
  activeVacuumId: string | null;
  setActiveVacuumId: Setter<string | null>;
  activeMowerId: string | null;
  setActiveMowerId: Setter<string | null>;
  showThemeSidebar: boolean;
  setShowThemeSidebar: Setter<boolean>;
  showLayoutSidebar: boolean;
  setShowLayoutSidebar: Setter<boolean>;
  editCardSettingsKey: string | null;
  setEditCardSettingsKey: Setter<string | null>;
  editMode: boolean;
  setEditMode: Setter<boolean>;
}

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  message: string;
  type?: ToastType;
}

export interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
  toasts: Toast[];
}

// ── Connessione e onboarding ────────────────────────────────────────────────

export interface UseConnectionSetupDeps {
  config: HomeAssistantConfig;
  setConfig: (config: HomeAssistantConfig) => void;
  connected: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  showConfigModal: boolean;
  setShowConfigModal: (show: boolean) => void;
  t: Translate;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface UseConnectionSetupResult {
  onboardingStep: number;
  setOnboardingStep: Setter<number>;
  onboardingUrlError: string;
  setOnboardingUrlError: Setter<string>;
  onboardingTokenError: string;
  setOnboardingTokenError: Setter<string>;
  testingConnection: boolean;
  testConnection: () => Promise<void>;
  connectionTestResult: ConnectionTestResult | null;
  setConnectionTestResult: Setter<ConnectionTestResult | null>;
  configTab: string;
  setConfigTab: Setter<string>;
  startOAuthLogin: (url?: string) => void;
  handleOAuthLogout: () => void;
  canAdvanceOnboarding: boolean;
  isOnboardingActive: boolean;
}

// ── Gestione delle pagine ───────────────────────────────────────────────────

export interface PageDefault {
  label?: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface UsePageManagementDeps {
  pagesConfig: PagesConfig;
  persistConfig: (newConfig: PagesConfig) => void;
  pageSettings: PageSettingsMap;
  persistPageSettings: (newSettings: PageSettingsMap) => void;
  savePageSetting: (id: string, setting: string, value: unknown) => void;
  pageDefaults: Record<string, PageDefault>;
  activePage: string;
  setActivePage: (pageId: string) => void;
  showAddPageModal: boolean;
  setShowAddPageModal: (show: boolean) => void;
  showAddCardModal?: boolean;
  setShowAddCardModal?: (show: boolean) => void;
  t: Translate;
}

export interface UsePageManagementResult {
  newPageLabel: string;
  setNewPageLabel: Setter<string>;
  newPageIcon: string | null;
  setNewPageIcon: Setter<string | null>;
  editingPage: string | null;
  setEditingPage: Setter<string | null>;
  createPage: () => void;
  createMediaPage: () => void;
  createSonosPage: () => void;
  createLightsPage: () => void;
  createBatteryPage: () => void;
  createRoomExplorerPage: () => void;
  deletePage: (pageId: string | null | undefined) => void;
  removeCard: (cardId: string, listName?: string) => void;
}

// ── Aggiunta delle card ─────────────────────────────────────────────────────

export type GetCardSettingsKey = (cardId: string, pageId?: string) => string;

export interface UseAddCardDeps {
  showAddCardModal: boolean;
  activePage: string;
  isMediaPage?: (pageId: string) => boolean;
  isSonosPage?: (pageId: string) => boolean;
  isLightsPage?: (pageId: string) => boolean;
  isBatteryPage?: (pageId: string) => boolean;
  isRoomExplorerPage?: (pageId: string) => boolean;
  pagesConfig: PagesConfig;
  persistConfig: (newConfig: PagesConfig) => void;
  cardSettings: CardSettingsMap;
  persistCardSettings: (newSettings: CardSettingsMap) => void;
  hiddenCards?: string[];
  persistHiddenCards?: ((newHidden: string[]) => void) | null;
  getCardSettingsKey: GetCardSettingsKey;
  saveCardSetting?: (id: string, setting: string, value: unknown) => void;
  setShowAddCardModal: (show: boolean) => void;
  setShowEditCardModal: (cardId: string | null) => void;
  setEditCardSettingsKey: (key: string | null) => void;
  t: Translate;
}

export interface AddSelectedOptions {
  spacerVariant?: string;
}

export interface UseAddCardResult {
  addCardTargetPage: string;
  setAddCardTargetPage: Setter<string>;
  addCardType: string;
  setAddCardType: Setter<string>;
  searchTerm: string;
  setSearchTerm: Setter<string>;
  selectedEntities: string[];
  setSelectedEntities: Setter<string[]>;
  selectedWeatherId: string | null;
  setSelectedWeatherId: Setter<string | null>;
  selectedTempId: string | null;
  setSelectedTempId: Setter<string | null>;
  selectedAndroidTVMediaId: string | null;
  setSelectedAndroidTVMediaId: Setter<string | null>;
  selectedAndroidTVRemoteId: string | null;
  setSelectedAndroidTVRemoteId: Setter<string | null>;
  selectedAppleTVMediaId: string | null;
  setSelectedAppleTVMediaId: Setter<string | null>;
  selectedAppleTVRemoteId: string | null;
  setSelectedAppleTVRemoteId: Setter<string | null>;
  selectedCostTodayId: string | null;
  setSelectedCostTodayId: Setter<string | null>;
  selectedCostMonthId: string | null;
  setSelectedCostMonthId: Setter<string | null>;
  costSelectionTarget: string;
  setCostSelectionTarget: Setter<string>;
  selectedNordpoolId: string | null;
  setSelectedNordpoolId: Setter<string | null>;
  nordpoolDecimals: number;
  setNordpoolDecimals: Setter<number>;
  selectedSpacerVariant: string;
  setSelectedSpacerVariant: Setter<string>;
  onAddSelected: (options?: AddSelectedOptions | object) => void;
  getAddCardAvailableLabel: () => string;
  getAddCardNoneLeftLabel: () => string;
}

// ── Griglia ─────────────────────────────────────────────────────────────────

export interface ResponsiveGridResult {
  gridColCount: number;
  isCompactCards: boolean;
  isMobile: boolean;
  viewportWidth: number;
}

// ── Modali ──────────────────────────────────────────────────────────────────

export interface EntityModalTarget {
  entityId: string;
  cardId?: string;
  settingsKey?: string;
}

export interface AlarmActionTarget {
  cardId: string;
  actionKey: string;
}

export interface StatusGroupModalTarget {
  pill: StatusPillConfig;
  presetId: string;
}

/**
 * Stato dei modali. I valori `boolean` accanto agli id rispecchiano le chiamate
 * esistenti (per esempio `setShowVacuumModal(true)` o `setShowCalendarModal(false)`).
 */
export interface ModalState {
  showNordpoolModal: string | null;
  showCostModal: string | null;
  activeClimateEntityModal: string | EntityModalTarget | null;
  showLightModal: string | null;
  activeCarModal: string | null;
  showPersonModal: string | null;
  showAndroidTVModal: string | null;
  showAppleTVModal: string | null;
  showVacuumModal: string | boolean | null;
  showMowerModal: string | boolean | null;
  showFanModal: string | null;
  showSensorInfoModal: string | EntityModalTarget | null;
  showCalendarModal: string | boolean | null;
  showTodoModal: string | null;
  showRoomModal: string | null;
  showCoverModal: string | null;
  showCameraModal: string | null;
  showWeatherModal: string | null;
  showAlarmModal: string | null;
  showAlarmActionModal: AlarmActionTarget | null;
  activeMediaModal: string | null;
  activeMediaGroupKey: string | null;
  activeMediaGroupIds: string[] | null;
  activeMediaSessionSensorIds: string[] | null;
  activeMediaId: string | null;
  showStatusGroupModal: StatusGroupModalTarget | null;
  showAddCardModal: boolean;
  showConfigModal: boolean;
  showAddPageModal: boolean;
  showHeaderEditModal: boolean;
  /** Id della card in modifica; `false`/`undefined` arrivano dai setter protetti e chiudono. */
  showEditCardModal: string | false | null | undefined;
  showStatusPillsConfig: boolean;
}

export type ModalKey = keyof ModalState;

/** `showLightModal` → `setShowLightModal`, con il tipo del valore corrispondente. */
export type ModalSetters = {
  [K in ModalKey as `set${Capitalize<K>}`]: (value: ModalState[K]) => void;
};

export type EntityModalActions = Pick<
  ModalSetters,
  | 'setShowNordpoolModal'
  | 'setShowCostModal'
  | 'setActiveClimateEntityModal'
  | 'setShowLightModal'
  | 'setActiveCarModal'
  | 'setShowPersonModal'
  | 'setShowAndroidTVModal'
  | 'setShowAppleTVModal'
  | 'setShowVacuumModal'
  | 'setShowMowerModal'
  | 'setShowFanModal'
  | 'setShowSensorInfoModal'
  | 'setShowCalendarModal'
  | 'setShowTodoModal'
  | 'setShowRoomModal'
  | 'setShowCoverModal'
  | 'setShowCameraModal'
  | 'setShowWeatherModal'
  | 'setShowAlarmModal'
  | 'setShowAlarmActionModal'
>;

export type MediaModalActions = Pick<
  ModalSetters,
  | 'setActiveMediaModal'
  | 'setActiveMediaGroupKey'
  | 'setActiveMediaGroupIds'
  | 'setActiveMediaSessionSensorIds'
  | 'setActiveMediaId'
>;

export type ManagementModalActions = Pick<
  ModalSetters,
  | 'setShowAddCardModal'
  | 'setShowConfigModal'
  | 'setShowAddPageModal'
  | 'setShowHeaderEditModal'
  | 'setShowEditCardModal'
  | 'setShowStatusPillsConfig'
>;

export type ModalActions = ModalSetters & {
  entityModalActions: EntityModalActions;
  mediaModalActions: MediaModalActions;
  managementModalActions: ManagementModalActions;
  hasOpenModal: () => boolean;
  closeAllModals: () => void;
};

export type UseModalsResult = ModalState & ModalActions;

export interface ModalStore {
  getSnapshot: () => ModalState;
  subscribe: (listener: () => void) => () => void;
  actions: ModalActions;
}

// ── Effetti della dashboard ─────────────────────────────────────────────────

export interface UseDashboardEffectsDeps {
  resolvedHeaderTitle: string;
  inactivityTimeout: number;
  resetToHome: () => void;
  activeMediaModal: string | null;
}

export interface UseDashboardEffectsResult {
  now: Date;
  mediaTick: number;
  optimisticLightBrightness: Record<string, number>;
  setOptimisticLightBrightness: Setter<Record<string, number>>;
}

export interface AppContentProps {
  showOnboarding: boolean;
  setShowOnboarding: Setter<boolean>;
}

export interface CardBaseProps {
  cardId: string;
  dragProps: Record<string, unknown>;
  controls: ReactNode;
  cardStyle: CSSProperties;
  editMode: boolean;
  isMobile?: boolean;
  entities?: EntityMap;
  customNames?: Record<string, string>;
  customIcons?: Record<string, string>;
  t: Translate;
  onOpen?: (...args: unknown[]) => void;
}
