import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConnectionNotice } from '@/components/system/status-bar/ConnectionNotice';
import { findWidgetDefinition } from '@/components/widgets/registry';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, ServiceData } from '@/@types/ha';
import type { WidgetDefinition } from '@/@types/launcher';
import { usePages } from '@/hooks/context/PageContext';
import { useToast } from '@/hooks/context/ToastContext';
import { translateItalian } from '@/hooks/launcher/useItalianTranslate';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';
import { useDeviceClass } from '@/hooks/launcher/useViewport';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import { connectionSummary } from '@/utils/launcher/connection';
import { buildStatusChips } from '@/utils/launcher/statusChips';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { CoverPage } from '../../cover/CoverPage';
import { previewEntities } from './previewFixtures';
import { previewDefinitions } from './previewWidgets';

const findDefinition = (widgetId: string, settings: CardSettings): WidgetDefinition | undefined =>
  previewDefinitions.find((item) => item.matches(widgetId, settings)) ??
  findWidgetDefinition(widgetId, settings);

/** Start options of the preview, read when it mounts (not when the module loads). */
const readParams = () => new URLSearchParams(globalThis.location?.search ?? '');

/** Connection flags from `?stato=riconnessione|errore|scaduta` (connected otherwise). */
function previewConnection(params: URLSearchParams) {
  const state = params.get('stato');
  return {
    connected: !state,
    entitiesLoaded: true,
    haUnavailableVisible: state === 'errore' || state === 'scaduta',
    oauthExpired: state === 'scaduta',
  };
}

/**
 * Development preview of the launcher: the real PageContext (seeded with a legacy
 * configuration), fixture entities and placeholder widgets. `?modifica=1` starts in edit
 * mode, `?pagina=<id>` on a page, `?stato=…` shows a connection state, `?reset=1` starts over.
 */
export function PreviewApp() {
  const { addToast } = useToast();
  const pages = usePages();
  const deviceClass = useDeviceClass();
  const [entities, setEntities] = useState<EntityMap>(previewEntities);

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
    resolveSizes: (widgetId, settings) => findDefinition(widgetId, settings)?.sizes,
  });

  // Start options from the query string, once the layout exists. The launcher is drawn only
  // after they apply, so the pager opens directly on the page asked for: no scroll from
  // «Principale» that a slow first frame could settle back on it.
  const [params] = useState(readParams);
  const [started, setStarted] = useState(false);
  const { goToPageId, setEditMode } = controller;
  const hasLayout = Boolean(pages.launcherLayout);
  useEffect(() => {
    if (started || !hasLayout) return;
    const page = params.get('pagina');
    if (page) goToPageId(page);
    if (params.get('modifica') === '1') setEditMode(true);
    setStarted(true);
  }, [started, hasLayout, goToPageId, setEditMode, params]);

  const [detailsWidgetId, setDetailsWidgetId] = useState<string | null>(null);
  const openDetails = useCallback((widgetId: string) => {
    setDetailsWidgetId(widgetId);
  }, []);

  // Lights change state after a short delay: requested first, then confirmed.
  const callService = useCallback(
    async (domain: string, service: string, data?: ServiceData) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const target = data?.entity_id;
      if (typeof target === 'string' && (service === 'turn_on' || service === 'turn_off')) {
        setEntities((prev) => {
          const entity = prev[target];
          if (!entity) return prev;
          return { ...prev, [target]: { ...entity, state: service === 'turn_on' ? 'on' : 'off' } };
        });
      } else {
        addToast(`Azione di prova: ${domain}.${service}`, 'info');
      }
      return undefined;
    },
    [addToast]
  );

  const runtime = useMemo(
    () =>
      createFixtureRuntime({
        entities,
        callService,
        cardSettings: pages.cardSettings,
        saveCardSetting: pages.saveCardSetting,
        customNames: pages.customNames,
        customIcons: pages.customIcons,
        openDetails,
        editMode: controller.editMode,
      }),
    [
      entities,
      callService,
      pages.cardSettings,
      pages.saveCardSetting,
      pages.customNames,
      pages.customIcons,
      openDetails,
      controller.editMode,
    ]
  );

  const chips = useMemo(
    () =>
      buildStatusChips({
        header: pages.pagesConfig.header ?? [],
        pills: pages.statusPillsConfig,
        entities,
        cardSettings: pages.cardSettings,
        customNames: pages.customNames,
        t: translateItalian,
        now: Date.parse('2026-10-06T08:00:10.000Z'),
      }),
    [
      pages.pagesConfig.header,
      pages.statusPillsConfig,
      entities,
      pages.cardSettings,
      pages.customNames,
    ]
  );

  const flags = previewConnection(params);
  const openSystem = () => addToast('Qui si apre la pagina Sistema.', 'info');

  return (
    <div className="aca-app-root">
      {started && (
        <LauncherScreen
          controller={controller}
          runtime={runtime}
          cover={<CoverPage />}
          connection={connectionSummary(flags)}
          chips={chips}
          notice={
            <ConnectionNotice
              visible={flags.haUnavailableVisible}
              oauthExpired={flags.oauthExpired}
              disconnectedSince={flags.haUnavailableVisible ? Date.now() - 125000 : null}
              onRetry={() => addToast('Nuovo tentativo di connessione (prova).', 'info')}
              onSignIn={openSystem}
            />
          }
          updateCount={1}
          onOpenSystem={openSystem}
          detailsWidgetId={detailsWidgetId}
          onCloseDetails={() => setDetailsWidgetId(null)}
          isWidgetHidden={(_pageId, widgetId) => pages.hiddenCards.includes(widgetId)}
          findDefinition={findDefinition}
        />
      )}
    </div>
  );
}
