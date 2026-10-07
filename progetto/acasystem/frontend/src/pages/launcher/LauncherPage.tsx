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
import { translateItalian } from '@/hooks/launcher/useItalianTranslate';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';
import { usePopupTriggerBridge } from '@/hooks/launcher/usePopupTriggerBridge';
import { useDeviceClass } from '@/hooks/launcher/useViewport';
import { isCardHiddenByLogic } from '@/utils/cardUtils';
import { connectionSummary, pendingUpdateCount } from '@/utils/launcher/connection';
import { buildStatusChips } from '@/utils/launcher/statusChips';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { CoverPage } from '../cover/CoverPage';

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
}

/**
 * The launcher with real data: layout and settings from PageContext, entities and services
 * from Home Assistant, status chips from the legacy header and pills, popup triggers. It always
 * opens on «Principale»; the cover stays on its left (REP-20261007-001).
 */
export function LauncherPage({ onOpenSystem, overlay = null }: LauncherPageProps) {
  const pages = usePages();
  const ha = useHomeAssistant();
  const deviceClass = useDeviceClass();
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
  const controller = useLauncherController({ store, deviceClass, resolveSizes });

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

  const { hiddenCards, cardSettings } = pages;
  const { entities, entitiesLoaded } = ha;
  const isWidgetHidden = useCallback(
    (pageId: string, widgetId: string) =>
      hiddenCards.includes(widgetId) ||
      (entitiesLoaded &&
        isCardHiddenByLogic(widgetId, {
          activePage: pageId,
          getCardSettingsKey: (cardId, page = pageId) => `${page}::${cardId}`,
          cardSettings,
          entities,
        })),
    [hiddenCards, entitiesLoaded, cardSettings, entities]
  );

  return (
    <>
      <div hidden={Boolean(overlay)}>
        <PageVisibilityContext.Provider value={!overlay}>
          <LauncherScreen
            controller={controller}
            runtime={runtime}
            cover={<CoverPage />}
            connection={connectionSummary(ha)}
            chips={chips}
            notice={
              <ConnectionNotice
                visible={ha.haUnavailableVisible}
                oauthExpired={ha.oauthExpired}
                disconnectedSince={ha.disconnectedSince}
                onRetry={() => globalThis.window?.location.reload()}
                onSignIn={onOpenSystem}
              />
            }
            updateCount={pendingUpdateCount(ha.entities)}
            onOpenSystem={onOpenSystem}
            detailsWidgetId={detailsWidgetId}
            onCloseDetails={closeDetails}
            isWidgetHidden={isWidgetHidden}
          />
        </PageVisibilityContext.Provider>
      </div>
      {overlay && <LauncherProvider value={controller}>{overlay}</LauncherProvider>}
    </>
  );
}
