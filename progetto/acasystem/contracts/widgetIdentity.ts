/** Identità e gruppi ADR-0019: modello puro comune a server e browser. */
export type WidgetKind =
  | "sensor"
  | "light"
  | "media"
  | "calendar"
  | "todo"
  | "cost"
  | "nordpool"
  | "androidtv"
  | "appletv"
  | "vacuum"
  | "car"
  | "room"
  | "lock"
  | "cover"
  | "alarm"
  | "spacer"
  | "camera"
  | "fan"
  | "climate"
  | "weather"
  | "person"
  | "other";

export const CAR_KEYS = [
  "batteryId",
  "rangeId",
  "odometerId",
  "fuelLevelId",
  "locationId",
  "latitudeId",
  "longitudeId",
  "pluggedId",
  "chargingPowerId",
  "chargeRateId",
  "timeToFullId",
  "chargeEndTimeId",
  "chargeLimitNumberId",
  "chargeLimitSelectId",
  "climateId",
  "lockId",
  "ignitionSwitchId",
  "engineStatusId",
  "lastUpdatedId",
  "apiStatusId",
  "updateButtonId",
] as const;

export const BINDING_KEYS: Record<string, string> = {
  light: "bindingEntityId",
  plug: "bindingEntityId",
  fan: "bindingEntityId",
  vacuum: "bindingEntityId",
  mower: "bindingEntityId",
  sensor: "entityId",
  lock: "lockId",
  camera: "cameraId",
  climate: "climateId",
  cover: "coverId",
  alarm: "alarmId",
  androidtv: "mediaPlayerId",
  appletv: "mediaPlayerId",
  media: "mediaIds",
  sonos: "mediaIds",
  weather: "weatherId",
  calendar: "calendars",
  todo: "todoEntityId",
  cost: "todayId",
  nordpool: "nordpoolId",
  room: "areaId",
  car: "batteryId",
};

export function categoryEntityId(
  type: string,
  settings: Record<string, unknown>,
): string | undefined {
  const key = BINDING_KEYS[type];
  if (key) {
    const val = settings[key];
    if (Array.isArray(val)) {
      if (typeof val[0] === "string" && val[0]) return val[0];
    } else if (typeof val === "string" && val) {
      return val;
    }
  }
  if (
    typeof settings.bindingEntityId === "string" &&
    settings.bindingEntityId
  ) {
    return settings.bindingEntityId;
  }
  return undefined;
}

export function kindOf(
  id: string,
  settings: Record<string, unknown>,
): WidgetKind {
  const isSensor =
    id.startsWith("entity_card_") ||
    (settings.type === "sensor" &&
      !/^(light[_.]|lock\.|vacuum\.|lawn_mower\.|fan\.|media_player\.)/.test(
        id,
      ));
  if (isSensor) return "sensor";
  if (id.startsWith("light_") || id.startsWith("light.")) return "light";
  if (
    id.startsWith("media_player.") ||
    id === "media_player" ||
    id.startsWith("media_group_") ||
    id.startsWith("sonos_group_")
  )
    return "media";
  if (id.startsWith("calendar_card_")) return "calendar";
  if (id.startsWith("todo_card_")) return "todo";
  if (id.startsWith("cost_card_")) return "cost";
  if (id.startsWith("nordpool_card_")) return "nordpool";
  if (id.startsWith("androidtv_card_")) return "androidtv";
  if (id.startsWith("appletv_card_")) return "appletv";
  if (id.startsWith("vacuum.")) return "vacuum";
  if (id === "car" || id.startsWith("car_card_")) return "car";
  if (id.startsWith("room_card_")) return "room";
  if (id.startsWith("lock_card_") || id.startsWith("lock.")) return "lock";
  if (id.startsWith("cover_card_")) return "cover";
  if (id.startsWith("alarm_card_")) return "alarm";
  if (id.startsWith("spacer_card_")) return "spacer";
  if (id.startsWith("camera_card_")) return "camera";
  if (id.startsWith("fan.") || id.startsWith("fan_card_")) return "fan";
  if (id.startsWith("climate_card_")) return "climate";
  if (id.startsWith("weather_temp_")) return "weather";
  if (id.startsWith("person.")) return "person";
  return "other";
}

export const DEVICE_SCOPED_SETTINGS: ReadonlySet<string> = new Set([
  // Associations of entities
  "adaptiveBindings",
  "sonosAlarmIds",
  "remoteId",
  "linkedMediaPlayers",
  "roomScripts",
  "batterySensorId",
  "currentRoomSensorId",
  "cleaningTimeSensorId",
  "cleanedAreaSensorId",
  "totalCleanTimeSensorId",
  "totalCleanAreaSensorId",
  "totalCleanCountSensorId",
  "lastCleanStartSensorId",
  "lastCleanEndSensorId",
  "roomSelectEntityId",
  "mopIntensityControlEntityId",
  "mapImageEntityId",
  ...CAR_KEYS.filter((key) => key !== "batteryId"),
  "chargingStateId",
  "chargingId",
  "chargeControlIds",
  // Connection of a camera
  "cameraStreamEngine",
  "cameraWebrtcUrl",
  "cameraGo2rtcMode",
  "cameraRefreshMode",
  "cameraRefreshInterval",
  "cameraMotionSensor",
  "cameraCastIds",
  "cameraPtz",
  "cameraCaptureDirectory",
  "cameraRecordDuration",
  // Defaults sent with the commands
  "lightTransition",
  "sonosSleepMinutes",
]);

const ENTITY_WIDGET_TYPES = new Set([
  "light",
  "fan",
  "vacuum",
  "mower",
  "lock",
  "media",
  "sensor",
]);
const ENTITY_ID = /^[a-z0-9_]+\.[A-Za-z0-9_]+$/;

/** Type of a widget: its category type, else the kind the legacy id rules give it. */
export function widgetTypeOf(
  widgetId: string,
  settings: Record<string, unknown>,
): string {
  const category =
    typeof settings.categoryWidgetType === "string"
      ? settings.categoryWidgetType
      : "";
  if (category) return category;
  if (widgetId.startsWith("lawn_mower.")) return "mower";
  return kindOf(widgetId, settings);
}

/**
 * The device a widget shows, or null when it shows none (not linked yet, a spacer, the clock…).
 * A widget of a category is linked through its binding; a widget added from an entity is that
 * entity.
 */
export function widgetDeviceKey(
  widgetId: string,
  settings: Record<string, unknown>,
): string | null {
  const type = widgetTypeOf(widgetId, settings);
  if (!Object.hasOwn(BINDING_KEYS, type)) return null;
  const bound = categoryEntityId(type, settings);
  if (bound) return bound;
  if (settings.categoryWidgetType) return null;
  return ENTITY_WIDGET_TYPES.has(type) && ENTITY_ID.test(widgetId)
    ? widgetId
    : null;
}
