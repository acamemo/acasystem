/**
 * Config snapshot — collect/apply dashboard configuration.
 *
 * A snapshot captures layout, card settings, and appearance — everything
 * a user would want to back up or transfer.  Credentials (HA URL, token,
 * OAuth tokens) are intentionally excluded for security.
 */

import type { UnitsMode } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import type { CollectedSnapshot, SnapshotContextSetters } from '@/@types/snapshot';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '@/utils/i18n';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { isObject, type UnknownRecord } from '@/validators/guards';
import {
  isPartialSectionSpacing,
  sanitizeCardSettingsMap,
  sanitizeHeaderSettings,
  sanitizePageSettingsMap,
  sanitizePagesConfig,
  sanitizeStatusPills,
  sanitizeStringList,
  sanitizeStringMap,
} from '@/validators/dashboardConfig';
import { isValidSnapshot, snapshotLauncherLayout } from '@/validators/snapshot';

export type {
  CollectedSnapshot,
  DashboardSnapshot,
  SnapshotContextSetters,
} from '@/@types/snapshot';
export { isValidSnapshot };

/** Setter of the launcher layout in PageContext (null: migrate again from pagesConfig). */
export interface LauncherSnapshotSetters {
  persistLauncherLayout?: (layout: LauncherLayout | null) => void;
}

const SNAPSHOT_VERSION = 1;

// ── helpers ──────────────────────────────────────────────────────────

const readJSON = (key: string, fallback: unknown = null): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const readNumber = (key: string, fallback: number): number => {
  const raw = localStorage.getItem(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return fallback;
};

const normalizeSnapshotLanguage = (language: unknown) => normalizeLanguage(language);

/** Testo per i setter: `null`/`undefined` diventano stringa vuota (valore «assente»). */
const toText = (value: unknown): string => (value == null ? '' : String(value));

const isUnitsMode = (value: unknown): value is UnitsMode =>
  value === 'follow_ha' || value === 'metric' || value === 'imperial';

// ── collect ──────────────────────────────────────────────────────────

/**
 * Read all relevant localStorage keys and return a versioned snapshot object.
 */
export function collectSnapshot(): CollectedSnapshot {
  const snapshot: CollectedSnapshot = {
    version: SNAPSHOT_VERSION,
    layout: {
      pagesConfig: readJSON('tunet_pages_config', { header: [], pages: ['home'], home: [] }),
      cardSettings: readJSON('tunet_card_settings', {}),
      hiddenCards: readJSON('tunet_hidden_cards', []),
      customNames: readJSON('tunet_custom_names', {}),
      customIcons: readJSON('tunet_custom_icons', {}),
      pageSettings: readJSON('tunet_page_settings', {}),
      gridColumns: readNumber('tunet_grid_columns', 4),
      dynamicGridColumns: readBoolean('tunet_grid_columns_dynamic', true),
      gridGapH: readNumber('tunet_grid_gap_h', 20),
      gridGapV: readNumber('tunet_grid_gap_v', 20),
      cardBorderRadius: readNumber('tunet_card_border_radius', 16),
      cardsOnlyMode: readBoolean('tunet_cards_only_mode', false),
      headerSettings: readJSON('tunet_header_settings', {
        showTitle: true,
        showClock: true,
        showDate: true,
      }),
      headerTitle: localStorage.getItem('tunet_header_title') || '',
      headerScale: readNumber('tunet_header_scale', 1),
      sectionSpacing: readJSON('tunet_section_spacing', {
        headerToStatus: 16,
        statusToNav: 24,
        navToGrid: 24,
      }),
      statusPillsConfig: readJSON('tunet_status_pills_config', []),
    },
    appearance: {
      theme: localStorage.getItem('tunet_theme') || 'dark',
      language: normalizeSnapshotLanguage(
        localStorage.getItem('tunet_language') || DEFAULT_LANGUAGE
      ),
      appFont: localStorage.getItem('tunet_app_font') || 'sans',
      unitsMode: localStorage.getItem('tunet_units_mode') || 'follow_ha',
      bgMode: localStorage.getItem('tunet_bg_mode') || 'theme',
      bgColor: localStorage.getItem('tunet_bg_color') || '#0f172a',
      bgGradient: localStorage.getItem('tunet_bg_gradient') || 'midnight',
      bgImage: localStorage.getItem('tunet_bg_image') || '',
      cardBgColor: localStorage.getItem('tunet_card_bg_color') || '',
      cardTransparency: readNumber('tunet_card_transparency', 40),
      cardBorderOpacity: readNumber('tunet_card_border_opacity', 5),
      inactivityTimeout: readNumber('tunet_inactivity_timeout', 60),
    },
  };
  // Launcher layout (ADR-0007): cells per device class, synchronised with the rest.
  const layout = {
    ...snapshot.layout,
    launcherLayout: readJSON(LAUNCHER_LAYOUT_STORAGE_KEY, null),
  };
  return { ...snapshot, layout };
}

// ── apply ────────────────────────────────────────────────────────────

const writeJSON = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

/**
 * Write a snapshot into localStorage AND update React context state via
 * the provided setter object.
 *
 * localStorage receives the snapshot values as they are; the context setters
 * receive values checked by the validators (malformed sections are skipped).
 *
 * @param snapshot Versioned snapshot (from collectSnapshot or API)
 * @param contextSetters Object with setter functions from PageContext + ConfigContext
 */
export function applySnapshot(
  snapshot: unknown,
  contextSetters: SnapshotContextSetters & LauncherSnapshotSetters = {}
): void {
  if (!isObject(snapshot)) return;

  const layout: UnknownRecord = isObject(snapshot.layout) ? snapshot.layout : {};
  const appearance: UnknownRecord = isObject(snapshot.appearance) ? snapshot.appearance : {};

  // ── Launcher layout: the cleaned layout, or none (the launcher migrates again from
  // pagesConfig) when the snapshot brings pages without a valid launcher layout ──
  const launcherLayout = snapshotLauncherLayout(layout);
  if (launcherLayout) {
    writeJSON(LAUNCHER_LAYOUT_STORAGE_KEY, launcherLayout);
    contextSetters.persistLauncherLayout?.(launcherLayout);
  } else if (launcherLayout === null || layout.pagesConfig) {
    localStorage.removeItem(LAUNCHER_LAYOUT_STORAGE_KEY);
    contextSetters.persistLauncherLayout?.(null);
  }

  // ── Layout → localStorage ──
  if (layout.pagesConfig) writeJSON('tunet_pages_config', layout.pagesConfig);
  if (layout.cardSettings) writeJSON('tunet_card_settings', layout.cardSettings);
  if (layout.hiddenCards) writeJSON('tunet_hidden_cards', layout.hiddenCards);
  if (layout.customNames) writeJSON('tunet_custom_names', layout.customNames);
  if (layout.customIcons) writeJSON('tunet_custom_icons', layout.customIcons);
  if (layout.pageSettings) writeJSON('tunet_page_settings', layout.pageSettings);
  if (layout.statusPillsConfig) writeJSON('tunet_status_pills_config', layout.statusPillsConfig);
  if (layout.headerSettings) writeJSON('tunet_header_settings', layout.headerSettings);
  if (layout.sectionSpacing) writeJSON('tunet_section_spacing', layout.sectionSpacing);

  if (layout.gridColumns !== undefined)
    localStorage.setItem('tunet_grid_columns', String(layout.gridColumns));
  if (layout.dynamicGridColumns !== undefined)
    localStorage.setItem('tunet_grid_columns_dynamic', layout.dynamicGridColumns ? '1' : '0');
  if (layout.gridGapH !== undefined)
    localStorage.setItem('tunet_grid_gap_h', String(layout.gridGapH));
  if (layout.gridGapV !== undefined)
    localStorage.setItem('tunet_grid_gap_v', String(layout.gridGapV));
  if (layout.cardBorderRadius !== undefined)
    localStorage.setItem('tunet_card_border_radius', String(layout.cardBorderRadius));
  if (layout.cardsOnlyMode !== undefined)
    localStorage.setItem('tunet_cards_only_mode', layout.cardsOnlyMode ? '1' : '0');
  if (layout.headerScale !== undefined)
    localStorage.setItem('tunet_header_scale', String(layout.headerScale));
  if (layout.headerTitle !== undefined)
    localStorage.setItem('tunet_header_title', String(layout.headerTitle));

  // ── Appearance → localStorage ──
  if (appearance.theme) localStorage.setItem('tunet_theme', String(appearance.theme));
  if (appearance.language)
    localStorage.setItem('tunet_language', normalizeSnapshotLanguage(appearance.language));
  if (appearance.appFont) localStorage.setItem('tunet_app_font', String(appearance.appFont));
  if (appearance.unitsMode) localStorage.setItem('tunet_units_mode', String(appearance.unitsMode));
  if (appearance.bgMode) localStorage.setItem('tunet_bg_mode', String(appearance.bgMode));
  if (appearance.bgColor) localStorage.setItem('tunet_bg_color', String(appearance.bgColor));
  if (appearance.bgGradient)
    localStorage.setItem('tunet_bg_gradient', String(appearance.bgGradient));
  if (appearance.bgImage !== undefined)
    localStorage.setItem('tunet_bg_image', String(appearance.bgImage));
  if (appearance.cardBgColor !== undefined) {
    if (appearance.cardBgColor) {
      localStorage.setItem('tunet_card_bg_color', String(appearance.cardBgColor));
    } else {
      localStorage.removeItem('tunet_card_bg_color');
    }
  }
  if (appearance.cardTransparency !== undefined)
    localStorage.setItem('tunet_card_transparency', String(appearance.cardTransparency));
  if (appearance.cardBorderOpacity !== undefined)
    localStorage.setItem('tunet_card_border_opacity', String(appearance.cardBorderOpacity));
  if (appearance.inactivityTimeout !== undefined)
    localStorage.setItem('tunet_inactivity_timeout', String(appearance.inactivityTimeout));

  // ── Update React contexts (if setters provided) ──
  const s = contextSetters;
  const pagesConfig = layout.pagesConfig ? sanitizePagesConfig(layout.pagesConfig) : null;
  const cardSettings = layout.cardSettings ? sanitizeCardSettingsMap(layout.cardSettings) : null;
  const pageSettings = layout.pageSettings ? sanitizePageSettingsMap(layout.pageSettings) : null;
  const customNames = layout.customNames ? sanitizeStringMap(layout.customNames) : null;
  const customIcons = layout.customIcons ? sanitizeStringMap(layout.customIcons) : null;
  const hiddenCards = layout.hiddenCards ? sanitizeStringList(layout.hiddenCards) : null;
  const headerSettings = layout.headerSettings
    ? sanitizeHeaderSettings(layout.headerSettings)
    : null;
  const statusPills = layout.statusPillsConfig
    ? sanitizeStatusPills(layout.statusPillsConfig)
    : null;

  // PageContext setters
  if (s.persistConfig && pagesConfig) s.persistConfig(pagesConfig);
  if (s.persistCardSettings && cardSettings) s.persistCardSettings(cardSettings);
  if (s.persistPageSettings && pageSettings) s.persistPageSettings(pageSettings);
  if (s.persistCustomNames && customNames) s.persistCustomNames(customNames);
  if (s.persistCustomIcons && customIcons) s.persistCustomIcons(customIcons);
  if (s.persistHiddenCards && hiddenCards) s.persistHiddenCards(hiddenCards);
  if (s.setGridColumns && layout.gridColumns !== undefined)
    s.setGridColumns(Number(layout.gridColumns));
  if (s.setDynamicGridColumns && layout.dynamicGridColumns !== undefined)
    s.setDynamicGridColumns(Boolean(layout.dynamicGridColumns));
  if (s.setGridGapH && layout.gridGapH !== undefined) s.setGridGapH(Number(layout.gridGapH));
  if (s.setGridGapV && layout.gridGapV !== undefined) s.setGridGapV(Number(layout.gridGapV));
  if (s.setCardBorderRadius && layout.cardBorderRadius !== undefined)
    s.setCardBorderRadius(Number(layout.cardBorderRadius));
  if (s.updateCardsOnlyMode && layout.cardsOnlyMode !== undefined)
    s.updateCardsOnlyMode(Boolean(layout.cardsOnlyMode));
  if (s.updateHeaderScale && layout.headerScale !== undefined)
    s.updateHeaderScale(Number(layout.headerScale));
  if (s.updateHeaderTitle && layout.headerTitle !== undefined)
    s.updateHeaderTitle(toText(layout.headerTitle));
  if (s.updateHeaderSettings && headerSettings) s.updateHeaderSettings(headerSettings);
  if (
    s.updateSectionSpacing &&
    layout.sectionSpacing &&
    isPartialSectionSpacing(layout.sectionSpacing)
  )
    s.updateSectionSpacing(layout.sectionSpacing);
  if (s.saveStatusPillsConfig && statusPills) s.saveStatusPillsConfig(statusPills);

  // ConfigContext setters
  if (s.setCurrentTheme && appearance.theme) s.setCurrentTheme(String(appearance.theme));
  if (s.setLanguage && appearance.language)
    s.setLanguage(normalizeSnapshotLanguage(appearance.language));
  if (s.setAppFont && appearance.appFont) s.setAppFont(String(appearance.appFont));
  if (s.setUnitsMode && appearance.unitsMode && isUnitsMode(appearance.unitsMode))
    s.setUnitsMode(appearance.unitsMode);
  if (s.setBgMode && appearance.bgMode) s.setBgMode(String(appearance.bgMode));
  if (s.setBgColor && appearance.bgColor) s.setBgColor(String(appearance.bgColor));
  if (s.setBgGradient && appearance.bgGradient) s.setBgGradient(String(appearance.bgGradient));
  if (s.setBgImage && appearance.bgImage !== undefined) s.setBgImage(toText(appearance.bgImage));
  if (s.setCardBgColor && appearance.cardBgColor !== undefined)
    s.setCardBgColor(toText(appearance.cardBgColor));
  if (s.setCardTransparency && appearance.cardTransparency !== undefined)
    s.setCardTransparency(Number(appearance.cardTransparency));
  if (s.setCardBorderOpacity && appearance.cardBorderOpacity !== undefined)
    s.setCardBorderOpacity(Number(appearance.cardBorderOpacity));
  if (s.setInactivityTimeout && appearance.inactivityTimeout !== undefined)
    s.setInactivityTimeout(Number(appearance.inactivityTimeout));
}
