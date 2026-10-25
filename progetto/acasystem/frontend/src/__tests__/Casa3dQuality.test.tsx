import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applySnapshot, collectSnapshot } from '@/api/snapshot';
import { Casa3dQualityPicker } from '@/casa3d/Casa3dQualityPicker';
import {
  guardReducer,
  initialGuard,
  MAX_LOSSES,
  REPEAT_WINDOW_MS,
  RESTORE_WAIT_MS,
  type GuardState,
} from '@/casa3d/contextGuard';
import { viewProps } from '@/casa3d/lightProps';
import {
  CASA3D_QUALITY_KEY,
  getCasa3dQuality,
  isWeakDevice,
  parseCasa3dQuality,
  readStoredCasa3dQuality,
  setCasa3dQuality,
  useCasa3dQuality,
} from '@/casa3d/quality';
import { useCasa3dContextGuard } from '@/casa3d/useCasa3dContextGuard';

/**
 * Quality of the Casa 3D view (ADR-0014, section 5, T5): the saved level of the device, the picker
 * with the confirmation of High, the copy in the synchronised settings (never from a profile), and
 * what the page does when the drawing context is lost (contextGuard.ts).
 */

beforeEach(() => {
  localStorage.clear();
  // the store keeps a copy only when the browser refuses to store: a fresh write clears it
  setCasa3dQuality('light');
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('saved quality of the device', () => {
  it('starts from Light on a device that never chose', () => {
    expect(readStoredCasa3dQuality()).toBeNull();
    expect(getCasa3dQuality()).toBe('light');
  });

  it('keeps the choice in this browser and gives it back', () => {
    setCasa3dQuality('medium');
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('medium');
    expect(readStoredCasa3dQuality()).toBe('medium');
    expect(getCasa3dQuality()).toBe('medium');
  });

  it('ignores a stored value that is not a level', () => {
    localStorage.setItem(CASA3D_QUALITY_KEY, 'ultra');
    expect(readStoredCasa3dQuality()).toBeNull();
    expect(getCasa3dQuality()).toBe('light');
    expect(parseCasa3dQuality('low')).toBeNull();
    expect(parseCasa3dQuality(undefined)).toBeNull();
  });

  it('survives a reload: a fresh read finds the level', () => {
    setCasa3dQuality('high');
    // a reload keeps localStorage and drops the memory of the page
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('high');
    expect(getCasa3dQuality()).toBe('high');
  });

  it('lasts for the page when the browser refuses to store', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setCasa3dQuality('medium');
    expect(getCasa3dQuality()).toBe('medium');
    vi.restoreAllMocks();
    // storage works again: the next write is the saved one
    setCasa3dQuality('light');
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('light');
  });

  it('the hook shows the same level in every component and follows a change', () => {
    const a = renderHook(() => useCasa3dQuality());
    const b = renderHook(() => useCasa3dQuality());
    expect(a.result.current[0]).toBe('light');
    act(() => a.result.current[1]('medium'));
    expect(a.result.current[0]).toBe('medium');
    expect(b.result.current[0]).toBe('medium');
  });

  it('follows a change made in another tab', () => {
    const hook = renderHook(() => useCasa3dQuality());
    act(() => {
      localStorage.setItem(CASA3D_QUALITY_KEY, 'high');
      window.dispatchEvent(new StorageEvent('storage', { key: CASA3D_QUALITY_KEY }));
    });
    expect(hook.result.current[0]).toBe('high');
  });
});

describe('weak device', () => {
  it('little memory or few cores make High ask for a confirmation', () => {
    expect(isWeakDevice({ deviceMemory: 4, hardwareConcurrency: 8 })).toBe(true);
    expect(isWeakDevice({ deviceMemory: 8, hardwareConcurrency: 4 })).toBe(true);
    expect(isWeakDevice({ deviceMemory: 8, hardwareConcurrency: 8 })).toBe(false);
  });

  it('a browser that tells nothing is not called weak', () => {
    expect(isWeakDevice({})).toBe(false);
    expect(isWeakDevice({ deviceMemory: 0, hardwareConcurrency: 0 })).toBe(false);
  });
});

describe('properties of the view', () => {
  it('sets the level and keeps the heavy extras off at every level', () => {
    for (const quality of ['light', 'medium', 'high'] as const) {
      const props = viewProps(quality);
      expect(props.quality).toBe(quality);
      expect(props.holograms).toBe(false);
      expect(props.flows).toBe(false);
      expect(props.floorThumbs).toBe(false);
    }
  });

  it('asks for the statistics only above Light', () => {
    expect(viewProps('light').statsEvents).toBe(false);
    expect(viewProps('medium').statsEvents).toBe(true);
    expect(viewProps('high').statsEvents).toBe(true);
  });
});

describe('quality picker', () => {
  it('shows the three levels with the one in use pressed, and explains it', () => {
    render(<Casa3dQualityPicker value="medium" onChange={() => undefined} />);
    const group = screen.getByRole('group', { name: 'Qualità della vista 3D' });
    expect(group).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')).toBe(
      'false'
    );
    expect(screen.getByRole('button', { name: 'Medium' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByRole('button', { name: 'High' })).toBeTruthy();
    expect(screen.getByText(/Più definizione e luci più ricche/)).toBeTruthy();
  });

  it('changes the level at once on a device that can bear it', () => {
    const onChange = vi.fn();
    render(<Casa3dQualityPicker value="light" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'High' }));
    expect(onChange).toHaveBeenCalledWith('high');
  });

  it('asks before High on a weak device, and Annulla changes nothing', () => {
    const onChange = vi.fn();
    render(<Casa3dQualityPicker value="light" weak onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'High' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/High può rallentare questo dispositivo/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/High può rallentare/)).toBeNull();
  });

  it('goes to High on a weak device after the confirmation', () => {
    const onChange = vi.fn();
    render(<Casa3dQualityPicker value="medium" weak onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'High' }));
    fireEvent.click(screen.getByRole('button', { name: 'Passa a High' }));
    expect(onChange).toHaveBeenCalledWith('high');
    expect(screen.queryByText(/High può rallentare/)).toBeNull();
  });

  it('moves down to Light or Medium without asking, on a weak device too', () => {
    const onChange = vi.fn();
    render(<Casa3dQualityPicker value="high" weak onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(onChange).toHaveBeenCalledWith('light');
  });

  it('shows the note about the return to Light', () => {
    render(
      <Casa3dQualityPicker
        value="light"
        onChange={() => undefined}
        note="La vista è tornata a Light."
      />
    );
    expect(screen.getByText('La vista è tornata a Light.')).toBeTruthy();
  });
});

describe('copy in the synchronised settings', () => {
  it('a snapshot of a device that never chose has no device section', () => {
    expect(collectSnapshot().device).toBeUndefined();
    expect('device' in collectSnapshot()).toBe(false);
  });

  it('carries the level, with the id of this device, once the user chose one', () => {
    localStorage.setItem('tunet_device_id', 'device_a');
    setCasa3dQuality('medium');
    expect(collectSnapshot().device).toEqual({ id: 'device_a', casa3dQuality: 'medium' });
  });

  it('has no device section when the browser has no device id', () => {
    setCasa3dQuality('medium');
    expect(collectSnapshot().device).toBeUndefined();
  });

  it('applies the level from the device settings and tells the components', () => {
    localStorage.setItem('tunet_device_id', 'device_a');
    const hook = renderHook(() => useCasa3dQuality());
    act(() =>
      applySnapshot(
        {
          version: 1,
          layout: {},
          appearance: {},
          device: { id: 'device_a', casa3dQuality: 'high' },
        },
        {},
        { device: true }
      )
    );
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('high');
    expect(hook.result.current[0]).toBe('high');
  });

  it('never applies a block written by another device (a published copy)', () => {
    localStorage.setItem('tunet_device_id', 'device_tablet');
    setCasa3dQuality('light');
    const published = {
      version: 1,
      layout: {},
      appearance: {},
      device: { id: 'device_pc', casa3dQuality: 'high' },
    };
    applySnapshot(published, {}, { device: true });
    // a block from an older version of the app has no id and is not applied either
    applySnapshot({ ...published, device: { casa3dQuality: 'high' } }, {}, { device: true });
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('light');
  });

  it('never applies it from a profile or an imported file', () => {
    localStorage.setItem('tunet_device_id', 'device_a');
    applySnapshot({
      version: 1,
      layout: {},
      appearance: {},
      device: { id: 'device_a', casa3dQuality: 'high' },
    });
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBeNull();
  });

  it('ignores a value that is not a level, and a snapshot without the section', () => {
    localStorage.setItem('tunet_device_id', 'device_a');
    setCasa3dQuality('medium');
    applySnapshot(
      {
        version: 1,
        layout: {},
        appearance: {},
        device: { id: 'device_a', casa3dQuality: 'ultra' },
      },
      {},
      { device: true }
    );
    applySnapshot({ version: 1, layout: {}, appearance: {} }, {}, { device: true });
    applySnapshot({ version: 1, layout: {}, appearance: {}, device: 'high' }, {}, { device: true });
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('medium');
  });
});

describe('what the page does when the drawing context is lost', () => {
  const at = 1_000_000;
  const after = (state: GuardState, ...actions: Parameters<typeof guardReducer>[1][]) =>
    actions.reduce(guardReducer, state);

  it('starts with the view as it is', () => {
    expect(initialGuard).toMatchObject({ phase: 'ok', generation: 0, forceLight: false });
  });

  it('a first loss shows the still picture and waits for the context to come back', () => {
    const state = after(initialGuard, { type: 'lost', at });
    expect(state.phase).toBe('lost');
    expect(state.generation).toBe(0);
  });

  it('the context coming back ends the wait', () => {
    const state = after(initialGuard, { type: 'lost', at }, { type: 'restored' });
    expect(state).toMatchObject({ phase: 'ok', generation: 0, forceLight: false });
  });

  it('a context that does not come back makes the view again, in Light', () => {
    const state = after(initialGuard, { type: 'lost', at }, { type: 'timeout', at: at + 5000 });
    expect(state).toMatchObject({ phase: 'ok', generation: 1, forceLight: true });
  });

  it('a late timeout after the context came back does nothing', () => {
    const state = after(
      initialGuard,
      { type: 'lost', at },
      { type: 'restored' },
      { type: 'timeout', at: at + 5000 }
    );
    expect(state).toMatchObject({ phase: 'ok', generation: 0, forceLight: false });
  });

  it('a lost view that was released while the page was away leaves nothing to wait for', () => {
    const state = after(initialGuard, { type: 'lost', at }, { type: 'released' });
    expect(state).toMatchObject({
      phase: 'ok',
      generation: 0,
      forceLight: false,
      recreatedAt: null,
    });
    // and a later timeout does not make the view again
    expect(after(state, { type: 'timeout', at: at + 5000 })).toBe(state);
  });

  it('a release changes nothing when no loss is pending', () => {
    expect(after(initialGuard, { type: 'released' })).toBe(initialGuard);
    const still = after(initialGuard, { type: 'failed' });
    expect(after(still, { type: 'released' })).toBe(still);
  });

  it('losses that each come back in time never stop the view, until the context keeps flapping', () => {
    let state: GuardState = initialGuard;
    for (let i = 0; i < MAX_LOSSES - 1; i += 1) {
      state = after(state, { type: 'lost', at: at + i * 2000 }, { type: 'restored' });
      expect(state).toMatchObject({ phase: 'ok', generation: 0 });
    }
    state = after(state, { type: 'lost', at: at + MAX_LOSSES * 2000 });
    expect(state).toMatchObject({ phase: 'static', reason: 'lost' });
  });

  it('three losses in a row, each one given back, are all recovered', () => {
    let state: GuardState = initialGuard;
    for (let i = 0; i < 3; i += 1) {
      state = after(state, { type: 'lost', at: at + i * 3000 });
      expect(state.phase).toBe('lost');
      state = after(state, { type: 'restored' });
      expect(state.phase).toBe('ok');
    }
    expect(state.generation).toBe(0);
  });

  it('a loss within ten minutes of a new view keeps the still picture, with a retry', () => {
    const state = after(
      initialGuard,
      { type: 'lost', at },
      { type: 'timeout', at: at + 5000 },
      { type: 'lost', at: at + REPEAT_WINDOW_MS - 1 }
    );
    expect(state).toMatchObject({ phase: 'static', reason: 'lost' });
  });

  it('a loss more than ten minutes after the new view counts as a first one', () => {
    const state = after(
      initialGuard,
      { type: 'lost', at },
      { type: 'timeout', at: at + 5000 },
      { type: 'lost', at: at + 5000 + REPEAT_WINDOW_MS + 1 }
    );
    expect(state.phase).toBe('lost');
  });

  it('a view that cannot be made keeps the still picture, for another reason', () => {
    expect(after(initialGuard, { type: 'failed' })).toMatchObject({
      phase: 'static',
      reason: 'failed',
    });
  });

  it('a view that failed to start for another reason keeps the still picture and says so', () => {
    expect(after(initialGuard, { type: 'failed', reason: 'error' })).toMatchObject({
      phase: 'static',
      reason: 'error',
    });
  });

  it('Riprova makes the view again in Light and forgets the losses', () => {
    const state = after(
      initialGuard,
      { type: 'lost', at },
      { type: 'timeout', at: at + 5000 },
      { type: 'lost', at: at + 6000 },
      { type: 'retry' }
    );
    expect(state).toMatchObject({
      phase: 'ok',
      generation: 2,
      forceLight: true,
      losses: [],
      recreatedAt: null,
      reason: null,
    });
    // and one more loss afterwards is a first one again
    expect(after(state, { type: 'lost', at: at + 7000 }).phase).toBe('lost');
  });

  it('choosing a level ends the Light that followed a loss', () => {
    const state = after(
      initialGuard,
      { type: 'lost', at },
      { type: 'timeout', at: at + 5000 },
      { type: 'choose' }
    );
    expect(state.forceLight).toBe(false);
    expect(after(initialGuard, { type: 'choose' })).toBe(initialGuard);
  });

  it('the hook turns what the view reports into the phase and waits five seconds', () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useCasa3dContextGuard());
    act(() => hook.result.current.report({ state: 'lost' }));
    expect(hook.result.current.state.phase).toBe('lost');
    act(() => {
      vi.advanceTimersByTime(RESTORE_WAIT_MS - 100);
    });
    expect(hook.result.current.state.generation).toBe(0);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(hook.result.current.state).toMatchObject({
      phase: 'ok',
      generation: 1,
      forceLight: true,
    });
  });

  it('the hook waits for the page to be active before it makes the view again', () => {
    vi.useFakeTimers();
    const hook = renderHook(({ active }) => useCasa3dContextGuard(undefined, active), {
      initialProps: { active: false },
    });
    act(() => hook.result.current.report({ state: 'lost' }));
    act(() => {
      vi.advanceTimersByTime(RESTORE_WAIT_MS * 3);
    });
    expect(hook.result.current.state).toMatchObject({ phase: 'lost', generation: 0 });
    hook.rerender({ active: true });
    act(() => {
      vi.advanceTimersByTime(RESTORE_WAIT_MS + 100);
    });
    expect(hook.result.current.state).toMatchObject({
      phase: 'ok',
      generation: 1,
      forceLight: true,
    });
  });

  it('the hook does not make the view again when the context came back in time', () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useCasa3dContextGuard());
    act(() => hook.result.current.report({ state: 'lost' }));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => hook.result.current.report({ state: 'restored' }));
    act(() => {
      vi.advanceTimersByTime(RESTORE_WAIT_MS * 2);
    });
    expect(hook.result.current.state).toMatchObject({ phase: 'ok', generation: 0 });
  });

  it('the hook goes to the still picture for a view that cannot be made, and Riprova leaves it', () => {
    const hook = renderHook(() => useCasa3dContextGuard());
    act(() => hook.result.current.report({ state: 'error' }));
    expect(hook.result.current.state).toMatchObject({ phase: 'static', reason: 'error' });
    act(() => hook.result.current.retry());
    act(() => hook.result.current.report({ state: 'failed' }));
    expect(hook.result.current.state).toMatchObject({ phase: 'static', reason: 'failed' });
    act(() => hook.result.current.retry());
    expect(hook.result.current.state).toMatchObject({ phase: 'ok', generation: 2 });
  });
});
