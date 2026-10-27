/**
 * Visibility of a stack in use (ISSUE-116): judged by its members with the rules of plain
 * widgets, never as an entity of its own.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { WidgetStack } from '@/@types/launcher';
import { isWidgetHiddenByLogic } from '@/pages/launcher/widgetVisibility';
import * as cardUtils from '@/utils/cardUtils';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { liftGhostStacks } from '@/utils/launcher/layout';

// The real function, observed: the configuration may reset mocks between tests.
const real = vi.hoisted(() => ({ fn: null as null | ((...args: never[]) => boolean) }));
vi.mock('@/utils/cardUtils', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/cardUtils')>();
  real.fn = original.isCardHiddenByLogic as never;
  return { ...original, isCardHiddenByLogic: vi.fn() };
});

const entities = {
  'sensor.presente': { entity_id: 'sensor.presente', state: '21', attributes: {} },
  'person.mario': { entity_id: 'person.mario', state: 'home', attributes: {} },
};

const stacks: Record<string, WidgetStack> = {
  stack_pre: { ids: ['media_group_preset_multimedia', 'appletv_card_preset_multimedia'] },
  stack_mix: { ids: ['sensor.assente', 'sensor.presente'] },
  stack_off: { ids: ['sensor.assente', 'sensor.altro_assente'] },
  stack_ghost: { ids: ['non_esiste_1', 'non_esiste_2'] },
  stack_vuota: { ids: [] },
};

// Unbound presets: a category type with no device yet (kept visible to be configured).
const settings: CardSettingsMap = {
  'multimedia::media_group_preset_multimedia': { categoryWidgetType: 'media' },
  'multimedia::appletv_card_preset_multimedia': { categoryWidgetType: 'appletv' },
} as CardSettingsMap;

const context = (over: Partial<Parameters<typeof isWidgetHiddenByLogic>[2]> = {}) => ({
  cardSettings: settings,
  entities,
  entitiesLoaded: true,
  stacks,
  ...over,
});

const spy = vi.mocked(cardUtils.isCardHiddenByLogic);

describe('visibility of a stack in use (ISSUE-116)', () => {
  beforeEach(() => {
    spy.mockReset();
    spy.mockImplementation(((...args: never[]) => real.fn?.(...args)) as never);
  });

  it('a stack of unbound presets is visible once the entities are loaded', () => {
    expect(isWidgetHiddenByLogic('multimedia', 'stack_pre', context())).toBe(false);
  });

  it('a stack with one member hidden by the normal rules and one visible is visible', () => {
    expect(isWidgetHiddenByLogic('home', 'stack_mix', context())).toBe(false);
    // Same rule for the members taken alone.
    expect(isWidgetHiddenByLogic('home', 'sensor.assente', context())).toBe(true);
    expect(isWidgetHiddenByLogic('home', 'sensor.presente', context())).toBe(false);
  });

  it('a stack whose members are all hidden by the normal rules is hidden', () => {
    expect(isWidgetHiddenByLogic('home', 'stack_off', context())).toBe(true);
  });

  it('a stack with no resolvable member follows rule (a): never drawn, so never reserved', () => {
    // Its cells are free ("+") because the controller treats it as a ghost stack; the check on
    // its members does not make a hole.
    expect(isWidgetHiddenByLogic('home', 'stack_ghost', context())).toBe(true);
    const rect = { x: 0, y: 0, w: 2, h: 1 };
    const layout = {
      version: 1 as const,
      cover: { enabled: false },
      stacks,
      pages: [
        {
          id: 'home',
          label: 'Principale',
          kind: 'widgets' as const,
          placements: { tablet: { stack_ghost: rect } },
        },
      ],
    };
    const ctx = {
      deviceClass: 'tablet' as const,
      grids: DEFAULT_GRIDS,
      sizesOf: () => undefined,
    };
    const { lifted } = liftGhostStacks(layout, ctx, (_page, id) => id === 'stack_ghost');
    expect(lifted).toHaveLength(1);
  });

  it('nothing is hidden before the entities are loaded', () => {
    expect(isWidgetHiddenByLogic('home', 'stack_off', context({ entitiesLoaded: false }))).toBe(
      false
    );
  });

  it('a stack with no widgets, or unknown to the layout, shows nothing', () => {
    expect(isWidgetHiddenByLogic('home', 'stack_vuota', context())).toBe(true);
    expect(isWidgetHiddenByLogic('home', 'stack_sconosciuta', context())).toBe(true);
  });

  it('no stack id ever reaches isCardHiddenByLogic as an entity', () => {
    for (const id of Object.keys(stacks)) isWidgetHiddenByLogic('multimedia', id, context());
    isWidgetHiddenByLogic('home', 'stack_sconosciuta', context());
    expect(spy).toHaveBeenCalled();
    for (const [visibilityId] of spy.mock.calls) {
      expect(visibilityId.startsWith('stack_')).toBe(false);
    }
  });
});
