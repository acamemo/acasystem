import type { Dispatch, SetStateAction, ComponentType, MouseEvent } from 'react';
import type { Connection, HassEntities } from 'home-assistant-js-websocket';
import type { Translate } from './home';

type Setter<T> = Dispatch<SetStateAction<T>>;
export type PickerIcon = ComponentType<{
  className?: string;
  color?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;
export interface Area {
  area_id: string;
  name?: string;
}
export type AreaEntities = Record<string, string[]>;

export interface AddCardProps {
  onClose: () => void;
  addCardTargetPage: string;
  addCardType: string;
  setAddCardType: (type: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  entities: HassEntities;
  pagesConfig: Record<string, string[]>;
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
  setCostSelectionTarget: (target: string) => void;
  selectedNordpoolId: string | null;
  setSelectedNordpoolId: Setter<string | null>;
  nordpoolDecimals: number;
  setNordpoolDecimals: (value: number) => void;
  selectedSpacerVariant: string;
  setSelectedSpacerVariant: (value: string) => void;
  onAddSelected: (options?: { spacerVariant: string } | MouseEvent<HTMLButtonElement>) => void;
  onAddRoom?: (areas: Area[], entities: AreaEntities) => void;
  conn?: Connection | null;
  getAddCardAvailableLabel: () => string;
  getAddCardNoneLeftLabel: () => string;
  t: Translate;
}

export interface RoomSectionProps {
  conn?: Connection | null;
  searchTerm: string;
  selectedAreas: Area[];
  setSelectedAreas: Setter<Area[]>;
  selectedAreaEntitiesById: AreaEntities;
  setSelectedAreaEntitiesById: Setter<AreaEntities>;
  t: Translate;
}

export interface TypeChoiceProps {
  type: string;
  icon: PickerIcon;
  label: string;
  isActive: boolean;
  onSelect: (type: string) => void;
}

export interface AddPageProps {
  isOpen: boolean;
  onClose: () => void;
  t: Translate;
  newPageLabel: string;
  setNewPageLabel: (value: string) => void;
  newPageIcon: string | null;
  setNewPageIcon: (value: string | null) => void;
  onCreate: () => void;
  onCreateMedia: () => void;
  onCreateSonos: () => void;
  onCreateLights: () => void;
  onCreateBattery: () => void;
  onCreateRoomExplorer: () => void;
}

export interface PageSettings {
  label?: string;
  icon?: string | null;
  hidden?: boolean;
  hideSinglePagePill?: boolean;
  gridColumns?: number | null;
}
export interface EditPageProps {
  isOpen: boolean;
  onClose: () => void;
  t: Translate;
  editingPage: string;
  pageSettings: Record<string, PageSettings>;
  savePageSetting: (
    page: string,
    field: keyof PageSettings,
    value: string | boolean | number | null
  ) => void;
  pageDefaults: Record<string, { label?: string }>;
  onDelete: (page: string) => void;
}
