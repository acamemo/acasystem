import { describe, expect, it } from 'vitest';
import { hasTrend, rangeCaption, wantsTrendChart } from '@/components/widgets/adaptive/chartPolicy';

const at = (value: number) => ({ value });

describe('wantsTrendChart', () => {
  it('keeps the chart for measured quantities', () => {
    expect(wantsTrendChart({ type: 'sensor', history: { entityId: 'sensor.temp' } })).toBe(true);
    expect(wantsTrendChart({ type: 'room', history: { entityId: 'sensor.camera_temp' } })).toBe(
      true
    );
    expect(wantsTrendChart({ type: 'cost', history: { entityId: 'sensor.costo' } })).toBe(true);
    expect(wantsTrendChart({ type: 'car', history: { entityId: 'sensor.batteria' } })).toBe(true);
    expect(wantsTrendChart({ type: 'vacuum', history: { entityId: 'vacuum.roomba' } })).toBe(true);
    expect(wantsTrendChart({ type: 'nordpool', hasSeries: true })).toBe(true);
  });

  it('drops it for states, commands and set points', () => {
    const states = { entityId: 'lock.porta', states: { locked: 1, unlocked: 0 } };
    expect(wantsTrendChart({ type: 'lock', history: states })).toBe(false);
    expect(wantsTrendChart({ type: 'alarm', history: states })).toBe(false);
    expect(wantsTrendChart({ type: 'camera', history: states })).toBe(false);
    expect(
      wantsTrendChart({
        type: 'sensor',
        history: { entityId: 'binary_sensor.porta', states: { on: 1 } },
      })
    ).toBe(false);
    expect(wantsTrendChart({ type: 'sensor', history: { entityId: 'switch.pompa' } })).toBe(false);
    for (const type of [
      'light',
      'fan',
      'cover',
      'climate',
      'media',
      'sonos',
      'androidtv',
      'appletv',
      'todo',
    ])
      expect(wantsTrendChart({ type, history: { entityId: `${type}.x` } })).toBe(false);
  });

  it('drops it when the card has no history at all', () => {
    expect(wantsTrendChart({ type: 'sensor' })).toBe(false);
    expect(wantsTrendChart({ type: 'room' })).toBe(false);
  });
});

describe('hasTrend', () => {
  it('needs two points that differ', () => {
    expect(hasTrend(undefined)).toBe(false);
    expect(hasTrend([])).toBe(false);
    expect(hasTrend([at(3)])).toBe(false);
    expect(hasTrend([at(80), at(80), at(80)])).toBe(false);
    expect(hasTrend([at(80), at(79)])).toBe(true);
  });
});

describe('rangeCaption', () => {
  it('says nothing for the usual day and names a range the user moved', () => {
    expect(rangeCaption(24)).toBeNull();
    expect(rangeCaption(6)).toBe('6 ore');
    expect(rangeCaption(168)).toBe('7 giorni');
    expect(rangeCaption(720)).toBe('30 giorni');
  });
});
