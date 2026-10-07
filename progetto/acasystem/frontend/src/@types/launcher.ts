/**
 * Launcher contract (ADR-0007, REP-20261006-001 wave 2).
 *
 * Shared by the launcher (pages, grid, edit mode), the widgets of every domain and the
 * system sheets. A widget id is the legacy Tunet card id (e.g. `light.kitchen`,
 * `climate_card_2`), so existing card settings keep working.
 */
import type { ComponentType } from 'react';
import type { CallService, Connection, EntityMap, HaConfig } from './ha';
import type { CardSettings, CardSettingsMap, PageSettings, Translate } from './dashboard';

/** Size in grid cells. */
export interface CellSize {
  w: number;
  h: number;
}

/** Rectangle in grid cells; x/y are 0-based from the top-left cell. */
export interface CellRect extends CellSize {
  x: number;
  y: number;
}

/** Each device class keeps its own placements, like separate Android home screens. */
export type DeviceClass = 'phone' | 'phoneLandscape' | 'tabletPortrait' | 'tablet';

/** Kinds of launcher pages: a widget grid or one of the special full-page views of Tunet. */
export type PageKind = 'widgets' | 'lights' | 'battery' | 'rooms' | 'media' | 'sonos';

export interface LauncherPage {
  /** Same ids as the legacy `pagesConfig.pages` (e.g. `home`). */
  id: string;
  label: string;
  /** Icon name as stored by the legacy page settings. */
  icon?: string;
  kind: PageKind;
  hidden?: boolean;
  /** Origin of an overflow page; membership stays shared across its device-class layouts. */
  continuationOf?: string;
  /** Widget placements per device class; a missing class is packed from another one on first use. */
  placements: Partial<Record<DeviceClass, Record<string, CellRect>>>;
}

export interface LauncherLayout {
  version: 1;
  /** Cover page (calendar and clock) shown before the widget pages. */
  cover: { enabled: boolean };
  pages: LauncherPage[];
}

/** Columns × rows of one page for each device class. Pages never scroll vertically. */
export type LauncherGrids = Record<DeviceClass, CellSize>;

/** Data and actions available to every widget, provided by the launcher (or by fixtures). */
export interface WidgetRuntime {
  entities: EntityMap;
  entitiesLoaded: boolean;
  conn: Connection | null;
  callService: CallService;
  t: Translate;
  language: string;
  cardSettings: CardSettingsMap;
  saveCardSetting: (settingsKey: string, key: string, value: unknown) => void;
  customNames: Record<string, string>;
  customIcons: Record<string, string>;
  /** Absolute URL for an HA-relative image path (entity pictures, camera proxies). */
  getEntityImageUrl: (path?: string | null) => string | null;
  /** Opens the detail sheet of a widget. */
  openDetails: (widgetId: string) => void;
  editMode: boolean;
  /**
   * Home Assistant system configuration (`get_config`): unit system, currency, time zone.
   * Null until loaded. Widgets use it for units and currency instead of guessing (wave 3).
   */
  haConfig: HaConfig | null;
}

export interface WidgetProps {
  /** Widget id = legacy card id. */
  id: string;
  /** Key into `cardSettings` (legacy `getCardSettingsKey`). */
  settingsKey: string;
  settings: CardSettings;
  /** Current size in cells: widgets adapt their density to it. */
  size: CellSize;
  editMode: boolean;
}

export interface WidgetDetailsProps {
  id: string;
  settingsKey: string;
  settings: CardSettings;
  onClose: () => void;
}

export interface WidgetSizes {
  min: CellSize;
  max: CellSize;
  default: CellSize;
}

/**
 * A widget type. The launcher (WidgetHost) draws the kit frame around every widget: a widget
 * renders **content only**, never its own Card/Surface frame. The area that opens the details
 * is a transparent button marked `data-widget-open`, so the frame gives press feedback only for
 * that area and not for the widget's own commands. Gestures that hold the pointer (sliders,
 * knobs) set `data-no-long-press` so they do not enter edit mode.
 */
export interface WidgetDefinition {
  /** Stable type key, e.g. `light`, `sensor`, `climate`. */
  type: string;
  /** Italian label for the add-widget sheet (sentence case). */
  label: string;
  /** mx-icons name exposed by the Icon primitive. */
  icon: string;
  sizes: WidgetSizes;
  /** True when this definition renders the given card id (mirrors the legacy registry prefixes). */
  matches: (id: string, settings: CardSettings) => boolean;
  Widget: ComponentType<WidgetProps>;
  /** Content of the detail sheet; the launcher wraps it in the Sheet primitive. */
  Details?: ComponentType<WidgetDetailsProps>;
  /** Drawn without the kit frame (e.g. the spacer). */
  frameless?: boolean;
}

/** Props of a special full page: its own saved settings (legacy `pageSettings[pageId]`). */
export interface PageKindProps {
  pageId: string;
  settings: PageSettings;
  onSaveSetting: (key: string, value: unknown) => void;
}

export interface PageKindDefinition {
  kind: Exclude<PageKind, 'widgets'>;
  label: string;
  Page: ComponentType<PageKindProps>;
}

/** Launcher state and actions, implemented by the launcher controller (wave 2, B1). */
export interface LauncherApi {
  layout: LauncherLayout;
  grids: LauncherGrids;
  deviceClass: DeviceClass;
  /** Index in the pager: 0 is the cover when enabled. */
  currentPage: number;
  goToPage: (index: number) => void;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  /**
   * Places a widget in the first free rectangle of the page (a new page if none fits); with
   * `at`, on that free cell or as close to it as possible.
   */
  placeWidget: (
    pageId: string,
    widgetId: string,
    size?: CellSize,
    at?: Pick<CellRect, 'x' | 'y'>
  ) => void;
  moveWidget: (pageId: string, widgetId: string, to: CellRect) => boolean;
  resizeWidget: (pageId: string, widgetId: string, size: CellSize) => boolean;
  removeWidget: (pageId: string, widgetId: string) => void;
  addPage: (page: { label: string; icon?: string; kind?: PageKind }) => string;
  updatePage: (
    pageId: string,
    patch: Partial<Pick<LauncherPage, 'label' | 'icon' | 'hidden'>>
  ) => void;
  removePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;
  setCoverEnabled: (enabled: boolean) => void;
}
