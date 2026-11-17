import { useEffect, useState } from 'react';
import { fetchBrandLogo } from '@/api/devicesApi';
import type { DeviceFamily } from '@/utils/devices/classify';
import type { UtilityIconName } from '../shared/UtilityIcon';
import { FAMILY_ICON } from './familyIcon';

/** Object URL of each logo (null: the server has none), per brand and theme, for the whole session. */
const logos = new Map<string, string | null>();
const loading = new Map<string, Promise<string | null>>();

const keyOf = (domain: string, dark: boolean) => `${domain}|${dark ? 'scuro' : 'chiaro'}`;

/** Kit 2 sets the theme actually shown on <html> (`data-theme`, «auto» already resolved). */
const isDarkTheme = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';

/**
 * The logo of a brand as an object URL, loaded once per brand and theme: the answer, a logo or the
 * lack of one, is kept in memory, so a failure is not asked again until the page is reloaded.
 */
function loadLogo(domain: string, dark: boolean): Promise<string | null> {
  const key = keyOf(domain, dark);
  if (logos.has(key)) return Promise.resolve(logos.get(key) ?? null);
  let request = loading.get(key);
  if (!request) {
    request = fetchBrandLogo(domain, dark)
      .then((blob) => (blob && blob.size > 0 ? URL.createObjectURL(blob) : null))
      .catch(() => null)
      .then((url) => {
        logos.set(key, url);
        loading.delete(key);
        return url;
      });
    loading.set(key, request);
  }
  return request;
}

/** Forgets every logo (tests; the app keeps them until it is closed). */
export function resetBrandLogos(): void {
  for (const url of logos.values()) if (url) URL.revokeObjectURL(url);
  logos.clear();
  loading.clear();
}

/**
 * The logo of the brand of a device (the integration `handler`), and the icon to draw while it
 * loads or when there is none (404, an error): the icon of the family, or `wifi` without one.
 * `settled` tells that the answer, a logo or the lack of one, is known (not still loading).
 * Logos come through Acasystem, never from a third party, in the dark variant with the dark theme.
 */
export function useBrandLogo(
  handler: string,
  family: DeviceFamily | null
): { url: string | null; icon: UtilityIconName; settled: boolean } {
  const dark = isDarkTheme();
  const key = keyOf(handler, dark);
  const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!handler || logos.has(key)) return undefined;
    let cancelled = false;
    void loadLogo(handler, dark).then((url) => {
      if (!cancelled) setLoaded({ key, url });
    });
    return () => {
      cancelled = true;
    };
  }, [dark, handler, key]);

  const url = logos.has(key) ? (logos.get(key) ?? null) : loaded?.key === key ? loaded.url : null;
  const settled = !handler || logos.has(key) || loaded?.key === key;
  return { url, icon: family ? FAMILY_ICON[family] : 'wifi', settled };
}
