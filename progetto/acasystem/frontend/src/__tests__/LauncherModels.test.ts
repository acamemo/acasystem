import { describe, expect, it, vi } from 'vitest';
import {
  ADD_WIDGET_TYPES,
  categoryOf,
  definitionForType,
  typeVisuals,
} from '@/domain/launcher/catalog';
import { BINDING_KEYS, categoryPageSeeds, createCategoryWidgetSeed, type WidgetSizeResolver } from '@/domain/launcher/categoryPages';
import { categoryPageGeometry } from '@/domain/launcher/categoryPageGrid';
import { kindOf, resolveCarSettings } from '@/domain/launcher/editTarget';

// Caricare i modelli non deve caricare il registry e le schermate dei widget.
vi.mock('@/components/widgets/registry', () => {
  throw new Error('Il dominio launcher ha caricato il registry dei componenti.');
});

describe('modelli launcher senza registry o schermate', () => {
  it('mantiene il catalogo e le etichette di fallback con un resolver esplicito', () => {
    const resolveDefinition = vi.fn(() => undefined);
    const visuals = typeVisuals(resolveDefinition);
    for (const type of ADD_WIDGET_TYPES) {
      expect(visuals.get(type.type)).toEqual({ label: type.label, icon: type.icon });
      expect(definitionForType(type, resolveDefinition)).toBeUndefined();
    }
    expect(categoryOf('sonos')).toBe('multimedia');
    expect(categoryOf('tipo-non-presente')).toBe('utilita');
  });

  it('usa le dimensioni fornite dal chiamante per i preset e tutte le geometrie', () => {
    const resolveSizes: WidgetSizeResolver = vi.fn(() => ({
      min: { w: 1, h: 1 },
      default: { w: 1, h: 1 },
      max: { w: 1, h: 1 },
    }));
    const seeds = categoryPageSeeds('multimedia', 'salotto', resolveSizes);
    expect(seeds).toHaveLength(4);
    expect(seeds.every((seed) => seed.id.includes('preset_salotto'))).toBe(true);
    expect(seeds.every((seed) => seed.size.w === 1 && seed.size.h === 1)).toBe(true);

    const geometry = categoryPageGeometry('multimedia', 'salotto', resolveSizes);
    expect(Object.keys(geometry.categoryGrids!)).toHaveLength(4);
    for (const placements of Object.values(geometry.placements)) {
      expect(Object.keys(placements!)).toEqual(expect.arrayContaining(seeds.map((seed) => seed.id)));
      expect(Object.values(placements!).every((rect) => rect.w === 1 && rect.h === 1)).toBe(true);
    }
    expect(categoryPageSeeds('assente', 'salotto', resolveSizes)).toEqual([]);
  });

  it('prepara ogni tipo del catalogo senza associazioni né scritture e con le dimensioni del resolver', () => {
    const original = JSON.stringify(ADD_WIDGET_TYPES);
    const size = { w: 3, h: 2 };
    const resolveSizes = vi.fn(() => ({ min: { w: 1, h: 1 }, default: size, max: { w: 4, h: 4 } }));
    const seeds = ADD_WIDGET_TYPES.map((item) => {
      const seed = createCategoryWidgetSeed(item.type, 'selezione-unica', resolveSizes);
      expect(seed).not.toBeNull();
      expect(seed!.id).toBe(item.sample.id.replace('esempio', 'selezione-unica'));
      expect(seed!.settings).toEqual({
        categoryWidgetType: item.type,
        ...(item.type === 'sensor' ? { type: 'sensor' } : {}),
        ...(item.type === 'spacer' ? { variant: 'divider' } : {}),
      });
      for (const key of Object.values(BINDING_KEYS)) expect(seed!.settings[key]).toBeUndefined();
      expect(seed!.size).toEqual(size);
      expect(resolveSizes).toHaveBeenLastCalledWith(item.sample.id, {
        ...item.sample.settings, categoryWidgetType: item.type,
      });
      return seed!;
    });
    expect(seeds.find((seed) => seed.settings.categoryWidgetType === 'rileva')?.id).toBe('rileva_card_selezione-unica');
    expect(new Set(seeds.map((seed) => seed.id)).size).toBe(ADD_WIDGET_TYPES.length);
    expect(JSON.stringify(ADD_WIDGET_TYPES)).toBe(original);
  });

  it('mantiene gli ID storici dei preset e separa due selezioni dello stesso tipo', () => {
    const resolveSizes = vi.fn(() => undefined);
    for (const category of ['comandi', 'clima', 'sicurezza', 'multimedia', 'casa', 'energia', 'utilita']) {
      for (const seed of categoryPageSeeds(category, 'salotto', resolveSizes)) {
        expect(seed).toEqual(createCategoryWidgetSeed(String(seed.settings.categoryWidgetType), 'preset_salotto', resolveSizes));
      }
    }
    const first = createCategoryWidgetSeed('light', 'prima-selezione', resolveSizes)!;
    const second = createCategoryWidgetSeed('light', 'seconda-selezione', resolveSizes)!;
    expect(first.id).not.toBe(second.id);
    expect(first.size).toEqual({ w: 2, h: 2 });
    first.settings.categoryWidgetType = 'modificato';
    expect(second.settings).toEqual({ categoryWidgetType: 'light' });
    resolveSizes.mockClear();
    expect(createCategoryWidgetSeed('tipo-assente', 'selezione', resolveSizes)).toBeNull();
    expect(resolveSizes).not.toHaveBeenCalled();
  });

  it('classifica e normalizza le impostazioni senza stato delle schermate', () => {
    expect(kindOf('car_card_1', {})).toBe('car');
    expect(kindOf('entity_card_1', {})).toBe('sensor');
    const original = { chargingId: 'binary_sensor.auto_in_carica' };
    const resolved = resolveCarSettings(original);
    expect(resolved.chargingStateId).toBe(original.chargingId);
    expect(resolved.batteryId).toBeNull();
    expect(original).toEqual({ chargingId: 'binary_sensor.auto_in_carica' });
  });
});
