/**
 * Setters a snapshot (profile, synchronised settings) applies to the page context, launcher
 * layout included. Appearance, language and units are not applied: the theme is fixed,
 * Italian is fixed and units come from Home Assistant (ADR-0007).
 */
import { useEffect, useMemo, useRef } from 'react';
import type { LauncherSnapshotSetters } from '@/api/snapshot';
import type { SnapshotContextSetters } from '@/@types/snapshot';
import { useHomeAssistantMeta } from '@/hooks/context/HomeAssistantContext';
import { usePages } from '@/hooks/context/PageContext';
import { useSettingsSync } from '@/hooks/useSettingsSync';

export type LauncherContextSetters = SnapshotContextSetters & LauncherSnapshotSetters;

export function useSnapshotSetters(): LauncherContextSetters {
  const pages = usePages();
  const {
    persistConfig,
    persistCardSettings,
    persistPageSettings,
    persistCustomNames,
    persistCustomIcons,
    persistWidgetMemory,
    setGridColumns,
    setDynamicGridColumns,
    setGridGapH,
    setGridGapV,
    setCardBorderRadius,
    updateCardsOnlyMode,
    updateHeaderScale,
    updateHeaderTitle,
    updateHeaderSettings,
    updateSectionSpacing,
    saveStatusPillsConfig,
    persistLauncherLayout,
  } = pages;
  return useMemo(
    () => ({
      persistConfig,
      persistCardSettings,
      persistPageSettings,
      persistCustomNames,
      persistCustomIcons,
      persistWidgetMemory,
      setGridColumns,
      setDynamicGridColumns,
      setGridGapH,
      setGridGapV,
      setCardBorderRadius,
      updateCardsOnlyMode,
      updateHeaderScale,
      updateHeaderTitle,
      updateHeaderSettings,
      updateSectionSpacing,
      saveStatusPillsConfig,
      persistLauncherLayout,
    }),
    [
      persistConfig,
      persistCardSettings,
      persistPageSettings,
      persistCustomNames,
      persistCustomIcons,
      persistWidgetMemory,
      setGridColumns,
      setDynamicGridColumns,
      setGridGapH,
      setGridGapV,
      setCardBorderRadius,
      updateCardsOnlyMode,
      updateHeaderScale,
      updateHeaderTitle,
      updateHeaderSettings,
      updateSectionSpacing,
      saveStatusPillsConfig,
      persistLauncherLayout,
    ]
  );
}

/**
 * Keeps the legacy behaviour of the settings sync while the app runs: when edit mode ends
 * (`tunet:edit-done`) the current snapshot, launcher layout included, is pushed at once.
 * Bootstrap and polling stay with the Sistema page, as they did with the settings panel.
 */
export function useLauncherSettingsSync() {
  const { haUser } = useHomeAssistantMeta();
  const setters = useSnapshotSetters();
  const settersRef = useRef<SnapshotContextSetters | null>(setters);
  useEffect(() => {
    settersRef.current = setters;
  }, [setters]);
  return useSettingsSync({
    haUserId: haUser?.id,
    contextSettersRef: settersRef,
    autoBootstrap: false,
  });
}
