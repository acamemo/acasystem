import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { callService, getHistory } from '@/api/haClient';
import { useHomeAssistantRuntime } from '@/hooks/launcher/useHomeAssistantRuntime';

const state = vi.hoisted(() => ({
  ha: {
    entities: {},
    entitiesLoaded: true,
    conn: null as unknown,
    connected: true,
    activeUrl: '/ha',
    haConfig: null,
  },
  helpers: vi.fn(() => ({ callService: vi.fn(), getEntityImageUrl: () => null })),
}));
vi.mock('@/hooks/context/HomeAssistantContext', () => ({ useHomeAssistant: () => state.ha }));
vi.mock('@/hooks/context/PageContext', () => ({
  usePages: () => ({
    cardSettings: {},
    saveCardSetting: vi.fn(),
    customNames: {},
    customIcons: {},
  }),
}));
vi.mock('@/hooks/useEntityHelpers', () => ({ useEntityHelpers: state.helpers }));

beforeEach(() => {
  vi.clearAllMocks();
  state.ha.connected = true;
});
describe('Connessione mantenuta con socket chiuso', () => {
  it('rifiuta i servizi prima di inviare o accodare messaggi', async () => {
    const conn = { connected: false, sendMessagePromise: vi.fn() };
    await expect(
      callService(conn, 'light', 'turn_on', { entity_id: 'light.fixture' })
    ).rejects.toThrow(/disconnected/);
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
  });
  it('non accoda neppure richieste storiche durante la disconnessione', async () => {
    const conn = { connected: false, sendMessagePromise: vi.fn() };
    await expect(
      getHistory(conn, { entityId: 'sensor.fixture', start: new Date(), end: new Date() })
    ).rejects.toThrow(/disconnected/);
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
  });
  it('conserva il contratto dei client leggeri quando lo stato non è esposto', async () => {
    const conn = { sendMessagePromise: vi.fn().mockResolvedValue({}) };
    await callService(conn, 'light', 'turn_on', { entity_id: 'light.fixture' });
    expect(conn.sendMessagePromise).toHaveBeenCalledOnce();
  });
  it('propaga null ai widget e agli helper offline e riusa la connessione al ritorno', () => {
    const conn = { connected: true, sendMessagePromise: vi.fn() };
    state.ha.conn = conn;
    const now = new Date();
    const view = renderHook(() =>
      useHomeAssistantRuntime({ openDetails: () => undefined, editMode: false, now })
    );
    expect(view.result.current.conn).toBe(conn);
    state.ha.connected = false;
    conn.connected = false;
    view.rerender();
    expect(view.result.current.conn).toBeNull();
    expect(state.helpers).toHaveBeenLastCalledWith(expect.objectContaining({ conn: null }));
    state.ha.connected = true;
    conn.connected = true;
    view.rerender();
    expect(view.result.current.conn).toBe(conn);
  });
});
