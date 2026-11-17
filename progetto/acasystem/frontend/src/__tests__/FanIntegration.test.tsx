import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ProductDevicePreview } from '@/templates/launcher/ProductDevicePreview';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { buildMockupSeed } from '@/utils/mockup/seed';
import { createMockHaStore } from '@/utils/mockup/haStore';
import type { CardSettingsMap } from '@/@types/dashboard';

const binding = { version: 1 as const, family: 'fan' as const, deviceId: 'vent', primaryEntityId: 'fan.vent',
  channelEntityIds: ['fan.vent'], secondaryEntityIds: [] };
afterEach(cleanup);

describe('integrazione conservativa Fan', () => {
  it('Console e minimo del prodotto lasciano intatta la definizione storica e quella riassociata', () => {
    const settings = { categoryWidgetType: 'fan', bindingEntityId: 'fan.vent' };
    const legacy = findWidgetDefinition('fan.old', settings)!;
    const product = findWidgetDefinition('fan.new', { ...settings, productDevice: binding })!;
    expect(legacy.sizes.min).toEqual({ w: 1, h: 1 });
    expect(legacy.Console).toBeUndefined();
    expect(product.sizes.min).toEqual({ w: 2, h: 2 });
    expect(product.Console).toBeDefined();
    expect(findWidgetDefinition('fan.old', settings)).toBe(legacy);
    expect(findWidgetDefinition('fan.new', { ...settings, bindingEntityId: 'fan.other', productDevice: binding })).toBe(legacy);
  });
  it('anteprima inerte: niente velocità inventata né falso Spento per uno stato sconosciuto', () => {
    const view = render(<ProductDevicePreview binding={binding} label="Ventilatore" entities={fixtureEntities([
      fixtureEntity('fan.vent', 'on', { supported_features: 48 }),
    ])} />);
    expect(screen.getByText('Acceso')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(<ProductDevicePreview binding={binding} label="Ventilatore" entities={fixtureEntities([
      fixtureEntity('fan.vent', 'unknown', { percentage: 0 }),
    ])} />);
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(screen.queryByText(/Spento|0%/)).toBeNull();
  });
  it('anteprima multicanale segnala i soli canali disponibili, senza comandi collettivi', () => {
    render(<ProductDevicePreview binding={{ ...binding, channelEntityIds: ['fan.vent', 'fan.second'] }} label="Due ventole" entities={fixtureEntities([
      fixtureEntity('fan.vent', 'on', { percentage: 50 }), fixtureEntity('fan.second', 'unavailable'),
    ])} />);
    expect(screen.getByText('1 di 2 canali disponibili')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('il seed demo mantiene identità e ingombri del prodotto senza convertire i widget degli account', () => {
    const seed = buildMockupSeed();
    const cards = JSON.parse(seed.storage.tunet_card_settings!) as CardSettingsMap;
    const products = Object.entries(cards).filter(([, settings]) => settings.productDevice?.family === 'fan');
    expect(products.length).toBeGreaterThan(0);
    for (const [key, settings] of products) {
      expect(settings.bindingEntityId).toBe(settings.productDevice?.primaryEntityId);
      const [page, id] = key.split('::');
      const size = seed.layout.pages.find(p => p.id === page)?.placements.tablet?.[id!];
      if (size) { expect(size.w).toBeGreaterThanOrEqual(2); expect(size.h).toBeGreaterThanOrEqual(2); }
    }
  });
  it('accendere un ventilatore semplice simulato non inventa una velocità né modifica altri canali', async () => {
    const store = createMockHaStore();
    try {
      const other = store.getEntities()['fan.ventilazione_studio'];
      await store.callService('fan', 'turn_on', { entity_id: 'fan.ventilatore_cucina' });
      expect(store.getEntities()['fan.ventilatore_cucina']).toMatchObject({ state: 'on' });
      expect(store.getEntities()['fan.ventilatore_cucina']?.attributes.percentage).toBeUndefined();
      expect(store.getEntities()['fan.ventilazione_studio']).toEqual(other);
      expect(store.calls()).toMatchObject([{ domain: 'fan', service: 'turn_on', data: { entity_id: 'fan.ventilatore_cucina' } }]);
    } finally { store.dispose(); }
  });
  it('la simulazione conserva il primo incremento del canale a passo uno senza sommare le ventole', async () => {
    const store = createMockHaStore();
    try {
      const other = store.getEntities()['fan.ventilazione_studio'];
      await store.callService('fan', 'set_percentage', { entity_id: 'fan.ventilazione_studio_secondaria', percentage: 31 });
      expect(store.getEntities()['fan.ventilazione_studio_secondaria']?.attributes.percentage).toBe(31);
      expect(store.getEntities()['fan.ventilazione_studio']).toEqual(other);
    } finally { store.dispose(); }
  });
});
