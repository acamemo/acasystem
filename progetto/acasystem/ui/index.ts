/** UI React condivisa; i moduli restano importabili anche dai rispettivi sottopercorsi. */
export * from './primitives';
export { AppShell } from './layout/AppShell';
export type { AppShellProps } from './layout/AppShell';
export { Pager } from './navigation/Pager';
export type { PagerPage, PagerProps } from './navigation/Pager';
export { PageIndicator } from './navigation/PageIndicator';
export { ToastHost } from './toast/ToastHost';
export { ToastProvider, useToast } from './toast/ToastContext';
export type { Toast, ToastContextValue, ToastType } from './toast/types';
