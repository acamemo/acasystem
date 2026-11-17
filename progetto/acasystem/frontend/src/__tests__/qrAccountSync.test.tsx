import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQrAccountSync } from '@/hooks/qrAccountSync';
import type { QrAccountSettings, QrConfiguration, QrPreferences } from '@/api/qrPairing';

const mocks = vi.hoisted(() => ({
  current: null as QrConfiguration | null,
  preferences: null as QrPreferences | null,
  read: vi.fn(), write: vi.fn(), apply: vi.fn(), watch: vi.fn(),
  notify: null as ((revision: number) => void) | null,
}));
vi.mock('@/api/qrPairing', () => ({
  QR_PREFERENCES_EVENT: 'acasystem:pairing-preferences',
  readQrPreferences: () => mocks.preferences,
  collectQrConfiguration: () => mocks.current && ({ ...mocks.current,
    appearance: { theme: 'light', accent: 'violet', wallpaper: 'none' } }),
  applyQrConfiguration: (configuration: QrConfiguration) => { mocks.current = configuration; mocks.apply(configuration); },
  importQrPairing: vi.fn(),
  readAccountSettings: mocks.read,
  writeAccountSettings: mocks.write,
  watchAccountSettings: mocks.watch,
}));

const configuration = (title: string): QrConfiguration => ({
  snapshot: { version: 1, layout: { headerTitle: title }, appearance: {} },
  appearance: { theme: 'dark', accent: 'cyan', wallpaper: 'none' },
});
const saved = (revision: number, title: string): QrAccountSettings => ({ revision, configuration: configuration(title), updatedAt: '2026-10-30T01:00:00.000Z' });
const settle = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.current = configuration('Locale');
  mocks.preferences = { schema: 1, mode: 'account', houseId: 'house', accountUserId: 'same-user' };
  mocks.notify = null;
  mocks.watch.mockImplementation((signal: AbortSignal, changed: (revision: number) => void) => {
    mocks.notify = changed;
    return new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }));
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('null')));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('shared account synchronization', () => {
  it('keeps raw server appearance on layout edits without publishing a rendering-only change', async () => {
    const appearance = Object.freeze({ theme: 'dark' as const, accent: 'wallpaper' as const,
      wallpaper: 'photo' as const, wallpaperHue: 240, historicalField: 'retained' });
    const original = { ...configuration('PC'), appearance };
    mocks.read.mockResolvedValue({ revision: 1, configuration: original, updatedAt: '2026-11-04T00:00:00.000Z' });
    mocks.write.mockImplementation(async (_revision: number, value: QrConfiguration) =>
      ({ revision: 2, configuration: value, updatedAt: '2026-11-04T00:00:01.000Z' }));
    renderHook(() => useQrAccountSync('same-user', {}));
    await act(settle);
    mocks.current = { ...original, appearance: { theme: 'light', accent: 'violet', wallpaper: 'none' } };
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); await settle(); });
    expect(mocks.write).not.toHaveBeenCalled();
    mocks.current = { ...mocks.current, snapshot: { ...original.snapshot,
      layout: { headerTitle: 'Dal telefono' } } };
    await act(async () => { await vi.advanceTimersByTimeAsync(500); await settle(); });
    expect(mocks.write).toHaveBeenCalledWith(1, {
      ...mocks.current, appearance,
    }, expect.any(AbortSignal));
    expect(mocks.write).toHaveBeenCalledOnce();
    expect(original.appearance).toBe(appearance);
    expect(original.snapshot.layout).toEqual({ headerTitle: 'PC' });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); await settle(); });
    expect(mocks.write).toHaveBeenCalledOnce();
  });
  it('applies pushed changes and publishes local edits without polling remote settings', async () => {
    mocks.read.mockResolvedValueOnce(saved(1, 'PC')).mockResolvedValueOnce(saved(2, 'Tablet'));
    mocks.write.mockResolvedValue(saved(3, 'Telefono'));
    renderHook(() => useQrAccountSync('same-user', {}));
    await act(settle);
    expect(mocks.apply).toHaveBeenCalledWith(configuration('PC'));
    expect(mocks.read).toHaveBeenCalledTimes(1);
    await act(async () => { mocks.notify?.(2); await settle(); });
    expect(mocks.apply).toHaveBeenLastCalledWith(configuration('Tablet'));
    mocks.current = configuration('Telefono');
    await act(async () => { await vi.advanceTimersByTimeAsync(500); await settle(); });
    expect(mocks.write).toHaveBeenCalledWith(2, configuration('Telefono'), expect.any(AbortSignal));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); await settle(); });
    expect(mocks.read).toHaveBeenCalledTimes(2);
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });
  it('retains a newer notification arriving while the preceding settings response is in flight', async () => {
    let finishPrevious!: (value: QrAccountSettings) => void;
    const previousResponse = new Promise<QrAccountSettings>((resolve) => { finishPrevious = resolve; });
    mocks.read.mockResolvedValueOnce(saved(1, 'PC')).mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce(saved(3, 'Ultima modifica'));
    renderHook(() => useQrAccountSync('same-user', {}));
    await act(settle);
    await act(async () => { mocks.notify?.(2); await settle(); });
    expect(mocks.read).toHaveBeenCalledTimes(2);
    await act(async () => {
      mocks.notify?.(3);
      finishPrevious(saved(2, 'Risposta precedente'));
      await settle();
      await vi.advanceTimersByTimeAsync(500);
      await settle();
    });
    expect(mocks.apply).toHaveBeenLastCalledWith(configuration('Ultima modifica'));
    expect(mocks.read).toHaveBeenCalledTimes(3);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it.each(['configuration', 'different-user'] as const)('does not synchronize a copied interface or a different account (%s)', async (condition) => {
    if (condition === 'configuration') mocks.preferences = { schema: 1, mode: 'configuration' };
    renderHook(() => useQrAccountSync(condition === 'different-user' ? 'other-user' : 'same-user', {}));
    await act(settle);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); await settle(); });
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.watch).not.toHaveBeenCalled();
  });
});
