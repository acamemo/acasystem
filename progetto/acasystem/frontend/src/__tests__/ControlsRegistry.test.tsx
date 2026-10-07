import { describe, expect, it } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import { controlsPages, controlsWidgets } from '@/components/widgets/controls';
import { findPageKindDefinition, findWidgetDefinition } from '@/components/widgets/registry';

/** First definition of the controls group that renders the card, like the legacy dispatcher. */
const typeOf = (id: string, settings: CardSettings = {}) =>
  controlsWidgets.find((definition) => definition.matches(id, settings))?.type;

describe('matcher dei widget dei controlli (parità con rendering/registry.js)', () => {
  it.each([
    ['entity_card_3', {}, 'sensor'],
    ['entity_card_3', { type: 'toggle' }, 'sensor'],
    ['light.cucina', {}, 'light'],
    ['light_kitchen', {}, 'light'],
    ['lock.ingresso', {}, 'lock'],
    ['lock_card_1', { lockId: 'lock.ingresso' }, 'lock'],
    ['fan.soffitto', {}, 'fan'],
    ['cover_card_2', { coverId: 'cover.salotto' }, 'cover'],
    ['automation.notte', {}, 'automation'],
    ['automation.notte', { type: 'entity' }, 'sensor'],
    ['automation.notte', { type: 'toggle' }, 'sensor'],
    ['automation.notte', { type: 'sensor' }, 'sensor'],
    ['switch.presa', { type: 'toggle' }, 'sensor'],
    ['sensor.temperatura', { type: 'sensor' }, 'sensor'],
  ])('%s con %j → %s', (id, settings, expected) => {
    expect(typeOf(id, settings)).toBe(expected);
  });

  it('il prefisso vince sul tipo generico, come nel registro legacy', () => {
    expect(typeOf('light.cucina', { type: 'sensor' })).toBe('light');
    expect(typeOf('fan.soffitto', { type: 'toggle' })).toBe('fan');
    expect(typeOf('lock.porta', { type: 'entity' })).toBe('lock');
  });

  it('non prende card che il legacy non renderebbe con questi widget', () => {
    expect(typeOf('switch.presa')).toBeUndefined();
    expect(typeOf('cover.salotto')).toBeUndefined();
    expect(typeOf('media_player.tv')).toBeUndefined();
    expect(typeOf('climate_card_1')).toBeUndefined();
  });

  it('il sensore è l’ultimo dell’array: è il fallback generico', () => {
    expect(controlsWidgets[controlsWidgets.length - 1]?.type).toBe('sensor');
    const automation = controlsWidgets.findIndex((definition) => definition.type === 'automation');
    expect(automation).toBeLessThan(controlsWidgets.length - 1);
  });

  it('il registro comune trova i widget dei controlli', () => {
    expect(findWidgetDefinition('light.cucina')?.type).toBe('light');
    expect(findWidgetDefinition('entity_card_9')?.type).toBe('sensor');
    expect(findWidgetDefinition('automation.notte')?.type).toBe('automation');
    expect(findWidgetDefinition('automation.notte', { type: 'toggle' })?.type).toBe('sensor');
    expect(findWidgetDefinition('cover_card_1')?.type).toBe('cover');
  });

  it('ogni definizione ha dimensioni coerenti, testi italiani e Details', () => {
    for (const definition of controlsWidgets) {
      const { min, max, default: initial } = definition.sizes;
      expect(min.w).toBeLessThanOrEqual(initial.w);
      expect(min.h).toBeLessThanOrEqual(initial.h);
      expect(initial.w).toBeLessThanOrEqual(max.w);
      expect(initial.h).toBeLessThanOrEqual(max.h);
      expect(definition.label).toMatch(/^[A-ZÀ-Ú][^A-Z]*$/);
      expect(definition.Details).toBeDefined();
    }
    expect(controlsWidgets.find((d) => d.type === 'cover')?.sizes.min).toEqual({ w: 2, h: 1 });
  });

  it('registra la pagina speciale delle luci', () => {
    expect(controlsPages.map((page) => page.kind)).toEqual(['lights']);
    expect(findPageKindDefinition('lights')?.label).toBe('Luci');
  });
});
