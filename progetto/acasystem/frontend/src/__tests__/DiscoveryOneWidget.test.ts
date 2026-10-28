import { describe, expect, it } from 'vitest';
import { oneWidgetPerDevice } from '@/templates/discovery/selectionAfterAdd';

describe('oneWidgetPerDevice', () => {
  it('keeps one stream of a camera with two', () => {
    expect(
      oneWidgetPerDevice({
        type: 'camera',
        entityIds: ['camera.reolink_fluent', 'camera.reolink_clear'],
      })
    ).toEqual({ type: 'camera', entityIds: ['camera.reolink_fluent'] });
  });

  it('leaves the other types as they are', () => {
    const lights = { type: 'light', entityIds: ['light.a', 'light.b'] };
    expect(oneWidgetPerDevice(lights)).toBe(lights);
  });
});
