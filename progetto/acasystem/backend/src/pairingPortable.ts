import type { SharedConfiguration } from './pairing.ts';

type Obj = Record<string, unknown>;
const obj = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);
const prefixes: Record<string, string> = {
  light: 'light.', fan: 'fan.', vacuum: 'vacuum.', mower: 'lawn_mower.', sensor: 'entity_card_',
  lock: 'lock_card_', camera: 'camera_card_', climate: 'climate_card_', cover: 'cover_card_',
  alarm: 'alarm_card_', androidtv: 'androidtv_card_', appletv: 'appletv_card_', media: 'media_group_',
  sonos: 'sonos_group_', weather: 'weather_temp_', calendar: 'calendar_card_', todo: 'todo_card_',
  cost: 'cost_card_', nordpool: 'nordpool_card_', room: 'room_card_', car: 'car_card_',
  spacer: 'spacer_card_', rileva: 'rileva_card_', zigbee: 'zigbee_card_',
  cover_clock: 'cover_clock_', cover_calendar: 'cover_calendar_', cover_weather: 'cover_weather_',
};
const typeOf = (id: string, settings: Obj): string => {
  if (typeof settings.categoryWidgetType === 'string' && settings.categoryWidgetType in prefixes) return settings.categoryWidgetType;
  const found = Object.entries(prefixes).find(([, prefix]) => id.startsWith(prefix));
  if (found) return found[0];
  if (id.startsWith('light_')) return 'light';
  if (id.startsWith('media_player.')) return 'media';
  return 'sensor';
};
const pick = (source: Obj, keys: readonly string[]): Obj => Object.fromEntries(keys
  .filter((key) => ['string', 'number', 'boolean'].includes(typeof source[key]))
  .map((key) => [key, source[key]]));
const grid = (value: unknown): Obj | null => {
  if (!obj(value) || !['x', 'y', 'w', 'h'].every((key) => Number.isInteger(value[key])
    && Number(value[key]) >= (key === 'w' || key === 'h' ? 1 : 0) && Number(value[key]) <= 64)) return null;
  return { x: value.x, y: value.y, w: value.w, h: value.h };
};

/** Copy structure and style across homes; rebuild ids and keep every widget unbound. */
export const portableConfiguration = (source: SharedConfiguration): SharedConfiguration => {
  const layout = source.snapshot.layout;
  const launcher = obj(layout.launcherLayout) ? layout.launcherLayout : {};
  const sourcePages = Array.isArray(launcher.pages) ? launcher.pages.filter(obj) : [];
  const settings = obj(layout.cardSettings) ? layout.cardSettings : {};
  const newSettings: Obj = {};
  const newNames: Obj = {};
  const newIcons: Obj = {};
  const stacks: Obj = {};
  const ids = new Map<string, string>();
  const pageIds = new Map(sourcePages.map((page, index) => [String(page.id), `qr_page_${index + 1}`]));
  const sourceStacks = obj(launcher.stacks) ? launcher.stacks : {};
  let count = 0;
  const copyWidget = (oldId: string, oldPageId: string): string => {
    const known = ids.get(oldId);
    if (known) return known;
    if (oldId.startsWith('stack_') && obj(sourceStacks[oldId])) {
      const stack = sourceStacks[oldId];
      const id = `stack_aca_copy_${++count}`;
      ids.set(oldId, id);
      stacks[id] = {
        ids: Array.isArray(stack.ids) ? stack.ids.filter((item): item is string => typeof item === 'string')
          .map((item) => copyWidget(item, oldPageId)) : [],
        ...(stack.rotate === true ? { rotate: true } : {}),
      };
      return id;
    }
    const card = settings[`${oldPageId}::${oldId}`] ?? settings[oldId];
    const cardObj = obj(card) ? card : {};
    const type = typeOf(oldId, cardObj);
    const id = `${prefixes[type]}aca_copy_${++count}`;
    ids.set(oldId, id);
    const style = { categoryWidgetType: type, ...pick(cardObj, ['size', 'variant', 'color', 'icon', 'chartType']) };
    newSettings[id] = type === 'sensor' ? { ...style, type: 'sensor' } : style;
    const oldNames = obj(layout.customNames) ? layout.customNames : {};
    const oldIcons = obj(layout.customIcons) ? layout.customIcons : {};
    if (typeof oldNames[oldId] === 'string') newNames[id] = oldNames[oldId];
    if (typeof oldIcons[oldId] === 'string') newIcons[id] = oldIcons[oldId];
    return id;
  };
  const pages = sourcePages.map((page) => {
    const placements: Obj = {};
    for (const [deviceClass, cells] of Object.entries(obj(page.placements) ? page.placements : {})) {
      if (!/^(phone|phoneLandscape|tabletPortrait|tablet)(@(?:compact|wide|\d+x\d+))?$/.test(deviceClass) || !obj(cells)) continue;
      placements[deviceClass] = Object.fromEntries(Object.entries(cells).flatMap(([id, rect]) => {
        const safe = grid(rect);
        return safe ? [[copyWidget(id, String(page.id)), safe]] : [];
      }));
    }
    const categoryGrids = Object.fromEntries(Object.entries(obj(page.categoryGrids) ? page.categoryGrids : {})
      .filter(([key, value]) => /^(phone|phoneLandscape|tabletPortrait|tablet)$/.test(key) && obj(value)
        && Number.isInteger(value.w) && Number.isInteger(value.h)
        && Number(value.w) >= 1 && Number(value.w) <= 64 && Number(value.h) >= 1 && Number(value.h) <= 64)
      .map(([key, value]) => [key, { w: (value as Obj).w, h: (value as Obj).h }]));
    return {
      ...pick(page, ['label', 'icon', 'kind', 'hidden', 'columns']), id: pageIds.get(String(page.id)), placements,
      ...(Object.keys(categoryGrids).length ? { categoryGrids } : {}),
      ...(typeof page.continuationOf === 'string' && pageIds.has(page.continuationOf)
        ? { continuationOf: pageIds.get(page.continuationOf) } : {}),
    };
  });
  const pagesConfig: Obj = { pages: pages.map((page) => page.id), header: [] };
  for (const page of pages) pagesConfig[String(page.id)] = [...new Set(Object.values(page.placements)
    .flatMap((cells) => obj(cells) ? Object.keys(cells) : []))];
  const copiedLayout: Obj = {
    ...pick(layout, ['gridColumns', 'dynamicGridColumns', 'gridGapH', 'gridGapV', 'cardBorderRadius',
      'cardsOnlyMode', 'headerTitle', 'headerScale']),
    pagesConfig,
    cardSettings: newSettings, customNames: newNames, customIcons: newIcons,
    widgetMemory: { entries: {}, touched: {} }, pageSettings: {}, statusPillsConfig: [],
    headerSettings: obj(layout.headerSettings) ? pick(layout.headerSettings, ['showTitle', 'showClock', 'showDate']) : {},
  };
  if (pages.length) copiedLayout.launcherLayout = {
    version: 1, categoryDefaultsVersion: 1, casa3dVersion: 1,
    cover: { enabled: !obj(launcher.cover) || launcher.cover.enabled !== false }, pages,
    ...pick(launcher, ['locked', 'density']),
    ...(pageIds.has(String(launcher.homePageId)) ? { homePageId: pageIds.get(String(launcher.homePageId)) } : {}),
    ...(Object.keys(stacks).length ? { stacks } : {}),
  };
  return { snapshot: { version: 1, layout: copiedLayout, appearance: {} }, appearance: { ...source.appearance } };
};
