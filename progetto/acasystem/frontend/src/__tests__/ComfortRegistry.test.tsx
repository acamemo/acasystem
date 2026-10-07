import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon, isIconName } from '@/components/primitives';
import { homePages, homeWidgets } from '@/components/widgets/home';
import { HOME_ICON_NAMES, HomeIcon } from '@/components/widgets/home/shared/HomeIcon';

afterEach(cleanup);

const LEGACY_IDS = [
  ['climate_card_1', 'climate'],
  ['weather_temp_3', 'weather'],
  ['calendar_card_2', 'calendar'],
  ['todo_card_7', 'todo'],
  ['alarm_card_1', 'alarm'],
] as const;

describe('Registro dei widget comfort', () => {
  it.each(LEGACY_IDS)('%s → %s (prefisso legacy)', (id, type) => {
    expect(
      homeWidgets.filter((definition) => definition.matches(id, {})).map((d) => d.type)
    ).toEqual([type]);
  });

  it('il registro comune trova i widget comfort', async () => {
    // Imported here: the registry aggregates every group, so a group being rewritten elsewhere
    // fails only this case and not the whole file.
    const { findWidgetDefinition } = await import('@/components/widgets/registry');
    for (const [id, type] of LEGACY_IDS) {
      expect(findWidgetDefinition(id, {})?.type).toBe(type);
    }
  });

  it.each([
    'climate.soggiorno',
    'weather.casa',
    'calendar.famiglia',
    'todo.spesa',
    'person.anna',
    'light.cucina',
  ])('%s non è un widget comfort', (id) => {
    expect(homeWidgets.some((definition) => definition.matches(id, {}))).toBe(false);
  });

  it('taglie coerenti (min ≤ predefinita ≤ max), etichette italiane, dettagli presenti', () => {
    expect(homeWidgets.map((definition) => [definition.label, definition.sizes])).toEqual([
      ['Clima', { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } }],
      ['Meteo', { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } }],
      ['Calendario', { min: { w: 2, h: 1 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } }],
      ['Attività', { min: { w: 2, h: 1 }, max: { w: 2, h: 4 }, default: { w: 2, h: 2 } }],
      ['Allarme', { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } }],
    ]);
    for (const { sizes, Details, frameless } of homeWidgets) {
      expect(sizes.min.w).toBeLessThanOrEqual(sizes.default.w);
      expect(sizes.default.w).toBeLessThanOrEqual(sizes.max.w);
      expect(sizes.min.h).toBeLessThanOrEqual(sizes.default.h);
      expect(sizes.default.h).toBeLessThanOrEqual(sizes.max.h);
      expect(Details).toBeDefined();
      // Every comfort widget sits in the launcher's kit frame.
      expect(frameless).not.toBe(true);
    }
    expect(homePages).toEqual([]);
  });

  it('le icone delle definizioni sono quelle della primitiva per il dominio', () => {
    expect(homeWidgets.map((definition) => [definition.type, definition.icon])).toEqual([
      ['climate', 'thermostat'],
      ['weather', 'weather'],
      ['calendar', 'calendar'],
      ['todo', 'task'],
      ['alarm', 'shield'],
    ]);
    for (const definition of homeWidgets) {
      const name = definition.icon;
      expect(isIconName(name), name).toBe(true);
      if (!isIconName(name)) continue;
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector('svg'), name).not.toBeNull();
      unmount();
    }
  });

  it('ogni icona del gruppo si disegna davvero (le dichiarazioni di tipo di mx-icons non bastano)', () => {
    for (const name of HOME_ICON_NAMES) {
      const { container, unmount } = render(<HomeIcon name={name} />);
      const svg = container.querySelector('svg');
      expect(svg, name).not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      unmount();
    }
  });

  it('i nomi che la primitiva conosce sono disegnati dalla primitiva, non da glifi locali', () => {
    const shared = HOME_ICON_NAMES.filter((name) => isIconName(name));
    expect(shared).toEqual(
      expect.arrayContaining(['thermostat', 'weather', 'sun', 'cloud', 'calendar', 'task'])
    );
    expect(shared).toEqual(expect.arrayContaining(['shield', 'humidity', 'power', 'fan', 'ok']));
    for (const name of shared) {
      const local = render(<HomeIcon name={name} />);
      const localSvg = local.container.innerHTML;
      local.unmount();
      if (!isIconName(name)) continue;
      const kit = render(<Icon name={name} size="md" />);
      expect(localSvg, name).toBe(kit.container.innerHTML);
      kit.unmount();
    }
  });
});
