/**
 * The widget a device added from «Trovati in rete» belongs to: the classifier on the registries
 * when they know the device, the family of the integration when they do not yet.
 */
import { describe, expect, it } from 'vitest';
import type { HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { selectionForNewEntry } from '@/utils/devices/entrySelection';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

const devices = [{ id: 'dev-tv', name: 'Samsung 7 Series' }] as HaDeviceRegistryEntry[];
const entityRegistry = [
  { entity_id: 'media_player.samsung', device_id: 'dev-tv', platform: 'samsungtv' },
  { entity_id: 'remote.samsung', device_id: 'dev-tv', platform: 'samsungtv' },
] as HaEntityRegistryEntry[];
const entities = fixtureEntities([
  fixtureEntity('media_player.samsung', 'off'),
  fixtureEntity('remote.samsung', 'on'),
]);

describe('selectionForNewEntry', () => {
  it('uses the classifier when the registries know the device, with the remote of a TV', () => {
    const selection = selectionForNewEntry(
      { devices, entityRegistry, entities },
      {
        deviceId: 'dev-tv',
        entityIds: ['media_player.samsung'],
        mediaPlayerEntityId: 'media_player.samsung',
      },
      'tv'
    );
    expect(selection).toEqual({
      type: 'androidtv',
      entityIds: ['media_player.samsung'],
      remoteId: 'remote.samsung',
    });
  });

  it('finds the device by its entities when the entry has no device id', () => {
    const selection = selectionForNewEntry(
      { devices, entityRegistry, entities },
      { deviceId: null, entityIds: ['media_player.samsung'], mediaPlayerEntityId: null },
      null
    );
    expect(selection?.type).toBe('androidtv');
  });

  it('falls back on the family of the integration when the registries do not show it yet', () => {
    const empty = { devices: [], entityRegistry: [], entities: fixtureEntities([]) };
    expect(
      selectionForNewEntry(
        empty,
        { deviceId: 'x', entityIds: ['media_player.new'], mediaPlayerEntityId: 'media_player.new' },
        'tv'
      )
    ).toEqual({ type: 'androidtv', entityIds: ['media_player.new'] });
    expect(
      selectionForNewEntry(
        empty,
        { deviceId: 'x', entityIds: ['light.a', 'light.b'], mediaPlayerEntityId: null },
        'light'
      )
    ).toEqual({ type: 'light', entityIds: ['light.a', 'light.b'] });
    // A plug lands in «Sensori e comandi», like in the classifier.
    expect(
      selectionForNewEntry(
        empty,
        { deviceId: 'x', entityIds: ['switch.p'], mediaPlayerEntityId: null },
        'plug'
      )
    ).toEqual({ type: 'sensor', entityIds: ['switch.p'] });
  });

  it('gives nothing when neither the registries nor the family say anything', () => {
    expect(
      selectionForNewEntry(
        { devices: [], entityRegistry: [], entities: fixtureEntities([]) },
        { deviceId: null, entityIds: [], mediaPlayerEntityId: null },
        null
      )
    ).toBeNull();
  });
});
