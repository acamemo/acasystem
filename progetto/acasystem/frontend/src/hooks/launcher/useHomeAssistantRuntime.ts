/**
 * WidgetRuntime built from the app contexts (Home Assistant, pages, toasts): the same data and
 * service calls the legacy cards received as props. Details sheets are opened by the launcher.
 */
import { useMemo } from 'react';
import type { WidgetRuntime } from '@/@types/launcher';
import { useHomeAssistant } from '@/hooks/context/HomeAssistantContext';
import { usePages } from '@/hooks/context/PageContext';
import { useEntityHelpers } from '@/hooks/useEntityHelpers';
import { translateItalian } from './useItalianTranslate';

export interface HomeAssistantRuntimeOptions {
  openDetails: (widgetId: string) => void;
  editMode: boolean;
  /** Clock used by the media activity helpers (the legacy dashboard ticked every 30 s). */
  now: Date;
}

export function useHomeAssistantRuntime({
  openDetails,
  editMode,
  now,
}: HomeAssistantRuntimeOptions): WidgetRuntime {
  const {
    entities,
    entitiesLoaded,
    conn: retainedConn,
    connected,
    activeUrl,
    haConfig,
  } = useHomeAssistant();
  const conn = connected && retainedConn?.connected !== false ? retainedConn : null;
  const { cardSettings, saveCardSetting, customNames, customIcons } = usePages();
  const { callService, getEntityImageUrl } = useEntityHelpers({
    entities,
    conn,
    activeUrl,
    now,
    t: translateItalian,
  });

  return useMemo<WidgetRuntime>(
    () => ({
      entities,
      entitiesLoaded,
      conn,
      callService: (domain, service, data) => callService(domain, service, data),
      t: translateItalian,
      language: 'it',
      cardSettings,
      saveCardSetting,
      customNames,
      customIcons,
      getEntityImageUrl: (path) => getEntityImageUrl(path),
      openDetails,
      editMode,
      haConfig: haConfig ?? null,
    }),
    [
      entities,
      entitiesLoaded,
      conn,
      callService,
      cardSettings,
      saveCardSetting,
      customNames,
      customIcons,
      getEntityImageUrl,
      openDetails,
      editMode,
      haConfig,
    ]
  );
}
