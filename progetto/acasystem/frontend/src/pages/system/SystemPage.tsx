import type { LayoutOptions } from '@/@types/launcher';
import type { LauncherApi } from '@/@types/launcher';
import {
  useConfig,
  useHomeAssistantEntities,
  useHomeAssistantMeta,
  usePages,
} from '@/hooks/context';
import { useLauncher } from '@/hooks/launcher/LauncherContext';
import { useSnapshotSetters } from '@/hooks/launcher/useSnapshotSetters';
import { useConnectionSetup } from '@/hooks/useConnectionSetup';
import { useProfiles } from '@/hooks/useProfiles';
import { useAppearance } from '@/utils/appearance';
import { connectionSummary } from '@/utils/launcher/connection';
import { AboutSection, CoverSection, useRunningVersion } from './sections/AboutSection';
import { HomeScreenSection } from './sections/HomeScreenSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { Casa3dSection } from './sections/Casa3dSection';
import { LocationSection } from './sections/LocationSection';
import { ConnectionSection } from './sections/ConnectionSection';
import { ProfilesSection } from './sections/ProfilesSection';
import { StatusBarSection } from './sections/StatusBarSection';
import { SystemLayout } from './SystemLayout';

export interface SystemPageProps {
  onClose: () => void;
}

/**
 * The launcher API when Sistema is mounted inside the launcher's provider, null otherwise
 * (the app may show Sistema as a sibling route): the cover then goes through the saved layout.
 */
function useOptionalLauncher(): LauncherApi | null {
  try {
    return useLauncher();
  } catch {
    return null;
  }
}

/**
 * Sistema: connection to Home Assistant (through Acasystem, ADR-0009), profiles, status bar,
 * cover, appearance, the quality of the Casa 3D view and information. Appearance holds only the Kit 2 theme and accent of this
 * device (ADR-0011); language, units, font, background, lock and return to home of the legacy
 * app stay gone (ADR-0007). Profiles apply layout only, never appearance preferences.
 */
export function SystemPage({ onClose }: SystemPageProps) {
  const launcher = useOptionalLauncher();
  const pages = usePages();
  const { config, setConfig } = useConfig();
  const meta = useHomeAssistantMeta();
  const entities = useHomeAssistantEntities();
  const version = useRunningVersion(__APP_VERSION__);
  const [appearance, setAppearance] = useAppearance();
  // Home location of Home Assistant, used by its weather forecast (REP-20261007-025).
  const latitude = meta.haConfig?.latitude;
  const longitude = meta.haConfig?.longitude;
  const home =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? { lat: latitude, lon: longitude }
      : null;
  const canEditLocation =
    Boolean(meta.haUser?.is_admin || meta.haUser?.is_owner) && Boolean(meta.conn);

  // Profiles and imports apply the layout, launcher included, never the old appearance.
  const contextSetters = useSnapshotSetters();
  const profiles = useProfiles({ haUser: meta.haUser, contextSetters });
  // Home Assistant is reached through the Acasystem server: the section shows the session and
  // offers a new sign-in (the login page) and the sign-out, which revokes the session.
  const setup = useConnectionSetup({ config, setConfig });

  const coverEnabled = launcher
    ? launcher.layout.cover.enabled
    : (pages.launcherLayout?.cover.enabled ?? true);
  const currentLayout = launcher ? launcher.layout : pages.launcherLayout;
  /** Lock, main page, density: through the launcher, else on the stored layout. */
  const setLayoutOptions = (options: LayoutOptions) => {
    if (launcher) {
      launcher.setLayoutOptions(options);
      return;
    }
    if (pages.launcherLayout) pages.persistLauncherLayout({ ...pages.launcherLayout, ...options });
  };

  return (
    <SystemLayout
      onClose={onClose}
      sections={[
        {
          id: 'sistema-collegamento',
          title: 'Collegamento',
          description:
            'Home Assistant, raggiunto attraverso il server Acasystem, e l’utente in uso.',
          content: (
            <ConnectionSection
              status={connectionSummary(meta)}
              oauthExpired={meta.oauthExpired}
              method={setup.method}
              user={meta.haUser}
              onReconnect={setup.openLogin}
              onLogout={() => {
                // Sistema closes: after a new access the app opens the launcher (F2).
                // «Collega di nuovo» keeps Sistema open, so «Annulla» goes back here.
                onClose();
                void setup.logout();
              }}
            />
          ),
        },
        {
          id: 'sistema-profili',
          title: 'Profili',
          description: 'Salva, carica, esporta e importa la configurazione delle pagine.',
          content: (
            <ProfilesSection
              hasUser={Boolean(meta.haUser?.id)}
              backendAvailable={profiles.backendAvailable}
              profiles={profiles.profiles}
              loading={profiles.loading}
              error={profiles.error}
              loadSummary={profiles.loadSummary}
              onSave={profiles.saveProfile}
              onLoad={profiles.loadProfile}
              onRename={profiles.editProfile}
              onDelete={profiles.removeProfile}
              onExport={profiles.exportDashboard}
              onImport={profiles.importDashboard}
            />
          ),
        },
        {
          id: 'sistema-barra',
          title: 'Barra di stato',
          description: 'Titolo, ora, persone fissate e indicatori in alto.',
          content: (
            <StatusBarSection
              entities={entities}
              title={pages.headerTitle}
              onTitle={pages.updateHeaderTitle}
              headerSettings={pages.headerSettings}
              onHeaderSettings={pages.updateHeaderSettings}
              pinned={pages.pagesConfig.header ?? []}
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
              enabled={coverEnabled}
              onChange={(enabled) => {
                if (launcher) {
                  launcher.setCoverEnabled(enabled);
                  return;
                }
                if (pages.launcherLayout) {
                  pages.persistLauncherLayout({ ...pages.launcherLayout, cover: { enabled } });
                }
              }}
              disabled={!launcher && !pages.launcherLayout}
            />
          ),
        },
        {
          id: 'sistema-home',
          title: 'Schermata Home',
          description: 'Come si comportano widget e pagine.',
          content: (
            <HomeScreenSection
              locked={currentLayout?.locked === true}
              onLocked={(locked) => setLayoutOptions({ locked })}
              density={currentLayout?.density ?? 'normal'}
              onDensity={(density) =>
                setLayoutOptions({ density: density === 'normal' ? undefined : density })
              }
              disabled={!currentLayout}
              onEditPages={
                launcher
                  ? () => {
                      // Back to the launcher, on the page overview (ADR-0016, C3; user answer of
                      // 2026-10-23: edit mode alone exists only with a widget selected).
                      launcher.setEditMode(true);
                      launcher.setOverview?.(true);
                      onClose();
                    }
                  : undefined
              }
            />
          ),
        },
        {
          id: 'sistema-posizione',
          title: 'Posizione',
          description: 'La posizione della casa in Home Assistant, usata dal meteo.',
          content: (
            <LocationSection
              home={home}
              canEdit={canEditLocation}
              onSave={async ({ lat, lon }) => {
                if (!meta.conn) throw new Error('Home Assistant non collegato');
                await meta.conn.sendMessagePromise({
                  type: 'config/core/update',
                  latitude: lat,
                  longitude: lon,
                });
              }}
            />
          ),
        },
        {
          id: 'sistema-aspetto',
          title: 'Aspetto',
          description: 'Tema e colore d’accento di questo dispositivo.',
          content: <AppearanceSection appearance={appearance} onChange={setAppearance} />,
        },
        {
          id: 'sistema-casa3d',
          title: 'Casa 3D',
          description: 'Apri la casa e scegli la qualità della vista 3D di questo dispositivo.',
          content: <Casa3dSection />,
        },
        {
          id: 'sistema-informazioni',
          title: 'Informazioni',
          content: <AboutSection version={version} />,
        },
      ]}
    />
  );
}
