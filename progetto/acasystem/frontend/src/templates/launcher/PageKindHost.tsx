import { memo } from 'react';
import { PageUnavailable } from '@/components/system/launcher/LauncherStates';
import { Title } from '@/components/primitives';
import { findPageKindDefinition } from '@/components/widgets/registry';
import { usePages } from '@/hooks/context/PageContext';
import type { LauncherPage } from '@/@types/launcher';
import { displayLabel } from '@/utils/launcher/pageIdentity';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Special full page (luci, batterie, stanze, multimedia, Sonos, Casa 3D) from its kind definition, in the
 * shell shared by every special page: the margins of the widget pages and the page title (h1).
 * Memoized: the pointer frames of a drag re-render the launcher, not the special pages.
 */
export const PageKindHost = memo(function PageKindHost({
  page,
  editMode,
}: {
  page: LauncherPage;
  editMode: boolean;
}) {
  const definition = page.kind === 'widgets' ? undefined : findPageKindDefinition(page.kind);
  const label = displayLabel(page.label);
  const { pageSettings, savePageSetting } = usePages();
  const settings = pageSettings[page.id] ?? {};
  return (
    <div className="aca-launcher-page aca-launcher-special" inert={editMode || undefined}>
      <Title level={1}>{label}</Title>
      {definition ? (
        <ErrorBoundary
          resetKey={`${page.id}|${page.kind}`}
          label={`page ${page.id}`}
          fallback={<PageUnavailable label={label} />}
        >
          <definition.Page
            pageId={page.id}
            settings={settings}
            onSaveSetting={(key, value) => savePageSetting(page.id, key, value)}
            editMode={editMode}
          />
        </ErrorBoundary>
      ) : (
        <PageUnavailable label={label} />
      )}
    </div>
  );
});
