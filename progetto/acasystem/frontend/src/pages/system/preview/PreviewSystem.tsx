import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Body, Button, Caption, Title } from '@/components/primitives';
import type { CellSize, LauncherApi, LauncherLayout, LauncherPage } from '@/@types/launcher';
import { ConfigProvider, useConfig } from '@/hooks/context/ConfigContext';
import { HomeAssistantProvider } from '@/hooks/context/HomeAssistantContext';
import { usePages } from '@/hooks/context/PageContext';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import { connectionSummary } from '@/utils/launcher/connection';
import { AddWidgetSheet, PageSettingsSheet, WidgetSettingsSheet } from '@/templates/sheets';
import { ConnectPage } from '../../connect';
import { SystemPage } from '../SystemPage';
import { SystemLayout } from '../SystemLayout';
import { AboutSection, CoverSection } from '../sections/AboutSection';
import { ConnectionSection } from '../sections/ConnectionSection';
import { ProfilesSection } from '../sections/ProfilesSection';
import { StatusBarSection } from '../sections/StatusBarSection';
import { previewEntities, previewProfiles } from './fixtures';

const VIEWS = [
  { value: 'sistema', label: 'Sistema' },
  { value: 'sistema-reale', label: 'Sistema, provider reali' },
  { value: 'collega', label: 'Collegamento' },
  { value: 'aggiungi', label: 'Aggiungi widget' },
  { value: 'impostazioni', label: 'Impostazioni widget' },
  { value: 'pagina', label: 'Impostazioni pagina' },
  { value: 'nuova-pagina', label: 'Nuova pagina' },
] as const;

type View = (typeof VIEWS)[number]['value'];

function initialView(): View {
  const requested = new URLSearchParams(window.location.search).get('vista');
  return VIEWS.find((view) => view.value === requested)?.value ?? 'sistema';
}

/** In-memory launcher API: enough for the sheets and the cover switch of the preview. */
function useLauncherMock(): LauncherApi {
  const [layout, setLayout] = useState<LauncherLayout>({
    version: 1,
    cover: { enabled: true },
    pages: [
      { id: 'home', label: 'Principale', kind: 'widgets', placements: {} },
      { id: 'studio', label: 'Studio', icon: 'Laptop', kind: 'widgets', placements: {} },
    ],
  });
  const updatePage = useCallback(
    (pageId: string, patch: Partial<Pick<LauncherPage, 'label' | 'icon' | 'hidden'>>) =>
      setLayout((current) => ({
        ...current,
        pages: current.pages.map((page) => (page.id === pageId ? { ...page, ...patch } : page)),
      })),
    []
  );
  return useMemo<LauncherApi>(
    () => ({
      layout,
      grids: {
        phone: { w: 4, h: 6 },
        phoneLandscape: { w: 6, h: 2 },
        tabletPortrait: { w: 6, h: 8 },
        tablet: { w: 8, h: 5 },
      },
      deviceClass: 'tablet',
      currentPage: 1,
      goToPage: () => undefined,
      editMode: true,
      setEditMode: () => undefined,
      placeWidget: () => undefined,
      moveWidget: () => true,
      resizeWidget: () => true,
      removeWidget: () => undefined,
      addPage: (page) => {
        const id = `pagina_${Date.now()}`;
        setLayout((current) => ({
          ...current,
          pages: [
            ...current.pages,
            {
              id,
              label: page.label,
              icon: page.icon,
              kind: page.kind ?? 'widgets',
              placements: {},
            },
          ],
        }));
        return id;
      },
      updatePage,
      removePage: (pageId: string) =>
        setLayout((current) => ({
          ...current,
          pages: current.pages.filter((page) => page.id !== pageId),
        })),
      reorderPages: () => undefined,
      setCoverEnabled: (enabled: boolean) =>
        setLayout((current) => ({ ...current, cover: { enabled } })),
    }),
    [layout, updatePage]
  );
}

/** Sistema with fixed data: connected, with a user, profiles and indicators. */
function FixtureSystem({ launcher }: { launcher: LauncherApi }) {
  const pages = usePages();
  return (
    <SystemLayout
      onClose={() => undefined}
      sections={[
        {
          id: 'sistema-collegamento',
          title: 'Collegamento',
          description:
            'Home Assistant, raggiunto attraverso il server Acasystem, e l’utente in uso.',
          content: (
            <ConnectionSection
              status={connectionSummary({
                connected: true,
                entitiesLoaded: true,
                haUnavailableVisible: false,
                oauthExpired: false,
              })}
              oauthExpired={false}
              method="oauth"
              user={{ id: 'u1', name: 'Mattia', is_owner: true }}
              onReconnect={() => undefined}
              onLogout={() => undefined}
            />
          ),
        },
        {
          id: 'sistema-profili',
          title: 'Profili',
          description: 'Salva, carica, esporta e importa la configurazione delle pagine.',
          content: (
            <ProfilesSection
              hasUser
              backendAvailable
              profiles={previewProfiles}
              loading={false}
              error={null}
              loadSummary={null}
              onSave={async () => undefined}
              onLoad={() => undefined}
              onRename={async () => undefined}
              onDelete={async () => undefined}
              onExport={() => ({ format: 'tunet-dashboard-export' })}
              onImport={() => undefined}
            />
          ),
        },
        {
          id: 'sistema-barra',
          title: 'Barra di stato',
          description: 'Titolo, ora, persone fissate e indicatori in alto.',
          content: (
            <StatusBarSection
              entities={previewEntities}
              title={pages.headerTitle}
              onTitle={pages.updateHeaderTitle}
              headerSettings={pages.headerSettings}
              onHeaderSettings={pages.updateHeaderSettings}
              pinned={pages.pagesConfig.header}
              onPinned={(header) => pages.persistConfig({ ...pages.pagesConfig, header })}
              pills={pages.statusPillsConfig}
              onPills={pages.saveStatusPillsConfig}
            />
          ),
        },
        {
          id: 'sistema-copertina',
          title: 'Copertina',
          content: (
            <CoverSection
              enabled={launcher.layout.cover.enabled}
              onChange={launcher.setCoverEnabled}
            />
          ),
        },
        {
          id: 'sistema-informazioni',
          title: 'Informazioni',
          content: <AboutSection version="0.1.0" />,
        },
      ]}
    />
  );
}

function WithHomeAssistant({ children }: { children: ReactNode }) {
  const { config } = useConfig();
  return <HomeAssistantProvider config={config}>{children}</HomeAssistantProvider>;
}

function SheetStage({
  title,
  onOpen,
  children,
}: {
  title: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <div className="aca-preview-system__stage">
      <Title level={2}>{title}</Title>
      <Body tone="muted">Il foglio si apre sopra il launcher; chiudilo e riaprilo da qui.</Body>
      <Button variant="secondary" size="md" onClick={onOpen}>
        Apri il foglio
      </Button>
      {children}
    </div>
  );
}

export function PreviewSystem() {
  const [view, setView] = useState<View>(initialView);
  const [open, setOpen] = useState(true);
  const [added, setAdded] = useState<Array<{ id: string; size?: CellSize }>>([]);
  const pages = usePages();
  const launcher = useLauncherMock();
  const runtime = useMemo(
    () =>
      createFixtureRuntime({
        entities: previewEntities,
        cardSettings: pages.cardSettings,
        saveCardSetting: pages.saveCardSetting,
        customNames: pages.customNames,
        customIcons: pages.customIcons,
        editMode: true,
      }),
    [pages.cardSettings, pages.saveCardSetting, pages.customNames, pages.customIcons]
  );

  const choose = (next: View) => {
    setView(next);
    setOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set('vista', next);
    window.history.replaceState(null, '', url);
  };

  return (
    <LauncherProvider value={launcher}>
      <WidgetRuntimeProvider value={runtime}>
        <div className="aca-preview-system">
          <nav className="aca-preview-system__bar" aria-label="Viste dell’anteprima">
            <Caption>Anteprima di sviluppo</Caption>
            <div className="aca-preview-system__views">
              {VIEWS.map((item) => (
                <Button
                  key={item.value}
                  variant="control"
                  size="sm"
                  aria-pressed={view === item.value}
                  onClick={() => choose(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </nav>

          {view === 'sistema' && <FixtureSystem launcher={launcher} />}
          {view === 'sistema-reale' && (
            <ConfigProvider>
              <WithHomeAssistant>
                <SystemPage onClose={() => choose('sistema')} />
              </WithHomeAssistant>
            </ConfigProvider>
          )}
          {view === 'collega' && (
            <ConfigProvider>
              <ConnectPage onConnected={() => choose('sistema')} />
            </ConfigProvider>
          )}
          {view === 'aggiungi' && (
            <SheetStage title="Aggiungi un widget" onOpen={() => setOpen(true)}>
              <AddWidgetSheet
                open={open}
                onClose={() => setOpen(false)}
                pageId="home"
                onAdded={(widgetId, size) => {
                  launcher.placeWidget('home', widgetId, size);
                  setAdded((current) => [...current, { id: widgetId, size }]);
                }}
              />
              {added.length > 0 && (
                <Caption as="p" role="status">
                  Aggiunti:{' '}
                  {added
                    .map(({ id, size }) => (size ? `${id} (${size.w} x ${size.h})` : id))
                    .join(', ')}
                </Caption>
              )}
            </SheetStage>
          )}
          {view === 'impostazioni' && (
            <SheetStage title="Impostazioni del widget" onOpen={() => setOpen(true)}>
              <WidgetSettingsSheet
                open={open}
                onClose={() => setOpen(false)}
                widgetId="climate_card_1"
                settingsKey="home::climate_card_1"
                pageId="home"
              />
            </SheetStage>
          )}
          {(view === 'pagina' || view === 'nuova-pagina') && (
            <SheetStage title="Pagine" onOpen={() => setOpen(true)}>
              <PageSettingsSheet
                open={open}
                onClose={() => setOpen(false)}
                pageId={view === 'pagina' ? 'studio' : null}
              />
            </SheetStage>
          )}
        </div>
      </WidgetRuntimeProvider>
    </LauncherProvider>
  );
}
