import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ProductDevicePreview } from '@/templates/launcher/ProductDevicePreview';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { buildMockupSeed } from '@/utils/mockup/seed';
import { createMockHaStore } from '@/utils/mockup/haStore';
import type { CardSettingsMap } from '@/@types/dashboard';

const binding = { version: 1 as const, family: 'alarm' as const, deviceId: 'door', primaryEntityId: 'alarm_control_panel.door', channelEntityIds: ['alarm_control_panel.door'], secondaryEntityIds: [] };
afterEach(cleanup);
describe('integrazione conservativa Allarme', () => {
  it('la Console prodotto e il minimo2x2 non contaminano la cache legacy o una riassociazione', () => {
    const settings = { categoryWidgetType: 'alarm', alarmId: 'alarm_control_panel.door' };
    const legacy = findWidgetDefinition('alarm_card_old', settings)!;
    const product = findWidgetDefinition('alarm_card_new', { ...settings, productDevice: binding })!;
    expect(legacy.Console).toBeUndefined();
    expect(product.Console).toBeDefined();
    expect(product.sizes.min).toEqual({ w: 2, h: 2 });
    expect(findWidgetDefinition('alarm_card_old', settings)).toBe(legacy);
    expect(findWidgetDefinition('alarm_card_new', { ...settings, alarmId: 'alarm_control_panel.other', productDevice: binding })).toBe(legacy);
  });
  it('l’anteprima è inerte e non inventa protezione per stati sconosciuti', () => {
    const view = render(<ProductDevicePreview binding={binding} label="Allarme" entities={fixtureEntities([fixtureEntity('alarm_control_panel.door', 'armed_home')])} />);
    expect(screen.getByText('Attivo in casa')).toBeInTheDocument();
    expect(screen.queryByText('Disinserito')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(<ProductDevicePreview binding={binding} label="Allarme" entities={fixtureEntities([fixtureEntity('alarm_control_panel.door', 'unknown')])} />);
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(screen.queryByText('Disinserito')).toBeNull();
    view.rerender(<ProductDevicePreview binding={binding} label="Allarme" entities={fixtureEntities([fixtureEntity('alarm_control_panel.door', 'constructor')])} />);
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
  });
  it('l’anteprima multicanale resta inerte e conta solo stati effettivi', () => {
    render(<ProductDevicePreview binding={{ ...binding, channelEntityIds: ['alarm_control_panel.door', 'alarm_control_panel.second'] }} label="Zone" entities={fixtureEntities([fixtureEntity('alarm_control_panel.door', 'disarmed'), fixtureEntity('alarm_control_panel.second', 'unavailable')])} />);
    expect(screen.getByText('1 di 2 canali disponibili')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('il seed privato mantiene alarmId, metadati e geometria coerenti', () => {
    const seed = buildMockupSeed();
    const cards = JSON.parse(seed.storage.tunet_card_settings!) as CardSettingsMap;
    const products = Object.entries(cards).filter(([, value]) => value.productDevice?.family === 'alarm');
    expect(products.length).toBeGreaterThan(0);
    for (const [key, value] of products) {
      expect(value.alarmId).toBe(value.productDevice?.primaryEntityId);
      const [page, id] = key.split('::');
      const size = seed.layout.pages.find(p => p.id === page)?.placements.tablet?.[id!];
      if (size) { expect(size.w).toBeGreaterThanOrEqual(2); expect(size.h).toBeGreaterThanOrEqual(2); }
    }
  });
  it('un comando simulato cambia solo la zona scelta', async () => {
    const store = createMockHaStore();
    try {
      const second = store.getEntities()['alarm_control_panel.garage'];
      await store.callService('alarm_control_panel', 'alarm_disarm', { entity_id: 'alarm_control_panel.piano_terra' });
      expect(store.getEntities()['alarm_control_panel.piano_terra']?.state).toBe('disarmed');
      expect(store.getEntities()['alarm_control_panel.garage']).toEqual(second);
      expect(store.calls()).toMatchObject([{ domain: 'alarm_control_panel', service: 'alarm_disarm', data: { entity_id: 'alarm_control_panel.piano_terra' } }]);
    } finally { store.dispose(); }
  });
});
