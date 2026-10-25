import { describe, expect, it } from 'vitest';
import { DESIGN_WIDGET_TYPES } from '@/pages/ui-kit/WidgetDesignGallery';
import {
  initialPreference,
  normalizedValue,
  preferenceForDevice,
  profilesFor,
  valuesFor,
  visibleCapacity,
  type Capability,
} from '@/pages/ui-kit/widgetDesignModel';

describe('simulated widget capabilities', () => {
  it('provides complete, distinct controls and values for all twenty catalog concepts', () => {
    expect(DESIGN_WIDGET_TYPES).toHaveLength(20);
    for (const item of DESIGN_WIDGET_TYPES) {
      for (const device of profilesFor(item.type)) {
        expect(device.capabilities.length, item.type).toBeGreaterThan(0);
        expect(new Set(device.capabilities.map((cap) => cap.id)).size).toBe(
          device.capabilities.length
        );
        const values = valuesFor(device);
        for (const cap of device.capabilities)
          if (cap.kind !== 'action') expect(values[cap.id]).toBeDefined();
      }
    }
  });
  it('keeps only compatible preferences, appends new controls hidden and preserves order', () => {
    const [rgb, white, basic] = profilesFor('light');
    const initial = initialPreference(rgb!);
    const next = preferenceForDevice({ ...initial, order: [...initial.order].reverse() }, basic!);
    expect(next.visible).toEqual(['power']);
    expect(next.order).toEqual(['power']);
    const upgraded = preferenceForDevice(next, white!);
    expect(upgraded.visible).toEqual(['power']);
    expect(upgraded.order[0]).toBe('power');
    expect(upgraded.order).toContain('white');
    expect(white!.capabilities.some((cap) => cap.id === 'hue')).toBe(false);
  });
  it('uses device ranges, snaps steps, clamps values and wraps hue in both directions', () => {
    const ranges = profilesFor('light')[0]!.capabilities.filter(
      (cap): cap is Extract<Capability, { kind: 'range' }> => cap.kind === 'range'
    );
    const brightness = ranges.find((cap) => cap.id === 'brightness')!;
    const hue = ranges.find((cap) => cap.id === 'hue')!;
    const white = ranges.find((cap) => cap.id === 'white')!;
    expect(normalizedValue(brightness, 200)).toBe(100);
    expect(normalizedValue(brightness, -20)).toBe(0);
    expect(normalizedValue(white, 3442)).toBe(3400);
    expect(normalizedValue(hue, 430)).toBe(70);
    expect(normalizedValue(hue, -10)).toBe(350);
    expect(normalizedValue(hue, 359.9)).toBe(0);
    expect(visibleCapacity(210, 170)).toBe(1);
    expect(visibleCapacity(350, 350)).toBeLessThan(visibleCapacity(750, 500));
  });
});
