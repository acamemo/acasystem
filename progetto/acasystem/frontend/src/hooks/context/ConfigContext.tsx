/**
 * App configuration (ADR-0007, ADR-0009). Only the way this browser accesses Home Assistant is
 * kept here: the session of the Acasystem login or a long-lived token for kiosk tablets.
 * Home Assistant is always reached through the Acasystem server (`getHassUrl()`): no address is
 * asked, saved or read by the browser, and the addresses saved by Tunet (`ha_url`,
 * `ha_fallback_url`) are removed with the tokens obtained for them.
 * Theme (Acasystem), language (Italian), units (from Home Assistant) and font (Inter) are
 * fixed; there is no background choice, settings lock or automatic return to the home page
 * (the removed lock is ISSUE-023). The appearance keys saved by Tunet (`tunet_theme`,
 * `tunet_language`, `tunet_bg_*`, `tunet_settings_lock_*`, `tunet_inactivity_timeout`, …) are
 * no longer read or written: they stay in the browser untouched and are ignored.
 */
import { createContext, useContext, useMemo, useState } from 'react';
import type {
  ConfigContextValue,
  ConfigProviderProps,
  FixedAppearance,
  HomeAssistantConfig,
} from '@/@types/dashboard';
import { getHassUrl } from '@/api/haUrl';
import { forgetLegacyConnection, readAccessMethod, readKioskToken } from '@/api/haSession';

export type { ConfigContextValue, ConfigProviderProps, FixedAppearance };

/** The fixed appearance of ADR-0007. */
export const FIXED_APPEARANCE: FixedAppearance = {
  theme: 'acasystem',
  language: 'it',
  unitsMode: 'follow_ha',
  font: 'Inter',
};

const ConfigContext = createContext<ConfigContextValue | null>(null);

export const useConfig = (): ConfigContextValue => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};

/**
 * Saved access. `url` is the address of the Acasystem proxy, computed and never stored;
 * `fallbackUrl` stays empty (the type still lists it).
 */
function readInitialConfig(): HomeAssistantConfig {
  const url = getHassUrl();
  if (typeof globalThis.window === 'undefined') {
    return { url, fallbackUrl: '', token: '', authMethod: 'oauth' };
  }
  forgetLegacyConnection(url);
  const authMethod = readAccessMethod();
  return {
    url,
    fallbackUrl: '',
    token: authMethod === 'token' ? readKioskToken() : '',
    authMethod,
  };
}

export const ConfigProvider = ({ children }: ConfigProviderProps) => {
  const [config, setConfig] = useState<HomeAssistantConfig>(readInitialConfig);

  const value = useMemo<ConfigContextValue>(
    () => ({ ...FIXED_APPEARANCE, config, setConfig }),
    [config]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

/** Opens and closes the Acasystem login page; the app root provides it. */
export interface ConnectPageControl {
  /** Shows the login page. The current session stays until a new access is accepted. */
  open: () => void;
  /** Back to the app without a new access; null when there is no session to go back to. */
  cancel: (() => void) | null;
}

const ConnectPageContext = createContext<ConnectPageControl | null>(null);

export const ConnectPageControlProvider = ConnectPageContext.Provider;

/** Control of the login page, or null outside the app (previews, isolated pages). */
export const useConnectPageControl = (): ConnectPageControl | null =>
  useContext(ConnectPageContext);
