import type {
  Configuration,
  EditTarget,
  ProfileChange,
} from "./collaboration.ts";
import { widgetDeviceKey, widgetTypeOf } from "./widgetIdentity.ts";

const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const safeKey = (key: string) => key.length > 0 && !FORBIDDEN.has(key);

function clone(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clone);
  if (!object(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!safeKey(key)) throw new Error("Chiave di configurazione non ammessa.");
    result[key] = clone(item);
  }
  return result;
}

/** Le liste sono atomiche: nessuna patch per indice o accesso al prototipo. */
export function applyChanges(
  configuration: Configuration,
  changes: readonly ProfileChange[],
): Configuration {
  const result = clone(configuration) as Configuration;
  for (const change of changes) {
    if (
      !Array.isArray(change.path) ||
      change.path.length === 0 ||
      change.path.length > 32 ||
      change.path.some((key) => typeof key !== "string" || !safeKey(key))
    ) {
      throw new Error("Percorso di configurazione non ammesso.");
    }
    let parent: Record<string, unknown> = result;
    for (const key of change.path.slice(0, -1)) {
      if (parent[key] === undefined) parent[key] = {};
      if (!object(parent[key]))
        throw new Error("Il percorso attraversa un valore non modificabile.");
      parent = parent[key];
    }
    const key = change.path[change.path.length - 1]!;
    if (change.remove) delete parent[key];
    else {
      if (!Object.hasOwn(change, "value") || change.value === undefined)
        throw new Error("Valore della modifica mancante.");
      parent[key] = clone(change.value);
    }
  }
  return result;
}

/** Diff deterministico dei campi; gli array restano un singolo valore. */
export function diffConfiguration(
  before: Configuration,
  after: Configuration,
): ProfileChange[] {
  const changes: ProfileChange[] = [];
  const walk = (oldValue: unknown, newValue: unknown, path: string[]) => {
    if (Object.is(oldValue, newValue)) return;
    if (object(oldValue) && object(newValue)) {
      for (const key of [
        ...new Set([...Object.keys(oldValue), ...Object.keys(newValue)]),
      ].sort()) {
        if (!safeKey(key))
          throw new Error("Chiave di configurazione non ammessa.");
        if (!Object.hasOwn(newValue, key))
          changes.push({ path: [...path, key], remove: true });
        else if (!Object.hasOwn(oldValue, key))
          changes.push({ path: [...path, key], value: clone(newValue[key]) });
        else walk(oldValue[key], newValue[key], [...path, key]);
      }
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push(
        newValue === undefined
          ? { path, remove: true }
          : { path, value: clone(newValue) },
      );
    }
  };
  walk(before, after, []);
  return changes;
}

export function configurationLayout(
  configuration: Configuration,
): Record<string, unknown> {
  const snapshot = object(configuration.snapshot)
    ? configuration.snapshot
    : configuration;
  return object(snapshot.layout) ? snapshot.layout : {};
}

const widgetOf = (key: string) =>
  key.includes("::") ? key.slice(key.indexOf("::") + 2) : key;
export const deviceResource = (type: string, entityKey: string) =>
  `device:${encodeURIComponent(type)}:${encodeURIComponent(entityKey)}`;

function groupsForWidget(
  configuration: Configuration,
  widgetId: string,
): string[] {
  const layout = configurationLayout(configuration);
  const settings = object(layout.cardSettings) ? layout.cardSettings : {};
  const groups = new Set<string>();
  for (const [key, value] of Object.entries(settings)) {
    if (widgetOf(key) !== widgetId || !object(value)) continue;
    const entityKey = widgetDeviceKey(widgetId, value);
    if (entityKey)
      groups.add(deviceResource(widgetTypeOf(widgetId, value), entityKey));
  }
  // Entity widgets can have no settings entry yet.
  if (groups.size === 0) {
    const entityKey = widgetDeviceKey(widgetId, {});
    if (entityKey)
      groups.add(deviceResource(widgetTypeOf(widgetId, {}), entityKey));
  }
  return [...groups];
}

export function resourcesForTarget(
  configuration: Configuration,
  target: EditTarget,
): string[] {
  if (target.kind === "structure") return ["profile"];
  if (!target.widgetId || !safeKey(target.widgetId))
    throw new Error("Widget della modifica mancante.");
  const groups = new Set(groupsForWidget(configuration, target.widgetId));
  const resources = new Set([`widget:${target.widgetId}`, ...groups]);
  const layout = configurationLayout(configuration);
  const settings = object(layout.cardSettings) ? layout.cardSettings : {};
  for (const [key, value] of Object.entries(settings)) {
    if (!object(value)) continue;
    const id = widgetOf(key);
    const entity = widgetDeviceKey(id, value);
    if (entity && groups.has(deviceResource(widgetTypeOf(id, value), entity)))
      resources.add(`widget:${id}`);
  }
  return [...resources].sort();
}

/** Le risorse sono dedotte dai dati attuali e proposti, mai dall'identità dichiarata dal client. */
export function resourcesForChanges(
  before: Configuration,
  after: Configuration,
  changes: readonly ProfileChange[],
): string[] {
  const resources = new Set<string>();
  for (const change of changes) {
    const path =
      change.path[0] === "snapshot" ? change.path.slice(1) : change.path;
    if (path[0] !== "layout") return ["profile"];
    const [field, key, detail] = path.slice(1);
    if (
      (field === "cardSettings" ||
        field === "customNames" ||
        field === "customIcons") &&
      key
    ) {
      const widgetId = field === "cardSettings" ? widgetOf(key) : key;
      resources.add(`widget:${widgetId}`);
      groupsForWidget(before, widgetId).forEach((item) => resources.add(item));
      groupsForWidget(after, widgetId).forEach((item) => resources.add(item));
    } else if (field === "widgetMemory" && key === "touched" && detail) {
      resources.add(`widget:${detail}`);
    } else if (
      field === "widgetMemory" &&
      key === "entries" &&
      detail &&
      detail.includes("|")
    ) {
      const divider = detail.indexOf("|");
      resources.add(
        deviceResource(detail.slice(0, divider), detail.slice(divider + 1)),
      );
    } else return ["profile"];
  }
  return [...resources].sort();
}

/** Le impostazioni archiviate da sole non fanno ricomparire un widget eliminato. */
export function widgetExists(
  configuration: Configuration,
  target: EditTarget,
): boolean {
  if (target.kind !== "widget" || !target.widgetId)
    return target.kind === "structure";
  const layout = configurationLayout(configuration);
  const launcher = object(layout.launcherLayout) ? layout.launcherLayout : null;
  const stacks = launcher && object(launcher.stacks) ? launcher.stacks : {};
  const pages = launcher && Array.isArray(launcher.pages) ? launcher.pages : [];
  for (const value of pages) {
    if (!object(value) || (target.pageId && value.id !== target.pageId))
      continue;
    if (Array.isArray(value.order) && value.order.includes(target.widgetId))
      return true;
    if (
      Array.isArray(value.order) &&
      value.order.some((id) => {
        const stack = typeof id === "string" ? stacks[id] : null;
        return (
          object(stack) &&
          Array.isArray(stack.ids) &&
          stack.ids.includes(target.widgetId)
        );
      })
    )
      return true;
    if (!object(value.placements)) continue;
    for (const placements of Object.values(value.placements)) {
      if (!object(placements)) continue;
      if (Object.hasOwn(placements, target.widgetId)) return true;
      if (launcher && object(launcher.stacks)) {
        for (const id of Object.keys(placements)) {
          const stack = launcher.stacks[id];
          if (
            object(stack) &&
            Array.isArray(stack.ids) &&
            stack.ids.includes(target.widgetId)
          )
            return true;
        }
      }
    }
  }
  if (launcher) return false;
  const legacy = object(layout.pagesConfig) ? layout.pagesConfig : {};
  return Object.entries(legacy).some(
    ([pageId, ids]) =>
      pageId !== "pages" &&
      pageId !== "header" &&
      (!target.pageId || target.pageId === pageId) &&
      Array.isArray(ids) &&
      ids.includes(target.widgetId),
  );
}
