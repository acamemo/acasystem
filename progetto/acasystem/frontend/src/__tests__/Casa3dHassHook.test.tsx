import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_KEY, type Casa3dPlanApi } from '@/casa3d/planApi';
import { useCasa3dHass } from '@/casa3d/useCasa3dHass';

/**
 * The hook that builds the `hass` object of the Casa 3D elements (ADR-0014, T6): the plan
 * commands go to the plan API it is given, and the unsaved draft of the plan is removed when
 * another user signs in on the same browser.
 */

const ha = vi.hoisted(() => ({
  meta: {
    conn: { sendMessagePromise: () => Promise.resolve([]) },
    haUser: { id: 'ana', name: 'Ana', is_admin: true },
    haConfig: null,
    activeUrl: 'https://aca.test/ha',
    entitiesLoaded: true,
  } as Record<string, unknown>,
}));

vi.mock('@/hooks/context/HomeAssistantContext', () => ({
  useHomeAssistantEntities: () => ({}),
  useHomeAssistantMeta: () => ha.meta,
}));

const planApi: Casa3dPlanApi = {
  handles: (type) => type === 'casa3d/building/get',
  call: <T,>() => Promise.resolve({ building: {}, revision: 5 } as T),
  subscribe: () => Promise.resolve(() => Promise.resolve()),
  revision: null,
};

beforeEach(() => {
  localStorage.clear();
  ha.meta.haUser = { id: 'ana', name: 'Ana', is_admin: true };
});
afterEach(() => localStorage.clear());

describe('useCasa3dHass: plan API and draft', () => {
  it('sends the plan commands to the plan API it is given', async () => {
    const { result } = renderHook(() => useCasa3dHass(null, undefined, planApi));
    await waitFor(() => expect(result.current.hass).not.toBeNull());
    await expect(result.current.hass?.callWS({ type: 'casa3d/building/get' })).resolves.toEqual({
      building: {},
      revision: 5,
    });
  });

  it('without a plan API the plan is not found, as before', async () => {
    const { result } = renderHook(() => useCasa3dHass(null));
    await waitFor(() => expect(result.current.hass).not.toBeNull());
    await expect(
      result.current.hass?.callWS({ type: 'casa3d/building/get' })
    ).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('keeps the draft of the same user and removes it when another user signs in', async () => {
    localStorage.setItem(DRAFT_KEY, '{"building":{},"savedAt":1}');
    const first = renderHook(() => useCasa3dHass(null));
    await waitFor(() => expect(first.result.current.hass).not.toBeNull());
    // The draft had no owner yet: the first user to arrive does not inherit it.
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    first.unmount();

    localStorage.setItem(DRAFT_KEY, '{"building":{},"savedAt":2}');
    const again = renderHook(() => useCasa3dHass(null));
    await waitFor(() => expect(again.result.current.hass).not.toBeNull());
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull(); // same user: kept
    again.unmount();

    ha.meta.haUser = { id: 'bruno', name: 'Bruno', is_admin: false };
    const other = renderHook(() => useCasa3dHass(null));
    await waitFor(() => expect(other.result.current.hass).not.toBeNull());
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('does not touch the draft while the user is not known', async () => {
    localStorage.setItem(DRAFT_KEY, '{"building":{},"savedAt":3}');
    ha.meta.haUser = null;
    const { result } = renderHook(() => useCasa3dHass(null));
    await waitFor(() => expect(result.current.hass).not.toBeNull());
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
  });

  it('does not hand out the plan before the user is known, so a draft is never offered to an unknown user', async () => {
    ha.meta.haUser = null;
    const { result, rerender } = renderHook(() => useCasa3dHass(null, undefined, planApi));
    await waitFor(() => expect(result.current.registriesLoaded).toBe(true));
    expect(result.current.hass).toBeNull();
    ha.meta.haUser = { id: 'ana', name: 'Ana', is_admin: true };
    rerender();
    await waitFor(() => expect(result.current.hass).not.toBeNull());
  });
});
