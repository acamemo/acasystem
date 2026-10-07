/**
 * Acasystem login page (ADR-0009): user and password of Home Assistant through the Acasystem
 * server, second factor when active, long-lived token for kiosk tablets. The app shows it while
 * this browser has no credentials; it needs ConfigProvider above it.
 */
export type { ConnectPageProps } from './ConnectPage';
export { ConnectPage } from './ConnectPage';
