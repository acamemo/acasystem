import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CardSettingsMap,
  HeaderSettings,
  PageContextValue as DashboardPageContextValue,
  PageProviderProps,
  PagesConfig,
  PageSettingsMap,
  SectionSpacing,
  StatusPillConfig,
  WidgetMemoryNotice,
} from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import {
  WIDGET_MEMORY_STORAGE_KEY,
  adoptDeviceConfig,
  isBindingSetting,
  isStructuralSetting,
  pageWidgetIds,
  propagateDeviceScoped,
  rememberWidgets,
  touchWidget,
  widgetTypeOf,
  type WidgetMemory,
  type WidgetState,
} from '@/utils/launcher/deviceMemory';
import { loadWidgetMemory, migrateStoredWidgetState } from '@/utils/launcher/widgetStateStorage';
import { DEFAULT_PAGES_CONFIG } from '@/utils/config/defaults';
import {
  DEFAULT_STATUS_GROUP_PRESET,
  STATUS_GROUP_PILL_TYPE,
  STATUS_GROUP_SELECTION_ALL,
} from '@/utils/statusGroupPills';
import { normalizeDecimalPlaces } from '@/utils/units';
import { isRecord } from '@/validators/guards';
import {
  DEFAULT_SECTION_SPACING,
  isStatusPillConfig,
  normalizeGridColumns,
  sanitizeCardSettingsMap,
  sanitizeHeaderSettings,
  sanitizePageSettingsMap,
  sanitizePagesConfig,
  sanitizeSectionSpacing,
  sanitizeStringMap,
} from '@/validators/dashboardConfig';
import { sanitizeLauncherLayout } from '@/validators/launcher';
import { LAUNCHER_LAYOUT_STORAGE_KEY as LAUNCHER_LAYOUT_KEY } from '@/utils/launcher/storage';

/** Dashboard pages plus the launcher layout; null until the launcher migrates the legacy one. */
export interface PageContextValue extends DashboardPageContextValue {
  /** True once the settings loaded after mount (page settings, names, icons) are in state. */
  settingsLoaded: boolean;
  launcherLayout: LauncherLayout | null;
  /** Saves the layout (null forgets it, so the launcher migrates again from pagesConfig). */
  persistLauncherLayout: (layout: LauncherLayout | null) => void;
}

export type { PageProviderProps };

const readJSON = (key: string, fallback: unknown): unknown => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return fallback;
  }
};

const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

const readNumber = (key: string, fallback: number | null): number | null => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    if (raw === '1' || raw === 'true') return true;
    if (raw === '0' || raw === 'false') return false;
    return fallback;
  } catch {
    return fallback;
  }
};

const CARDS_ONLY_MODE_KEY = 'tunet_cards_only_mode';

const DEFAULT_HEADER_SETTINGS: HeaderSettings = {
  showTitle: true,
  showClock: true,
  showClockOnMobile: true,
  showDate: true,
  headerStyle: 'classic',
  mobileAlignment: 'center',
  batteryVariant: 'glass',
  showBatteryNub: true,
};

const coercePillBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
};

const coerceConditionEnabled = (value: unknown): boolean | undefined => {
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return undefined;
};

function normalizeStatusPillConfig(pill: StatusPillConfig): StatusPillConfig {
  return {
    ...pill,
    visible: coercePillBoolean(pill.visible, true),
    clickable: coercePillBoolean(pill.clickable, false),
    animated: coercePillBoolean(pill.animated, true),
    showLabel: coercePillBoolean(pill.showLabel, true),
    showSublabel: coercePillBoolean(pill.showSublabel, true),
    showCover: coercePillBoolean(pill.showCover, true),
    showCount: coercePillBoolean(pill.showCount, false),
    decimals: normalizeDecimalPlaces(pill.decimals),
    hideWhenEmpty:
      pill.type === STATUS_GROUP_PILL_TYPE
        ? coercePillBoolean(pill.hideWhenEmpty, true)
        : pill.hideWhenEmpty,
    groupPreset:
      pill.type === STATUS_GROUP_PILL_TYPE && typeof pill.groupPreset !== 'string'
        ? DEFAULT_STATUS_GROUP_PRESET
        : pill.groupPreset,
    groupSelectionMode:
      pill.type === STATUS_GROUP_PILL_TYPE && typeof pill.groupSelectionMode !== 'string'
        ? STATUS_GROUP_SELECTION_ALL
        : pill.groupSelectionMode,
    groupEntityIds:
      pill.type === STATUS_GROUP_PILL_TYPE && !Array.isArray(pill.groupEntityIds)
        ? []
        : pill.groupEntityIds,
    conditionEnabled: coerceConditionEnabled(pill.conditionEnabled),
  };
}

const ROOM_CARD_DEFAULTS: Record<string, boolean> = {
  showLightChip: true,
  showMediaChip: true,
  showActiveChip: true,
  showVacuumChip: true,
  showOccupiedIndicator: false,
  showIconWatermark: true,
  showPopupClimate: true,
  showPopupLights: true,
  showPopupTempOverview: true,
  showPopupMedia: true,
  showPopupVacuum: true,
  navigateOnTap: false,
};

function migrateCardSettings(rawSettings: unknown): {
  migratedSettings: CardSettingsMap;
  changed: boolean;
} {
  const migratedSettings = sanitizeCardSettingsMap(rawSettings);
  if (!migratedSettings) return { migratedSettings: {}, changed: false };

  let changed = false;

  Object.entries(migratedSettings).forEach(([settingsKey, settings]) => {
    const isRoomSettings =
      settingsKey.includes('room_card_') ||
      String(settings.type || '').toLowerCase() === 'room' ||
      typeof settings.areaId === 'string';

    if (!isRoomSettings) return;

    const next = { ...settings };
    Object.entries(ROOM_CARD_DEFAULTS).forEach(([key, defaultValue]) => {
      if (next[key] === undefined) {
        next[key] = defaultValue;
        changed = true;
      }
    });

    migratedSettings[settingsKey] = next;
  });

  return { migratedSettings, changed };
}

function loadCardSettings(): CardSettingsMap {
  const saved = readJSON('tunet_card_settings', null);
  if (!saved) return {};

  const { migratedSettings, changed } = migrateCardSettings(saved);
  if (changed) writeJSON('tunet_card_settings', migratedSettings);
  return migratedSettings;
}

/** Synchronously load & migrate pagesConfig from localStorage. */
function loadPagesConfig(): PagesConfig {
  const parsed = readJSON('tunet_pages_config', null);
  if (!parsed) return DEFAULT_PAGES_CONFIG;
  if (!isRecord(parsed)) return DEFAULT_PAGES_CONFIG;

  let modified = false;

  // Remove legacy automations page config entirely
  if (parsed.automations) {
    delete parsed.automations;
    modified = true;
  }

  // Ensure pages array exists
  let pages: unknown[];
  if (Array.isArray(parsed.pages)) {
    pages = parsed.pages;
  } else {
    const detectedPages = Object.keys(parsed).filter(
      (key) => Array.isArray(parsed[key]) && !['header', 'settings', 'automations'].includes(key)
    );
    pages = detectedPages.length > 0 ? detectedPages : ['home'];
    modified = true;
  }

  // Filter out settings and legacy automations from pages
  pages = pages.filter((id) => id !== 'settings' && id !== 'automations');
  if (pages.length === 0) {
    pages = ['home'];
    modified = true;
  }
  parsed.pages = pages;

  // Ensure all pages have arrays
  pages.forEach((pageId) => {
    const key = String(pageId);
    if (!Array.isArray(parsed[key])) {
      parsed[key] = [];
      modified = true;
    }
  });

  // Ensure header exists
  if (!parsed.header) {
    parsed.header = [];
    modified = true;
  }

  if (modified) writeJSON('tunet_pages_config', parsed);
  return sanitizePagesConfig(parsed) ?? DEFAULT_PAGES_CONFIG;
}

/** Synchronously load & migrate status pills config from localStorage. */
function loadStatusPillsConfig(): StatusPillConfig[] {
  const parsed = readJSON('tunet_status_pills_config', []);
  if (!Array.isArray(parsed)) return [];

  const pills = parsed.filter(isStatusPillConfig);
  let modified = pills.length !== parsed.length;
  const next = pills.map((pill) => {
    const normalizedPill = normalizeStatusPillConfig(pill);
    if (normalizedPill !== pill) {
      modified = true;
    }

    if (normalizedPill.type !== 'sonos') {
      return normalizedPill;
    }

    const updates: Partial<StatusPillConfig> = {};
    if (typeof normalizedPill.clickable !== 'boolean') {
      updates.clickable = true;
      modified = true;
    }
    if (typeof normalizedPill.showCount !== 'boolean') {
      updates.showCount = true;
      modified = true;
    }
    if (typeof normalizedPill.sonosHeadingSource !== 'string') {
      updates.sonosHeadingSource = 'song';
      modified = true;
    }
    if (typeof normalizedPill.sonosSubheadingSource !== 'string') {
      updates.sonosSubheadingSource = 'artist_player';
      modified = true;
    }

    if (Object.keys(updates).length === 0) return normalizedPill;
    return { ...normalizedPill, ...updates };
  });

  if (modified) writeJSON('tunet_status_pills_config', next);
  return next;
}

const PageContext = createContext<PageContextValue | null>(null);

export const usePages = (): PageContextValue => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePages must be used within PageProvider');
  }
  return context;
};

export const PageProvider = ({ children }: PageProviderProps) => {
  // ADR-0019: the hidden widgets of an earlier version leave the pages and the settings of
  // widgets that are gone are tidied, before anything below reads the stored state.
  useState(() => migrateStoredWidgetState());
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>(loadPagesConfig);
  const [cardSettings, setCardSettings] = useState<CardSettingsMap>(loadCardSettings);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [widgetMemory, setWidgetMemory] = useState<WidgetMemory>(loadWidgetMemory);
  const [widgetMemoryNotice, setWidgetMemoryNotice] = useState<WidgetMemoryNotice | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSettingsMap>({});
  const [gridColumns, setGridColumns] = useState(4);
  const [dynamicGridColumns, setDynamicGridColumns] = useState(true);
  const [gridGapH, setGridGapH] = useState(20);
  const [gridGapV, setGridGapV] = useState(20);
  const [cardBorderRadius, setCardBorderRadius] = useState(16);
  const [headerScale, setHeaderScale] = useState(1);
  const [sectionSpacing, setSectionSpacing] = useState<SectionSpacing>(DEFAULT_SECTION_SPACING);
  const [cardsOnlyMode, setCardsOnlyMode] = useState(() => readBoolean(CARDS_ONLY_MODE_KEY, false));
  const [headerTitle, setHeaderTitle] = useState(
    () => localStorage.getItem('tunet_header_title') || ''
  );
  // The launcher migrates the legacy layout only after the page settings are loaded.
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load remaining configuration from localStorage
  useEffect(() => {
    const names = sanitizeStringMap(readJSON('tunet_custom_names', null));
    if (names) setCustomNames(names);

    const icons = sanitizeStringMap(readJSON('tunet_custom_icons', null));
    if (icons) setCustomIcons(icons);

    const savedCols = readNumber('tunet_grid_columns', null);
    if (savedCols !== null) setGridColumns(normalizeGridColumns(savedCols));

    const savedDynamicCols = readBoolean('tunet_grid_columns_dynamic', true);
    setDynamicGridColumns(savedDynamicCols);

    const savedGap = readNumber('tunet_grid_gap', null);
    const savedGapH = readNumber('tunet_grid_gap_h', null);
    const savedGapV = readNumber('tunet_grid_gap_v', null);

    if (savedGapH !== null) setGridGapH(savedGapH);
    else if (savedGap !== null) setGridGapH(savedGap);

    if (savedGapV !== null) setGridGapV(savedGapV);
    else if (savedGap !== null) setGridGapV(savedGap);

    const savedRadius = readNumber('tunet_card_border_radius', null);
    if (savedRadius !== null) setCardBorderRadius(savedRadius);

    const savedScale = readNumber('tunet_header_scale', null);
    if (savedScale !== null) setHeaderScale(savedScale);

    const spacingSaved = readJSON('tunet_section_spacing', null);
    const nextSpacing = spacingSaved ? sanitizeSectionSpacing(spacingSaved) : null;
    if (nextSpacing) {
      setSectionSpacing(nextSpacing);
    }

    const pageSettingsSaved = sanitizePageSettingsMap(readJSON('tunet_page_settings', null));
    if (pageSettingsSaved) {
      let modified = false;
      const nextSettings: PageSettingsMap = { ...pageSettingsSaved };
      Object.keys(nextSettings).forEach((pageId) => {
        if (nextSettings[pageId]?.type === 'sonos') {
          nextSettings[pageId] = { ...nextSettings[pageId], type: 'media' };
          modified = true;
        }
      });
      setPageSettings(nextSettings);
      if (modified) writeJSON('tunet_page_settings', nextSettings);
    }
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    writeJSON('tunet_pages_config', pagesConfig);
  }, [pagesConfig]);

  useEffect(() => {
    writeJSON('tunet_card_settings', cardSettings);
  }, [cardSettings]);

  // ── Memory of the widget configuration per device (ADR-0019) ──
  /** The state the memory works on, as last committed (read by the callbacks below). */
  const latest = useRef<WidgetState | null>(null);
  /** Widgets just linked to a device, waiting for the committed state to copy a configuration. */
  const pendingAdoptions = useRef(new Map<string, string | null>());
  const [adoptionTick, setAdoptionTick] = useState(0);

  /** The configuration of a widget was edited now: it decides which copy is the newest. */
  const touchWidgetConfig = useCallback((widgetId: string) => {
    setWidgetMemory((prev) => touchWidget(prev, widgetId, Date.now()));
  }, []);

  /** A widget was linked to a device: once the state is committed it may take a configuration. */
  const requestWidgetAdoption = useCallback((pageId: string | null, widgetId: string) => {
    pendingAdoptions.current.set(widgetId, pageId);
    setAdoptionTick((tick) => tick + 1);
  }, []);

  const saveCustomName = useCallback(
    (id: string, name: string) => {
      setCustomNames((prev) => {
        const newNames = { ...prev, [id]: name };
        writeJSON('tunet_custom_names', newNames);
        return newNames;
      });
      touchWidgetConfig(id);
    },
    [touchWidgetConfig]
  );

  const saveCustomIcon = useCallback(
    (id: string, iconName: string) => {
      setCustomIcons((prev) => {
        const newIcons = { ...prev, [id]: iconName };
        writeJSON('tunet_custom_icons', newIcons);
        return newIcons;
      });
      touchWidgetConfig(id);
    },
    [touchWidgetConfig]
  );

  const saveCardSetting = useCallback(
    (id: string, setting: string, value: unknown) => {
      setCardSettings((prev) =>
        propagateDeviceScoped(
          { ...prev, [id]: { ...(prev[id] || {}), [setting]: value } },
          id,
          setting,
          value
        )
      );
      const at = id.indexOf('::');
      const widgetId = at < 0 ? id : id.slice(at + 2);
      const type = widgetTypeOf(widgetId, latest.current?.cardSettings[id] ?? {});
      if (!isStructuralSetting(type, setting)) {
        touchWidgetConfig(widgetId);
      } else if (isBindingSetting(type, setting) && value) {
        requestWidgetAdoption(at < 0 ? null : id.slice(0, at), widgetId);
      }
    },
    [touchWidgetConfig, requestWidgetAdoption]
  );

  const savePageSetting = useCallback((id: string, setting: string, value: unknown) => {
    setPageSettings((prev) => {
      const newSettings: PageSettingsMap = {
        ...prev,
        [id]: { ...(prev[id] || {}), [setting]: value },
      };
      writeJSON('tunet_page_settings', newSettings);
      return newSettings;
    });
  }, []);

  const persistPageSettings = useCallback((newSettings: PageSettingsMap) => {
    setPageSettings(newSettings);
    writeJSON('tunet_page_settings', newSettings);
  }, []);

  const persistCustomNames = useCallback((newNames: Record<string, string>) => {
    setCustomNames(newNames);
    writeJSON('tunet_custom_names', newNames);
  }, []);

  const persistCustomIcons = useCallback((newIcons: Record<string, string>) => {
    setCustomIcons(newIcons);
    writeJSON('tunet_custom_icons', newIcons);
  }, []);

  const persistWidgetMemory = useCallback((next: WidgetMemory) => {
    setWidgetMemory(next);
    writeJSON(WIDGET_MEMORY_STORAGE_KEY, next);
  }, []);

  const updateHeaderScale = useCallback((newScale: number) => {
    setHeaderScale(newScale);
    try {
      localStorage.setItem('tunet_header_scale', String(newScale));
    } catch (error) {
      console.error('Failed to save header scale:', error);
    }
  }, []);

  const updateHeaderTitle = useCallback((newTitle: string) => {
    setHeaderTitle(newTitle);
    try {
      localStorage.setItem('tunet_header_title', newTitle);
    } catch (error) {
      console.error('Failed to save header title:', error);
    }
  }, []);

  const updateSectionSpacing = useCallback((partial: Partial<SectionSpacing>) => {
    setSectionSpacing((prev) => {
      const nextSpacing = { ...prev, ...partial };
      writeJSON('tunet_section_spacing', nextSpacing);
      return nextSpacing;
    });
  }, []);

  const updateCardsOnlyMode = useCallback((nextValue: boolean) => {
    const enabled = Boolean(nextValue);
    setCardsOnlyMode(enabled);
    try {
      localStorage.setItem(CARDS_ONLY_MODE_KEY, enabled ? '1' : '0');
    } catch (error) {
      console.error('Failed to save cards-only mode:', error);
    }
  }, []);

  const [headerSettings, setHeaderSettings] = useState<HeaderSettings>(() => {
    const saved = sanitizeHeaderSettings(readJSON('tunet_header_settings', undefined));
    return saved || DEFAULT_HEADER_SETTINGS;
  });

  const updateHeaderSettings = useCallback((newSettings: HeaderSettings) => {
    setHeaderSettings(newSettings);
    writeJSON('tunet_header_settings', newSettings);
  }, []);

  const [statusPillsConfig, setStatusPillsConfig] =
    useState<StatusPillConfig[]>(loadStatusPillsConfig);

  const saveStatusPillsConfig = useCallback((newConfig: StatusPillConfig[]) => {
    const normalized = Array.isArray(newConfig)
      ? newConfig.map((pill) => normalizeStatusPillConfig(pill))
      : [];
    setStatusPillsConfig(normalized);
    writeJSON('tunet_status_pills_config', normalized);
  }, []);

  const persistConfig = useCallback((newConfig: PagesConfig) => {
    setPagesConfig(newConfig);
    writeJSON('tunet_pages_config', newConfig);
  }, []);

  const persistCardSettings = useCallback((newSettings: CardSettingsMap) => {
    setCardSettings(newSettings);
    writeJSON('tunet_card_settings', newSettings);
  }, []);

  const [launcherLayout, setLauncherLayout] = useState<LauncherLayout | null>(() =>
    sanitizeLauncherLayout(readJSON(LAUNCHER_LAYOUT_KEY, null))
  );

  const persistLauncherLayout = useCallback((layout: LauncherLayout | null) => {
    setLauncherLayout(layout);
    if (layout) {
      writeJSON(LAUNCHER_LAYOUT_KEY, layout);
      return;
    }
    try {
      localStorage.removeItem(LAUNCHER_LAYOUT_KEY);
    } catch (error) {
      console.error(`Failed to remove ${LAUNCHER_LAYOUT_KEY}:`, error);
    }
  }, []);

  useLayoutEffect(() => {
    latest.current = {
      layout: launcherLayout,
      pagesConfig,
      cardSettings,
      customNames,
      customIcons,
      memory: widgetMemory,
    };
  });

  useEffect(() => {
    writeJSON(WIDGET_MEMORY_STORAGE_KEY, widgetMemory);
  }, [widgetMemory]);

  // A widget linked to a device takes the newest configuration of that device (ADR-0019).
  useEffect(() => {
    const requests = [...pendingAdoptions.current];
    pendingAdoptions.current.clear();
    let state = latest.current;
    if (requests.length === 0 || !state) return;
    const before = state;
    let source: WidgetMemoryNotice | null = null;
    for (const [widgetId, pageId] of requests) {
      const result = adoptDeviceConfig(state, pageId, widgetId, Date.now());
      if (!result) continue;
      const { source: from, ...rest } = result;
      state = { ...state, ...rest };
      if (from) source = { seq: 0, ...from };
    }
    if (state === before) return;
    if (state.cardSettings !== before.cardSettings) persistCardSettings(state.cardSettings);
    if (state.customNames !== before.customNames) persistCustomNames(state.customNames);
    if (state.customIcons !== before.customIcons) persistCustomIcons(state.customIcons);
    setWidgetMemory(state.memory);
    if (source) {
      const notice = source;
      setWidgetMemoryNotice((previous) => ({ ...notice, seq: (previous?.seq ?? 0) + 1 }));
    }
  }, [adoptionTick, persistCardSettings, persistCustomNames, persistCustomIcons]);

  /** A widget is about to be removed from a page: its configuration is kept for its device. */
  const rememberRemovedWidget = useCallback(
    (pageId: string, widgetId: string, label?: string | null) => {
      const state = latest.current;
      if (!state) return;
      setWidgetMemory((prev) =>
        rememberWidgets({ ...state, memory: prev }, pageId, [widgetId], Date.now(), (id) =>
          id === widgetId ? (label ?? null) : null
        )
      );
    },
    []
  );

  /** A page is about to be removed: so are its widgets, whose configuration is kept. */
  const rememberRemovedPage = useCallback((pageId: string) => {
    const state = latest.current;
    if (!state?.layout) return;
    const ids = pageWidgetIds(state.layout, pageId);
    setWidgetMemory((prev) => rememberWidgets({ ...state, memory: prev }, pageId, ids, Date.now()));
  }, []);

  const setGridColumnsPersisted = useCallback((val: number) => {
    const next = normalizeGridColumns(val);
    setGridColumns(next);
    try {
      localStorage.setItem('tunet_grid_columns', String(next));
    } catch (error) {
      console.error('Failed to save grid columns:', error);
    }
  }, []);

  const setDynamicGridColumnsPersisted = useCallback((val: boolean) => {
    const next = Boolean(val);
    setDynamicGridColumns(next);
    try {
      localStorage.setItem('tunet_grid_columns_dynamic', next ? '1' : '0');
    } catch (error) {
      console.error('Failed to save dynamic grid columns setting:', error);
    }
  }, []);

  const setGridGapHPersisted = useCallback((val: number) => {
    setGridGapH(val);
    try {
      localStorage.setItem('tunet_grid_gap_h', String(val));
    } catch (error) {
      console.error('Failed to save grid gap h:', error);
    }
  }, []);

  const setGridGapVPersisted = useCallback((val: number) => {
    setGridGapV(val);
    try {
      localStorage.setItem('tunet_grid_gap_v', String(val));
    } catch (error) {
      console.error('Failed to save grid gap v:', error);
    }
  }, []);

  const setCardBorderRadiusPersisted = useCallback((val: number) => {
    setCardBorderRadius(val);
    try {
      localStorage.setItem('tunet_card_border_radius', String(val));
    } catch (error) {
      console.error('Failed to save card border radius:', error);
    }
  }, []);

  const value = useMemo<PageContextValue>(
    () => ({
      pagesConfig,
      setPagesConfig,
      persistConfig,
      cardSettings,
      setCardSettings,
      saveCardSetting,
      customNames,
      saveCustomName,
      customIcons,
      saveCustomIcon,
      pageSettings,
      setPageSettings,
      persistPageSettings,
      persistCustomNames,
      persistCustomIcons,
      persistWidgetMemory,
      rememberRemovedWidget,
      rememberRemovedPage,
      requestWidgetAdoption,
      widgetMemoryNotice,
      savePageSetting,
      gridColumns,
      setGridColumns: setGridColumnsPersisted,
      dynamicGridColumns,
      setDynamicGridColumns: setDynamicGridColumnsPersisted,
      headerScale,
      updateHeaderScale,
      headerTitle,
      updateHeaderTitle,
      headerSettings,
      updateHeaderSettings,
      sectionSpacing,
      updateSectionSpacing,
      cardsOnlyMode,
      updateCardsOnlyMode,
      persistCardSettings,
      gridGapH,
      setGridGapH: setGridGapHPersisted,
      gridGapV,
      setGridGapV: setGridGapVPersisted,
      statusPillsConfig,
      saveStatusPillsConfig,
      cardBorderRadius,
      setCardBorderRadius: setCardBorderRadiusPersisted,
      settingsLoaded,
      launcherLayout,
      persistLauncherLayout,
    }),
    [
      pagesConfig,
      persistConfig,
      cardSettings,
      saveCardSetting,
      customNames,
      saveCustomName,
      customIcons,
      saveCustomIcon,
      pageSettings,
      persistPageSettings,
      persistCustomNames,
      persistCustomIcons,
      persistWidgetMemory,
      rememberRemovedWidget,
      rememberRemovedPage,
      requestWidgetAdoption,
      widgetMemoryNotice,
      savePageSetting,
      gridColumns,
      setGridColumnsPersisted,
      dynamicGridColumns,
      setDynamicGridColumnsPersisted,
      headerScale,
      updateHeaderScale,
      headerTitle,
      updateHeaderTitle,
      headerSettings,
      updateHeaderSettings,
      sectionSpacing,
      updateSectionSpacing,
      cardsOnlyMode,
      updateCardsOnlyMode,
      persistCardSettings,
      gridGapH,
      setGridGapHPersisted,
      gridGapV,
      setGridGapVPersisted,
      statusPillsConfig,
      saveStatusPillsConfig,
      cardBorderRadius,
      setCardBorderRadiusPersisted,
      settingsLoaded,
      launcherLayout,
      persistLauncherLayout,
    ]
  );

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};
