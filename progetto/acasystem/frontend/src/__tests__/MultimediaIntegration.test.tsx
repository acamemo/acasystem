import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductBindingSection } from '@/templates/sheets/ProductBindingSection';
import { mockHouse, buildRegistries, mockBindingSettings } from '@/utils/mockup/mockData';
import { classifyDevices } from '@/utils/devices/classify';
import { resolveTvDeviceBinding, resolveSonosDeviceBinding, resolveMediaDeviceBinding, multimediaProductBinding } from '@/utils/devices/productBinding';
import { multimediaAssociationPatch } from '@/utils/devices/multimediaSettings';
import { createCategoryWidgetSeed } from '@/utils/launcher/categoryModels';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ProductDevicePreview } from '@/templates/launcher/ProductDevicePreview';
import { fakeConnection, renderWithRuntime, serviceMock } from './ControlsHarness';

afterEach(cleanup);
const cases = [
  { family: 'tv', type: 'androidtv', deviceId: 'dev_multimedia_tv', name: 'TV multicanale', resolve: resolveTvDeviceBinding },
  { family: 'tv', type: 'appletv', deviceId: 'dev_appletv', name: 'Apple TV camera', resolve: resolveTvDeviceBinding },
  { family: 'sonos', type: 'sonos', deviceId: 'dev_multimedia_sonos', name: 'Sonos multicanale', resolve: resolveSonosDeviceBinding },
  { family: 'media', type: 'media', deviceId: 'dev_multimedia_audio', name: 'Lettore multizona', resolve: resolveMediaDeviceBinding },
] as const;

describe('raccordi Multimedia: associazione e conservazione', () => {
  it('cambiando TV scarta telecomando e player del vecchio apparecchio; sullo stesso prodotto conserva le scelte esplicite', () => {
    const house = mockHouse('normal'), registry = buildRegistries(house.entities, house.devices);
    const binding = resolveTvDeviceBinding('dev_multimedia_tv', registry.devices, registry.entities, house.entities)!;
    const previous = { mediaPlayerId: 'media_player.old_tv', remoteId: 'remote.old_tv', linkedMediaPlayers: ['media_player.old_cast'] };
    expect(multimediaAssociationPatch(binding, previous)).toMatchObject({ remoteId: null, linkedMediaPlayers: [] });
    const retained = { ...previous, mediaPlayerId: binding.primaryEntityId };
    expect(multimediaAssociationPatch(binding, { ...retained, productDevice: { ...binding, deviceId: 'old-device' } }))
      .toMatchObject({ remoteId: null, linkedMediaPlayers: [] });
    expect({ ...retained, ...multimediaAssociationPatch(binding, retained) }).toMatchObject({ remoteId: 'remote.old_tv', linkedMediaPlayers: ['media_player.old_cast'] });
  });

  it.each(['constructor', 'toString', '__proto__'])('anteprima ignora stato anomalo %s', state => {
    const house = mockHouse('normal'), registry = buildRegistries(house.entities, house.devices);
    const binding = resolveMediaDeviceBinding('dev_multimedia_audio_single', registry.devices, registry.entities, house.entities)!;
    house.entities[binding.primaryEntityId] = { ...house.entities[binding.primaryEntityId]!, state };
    const view = renderWithRuntime(<ProductDevicePreview binding={binding} entities={house.entities} label="Anteprima" />);
    expect(view.container.textContent).toContain('Non disponibile');
  });
  it.each(cases)('$type prepara identità storica coerente senza eseguire comandi', ({ family, type, deviceId, resolve }) => {
    const house = mockHouse('normal'), registry = buildRegistries(house.entities, house.devices);
    const classified = classifyDevices({ devices: registry.devices, entityRegistry: registry.entities, entities: house.entities }).find(device => device.deviceId === deviceId);
    expect(classified).toMatchObject({ family, widgetType: type });
    const binding = resolve(deviceId, registry.devices, registry.entities, house.entities)!;
    expect(binding).not.toBeNull();
    const seed = createCategoryWidgetSeed(type, 'test_new')!;
    seed.settings = { ...seed.settings, ...multimediaAssociationPatch(binding), productDevice: binding };
    expect(multimediaProductBinding(seed.settings)).toEqual(binding);
    expect(findWidgetDefinition(seed.id, seed.settings)?.sizes.min).toEqual({ w: 2, h: 2 });
    const callService = serviceMock();
    const view = renderWithRuntime(<ProductDevicePreview binding={binding} entities={house.entities} label="Anteprima" />, { entities: house.entities, callService });
    expect(view.container.querySelectorAll('button, video, audio, img, iframe')).toHaveLength(0);
    expect(callService).not.toHaveBeenCalled();
  });

  it.each(cases)('$type associa manualmente lo stesso prodotto con un unico salvataggio', async ({ family, type, deviceId, name, resolve }) => {
    const house = mockHouse('normal'), registry = buildRegistries(house.entities, house.devices);
    const { conn } = fakeConnection(message => message.type === 'config/device_registry/list' ? registry.devices
      : message.type === 'config/entity_registry/list' ? registry.entities : []);
    const saveBinding = vi.fn(async () => undefined), callService = serviceMock();
    renderWithRuntime(<ProductBindingSection family={family} {...(family === 'tv' ? { tvKind: type as 'androidtv' | 'appletv' } : {})}
      settings={{}} saveBinding={saveBinding} />, { conn, entities: house.entities, entitiesLoaded: true, callService });
    fireEvent.click(await screen.findByRole('button', { name: /Dispositivo da collegare:/ }));
    const choice = await screen.findByRole('button', { name: new RegExp(name) });
    fireEvent.click(choice);
    await waitFor(() => expect(saveBinding).toHaveBeenCalledTimes(1));
    const binding = resolve(deviceId, registry.devices, registry.entities, house.entities)!;
    expect(saveBinding).toHaveBeenCalledWith(expect.objectContaining({ ...multimediaAssociationPatch(binding), productDevice: binding, name }));
    expect(callService).not.toHaveBeenCalled();
  });

  it.each(['media', 'sonos'])('%s mantiene il gruppo dimostrativo storico senza metadati prodotto', type => {
    const current = mockBindingSettings(type), legacy = mockBindingSettings(type, true);
    expect(multimediaProductBinding(current)?.family).toBe(type);
    expect(legacy.mediaIds).toHaveLength(2);
    expect(multimediaProductBinding(legacy)).toBeNull();
    expect(legacy.productDevice).toBeUndefined();
  });
});
