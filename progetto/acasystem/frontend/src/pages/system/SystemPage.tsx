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
import { connectionSummary } from '@/utils/launcher/connection';
import { AboutSection, CoverSection, useRunningVersion } from './sections/AboutSection';
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
 * Sistema: connection to Home Assistant (through Acasystem, ADR-0009), profiles, status bar, cover and information. There is
 * no Appearance section (ADR-0007): theme, language, units, font, background, lock and return
 * to home are gone. Profiles apply layout only, never the old appearance preferences.
 */
export function SystemPage({ onClose }: SystemPageProps) {
  const launcher = useOptionalLauncher();
  const pages = usePages();
  const { config, setConfig } = useConfig();
  const meta = useHomeAssistantMeta();
  const entities = useHomeAssistantEntities();
  const version = useRunningVersion(__APP_VERSION__);

  // Profiles and imports apply the layout, launcher included, never the old appearance.
  const contextSetters = useSnapshotSetters();
  const profiles = useProfiles({ haUser: meta.haUser, contextSetters });
  // Home Assistant is reached through the Acasystem server: the section shows the session and
  // offers a new sign-in (the login page) and the sign-out, which revokes the session.
  const setup = useConnectionSetup({ config, setConfig });

  const coverEnabled = launcher
    ? launcher.layout.cover.enabled
    : (pages.launcherLayout?.cover.enabled ?? true);

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
          id: 'sistema-informazioni',
          title: 'Informazioni',
          content: <AboutSection version={version} />,
        },
      ]}
    />
  );
}
