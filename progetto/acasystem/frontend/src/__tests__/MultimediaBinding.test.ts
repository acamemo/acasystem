import { describe, expect, it, vi } from 'vitest';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import type { CardSettings } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, multimediaProductBinding, resolveMediaDeviceBinding, resolveSonosDeviceBinding, resolveTvDeviceBinding } from '@/utils/devices/productBinding';
import { classifyDevices, PLATFORM_FAMILY } from '@/utils/devices/classify';
import { deviceWidgetDestinations } from '@/utils/devices/widgetDestinations';

// Destination indexing needs the saved layout, not the unrelated renderer tree.
vi.mock('@/components/widgets/registry', () => ({ findWidgetDefinition: () => undefined }));

const devices = [{ id: 'player', name: 'Nome condiviso', manufacturer: 'Stessa marca', config_entries: ['hub'] },
  { id: 'other', name: 'Nome condiviso', manufacturer: 'Stessa marca', config_entries: ['hub'] }];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry => ({ entity_id, device_id: 'player', platform: 'dlna_dmr', config_entry_id: 'hub', ...extra });
const states = fixtureEntities([fixtureEntity('media_player.a', 'idle'), fixtureEntity('media_player.b', 'playing')]);
const resolvers = [['media', resolveMediaDeviceBinding, 'dlna_dmr'], ['sonos', resolveSonosDeviceBinding, 'sonos'], ['tv', resolveTvDeviceBinding, 'androidtv_remote']] as const;

describe('Multimedia: identità esatta e ruoli dei canali', () => {
  it.each(resolvers)('%s non aggrega dispositivi omonimi o remotes della medesima entry', (family, resolve, platform) => {
    const registry = [row('media_player.b', { platform }), row('media_player.a', { platform }),
      row('media_player.other', { device_id: 'other', platform }), row('remote.other', { device_id: 'other' }),
      row('media_player.helper', { device_id: null }), row('remote.own'), row('sensor.battery')];
    const before = JSON.stringify({ devices, registry, states });
    const binding = resolve('player', devices, registry, states)!;
    expect(binding).toEqual({ version: 1, family, deviceId: 'player', primaryEntityId: 'media_player.a',
      channelEntityIds: ['media_player.a', 'media_player.b'], secondaryEntityIds: ['remote.own', 'sensor.battery'], technicalEntityIds: [] });
    expect(isProductDeviceBinding(binding)).toBe(true);
    expect(JSON.stringify({ devices, registry, states })).toBe(before);
  });
  it.each(resolvers)('%s esclude hidden/disabled e conserva solo secondarie proprie', (_family, resolve, platform) => {
    const registry = [row('media_player.a', { platform }), row('media_player.a', { platform }),
      row('media_player.b', { platform, hidden_by: 'user' }), row('media_player.disabled', { platform, disabled_by: 'integration' }),
      row('remote.hidden', { hidden_by: 'user' }), row('remote.disabled', { disabled_by: 'integration' }),
      row('sensor.power'), row('binary_sensor.alert'), row('switch.output'), row('number.offset'), row('select.mode'),
      row('button.service'), row('event.service'), row('update.firmware'), row('camera.foreign_domain'),
      row('media_player.technical', { platform, entity_category: 'diagnostic' }),
      row('remote.technical', { entity_category: 'config' }), row('light.status', { entity_category: 'diagnostic' })];
    const binding = resolve('player', devices, registry, states)!;
    expect(binding.channelEntityIds).toEqual(['media_player.a']);
    expect(binding.secondaryEntityIds).toEqual(['binary_sensor.alert', 'button.service', 'event.service', 'number.offset',
      'select.mode', 'sensor.power', 'switch.output', 'update.firmware', 'light.status', 'media_player.technical', 'remote.technical']);
    expect(binding.technicalEntityIds).toEqual(['light.status', 'media_player.technical', 'remote.technical']);
    expect(isProductDeviceBinding(binding)).toBe(true);
  });
  it.each(resolvers)('%s rifiuta dispositivi assenti/disabilitati e canali solo tecnici', (_family, resolve, platform) => {
    const registry = [row('media_player.a', { platform })];
    expect(resolve('missing', devices, registry, states)).toBeNull();
    expect(resolve('player', [{ id: 'player', disabled_by: 'user' }], registry, states)).toBeNull();
    expect(resolve('player', devices, [row('media_player.a', { platform, entity_category: 'config' })], states)).toBeNull();
    expect(resolve('player', devices, [row('remote.own'), row('sensor.power')], states)).toBeNull();
    expect(resolve('player', devices, registry, {})).toBeNull();
  });
  it.each(['off', 'on', 'idle', 'playing', 'paused', 'buffering', 'standby'])('preferisce lo stato ufficiale %s a un valore anomalo', state => {
    const entities = fixtureEntities([fixtureEntity('media_player.a', 'constructor'), fixtureEntity('media_player.b', state)]);
    expect(resolveMediaDeviceBinding('player', devices, [row('media_player.a'), row('media_player.b')], entities)?.primaryEntityId).toBe('media_player.b');
  });
  it('mantiene canali temporaneamente privi di snapshot, senza inventare disponibilità', () => {
    const registry = [row('media_player.a'), row('media_player.b'), row('media_player.c')];
    const entities = fixtureEntities([fixtureEntity('media_player.a', 'unavailable'), fixtureEntity('media_player.b', 'vendor_state')]);
    expect(resolveMediaDeviceBinding('player', devices, registry, entities)).toMatchObject({ primaryEntityId: 'media_player.b', channelEntityIds: ['media_player.a', 'media_player.b', 'media_player.c'] });
    expect(entities['media_player.c']).toBeUndefined();
    expect(resolveMediaDeviceBinding('player', devices, registry, fixtureEntities([fixtureEntity('media_player.a', 'unknown')])))
      .toMatchObject({ primaryEntityId: 'media_player.a' });
  });
  it('rivaluta il primario disabilitato e ordina senza dipendere dall’ordine del registro', () => {
    const registry = [row('media_player.b'), row('media_player.a'), row('remote.own')];
    const binding = resolveMediaDeviceBinding('player', devices, registry, states);
    expect(binding).toEqual(resolveMediaDeviceBinding('player', devices, [...registry].reverse(), states));
    expect(resolveMediaDeviceBinding('player', devices, registry.map(entry => entry.entity_id === 'media_player.a' ? { ...entry, disabled_by: 'user' } : entry), states))
      .toMatchObject({ primaryEntityId: 'media_player.b', channelEntityIds: ['media_player.b'] });
  });
  it.each(resolvers)('%s persiste soltanto identità, mai token o metadati di riproduzione', (_family, resolve, platform) => {
    const secret = 'SYNTHETIC_MEDIA_SECRET';
    const binding = resolve('player', devices, [row('media_player.a', { platform, access_token: secret }), row('remote.own')],
      fixtureEntities([fixtureEntity('media_player.a', 'playing', { entity_picture: secret, media_content_id: secret, access_token: secret, app_name: secret })]))!;
    expect(Object.keys(binding).sort()).toEqual(['version', 'deviceId', 'family', 'primaryEntityId', 'channelEntityIds', 'secondaryEntityIds', 'technicalEntityIds'].sort());
    expect(JSON.stringify(binding)).not.toContain(secret);
  });
  it.each(['media', 'sonos', 'tv'] as const)('il contratto %s rifiuta dominio errato e canale tecnico', family => {
    const binding = { version: 1, family, deviceId: 'player', primaryEntityId: 'media_player.a', channelEntityIds: ['media_player.a'], secondaryEntityIds: [] };
    for (const invalid of [{ ...binding, primaryEntityId: 'remote.a', channelEntityIds: ['remote.a'] },
      { ...binding, channelEntityIds: ['media_player.a', 'switch.a'] }, { ...binding, technicalEntityIds: ['media_player.a'] },
      { ...binding, family: 'constructor' }, { ...binding, family: '__proto__' }]) expect(isProductDeviceBinding(invalid)).toBe(false);
  });
});

describe('Multimedia: classificazione da registro e sottotipo TV', () => {
  it.each([
    ['apple_tv', {}, 'tv', 'appletv'], ['androidtv_remote', {}, 'tv', 'androidtv'], ['androidtv', {}, 'tv', 'androidtv'],
    ['webostv', {}, 'tv', 'androidtv'], ['samsungtv', {}, 'tv', 'androidtv'], ['cast', { device_class: 'tv' }, 'tv', 'androidtv'],
    ['sonos', {}, 'sonos', 'sonos'], ['dlna_dmr', {}, 'media', 'media'],
    ['cast', { device_class: 'speaker' }, 'media', 'media'], ['cast', { device_class: 'receiver' }, 'media', 'media'],
    ['apple_tv', { device_class: 'speaker' }, 'media', 'media'],
  ])('%s %j -> %s/%s', (platform, attributes, family, widgetType) => {
    const registry = [row('media_player.a', { platform })];
    const entities = fixtureEntities([fixtureEntity('media_player.a', 'idle', attributes)]);
    expect(classifyDevices({ devices, entityRegistry: registry, entities })).toMatchObject([{ deviceId: 'player', family, widgetType }]);
    const resolve = family === 'tv' ? resolveTvDeviceBinding : family === 'sonos' ? resolveSonosDeviceBinding : resolveMediaDeviceBinding;
    expect(resolve('player', devices, registry, entities)?.family).toBe(family);
  });
  it('espone apple_tv anche per il raccordo entry senza attribuire un tipo tv inesistente', () => {
    expect(PLATFORM_FAMILY.apple_tv).toBe('tv');
    expect(classifyDevices({ devices, entityRegistry: [row('media_player.a', { platform: 'apple_tv' })], entities: states })[0]?.widgetType).toBe('appletv');
  });
  it.each([
    ['apple_tv', 'cast', 'tv', 'appletv', resolveTvDeviceBinding],
    ['sonos', 'dlna_dmr', 'sonos', 'sonos', resolveSonosDeviceBinding],
  ] as const)('mantiene famiglia/sottotipo %s quando il canale nativo arriva dopo lo snapshot ausiliario', (platform, auxiliary, family, widgetType, resolve) => {
    const registry = [row('media_player.a', { platform }), row('media_player.b', { platform: auxiliary })];
    const delayed = fixtureEntities([fixtureEntity('media_player.b', 'playing')]);
    const before = classifyDevices({ devices, entityRegistry: registry, entities: delayed })[0];
    expect(before).toMatchObject({ family, widgetType, primaryEntityId: 'media_player.b', entityIds: ['media_player.b', 'media_player.a'] });
    expect(resolve('player', devices, registry, delayed)).toMatchObject({ family, primaryEntityId: 'media_player.b' });
    const ready = classifyDevices({ devices, entityRegistry: registry, entities: states })[0];
    expect(ready).toMatchObject({ family, widgetType, primaryEntityId: 'media_player.a' });
    expect(delayed['media_player.a']).toBeUndefined();
  });
  it('nomi, marchio, attributi Sonos o URL non cambiano la famiglia dichiarata dal registro', () => {
    const entities = fixtureEntities([fixtureEntity('media_player.a', 'playing', { friendly_name: 'Sonos Apple TV', platform: 'sonos', manufacturer: 'Sonos', sonos_group: ['media_player.other'], media_content_id: 'sonos://media' })]);
    const registry = [row('media_player.a', { platform: 'upnp' })];
    expect(classifyDevices({ devices, entityRegistry: registry, entities })[0]?.family).toBe('media');
    expect(resolveSonosDeviceBinding('player', devices, registry, entities)).toBeNull();
  });
  it('mantiene Sonos prima TV prima media senza aggregare il resto della entry', () => {
    const registry = [row('media_player.a', { platform: 'apple_tv' }), row('media_player.b', { platform: 'sonos' })];
    expect(classifyDevices({ devices, entityRegistry: registry, entities: states })[0]?.family).toBe('sonos');
    expect(resolveSonosDeviceBinding('player', devices, registry, states)?.channelEntityIds).toEqual(['media_player.a', 'media_player.b']);
    expect(resolveTvDeviceBinding('player', devices, registry, states)).toBeNull();
    expect(resolveMediaDeviceBinding('player', devices, registry, states)).toBeNull();
  });
  it('preferisce il TV nativo a Cast anche quando Cast riproduce e il nativo è temporaneamente indisponibile', () => {
    const registry = [row('media_player.a', { platform: 'cast' }), row('media_player.b', { platform: 'webostv' }),
      row('remote.z'), row('remote.a', { entity_category: 'config' }), row('remote.other', { device_id: 'other' })];
    const entities = fixtureEntities([fixtureEntity('media_player.a', 'playing'), fixtureEntity('media_player.b', 'unavailable'), fixtureEntity('remote.z', 'on'), fixtureEntity('remote.a', 'on'), fixtureEntity('remote.other', 'on')]);
    expect(resolveTvDeviceBinding('player', devices, registry, entities)?.primaryEntityId).toBe('media_player.b');
    expect(classifyDevices({ devices, entityRegistry: registry, entities })[0]).toMatchObject({ family: 'tv', primaryEntityId: 'media_player.b', entityIds: ['media_player.b', 'media_player.a'], remoteId: 'remote.z' });
  });
  it.each(['config', 'diagnostic'])('un player %s non sostituisce il prodotto ordinario', entity_category => {
    const registry = [row('media_player.a', { platform: 'sonos', entity_category }), row('switch.output')];
    const entities = { ...states, 'switch.output': fixtureEntity('switch.output', 'on') };
    expect(classifyDevices({ devices, entityRegistry: registry, entities })[0]?.family).toBe('plug');
    expect(resolveSonosDeviceBinding('player', devices, registry, entities)).toBeNull();
  });
  it('conserva la precedenza dei media sugli accessori e le famiglie dirette preesistenti', () => {
    const registry = [row('media_player.a'), row('light.a'), row('cover.a'), row('fan.a')];
    const entities = { ...states, ...fixtureEntities([fixtureEntity('light.a', 'on'), fixtureEntity('cover.a', 'closed'), fixtureEntity('fan.a', 'on')]) };
    expect(classifyDevices({ devices, entityRegistry: registry, entities })[0]?.family).toBe('media');
    expect(classifyDevices({ devices, entityRegistry: registry.slice(1), entities })[0]?.family).toBe('light');
  });
});

describe('Multimedia: metadati coerenti e destinazioni senza migrare i gruppi', () => {
  const media = resolveMediaDeviceBinding('player', devices, [row('media_player.a'), row('media_player.b')], states)!;
  const tv = resolveTvDeviceBinding('player', devices, [row('media_player.a', { platform: 'apple_tv' })], states)!;
  const base: LauncherLayout = { version: 1, cover: { enabled: false }, pages: [{ id: 'home', kind: 'widgets', label: 'Casa', placements: {}, order: ['media_group_product'] }] };
  const key = (page: string, widget: string) => `${page}::${widget}`;
  it('verifica TV con mediaPlayerId scalare senza usare bindingEntityId obsoleto', () => {
    expect(multimediaProductBinding({ productDevice: tv, mediaPlayerId: 'media_player.a' })).toBe(tv);
    expect(multimediaProductBinding({ productDevice: tv, mediaPlayerId: 'media_player.b' })).toBeNull();
    expect(multimediaProductBinding({ productDevice: tv, mediaPlayerId: ['media_player.a'] })).toBeNull();
    expect(multimediaProductBinding({ productDevice: tv })).toBeNull();
  });
  it.each(['media', 'sonos'] as const)('%s richiede primario primo e insieme esatto, non un gruppo arbitrario', family => {
    const productDevice = { ...media, family };
    expect(multimediaProductBinding({ productDevice, mediaIds: ['media_player.a', 'media_player.b'] })).toEqual(productDevice);
    for (const mediaIds of [[], ['media_player.a'], ['media_player.a', 'media_player.b', 'media_player.other'], ['media_player.b', 'media_player.a'], ['media_player.a', 'media_player.a'], 'media_player.a', null])
      expect(multimediaProductBinding({ productDevice, mediaIds })).toBeNull();
    expect(multimediaProductBinding({ mediaIds: ['media_player.a', 'media_player.b'] })).toBeNull();
  });
  it('trova media/Sonos/TV senza registro con le rispettive chiavi persistite', () => {
    for (const settings of [{ categoryWidgetType: 'media', mediaIds: ['media_player.a', 'media_player.b'], productDevice: media },
      { categoryWidgetType: 'sonos', mediaIds: ['media_player.a', 'media_player.b'], productDevice: { ...media, family: 'sonos' as const } },
      { categoryWidgetType: 'appletv', mediaPlayerId: 'media_player.a', productDevice: tv }])
      expect(deviceWidgetDestinations('player', base, [], () => settings, key)).toMatchObject([{ widgetId: 'media_group_product', pageId: 'home' }]);
  });
  it('non usa metadati stantii come prova di un gruppo modificato e conserva il lookup legacy reale', () => {
    const registry = [row('media_player.a'), row('media_player.other', { device_id: 'other' })];
    const settings: CardSettings = { categoryWidgetType: 'media', productDevice: media, mediaIds: ['media_player.a', 'media_player.other'] };
    expect(deviceWidgetDestinations('player', base, [], () => settings, key)).toEqual([]);
    expect(deviceWidgetDestinations('player', base, registry, () => settings, key)).toHaveLength(1);
    expect(deviceWidgetDestinations('other', base, registry, () => settings, key)).toHaveLength(1);
    expect(multimediaProductBinding(settings)).toBeNull();
  });
  it('raggiunge pile/pagine nascoste e deduplica segmenti senza cambiare ordine o gruppi', () => {
    const layout: LauncherLayout = { ...base, stacks: { pile: { ids: ['media_group_product'] } }, commonOrderVersion: 1,
      pages: [{ ...base.pages[0]!, id: 'hidden', hidden: true, order: ['pile'] },
        { ...base.pages[0]!, id: 'segment', logicalPageId: 'hidden', order: ['pile'] }] };
    const settings = { mediaIds: ['media_player.a', 'media_player.b'], productDevice: media };
    const before = JSON.stringify({ layout, settings });
    expect(deviceWidgetDestinations('player', layout, [], () => settings, key)).toMatchObject([{ widgetId: 'media_group_product', pageId: 'hidden', stackId: 'pile' }]);
    expect(deviceWidgetDestinations('player', layout, [], () => settings, key)).toHaveLength(1);
    expect(JSON.stringify({ layout, settings })).toBe(before);
  });
});
