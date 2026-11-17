import { useEffect, useState } from 'react';
import type { HaMessageConnection } from '@/@types/ha';
import { browseAppChoices, type MediaChoice } from '../model/choices';

const canBrowse = (conn: unknown): conn is HaMessageConnection =>
  typeof conn === 'object' &&
  conn !== null &&
  typeof (conn as { sendMessagePromise?: unknown }).sendMessagePromise === 'function';

/**
 * The apps a TV lists when browsed (Android TV remote: the apps configured in Home Assistant),
 * read once while `enabled`. Empty while loading, when the TV lists none and when the call fails:
 * the caller then keeps its fixed list.
 */
export function useTvBrowsedApps(conn: unknown, entityId: string, enabled: boolean): MediaChoice[] {
  const [apps, setApps] = useState<{ entityId: string; list: MediaChoice[] } | null>(null);
  const usable = canBrowse(conn) ? conn : null;

  useEffect(() => {
    if (!enabled || !entityId || !usable) return undefined;
    let cancelled = false;
    browseAppChoices(usable, entityId).then(
      (list) => {
        if (!cancelled) setApps({ entityId, list });
      },
      () => {
        if (!cancelled) setApps({ entityId, list: [] });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, entityId, usable]);

  return apps && apps.entityId === entityId ? apps.list : [];
}
