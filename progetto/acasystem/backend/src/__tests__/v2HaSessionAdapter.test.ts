// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { HA_CALLS } from '../config/homeAssistantApiCatalog.ts';
import { createHaAdapter } from '../services/devices/haAdapter.ts';
import type { HaTransport } from '../services/devices/haTransport.ts';
const create = (replies: unknown[]) => {
  const send = vi.fn(async () => replies.shift());
  const close = vi.fn();
  const transport = { openSession: async () => ({ send, close }) } as unknown as HaTransport;
  return { adapter: createHaAdapter({ transport, callTimeoutMs: 100, flowStepTimeoutMs: 100 }), send, close };
};
describe('confine HA per sessioni personali e registrazione', () => {
  it('lega il bearer al solo refreshToken corrente restituito da HA', async () => {
    const { adapter, close } = create([{ id: 'anna', name: 'Anna', is_admin: false, is_owner: false },
      [{ id: 'old-token', type: 'normal', is_current: false }, { id: 'phone-token', type: 'normal', is_current: true }]]);
    await expect(adapter.withWs('bearer', api => api.currentSession())).resolves.toEqual({
      user: { id: 'anna', name: 'Anna', isAdmin: false, isOwner: false }, refreshTokenId: 'phone-token', tokenType: 'normal' });
    expect(close).toHaveBeenCalledOnce();
  });
  it.each([
    { label: 'assente', tokens: [] },
    { label: 'ambigua', tokens: [{ id: 'a', type: 'normal', is_current: true }, { id: 'b', type: 'normal', is_current: true }] },
    { label: 'incompleta', tokens: [{ id: 'a', is_current: true }] },
  ])('rifiuta un’identità sessione $label', async ({ tokens }) => {
    const { adapter, close } = create([{ id: 'anna', name: 'Anna' }, tokens]);
    await expect(adapter.withWs('bearer', api => api.currentSession())).rejects.toMatchObject({ kind: 'protocol' });
    expect(close).toHaveBeenCalledOnce();
  });
  it('crea il membro senza i privilegi dell’identità servizio e limita rename/delete al suo ID', async () => {
    const { adapter, send } = create([{ user: { id: 'new-member', name: 'Anna', group_ids: ['system-users'] } }, {}, {}]);
    await adapter.withWs('service', async api => {
      const user = await api.createHumanUser('Anna');
      expect(user.isAdmin).toBe(false);
      await api.updateUser(user.id, { name: 'Anna Rossi' });
      await api.deleteUser(user.id);
    });
    expect(send).toHaveBeenNthCalledWith(1, HA_CALLS.usersCreate, { payload: { name: 'Anna', group_ids: ['system-users'], local_only: false }, timeoutMs: 100 });
    expect(send).toHaveBeenNthCalledWith(2, HA_CALLS.usersUpdate, { payload: { user_id: 'new-member', name: 'Anna Rossi' }, timeoutMs: 100 });
    expect(send).toHaveBeenNthCalledWith(3, HA_CALLS.usersDelete, { payload: { user_id: 'new-member' }, timeoutMs: 100 });
  });
  it('rifiuta una risposta HA che assegna privilegi amministratore al nuovo membro', async () => {
    const { adapter } = create([{ user: { id: 'new-member', name: 'Anna', group_ids: ['system-admin'] } }]);
    await expect(adapter.withWs('service', api => api.createHumanUser('Anna'))).rejects.toMatchObject({ kind: 'protocol' });
  });
});
