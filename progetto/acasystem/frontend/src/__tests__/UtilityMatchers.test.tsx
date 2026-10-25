import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon, iconNames, isIconName } from '@/components/primitives';
import { utilityPages, utilityWidgets } from '@/components/widgets/utilities';
import {
  UTILITY_EXTRA_ICON_NAMES,
  UTILITY_ICON_NAMES,
  UtilityIcon,
} from '@/components/widgets/utilities/shared/UtilityIcon';
import { findPageKindDefinition, findWidgetDefinition } from '@/components/widgets/registry';

const typeOf = (id: string) =>
  utilityWidgets.find((definition) => definition.matches(id, {}))?.type;

describe('matcher dei widget utilità (prefissi del registro legacy)', () => {
  it.each([
    ['cost_card_1', 'cost'],
    ['nordpool_card_2', 'nordpool'],
    ['car_card_3', 'car'],
    ['car', 'car'],
    ['vacuum.roborock_s7', 'vacuum'],
    ['lawn_mower.automower', 'mower'],
    ['room_card_4', 'room'],
    ['spacer_card_5', 'spacer'],
  ])('%s → %s', (id, type) => {
    expect(typeOf(id)).toBe(type);
  });

  it('non riconosce id di altri gruppi o simili', () => {
    for (const id of [
      'cars',
      'car_card',
      'light.cucina',
      'sensor.vacuum_battery',
      'media_player.tv',
      'climate_card_1',
    ]) {
      expect(typeOf(id)).toBeUndefined();
    }
  });

  it('il registro comune risolve gli id legacy su queste definizioni', () => {
    expect(findWidgetDefinition('car')?.type).toBe('car');
    expect(findWidgetDefinition('vacuum.robot', { type: 'sensor' })?.type).toBe('vacuum');
    expect(findWidgetDefinition('spacer_card_1')?.type).toBe('spacer');
  });

  it('dimensioni coerenti: min ≤ predefinita ≤ max', () => {
    for (const definition of utilityWidgets) {
      const { min, max, default: initial } = definition.sizes;
      expect(min.w).toBeLessThanOrEqual(initial.w);
      expect(min.h).toBeLessThanOrEqual(initial.h);
      expect(initial.w).toBeLessThanOrEqual(max.w);
      expect(initial.h).toBeLessThanOrEqual(max.h);
    }
    const spacer = utilityWidgets.find((definition) => definition.type === 'spacer');
    expect(spacer?.sizes.min).toEqual({ w: 1, h: 1 });
    expect(spacer?.sizes.max).toEqual({ w: 8, h: 1 });
    expect(spacer?.Details).toBeUndefined();
  });

  it('il separatore è senza cornice; gli altri widget hanno la cornice del launcher', () => {
    const frameless = utilityWidgets
      .filter((definition) => definition.frameless === true)
      .map((definition) => definition.type);
    expect(frameless).toEqual(['spacer']);
  });

  it('icone del foglio di aggiunta dalla primitiva, con il glifo del dominio', () => {
    const icons = Object.fromEntries(
      utilityWidgets.map((definition) => [definition.type, definition.icon])
    );
    expect(icons).toEqual({
      cost: 'wallet',
      nordpool: 'energy',
      car: 'car',
      vacuum: 'vacuum',
      mower: 'mower',
      room: 'room',
      spacer: 'grid',
    });
    for (const definition of utilityWidgets) {
      expect(isIconName(definition.icon), definition.type).toBe(true);
      if (!isIconName(definition.icon)) continue;
      const { container, unmount } = render(<Icon name={definition.icon} />);
      expect(container.querySelector('svg'), definition.type).not.toBeNull();
      unmount();
    }
  });

  it('UtilityIcon disegna le icone del kit con la primitiva e pochi glifi extra esistenti a runtime', () => {
    // The extras never shadow a kit name: those are always drawn by the primitive.
    expect(UTILITY_EXTRA_ICON_NAMES.filter((name) => isIconName(name))).toEqual([]);
    expect(UTILITY_ICON_NAMES).toEqual(
      expect.arrayContaining([...iconNames, ...UTILITY_EXTRA_ICON_NAMES])
    );
    for (const name of UTILITY_ICON_NAMES) {
      const { container, unmount } = render(<UtilityIcon name={name} size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg, name).not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg?.getAttribute('class')).toContain('aca-icon--sm');
      unmount();
    }
    // Same markup as the primitive for a kit name.
    const kit = render(<Icon name="vacuum" size="md" />).container.innerHTML;
    const utility = render(<UtilityIcon name="vacuum" size="md" />).container.innerHTML;
    expect(utility).toBe(kit);
  });

  it('registra le pagine batteria e stanze', () => {
    expect(utilityPages.map((page) => page.kind)).toEqual(['battery', 'rooms']);
    expect(findPageKindDefinition('battery')?.label).toBe('Batterie');
    expect(findPageKindDefinition('rooms')?.label).toBe('Stanze');
  });
});
