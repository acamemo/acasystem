import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ConnectionNotice } from '@/components/system/status-bar/ConnectionNotice';
import { findWidgetDefinition } from '@/components/widgets/registry';
import type { CardSettings } from '@/@types/dashboard';
import { useHomeAssistant } from '@/hooks/context/HomeAssistantContext';
import { usePages } from '@/hooks/context/PageContext';
import { useDashboardEffects } from '@/hooks/useDashboardEffects';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { useHomeAssistantRuntime } from '@/hooks/launcher/useHomeAssistantRuntime';
import { OverlayPhaseContext, useOverlayScene } from '@/hooks/launcher/useOverlayScene';
import { translateItalian } from '@/hooks/launcher/useItalianTranslate';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';
import { usePopupTriggerBridge } from '@/hooks/launcher/usePopupTriggerBridge';
import { useDeviceClass, useViewportSize } from '@/hooks/launcher/useViewport';
import { isCardHiddenByLogic } from '@/utils/cardUtils';
import { connectionSummary, pendingUpdateCount } from '@/utils/launcher/connection';
import { buildStatusChips } from '@/utils/launcher/statusChips';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { categoryDeviceId, isCategoryWidgetReady } from '@/templates/sheets/categoryPages';

const resolveSizes = (widgetId: string, settings: CardSettings) =>
  findWidgetDefinition(widgetId, settings)?.sizes;

const noop = () => undefined;

export interface LauncherPageProps {
  /** Opens the Sistema page (also the way back to the connection after an expired sign-in). */
  onOpenSystem: () => void;
  /**
   * Full page shown instead of the pager (the Sistema page), inside the launcher's provider so
   * it reads and changes the same layout. The launcher stays mounted underneath, hidden.
   */
  overlay?: ReactNode;
  /**
   * The overlay comes and goes in a scene (REP-20261023-006, D-M12): it fades in over the launcher,
   * which is covered and stopped only once it is there, and on the way out the launcher is shown
   * again under it before it fades away. Without it (the house) the overlay replaces the launcher
   * at once, as before.
   */
  overlayStaged?: boolean;
}

/**
 * The launcher with real data: layout and settings from PageContext, entities and services
 * from Home Assistant, status chips from the legacy header and pills, popup triggers. It always
 * opens on «Principale»; the cover stays on its left (REP-20261007-001).
 */
export function LauncherPage({
  onOpenSystem,
  overlay = null,
  overlayStaged = false,
}: LauncherPageProps) {
  const pages = usePages();
  const ha = useHomeAssistant();
  const scene = useOverlayScene(overlay, overlayStaged);
  const deviceClass = useDeviceClass();
  const { width: viewportWidth } = useViewportSize();
  // Clock, haptics and title of the legacy dashboard (no inactivity reset: removed, ADR-0007).
  const { now } = useDashboardEffects({
    resolvedHeaderTitle: 'Acasystem',
    inactivityTimeout: 0,
    resetToHome: noop,
    activeMediaModal: null,
  });

  const store = useMemo<LauncherStore>(
    () => ({
      ready: pages.settingsLoaded,
      layout: pages.launcherLayout,
      persistLayout: pages.persistLauncherLayout,
      pagesConfig: pages.pagesConfig,
      pageSettings: pages.pageSettings,
      cardSettings: pages.cardSettings,
      persistPagesConfig: pages.persistConfig,
      persistPageSettings: pages.persistPageSettings,
      persistCardSettings: pages.persistCardSettings,
    }),
    [
      pages.settingsLoaded,
      pages.launcherLayout,
      pages.persistLauncherLayout,
      pages.pagesConfig,
      pages.pageSettings,
      pages.cardSettings,
      pages.persistConfig,
      pages.persistPageSettings,
      pages.persistCardSettings,
    ]
  );
  const controller = useLauncherController({
    store,
    deviceClass,
    viewportWidth,
    resolveSizes,
    initializeCategoryPages: true,
  });

  const [detailsWidgetId, setDetailsWidgetId] = useState<string | null>(null);
  const openDetails = useCallback((widgetId: string) => {
    setDetailsWidgetId(widgetId);
  }, []);
  const closeDetails = useCallback(() => setDetailsWidgetId(null), []);

  const runtime = useHomeAssistantRuntime({ openDetails, editMode: controller.editMode, now });

  const watchedPageId =
    controller.currentPageId ??
    controller.layout.pages.find((page) => page.kind === 'widgets')?.id ??
    null;
  usePopupTriggerBridge({
    entities: ha.entities,
    entitiesLoaded: ha.entitiesLoaded,
    pagesConfig: pages.pagesConfig,
    pageId: watchedPageId,
    cardSettings: pages.cardSettings,
    editMode: controller.editMode,
    openDetails,
    closeDetails,
  });

  const chips = useMemo(
    () =>
      buildStatusChips({
        header: pages.pagesConfig.header ?? [],
        pills: pages.statusPillsConfig,
        entities: ha.entities,
        cardSettings: pages.cardSettings,
        customNames: pages.customNames,
        t: translateItalian,
        haConfig: ha.haConfig,
        now: now.getTime(),
      }),
    [
      pages.pagesConfig.header,
      pages.statusPillsConfig,
      ha.entities,
      pages.cardSettings,
      pages.customNames,
      ha.haConfig,
      now,
    ]
  );

  const { cardSettings } = pages;
  const { entities, entitiesLoaded } = ha;
  const isWidgetHidden = useCallback(
    (pageId: string, widgetId: string) => {
      const settingsKey = `${pageId}::${widgetId}`;
      const settings = cardSettings[settingsKey] ?? cardSettings[widgetId] ?? {};
      // Empty presets stay visible to be configured; bound presets use the actual HA id.
      if (settings.categoryWidgetType && !isCategoryWidgetReady(settings)) return false;
      const visibilityId = settings.categoryWidgetType
        ? categoryDeviceId(widgetId, settings)
        : widgetId;
      return (
        entitiesLoaded &&
        isCardHiddenByLogic(visibilityId, {
          activePage: pageId,
          getCardSettingsKey: () => (cardSettings[settingsKey] ? settingsKey : widgetId),
          cardSettings,
          entities,
        })
      );
    },
    [entitiesLoaded, cardSettings, entities]
  );

  // The screen is an element of its own, made again only when something it shows changes. The
  // phases of the scene that Sistema goes through (wait, in, out-wait, out) change nothing of it,
  // so React finds the same element and does not render the launcher for them: before, each phase
  // rendered every page, widget and bar again in the frame that starts the fade (0.9.28,
  // measurement of 2026-10-23, REP-20261023-006). Only `covered` reaches it, through the context.
  const { connected, haUnavailableVisible, oauthExpired, disconnectedSince } = ha;
  const connection = useMemo(
    () => connectionSummary({ connected, entitiesLoaded, haUnavailableVisible, oauthExpired }),
    [connected, entitiesLoaded, haUnavailableVisible, oauthExpired]
  );
  const updateCount = pendingUpdateCount(entities);
  const screen = useMemo(
    () => (
      <LauncherScreen
        controller={controller}
        runtime={runtime}
        connection={connection}
        chips={chips}
        notice={
          <ConnectionNotice
            visible={haUnavailableVisible}
            oauthExpired={oauthExpired}
            disconnectedSince={disconnectedSince}
            onRetry={() => globalThis.window?.location.reload()}
            onSignIn={onOpenSystem}
          />
        }
        updateCount={updateCount}
        onOpenSystem={onOpenSystem}
        detailsWidgetId={detailsWidgetId}
        onCloseDetails={closeDetails}
        isWidgetHidden={isWidgetHidden}
      />
    ),
    [
      controller,
      runtime,
      connection,
      chips,
      haUnavailableVisible,
      oauthExpired,
      disconnectedSince,
      onOpenSystem,
      updateCount,
      detailsWidgetId,
      closeDetails,
      isWidgetHidden,
    ]
  );

  return (
    <>
      <div hidden={scene.covered}>
        <PageVisibilityContext.Provider value={!scene.covered}>
          {screen}
        </PageVisibilityContext.Provider>
      </div>
      {scene.node && (
        <LauncherProvider value={controller}>
          {scene.staged ? (
            <div ref={scene.sceneRef} className="aca-overlay-scene" data-scene={scene.phase}>
              <OverlayPhaseContext.Provider value={scene.phase}>
                {scene.node}
              </OverlayPhaseContext.Provider>
            </div>
          ) : (
            scene.node
          )}
        </LauncherProvider>
      )}
    </>
  );
}
