import type { ComponentType, ReactNode } from 'react';

export type Translate = (key: string) => string;
export type SetVisible = (visible: boolean) => void;

export interface NavigationPage {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface PageNavigationProps {
  pages: NavigationPage[];
  activePage: string;
  setActivePage: (pageId: string) => void;
  editMode: boolean;
  setEditingPage: (pageId: string) => void;
  t: Translate;
}

export interface NavigationPageSettings {
  label?: string;
  icon?: string;
  hidden?: boolean;
  hideSinglePagePill?: boolean;
}

export interface NavigationConfig {
  pages: string[];
  header: string[];
  [pageId: string]: unknown;
}

export interface PageManagerProps extends Omit<PageNavigationProps, 'editMode'> {
  pageSettings: Record<string, NavigationPageSettings>;
  pagesConfig: NavigationConfig;
  persistConfig?: (config: NavigationConfig) => void;
  setShowAddPageModal: SetVisible;
  onClose: () => void;
}

export interface HeaderSettings {
  showTitle?: boolean;
  showClock?: boolean;
  showDate?: boolean;
  showClockOnMobile?: boolean;
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
  mobileAlignment?: 'left' | 'center' | 'right';
}

export interface HeaderProps {
  now: Date;
  headerTitle: string;
  headerScale: number;
  editMode: boolean;
  headerSettings?: HeaderSettings;
  setShowHeaderEditModal?: SetVisible;
  t: Translate;
  isMobile?: boolean;
  sectionSpacing?: { headerToStatus?: number; statusToNav?: number; navToGrid?: number };
  children?: ReactNode;
}

export interface SettingsMenuProps {
  setShowConfigModal: SetVisible;
  setConfigTab: (tab: string) => void;
  setShowThemeSidebar: SetVisible;
  setShowLayoutSidebar: SetVisible;
  setShowHeaderEditModal: SetVisible;
  onAddCard: () => void;
  onToggleEdit: () => void;
  editMode: boolean;
  updateCount: number;
  isMobile?: boolean;
  floating?: boolean;
  t: Translate;
}

export interface EditToolbarProps extends Omit<SettingsMenuProps, 'onAddCard' | 'floating'> {
  setShowAddCardModal: SetVisible;
  showSettingsMenu?: boolean;
  connected: boolean;
}

export interface SettingsDropdownProps {
  onOpenSettings: () => void;
  onOpenTheme: () => void;
  onOpenLayout: () => void;
  onOpenHeader: () => void;
  onAddCard?: () => void;
  onToggleEdit?: () => void;
  editMode?: boolean;
  isMobile?: boolean;
  floating?: boolean;
  t: Translate;
}
