/**
 * Istantanea della dashboard: layout, impostazioni delle card e aspetto.
 * È il formato dei profili, dell'esportazione e della sincronizzazione con il backend.
 */
import type { SupportedLanguage } from '@/utils/i18n/languageUtils';
import type {
  CardSettingsMap,
  HeaderSettings,
  PagesConfig,
  PageSettingsMap,
  SectionSpacing,
  StatusPillConfig,
  UnitsMode,
} from './dashboard';

type UnknownRecord = Record<string, unknown>;

/** Istantanea generica (importata, ricevuta dal server o salvata in un profilo). */
export type DashboardSnapshot = {
  version: number;
  layout: UnknownRecord;
  appearance: UnknownRecord;
  [key: string]: unknown;
};

/** Istantanea raccolta da questo dispositivo con `collectSnapshot`. */
export type CollectedSnapshot = {
  version: number;
  layout: {
    pagesConfig: unknown;
    cardSettings: unknown;
    hiddenCards: unknown;
    customNames: unknown;
    customIcons: unknown;
    pageSettings: unknown;
    gridColumns: number;
    dynamicGridColumns: boolean;
    gridGapH: number;
    gridGapV: number;
    cardBorderRadius: number;
    cardsOnlyMode: boolean;
    headerSettings: unknown;
    headerTitle: string;
    headerScale: number;
    sectionSpacing: unknown;
    statusPillsConfig: unknown;
  };
  appearance: {
    theme: string;
    language: SupportedLanguage;
    appFont: string;
    unitsMode: string;
    bgMode: string;
    bgColor: string;
    bgGradient: string;
    bgImage: string;
    cardBgColor: string;
    cardTransparency: number;
    cardBorderOpacity: number;
    inactivityTimeout: number;
  };
};

/** Setter dei contesti aggiornati quando si applica un'istantanea. */
export interface SnapshotContextSetters {
  persistConfig?: (config: PagesConfig) => void;
  persistCardSettings?: (settings: CardSettingsMap) => void;
  persistPageSettings?: (settings: PageSettingsMap) => void;
  persistCustomNames?: (names: Record<string, string>) => void;
  persistCustomIcons?: (icons: Record<string, string>) => void;
  persistHiddenCards?: (hidden: string[]) => void;
  setGridColumns?: (value: number) => void;
  setDynamicGridColumns?: (value: boolean) => void;
  setGridGapH?: (value: number) => void;
  setGridGapV?: (value: number) => void;
  setCardBorderRadius?: (value: number) => void;
  updateCardsOnlyMode?: (value: boolean) => void;
  updateHeaderScale?: (value: number) => void;
  updateHeaderTitle?: (value: string) => void;
  updateHeaderSettings?: (value: HeaderSettings) => void;
  updateSectionSpacing?: (value: Partial<SectionSpacing>) => void;
  saveStatusPillsConfig?: (value: StatusPillConfig[]) => void;
  setCurrentTheme?: (value: string) => void;
  setLanguage?: (value: string) => void;
  setAppFont?: (value: string) => void;
  setUnitsMode?: (value: UnitsMode) => void;
  setBgMode?: (value: string) => void;
  setBgColor?: (value: string) => void;
  setBgGradient?: (value: string) => void;
  setBgImage?: (value: string) => void;
  setCardBgColor?: (value: string) => void;
  setCardTransparency?: (value: number) => void;
  setCardBorderOpacity?: (value: number) => void;
  setInactivityTimeout?: (value: number) => void;
}

/** File di esportazione della dashboard. */
export interface DashboardExport {
  format: 'tunet-dashboard-export';
  version: number;
  exported_at: string;
  data: CollectedSnapshot;
}
