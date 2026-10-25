/**
 * Name of a widget for people and assistive technologies: the custom name, the card heading,
 * the entity name, the widget type, the id, in this order (as the legacy cards did).
 */
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function widgetDisplayName(
  widgetId: string,
  settings: CardSettings,
  entities: EntityMap,
  customNames: Record<string, string>,
  typeLabel?: string
): string {
  const custom = text(customNames[widgetId]) || text(settings.name) || text(settings.heading);
  if (custom) return custom;
  const entityId =
    [
      'bindingEntityId',
      'lockId',
      'coverId',
      'entityId',
      'climateId',
      'weatherId',
      'mediaPlayerId',
      'cameraId',
      'alarmId',
      'vacuumId',
      'nordpoolId',
      'todoEntityId',
      'tempId',
      'personId',
    ]
      .map((key) => text(settings[key]))
      .find(Boolean) ||
    (Array.isArray(settings.calendars) ? text(settings.calendars[0]) : '') ||
    widgetId;
  const friendly = text(entities[entityId]?.attributes?.friendly_name);
  if (friendly) return friendly;
  // A room card has no entity: its name is the area chosen for it (as RoomWidget shows it).
  return text(settings.areaName) || typeLabel || widgetId;
}

/** «2 per 2, colonna 3, riga 1» */
export function describeRect(rect: { x: number; y: number; w: number; h: number }): string {
  return `${rect.w} per ${rect.h}, colonna ${rect.x + 1}, riga ${rect.y + 1}`;
}
