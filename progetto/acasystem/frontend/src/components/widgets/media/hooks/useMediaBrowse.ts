import { useCallback, useEffect, useState } from 'react';
import type { HaMessageConnection } from '@/@types/ha';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { browseMediaChoices, type BrowseChoices } from '../model/choices';

export interface MediaBrowseState {
  choices: BrowseChoices | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

const canBrowse = (conn: unknown): conn is HaMessageConnection =>
  typeof conn === 'object' &&
  conn !== null &&
  typeof (conn as { sendMessagePromise?: unknown }).sendMessagePromise === 'function';

/**
 * Loads the browse tree of a player once per session (legacy cache by player id) while the
 * chooser is open. Without a connection only the Sonos attributes are offered.
 */
export function useMediaBrowse(
  conn: unknown,
  entityId: string | null,
  enabled: boolean
): MediaBrowseState {
  const visible = usePageVisible();
  const [results, setResults] = useState<Record<string, BrowseChoices | 'error'>>({});
  const known = entityId ? results[entityId] !== undefined : true;
  const usable = canBrowse(conn) ? conn : null;

  useEffect(() => {
    if (!enabled || !visible || !entityId || !usable || known) return undefined;
    let cancelled = false;
    browseMediaChoices(usable, entityId, () => cancelled).then(
      (choices) => {
        if (!cancelled) setResults((prev) => ({ ...prev, [entityId]: choices }));
      },
      () => {
        if (!cancelled) setResults((prev) => ({ ...prev, [entityId]: 'error' }));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, visible, entityId, usable, known]);

  const retry = useCallback(() => {
    if (!entityId) return;
    setResults((prev) => {
      const next = { ...prev };
      delete next[entityId];
      return next;
    });
  }, [entityId]);

  const result = entityId ? results[entityId] : undefined;
  return {
    choices: result && result !== 'error' ? result : null,
    loading: Boolean(enabled && entityId && usable && result === undefined),
    error: result === 'error',
    retry,
  };
}
