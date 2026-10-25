import { useEffect, useState } from 'react';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import type { ServiceCatalog } from './operationalProfile';

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export function parseQueue(value: unknown, entityId: string) {
  const envelope = record(value);
  const response = envelope.response ?? envelope.service_response ?? value;
  const body = record(response)[entityId] ?? response;
  const rows = Array.isArray(body) ? body : record(body).queue;
  return Array.isArray(rows)
    ? rows.flatMap((row, index) => {
        const item = record(row);
        return typeof item.media_title === 'string'
          ? [{ id: String(index), label: item.media_title }]
          : [];
      })
    : [];
}
export function parseMediaChildren(
  value: unknown
): { id: string; label: string; type: string; playable: boolean; expandable: boolean }[] {
  const body = record(value);
  return Array.isArray(body.children)
    ? body.children.flatMap((row) => {
        const item = record(row);
        return (item.can_play === true || item.can_expand === true) &&
          typeof item.media_content_id === 'string' &&
          typeof item.media_content_type === 'string'
          ? [
              {
                id: item.media_content_id,
                label: String(item.title ?? item.media_content_id),
                type: item.media_content_type,
                playable: item.can_play === true,
                expandable: item.can_expand === true,
              },
            ]
          : [];
      })
    : [];
}

export function useMediaResources(
  type: string,
  entityId: string,
  services: ServiceCatalog | null,
  location?: unknown
) {
  const { conn, entities } = useWidgetRuntime();
  const visible = usePageVisible();
  const [result, setResult] = useState({
    entityId: '',
    queue: [] as { id: string; label: string }[],
    content: [] as { id: string; label: string; type: string }[],
    error: false,
  });
  const browse = Boolean(Number(entities[entityId]?.attributes.supported_features ?? 0) & 131072);
  const browseId =
    typeof record(location).id === 'string' ? String(record(location).id) : undefined;
  const browseType =
    typeof record(location).type === 'string' ? String(record(location).type) : undefined;
  useEffect(() => {
    if (
      !visible ||
      !conn ||
      typeof conn.sendMessagePromise !== 'function' ||
      !['media', 'sonos', 'androidtv', 'appletv'].includes(type)
    )
      return;
    let active = true;
    const load = async () => {
      let queue: { id: string; label: string }[] = [];
      let content: { id: string; label: string; type: string }[] = [];
      let error = false;
      if (type === 'sonos' && services?.sonos?.get_queue) {
        try {
          queue = parseQueue(
            await conn.sendMessagePromise({
              type: 'call_service',
              domain: 'sonos',
              service: 'get_queue',
              target: { entity_id: entityId },
              return_response: true,
            }),
            entityId
          );
        } catch {
          error = true;
        }
      }
      if (browse) {
        try {
          content = parseMediaChildren(
            await conn.sendMessagePromise({
              type: 'media_player/browse_media',
              entity_id: entityId,
              ...(browseId ? { media_content_id: browseId, media_content_type: browseType } : {}),
            })
          );
        } catch {
          error = true;
        }
      }
      if (active) setResult({ entityId, queue, content, error });
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conn, entityId, type, services, visible, browse, browseId, browseType]);
  return result.entityId === entityId ? result : { queue: [], content: [], error: false };
}
