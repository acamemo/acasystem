import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ProductDevicePreview } from '@/templates/launcher/ProductDevicePreview';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { buildMockupSeed } from '@/utils/mockup/seed';
import { createMockHaStore } from '@/utils/mockup/haStore';
import type { CardSettingsMap } from '@/@types/dashboard';

const binding = {
  version: 1 as const,
  family: 'camera' as const,
  deviceId: 'camera-controller',
  primaryEntityId: 'camera.door',
  channelEntityIds: ['camera.door'],
  secondaryEntityIds: [],
};

afterEach(cleanup);

describe('integrazione conservativa Videocamere', () => {
  it('la Console prodotto conserva la Console legacy e non contamina la cache dopo un rebind', () => {
    const settings = { categoryWidgetType: 'camera', cameraId: 'camera.door' };
    const legacy = findWidgetDefinition('camera_card_old', settings)!;
    const product = findWidgetDefinition('camera_card_new', {
      ...settings,
      productDevice: binding,
    })!;
    expect(legacy.Console).toBeDefined();
    expect(product.Console).toBeDefined();
    expect(product.Console).not.toBe(legacy.Console);
    expect(product.sizes.min).toEqual({ w: 2, h: 2 });
    expect(legacy.sizes.min).toEqual({ w: 2, h: 1 });
    expect(findWidgetDefinition('camera_card_old', settings)).toBe(legacy);
    expect(
      findWidgetDefinition('camera_card_new', {
        ...settings,
        cameraId: 'camera.other',
        productDevice: binding,
      })
    ).toBe(legacy);
  });

  it('l’anteprima idle è inerte e non trasforma idle in conferma di alimentazione', () => {
    const view = render(
      <ProductDevicePreview
        binding={binding}
        label="Videocamera"
        entities={fixtureEntities([fixtureEntity('camera.door', 'idle')])}
      />
    );
    expect(screen.getByText('Videocamera')).toBeInTheDocument();
    expect(screen.getByText('Inattiva')).toBeInTheDocument();
    expect(
      screen.queryByText(/^(Accesa|Spenta|Non disponibile|Stato non disponibile)$/)
    ).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(view.container.querySelector('video,iframe,img')).toBeNull();
    for (const state of ['unknown', 'constructor', '__proto__']) {
      view.rerender(
        <ProductDevicePreview
          binding={binding}
          label="Videocamera"
          entities={fixtureEntities([fixtureEntity('camera.door', state)])}
        />
      );
      expect(screen.getByText('Non disponibile')).toBeInTheDocument();
      expect(screen.queryByText(/^(Accesa|Spenta)$/)).toBeNull();
    }
  });

  it('l’anteprima multicanale conta solo i canali disponibili e non avvia trasporti', () => {
    const view = render(
      <ProductDevicePreview
        binding={{ ...binding, channelEntityIds: ['camera.door', 'camera.garden'] }}
        label="Viste esterne"
        entities={fixtureEntities([
          fixtureEntity('camera.door', 'streaming'),
          fixtureEntity('camera.garden', 'unavailable'),
        ])}
      />
    );
    expect(screen.getByText('1 di 2 canali disponibili')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(view.container.querySelector('video,iframe,img')).toBeNull();
  });

  it('il seed mantiene cameraId, metadati esatti e geometria minima prodotto', () => {
    const seed = buildMockupSeed();
    const cards = JSON.parse(seed.storage.tunet_card_settings!) as CardSettingsMap;
    const products = Object.entries(cards).filter(
      ([, value]) => value.productDevice?.family === 'camera'
    );
    expect(products.length).toBeGreaterThan(0);
    for (const [key, value] of products) {
      expect(value.cameraId).toBe(value.productDevice?.primaryEntityId);
      expect(value.productDevice?.channelEntityIds).toContain(value.cameraId);
      const [page, id] = key.split('::');
      const size = seed.layout.pages.find((p) => p.id === page)?.placements.tablet?.[id!];
      if (size) {
        expect(size.w).toBeGreaterThanOrEqual(2);
        expect(size.h).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('il mock comanda soltanto la videocamera scelta senza ricavare power da idle', async () => {
    const store = createMockHaStore();
    try {
      const before = structuredClone(store.getEntities());
      const selected = 'camera.vista_ingresso',
        other = 'camera.vista_giardino';
      expect(before[selected]).toBeDefined();
      expect(before[other]).toBeDefined();
      await store.callService('camera', 'enable_motion_detection', { entity_id: selected });
      expect(store.getEntities()[selected]?.attributes.motion_detection).toBe(true);
      expect(store.getEntities()[selected]?.state).toBe(before[selected]?.state);
      expect(store.getEntities()[selected]?.attributes.is_on).toBe(
        before[selected]?.attributes.is_on
      );
      for (const [id, entity] of Object.entries(before)) {
        if (id !== selected) expect(store.getEntities()[id]).toEqual(entity);
      }
      expect(store.calls()).toMatchObject([
        { domain: 'camera', service: 'enable_motion_detection', data: { entity_id: selected } },
      ]);
    } finally {
      store.dispose();
    }
  });
});
