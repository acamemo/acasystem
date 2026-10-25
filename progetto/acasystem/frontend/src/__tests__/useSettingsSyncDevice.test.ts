import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsSync } from '../hooks/useSettingsSync';
import { collectSnapshot } from '@/api/snapshot';
import { readStoredCasa3dQuality, setCasa3dQuality } from '@/casa3d/quality';

/**
 * The round trip between collectSnapshot and applySnapshot (not mocked here, unlike
 * useSettingsSync.test.ts): the `device` block of a row written by another device must not make
 * this device refuse the next rows (ADR-0014, T5).
 */
vi.mock('@/api/settingsApi', () => ({
  fetchCurrentSettings: vi.fn(),
  fetchSettingsHistory: vi.fn(),
  deleteSettingsHistory: vi.fn(),
  deleteSettingsDevice: vi.fn(),
  updateSettingsDeviceLabel: vi.fn(),
  saveCurrentSettings: vi.fn(),
  fetchCurrentDevices: vi.fn(),
  publishCurrentSettings: vi.fn(),
}));

import {
  fetchCurrentSettings,
  fetchCurrentDevices,
  fetchSettingsHistory,
  saveCurrentSettings,
} from '@/api/settingsApi';

const OWN_ID = 'device_b';
const OTHER = { id: 'device_a', casa3dQuality: 'high' };

type Snapshot = ReturnType<typeof collectSnapshot>;

/** The snapshot of this device with another device's block and a changed list of custom names. */
const publishedRow = (revision: number, names: string[], device?: object) => {
  const own = collectSnapshot() as Snapshot & { device?: unknown };
  const { device: _ownBlock, ...rest } = own;
  void _ownBlock;
  return {
    revision,
    updated_at: `2026-10-20T10:0${revision}:00.000Z`,
    data: {
      ...rest,
      layout: {
        ...rest.layout,
        customNames: Object.fromEntries(names.map((name) => [name, name])),
      },
      ...(device ? { device } : {}),
    },
  };
};

describe('useSettingsSync: the device block of a row from another device', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('tunet_device_id', OWN_ID);
    vi.mocked(fetchSettingsHistory).mockResolvedValue([]);
    vi.mocked(fetchCurrentDevices).mockResolvedValue([]);
    vi.mocked(saveCurrentSettings).mockResolvedValue({
      revision: 9,
      updated_at: '2026-10-20T11:00:00.000Z',
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // Any synchronised setting tells whether a row was applied; the custom names are the marker.
  const names = () =>
    Object.keys(JSON.parse(localStorage.getItem('tunet_custom_names') ?? 'null') ?? {});

  it('applies the next published rows although this device chose another level', async () => {
    setCasa3dQuality('light');
    vi.mocked(fetchCurrentSettings)
      .mockResolvedValueOnce(publishedRow(1, [], OTHER))
      .mockResolvedValueOnce(publishedRow(2, ['x'], OTHER))
      .mockResolvedValueOnce(publishedRow(3, ['x', 'y'], OTHER));

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(names()).toEqual(['x']);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(names()).toEqual(['x', 'y']);
    // the level of the other device is never taken
    expect(readStoredCasa3dQuality()).toBe('light');
  });

  it('applies the next rows when only the publishing device chose a level', async () => {
    vi.mocked(fetchCurrentSettings)
      .mockResolvedValueOnce(publishedRow(1, [], OTHER))
      .mockResolvedValueOnce(publishedRow(2, ['x'], OTHER));

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(names()).toEqual(['x']);
    expect(readStoredCasa3dQuality()).toBeNull();
  });

  it('applies the next rows when only this device chose a level', async () => {
    setCasa3dQuality('medium');
    vi.mocked(fetchCurrentSettings)
      .mockResolvedValueOnce(publishedRow(1, []))
      .mockResolvedValueOnce(publishedRow(2, ['x']));

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(names()).toEqual(['x']);
    expect(readStoredCasa3dQuality()).toBe('medium');
  });

  it('still refuses a row while this device has a real local change', async () => {
    vi.mocked(fetchCurrentSettings)
      .mockResolvedValueOnce(publishedRow(1, [], OTHER))
      .mockResolvedValueOnce(publishedRow(2, ['x'], OTHER));

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    localStorage.setItem('tunet_custom_names', JSON.stringify({ mine: 'mine' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(names()).toEqual(['mine']);
  });

  it('sends its own block when the level picked is the one in the block of the other device', async () => {
    vi.mocked(fetchCurrentSettings).mockResolvedValueOnce(publishedRow(4, [], OTHER));

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(saveCurrentSettings).not.toHaveBeenCalled();

    act(() => setCasa3dQuality('high'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3700);
    });

    expect(saveCurrentSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        base_revision: 4,
        data: expect.objectContaining({ device: { id: OWN_ID, casa3dQuality: 'high' } }),
      }),
      expect.anything()
    );
  });
});
