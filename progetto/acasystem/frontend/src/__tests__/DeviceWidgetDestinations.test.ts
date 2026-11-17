import { describe, expect, it } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import type { LauncherLayout } from '@/@types/launcher';
import { deviceWidgetDestinations } from '@/utils/devices/widgetDestinations';
import { configOf } from '@/utils/launcher/deviceMemory';

const registry = [{ entity_id: 'light.a', device_id: 'a' }, { entity_id: 'light.b', device_id: 'b' }] as HaEntityRegistryEntry[];
const base: LauncherLayout = { version: 1, cover: { enabled: false }, pages: [
  { id: 'home', kind: 'widgets', label: 'Casa', placements: { tablet: { 'light.a': { x: 0, y: 0, w: 1, h: 1 } } } },
] };
const key = (page: string, widget: string) => `${page}::${widget}`;

describe('destinazioni derivate dal dispositivo', () => {
  it('usa bindingEntityId del prodotto vacuum e ignora i metadati dopo una riassociazione', () => {
    const productDevice = { version: 1 as const, family: 'vacuum' as const, deviceId: 'robot', primaryEntityId: 'vacuum.a', channelEntityIds: ['vacuum.a'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0]!, placements: {}, order: ['vacuum_card_new'] }] };
    const settings = { categoryWidgetType: 'vacuum', bindingEntityId: 'vacuum.a', productDevice };
    expect(deviceWidgetDestinations('robot', layout, [], () => settings, key)).toMatchObject([{ widgetId: 'vacuum_card_new' }]);
    expect(deviceWidgetDestinations('robot', layout, [], () => ({ ...settings, bindingEntityId: 'vacuum.other', entityId: 'vacuum.a' }), key)).toEqual([]);
  });
  it('usa bindingEntityId del prodotto mower e ignora i metadati dopo una riassociazione', () => {
    const productDevice = { version: 1 as const, family: 'mower' as const, deviceId: 'yard', primaryEntityId: 'lawn_mower.a', channelEntityIds: ['lawn_mower.a'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0]!, placements: {}, order: ['mower_card_new'] }] };
    const settings = { categoryWidgetType: 'mower', bindingEntityId: 'lawn_mower.a', productDevice };
    expect(deviceWidgetDestinations('yard', layout, [], () => settings, key)).toMatchObject([{ widgetId: 'mower_card_new' }]);
    expect(deviceWidgetDestinations('yard', layout, [], () => ({ ...settings, bindingEntityId: 'lawn_mower.other', entityId: 'lawn_mower.a' }), key)).toEqual([]);
  });
  it('usa cameraId del prodotto e ignora i metadati dopo una riassociazione', () => {
    const productDevice = { version: 1 as const, family: 'camera' as const, deviceId: 'cam', primaryEntityId: 'camera.a', channelEntityIds: ['camera.a'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0]!, placements: {}, order: ['camera_card_new'] }] };
    const settings = { categoryWidgetType: 'camera', cameraId: 'camera.a', productDevice };
    expect(deviceWidgetDestinations('cam', layout, [], () => settings, key)).toMatchObject([{ widgetId: 'camera_card_new' }]);
    expect(deviceWidgetDestinations('cam', layout, [], () => ({ ...settings, cameraId: 'camera.other', bindingEntityId: 'camera.a' }), key)).toEqual([]);
  });
  it('usa alarmId del prodotto e ignora i metadati dopo una riassociazione', () => {
    const productDevice = { version: 1 as const, family: 'alarm' as const, deviceId: 'panel', primaryEntityId: 'alarm_control_panel.a', channelEntityIds: ['alarm_control_panel.a'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0]!, placements: {}, order: ['alarm_card_new'] }] };
    const settings = { categoryWidgetType: 'alarm', alarmId: 'alarm_control_panel.a', productDevice };
    expect(deviceWidgetDestinations('panel', layout, [], () => settings, key)).toMatchObject([{ widgetId: 'alarm_card_new' }]);
    expect(deviceWidgetDestinations('panel', layout, [], () => ({ ...settings, alarmId: 'alarm_control_panel.other', bindingEntityId: 'alarm_control_panel.a' }), key)).toEqual([]);
  });
  it('usa lockId del prodotto e ignora i metadati dopo la riassociazione', () => {
    const productDevice = { version: 1 as const, family: 'lock' as const, deviceId: 'door', primaryEntityId: 'lock.a', channelEntityIds: ['lock.a'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0]!, placements: {}, order: ['lock_card_new'] }] };
    const settings = { categoryWidgetType: 'lock', lockId: 'lock.a', productDevice };
    expect(deviceWidgetDestinations('door', layout, [], () => settings, key)).toMatchObject([{ widgetId: 'lock_card_new' }]);
    expect(deviceWidgetDestinations('door', layout, [], () => ({ ...settings, lockId: 'lock.other', bindingEntityId: 'lock.a' }), key)).toEqual([]);
  });
  it('usa bindingEntityId Fan anche senza registro e non riusa il prodotto dopo una riassociazione', () => {
    const productDevice = { version: 1 as const, family: 'fan' as const, deviceId: 'vent', primaryEntityId: 'fan.a', channelEntityIds: ['fan.a'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0]!, placements: {}, order: ['fan_card_new'] }] };
    const settings = { categoryWidgetType: 'fan', bindingEntityId: 'fan.a', productDevice };
    expect(deviceWidgetDestinations('vent', layout, [], () => settings, key)).toMatchObject([{ widgetId: 'fan_card_new' }]);
    expect(deviceWidgetDestinations('vent', layout, [], () => ({ ...settings, bindingEntityId: 'fan.other' }), key)).toEqual([]);
  });
  it('usa coverId per il prodotto Cover anche senza registro, senza riusare metadati dopo una riassociazione', () => {
    const productDevice = { version: 1 as const, family: 'cover' as const, deviceId: 'shade', primaryEntityId: 'cover.a', channelEntityIds: ['cover.a'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0]!, placements: {}, order: ['cover_card_new'] }] };
    const settings = { categoryWidgetType: 'cover', coverId: 'cover.a', productDevice };
    expect(deviceWidgetDestinations('shade', layout, [], () => settings, key)).toMatchObject([{ widgetId: 'cover_card_new' }]);
    expect(deviceWidgetDestinations('shade', layout, [], () => ({ ...settings, coverId: 'cover.other', bindingEntityId: 'cover.a' }), key)).toEqual([]);
  });
  it('usa climateId per i nuovi prodotti Clima anche senza il registro e ignora un vecchio binding concorrente', () => {
    const productDevice = { version: 1 as const, family: 'climate' as const, deviceId: 'ac', primaryEntityId: 'climate.a',
      channelEntityIds: ['climate.a', 'climate.b'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0], placements: {}, order: ['climate_card_ac'] }] };
    const settings = { categoryWidgetType: 'climate', climateId: 'climate.a', productDevice };
    expect(deviceWidgetDestinations('ac', layout, [], () => settings, key)).toHaveLength(1);
    expect(deviceWidgetDestinations('ac', layout, [], () => ({ ...settings, climateId: 'climate.other', bindingEntityId: 'climate.a' }), key)).toEqual([]);
  });
  it('non confonde due dispositivi della stessa integrazione e non modifica il profilo', () => {
    const before = JSON.stringify(base);
    expect(deviceWidgetDestinations('b', base, registry, () => ({}), key)).toEqual([]);
    expect(deviceWidgetDestinations('a', base, registry, () => ({}), key)).toMatchObject([{ widgetId: 'light.a', pageId: 'home' }]);
    expect(JSON.stringify(base)).toBe(before);
  });
  it('risolve membri di pile e pagine nascoste con la loro chiave originale', () => {
    const layout: LauncherLayout = { ...base, stacks: { stack: { ids: ['light.a', 'light.b'] } }, pages: [
      { ...base.pages[0], id: 'hidden', hidden: true, placements: { tablet: { stack: { x: 0, y: 0, w: 2, h: 2 } } } },
    ] };
    const result = deviceWidgetDestinations('b', layout, registry, () => ({}), key);
    expect(result).toMatchObject([{ widgetId: 'light.b', stackId: 'stack', pageId: 'hidden', settingsKey: 'hidden::light.b' }]);
    expect(layout.pages[0].hidden).toBe(true);
  });
  it('conserva destinazioni multiple storiche e deduplica segmenti della stessa pagina logica', () => {
    const layout: LauncherLayout = { ...base, commonOrderVersion: 1, pages: [
      { ...base.pages[0], id: 'home', order: ['first', 'second'], placements: {} },
      { ...base.pages[0], id: 'segment', logicalPageId: 'home', order: ['first'], placements: {} },
    ] };
    const settings = (): CardSettings => ({ categoryWidgetType: 'light', bindingEntityId: 'light.a' });
    const result = deviceWidgetDestinations('a', layout, registry, settings, key);
    expect(result.map(item => item.widgetId)).toEqual(['first', 'second']);
  });
  it('attribuisce la pila soltanto sulla pagina che la contiene', () => {
    const layout: LauncherLayout = { ...base, stacks: { stack: { ids: ['light.a'] } }, pages: [
      base.pages[0], { ...base.pages[0], id: 'other', placements: { tablet: { stack: { x: 0, y: 0, w: 2, h: 2 } } } },
    ] };
    const result = deviceWidgetDestinations('a', layout, registry, () => ({}), key);
    expect(result.find(item => item.pageId === 'home')?.stackId).toBeUndefined();
    expect(result.find(item => item.pageId === 'other')?.stackId).toBe('stack');
  });
  it('riconosce il binding nuovo e non lo copia nella memoria della configurazione', () => {
    const productDevice = { version: 1 as const, family: 'light' as const, deviceId: 'a', primaryEntityId: 'light.a', channelEntityIds: ['light.a'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0], placements: {}, order: ['new-light'] }] };
    const settings = { categoryWidgetType: 'light', bindingEntityId: 'light.a', productDevice, transition: 2 };
    expect(deviceWidgetDestinations('a', layout, [], () => settings, key)).toHaveLength(1);
    expect(configOf('light', settings)).toEqual({ transition: 2 });
  });
  it('non usa metadati del vecchio dispositivo dopo una nuova associazione manuale', () => {
    const productDevice = { version: 1 as const, family: 'light' as const, deviceId: 'a', primaryEntityId: 'light.a', channelEntityIds: ['light.a'], secondaryEntityIds: [] };
    const layout: LauncherLayout = { ...base, pages: [{ ...base.pages[0], placements: {}, order: ['new-light'] }] };
    const settings = { categoryWidgetType: 'light', bindingEntityId: 'light.b', productDevice };
    expect(deviceWidgetDestinations('a', layout, registry, () => settings, key)).toEqual([]);
    expect(deviceWidgetDestinations('b', layout, registry, () => settings, key)).toHaveLength(1);
  });
});
