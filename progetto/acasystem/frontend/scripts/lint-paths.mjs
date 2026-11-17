// I percorsi precedenti contengono solo re-export: i controlli analizzano la fonte UI condivisa.
const shimDir = 'src/components/primitives';
const shimFiles = [
  'src/components/system/page-indicator/PageIndicator.tsx',
  'src/components/system/toast/ToastHost.tsx',
  'src/hooks/context/ToastContext.tsx',
  'src/hooks/launcher/gestures.ts',
  'src/hooks/launcher/PageVisibilityContext.tsx',
  'src/hooks/launcher/useLeaving.ts',
  'src/hooks/launcher/useOverviewPan.ts',
  'src/hooks/launcher/usePageDrag.ts',
  'src/hooks/launcher/useStagedScene.ts',
  'src/templates/app-shell/AppShell.tsx',
  'src/templates/app-shell/footerBand.ts',
  'src/templates/launcher/Pager.tsx',
  'src/utils/launcher/afterFrame.ts',
];

export const sharedUiShimGlobs = [`${shimDir}/**`, ...shimFiles];
export const isSharedUiShim = (file) =>
  file.startsWith(`${shimDir}/`) || shimFiles.includes(file);
