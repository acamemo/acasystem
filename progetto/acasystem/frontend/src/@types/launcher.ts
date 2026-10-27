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
/** Screen class from the viewport (ADR-0007). */
export type BaseDeviceClass = 'phone' | 'phoneLandscape' | 'tabletPortrait' | 'tablet';
/**
 * Class of a set of placements: the screen class, plus the grid density when it is not normal
 * (REP-20261007-034), so every density keeps its own arrangement, like a separate home screen.
 * A page with its own columns uses a key that names its grid, e.g. `phoneLandscape@8x2`
 * (REP-20261008-001).
 */
export type DeviceClass =
  | BaseDeviceClass
  | `${BaseDeviceClass}@compact`
  | `${BaseDeviceClass}@wide`
  | `${BaseDeviceClass}@${number}x${number}`;

/** Kinds of launcher pages: a widget grid or one of the special full-page views of Tunet. */
/**
 * `cover`: the cover, a page of widgets of its own (REP-20261007-030). `casa3d`: the 3D house,
 * one page per layout, always added last (ADR-0014).
 */
export type PageKind =
  'widgets' | 'lights' | 'battery' | 'rooms' | 'media' | 'sonos' | 'cover' | 'casa3d';

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
  /**
   * Columns chosen for the page on a landscape screen (2-10, REP-20261008-001); the rows follow.
   * Only on the first page of a family and on the cover (3 or more; a new cover has 3). Absent:
   * the grid of the density, as before (also a cover saved by an earlier build).
   */
  columns?: number;
  /** Filled initial grids of a category; an explicit column choice takes precedence. */
  categoryGrids?: Partial<Record<BaseDeviceClass, CellSize>>;
  /** Widget placements per device class; a missing class is packed from another one on first use. */
  placements: Partial<Record<DeviceClass, Record<string, CellRect>>>;
}

export interface LauncherLayout {
  version: 1;
  /** Initial category pages installed once; removals are user preferences thereafter. */
  categoryDefaultsVersion?: 1;
  /**
   * The 3D house page installed once, at the end of the pages (ADR-0014, D12): a profile that
   * has the mark never gets it again, so a page the user removed stays removed.
   */
  casa3dVersion?: 1;
  /** Cover page (calendar and clock) shown before the widget pages. */
  cover: { enabled: boolean };
  pages: LauncherPage[];
  /** «Blocca la disposizione» (REP-20261007-033): no edit mode, no drag. */
  locked?: boolean;
  /** Main page chosen with the house icon (REP-20261007-033); the first widget page otherwise. */
  homePageId?: string;
  /** Density of the grid (REP-20261007-034); normal when absent. */
  density?: GridDensity;
  /**
   * Widget stacks (REP-20261007-037), as the stacks of One UI: a stack takes one place on the
   * grid under its own id (`stack_…`) and shows its widgets one at a time.
   */
  stacks?: Record<string, WidgetStack>;
}

/** Widgets of a stack, in order; `rotate` turns them by itself every few seconds. */
export interface WidgetStack {
  ids: string[];
  rotate?: boolean;
}

/** Density of the launcher grid: fewer, normal or more cells. */
export type GridDensity = 'compact' | 'normal' | 'wide';

/** Changes to a page: label, icon, visibility and its columns (null: back to the default). */
export type PagePatch = Partial<Pick<LauncherPage, 'label' | 'icon' | 'hidden'>> & {
  columns?: number | null;
};

/** Options of the whole layout changed from Sistema or from the page overview. */
export type LayoutOptions = Partial<Pick<LauncherLayout, 'locked' | 'homePageId' | 'density'>>;

/** Columns × rows of one page for each device class. Pages never scroll vertically. */
/** Grid of each screen class at normal density; the other densities follow (gridFor). */
export type LauncherGrids = Record<BaseDeviceClass, CellSize>;

/**
 * A device already chosen when «Aggiungi un widget» opens («Rileva dispositivi»): the type and
 * the entities to preselect, so that only the confirmation is left.
 */
export interface AddWidgetSelection {
  type: string;
  entityIds: string[];
  /** Remote of a television, linked next to its player. */
  remoteId?: string;
}

/** Data and actions available to every widget, provided by the launcher (or by fixtures). */
export interface WidgetRuntime {
  entities: EntityMap;
  entitiesLoaded: boolean;
  /** Optional already-loaded HA service catalog (shared runtime and isolated fixtures). */
  services?: Record<string, Record<string, unknown>>;
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
  /** Edit mode, which includes the page overview: heavy pages show a still picture instead. */
  editMode?: boolean;
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
   * The page overview (the pages as cards), which closes with edit mode. Together with
   * `setEditMode(true)` it is what Sistema → «Modifica le pagine» opens; absent in the harnesses
   * that have no overview.
   */
  setOverview?: (open: boolean) => void;
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
  /** Adds a page after `afterPageId` (at the end without it) and shows it. */
  addPage: (
    page: { label: string; icon?: string; kind?: PageKind; category?: string },
    afterPageId?: string
  ) => string;
  /** `columns` goes to the first page of the family; null gives the page back its default grid. */
  updatePage: (pageId: string, patch: PagePatch) => void;
  removePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;
  setCoverEnabled: (enabled: boolean) => void;
  /** Puts back a layout read earlier (undo of the widget being edited). */
  restoreLayout: (previous: LauncherLayout) => void;
  /** Lock, main page, grid density (REP-20261007-033/034). */
  setLayoutOptions: (options: LayoutOptions) => void;
  /** Puts `draggedId` on `ontoId` (same page) in a stack; returns the stack id, null if refused. */
  stackWidgets: (pageId: string, draggedId: string, ontoId: string) => string | null;
  /** Takes a widget out of a stack, back on the page. */
  unstackWidget: (pageId: string, stackId: string, memberId: string) => void;
  setStackRotate: (stackId: string, rotate: boolean) => void;
}
