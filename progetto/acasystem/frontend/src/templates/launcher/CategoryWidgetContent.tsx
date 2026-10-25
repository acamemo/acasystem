import { useId, useMemo } from 'react';
import type { WidgetDefinition, WidgetProps } from '@/@types/launcher';
import { WidgetRuntimeProvider, useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { AdaptiveCategoryWidget } from './AdaptiveCategoryWidget';
import { ADAPTIVE_WIDGET_TYPES } from '@/components/widgets/adaptive/widgetTypes';
import { ADD_WIDGET_TYPES, type AddWidgetType } from '../sheets/catalog';
import { BINDING_KEYS, categoryDeviceId, isCategoryWidgetReady } from '../sheets/categoryPages';
import { pagerMoving } from '@/utils/launcher/pagerMoving';

const UNBOUND_AS_IS = new Set(['calendar', 'todo']);
const UNBOUND_HINT = 'Questo widget non è ancora collegato a un dispositivo.';

/** What a device with nothing to say reports: widgets that print the state print this dash. */
const NEUTRAL = '–';

/**
 * What the placeholder device reports, per type: a device that is off where being off makes sense
 * (light, fan, climate, players, TV, vacuum, mower), a dash where nothing can be said (sensor,
 * weather, energy, car, room). It must never assert something about a real device, least of all
 * its safety: the lock, the alarm and the camera report the dash too, so they print neither
 * «aperta», «chiusa», «armato» nor «disattivato», and no picture is loaded. «unknown» and
 * «unavailable» are not used: every widget would draw its fault variant (warning icon, red).
 */
const PLACEHOLDER_STATE: Record<string, { state: string; attributes?: Record<string, unknown> }> = {
  sensor: { state: NEUTRAL },
  light: { state: 'off', attributes: { supported_color_modes: ['brightness'] } },
  fan: { state: 'off', attributes: { supported_features: 49, percentage: 0 } },
  lock: { state: NEUTRAL, attributes: { icon: 'key' } },
  vacuum: { state: 'idle' },
  mower: { state: 'idle' },
  camera: { state: NEUTRAL },
  climate: {
    state: 'off',
    attributes: { hvac_modes: ['off', 'heat', 'cool'], min_temp: 7, max_temp: 35 },
  },
  cover: { state: NEUTRAL, attributes: { supported_features: 15 } },
  alarm: { state: NEUTRAL, attributes: { supported_features: 1 } },
  androidtv: { state: 'off' },
  appletv: { state: 'off' },
  media: { state: 'off' },
  sonos: { state: 'off' },
  weather: { state: NEUTRAL },
  cost: { state: NEUTRAL },
  nordpool: { state: NEUTRAL },
  room: { state: NEUTRAL },
  car: { state: NEUTRAL },
};

/** Same operational component before/after binding, with no service or connection while empty. */
export function CategoryWidgetContent({
  definition,
  onConfigure,
  ...props
}: WidgetProps & {
  definition: WidgetDefinition;
  onConfigure: () => void;
}) {
  const runtime = useWidgetRuntime();
  const ready = isCategoryWidgetReady(props.settings);
  const deviceId = categoryDeviceId(props.id, props.settings);
  const type = String(props.settings.categoryWidgetType);
  const key = BINDING_KEYS[type];
  const hintId = useId();
  const placeholderId = `preset.${props.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  // Only Multimedia and Sonos share one definition, so only they take the catalog label;
  // every other type keeps the definition label to leave its visible name unchanged.
  const label =
    type === 'media' || type === 'sonos'
      ? (ADD_WIDGET_TYPES.find((item) => item.type === type)?.label ?? definition.label)
      : definition.label;
  // Calendar and to-do hold a placeholder that never loads (no connection): leave them
  // unbound so they draw their own «not associated» notice instead of an endless skeleton.
  const settings =
    ready || !key || UNBOUND_AS_IS.has(type)
      ? props.settings
      : {
          ...props.settings,
          [key]: ['mediaIds', 'calendars'].includes(key) ? [placeholderId] : placeholderId,
          // A room with no device only draws its «nothing associated» message: give it one.
          ...(type === 'room' ? { entityIds: [placeholderId] } : {}),
        };
  const value = useMemo(() => {
    if (ready)
      return {
        ...runtime,
        openDetails: () => runtime.openDetails(props.id),
        customNames: {
          ...runtime.customNames,
          ...(runtime.customNames[props.id] ? { [deviceId]: runtime.customNames[props.id] } : {}),
        },
        customIcons: {
          ...runtime.customIcons,
          ...(runtime.customIcons[props.id] ? { [deviceId]: runtime.customIcons[props.id] } : {}),
        },
      };
    const neutral = PLACEHOLDER_STATE[type] ?? { state: NEUTRAL };
    const entity = {
      entity_id: placeholderId,
      state: neutral.state,
      attributes: { ...neutral.attributes, friendly_name: label },
      last_changed: '',
      last_updated: '',
      context: { id: '', parent_id: null, user_id: null },
    };
    return {
      ...runtime,
      entitiesLoaded: true,
      conn: null,
      entities: { [placeholderId]: entity, [props.id]: { ...entity, entity_id: props.id } },
      callService: async () => undefined,
      // No picture or stream source (a camera would reload its snapshot every few seconds).
      getEntityImageUrl: () => null,
      openDetails: onConfigure,
    };
  }, [runtime, ready, props.id, deviceId, placeholderId, label, type, onConfigure]);
  // Calendar and to-do keep their own notice; a transparent tile-wide tap target opens the
  // configuration («Collega»: the devices found for this widget).
  const ownNotice = !ready && UNBOUND_AS_IS.has(type);
  const unbound = !ready && !ownNotice;
  return (
    <WidgetRuntimeProvider value={value}>
      <div
        className="aca-category-widget"
        data-unbound={unbound || undefined}
        data-editing={(unbound && props.editMode) || undefined}
        data-category-type={unbound ? type : undefined}
      >
        <div className="aca-category-widget__content" inert={!ready || undefined}>
          {ready && ADAPTIVE_WIDGET_TYPES.has(type) && definition.Widget.name !== 'Probe' ? (
            <AdaptiveCategoryWidget
              id={props.id}
              settingsKey={props.settingsKey}
              settings={props.settings}
              type={type as AddWidgetType['type']}
              entityId={deviceId}
              size={props.size}
              editMode={props.editMode}
              onConfigure={onConfigure}
              openDetails={() => runtime.openDetails(props.id)}
            />
          ) : (
            <definition.Widget {...props} id={deviceId} settings={settings} />
          )}
        </div>
        {!ready && !props.editMode && (
          // The only target, over the whole tile (the widget under it is inert). A tap opens
          // «Collega» at once (ADR-0016, rectification of 2026-10-21); one that only stops the
          // fling of the pager opens nothing.
          <button
            type="button"
            className="aca-category-widget__tap"
            data-category-bind={unbound ? '' : undefined}
            aria-label={`Collega ${label}`}
            aria-describedby={unbound ? hintId : undefined}
            onClick={(event) => {
              if (pagerMoving(event.currentTarget)) return;
              onConfigure();
            }}
          />
        )}
        {unbound && (
          // No visible «Da collegare» chip (ISSUE-105): the installer knows at a glance. Readers get
          // the state in words instead, and the tap target keeps its hint.
          <>
            <span className="sr-only" data-category-unbound="">
              {`${label}, non collegato`}
            </span>
            <span id={hintId} className="sr-only">
              {UNBOUND_HINT}
            </span>
          </>
        )}
      </div>
    </WidgetRuntimeProvider>
  );
}
