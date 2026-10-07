import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppUiContextValue } from '@/@types/dashboard';

export type { AppUiContextValue };

const AppUiContext = createContext<AppUiContextValue | null>(null);

export function AppUiProvider({ children }: { children?: ReactNode }) {
  const [activeVacuumId, setActiveVacuumId] = useState<string | null>(null);
  const [activeMowerId, setActiveMowerId] = useState<string | null>(null);
  const [showThemeSidebar, setShowThemeSidebar] = useState(false);
  const [showLayoutSidebar, setShowLayoutSidebar] = useState(false);
  const [editCardSettingsKey, setEditCardSettingsKey] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const value = useMemo<AppUiContextValue>(
    () => ({
      activeVacuumId,
      setActiveVacuumId,
      activeMowerId,
      setActiveMowerId,
      showThemeSidebar,
      setShowThemeSidebar,
      showLayoutSidebar,
      setShowLayoutSidebar,
      editCardSettingsKey,
      setEditCardSettingsKey,
      editMode,
      setEditMode,
    }),
    [
      activeVacuumId,
      activeMowerId,
      showThemeSidebar,
      showLayoutSidebar,
      editCardSettingsKey,
      editMode,
    ]
  );

  return <AppUiContext.Provider value={value}>{children}</AppUiContext.Provider>;
}

export function useAppUiStateContext(): AppUiContextValue {
  const context = useContext(AppUiContext);
  if (!context) {
    throw new Error('useAppUiStateContext must be used within an AppUiProvider');
  }
  return context;
}
