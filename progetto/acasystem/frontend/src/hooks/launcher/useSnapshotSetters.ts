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
import { useQrAccountSync } from '@/hooks/qrAccountSync';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';

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
 * Keeps the account's shared interface up to date while the app runs. QR CONFIG copies stay
 * local; QR ACCOUNT follows this same HA user's revisions through the server's event stream.
 */
export function useLauncherSettingsSync() {
  const { haUser } = useHomeAssistantMeta();
  const live = useOptionalLiveProfiles();
  const setters = useSnapshotSetters();
  useQrAccountSync(live ? undefined : haUser?.id, setters);
  // Preserve the existing per-device saves (including Casa 3D quality), without its polling.
  const settersRef = useRef<SnapshotContextSetters | null>(setters);
  useEffect(() => { settersRef.current = setters; }, [setters]);
  return useSettingsSync({
    haUserId: live ? undefined : haUser?.id,
    contextSettersRef: settersRef,
    autoBootstrap: false,
  });
}
