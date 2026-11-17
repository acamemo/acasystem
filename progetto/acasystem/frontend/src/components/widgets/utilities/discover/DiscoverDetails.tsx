import type { WidgetDetailsProps } from '@/@types/launcher';
import {
  AddWidgetRequestProvider,
  useAddWidgetRequest,
} from '@/hooks/launcher/AddWidgetRequestContext';
import { useOptionalLauncher } from '@/hooks/launcher/LauncherContext';
import { widgetPages } from '@/utils/launcher/deviceMemory';
import { DiscoveryContent } from './DiscoveryContent';

/** The fallback details share the same list, filters and pairing flows as the direct entry. */
export function DiscoverDetails({ id, onClose }: WidgetDetailsProps) {
  const launcher = useOptionalLauncher();
  const requestAdd = useAddWidgetRequest();
  const pageId =
    [...(launcher ? (widgetPages(launcher.layout).get(id) ?? []) : [])][0] ??
    launcher?.layout.pages.find((page) => page.kind === 'widgets')?.id ??
    'home';
  const content = <DiscoveryContent pageId={pageId} />;
  return launcher && requestAdd ? (
    <AddWidgetRequestProvider
      value={(page, selection) => {
        onClose();
        requestAdd(page, selection);
      }}
    >
      {content}
    </AddWidgetRequestProvider>
  ) : (
    content
  );
}
