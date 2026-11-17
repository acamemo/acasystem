// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { acceptPairing } from '../pairingFlow.ts';
import type { CapacitorHttpPlugin } from '../capacitorPorts.ts';

const code = {
  endpoint: 'http://192.168.1.50:3002',
  houseId: 'source-house',
  invite: 'opaque-invite',
  config: { host: '192.168.1.50', port: 3002 },
};
const result = (mode: 'account' | 'configuration') => ({
  schema: 1,
  pairingId: '345dd32e-56bd-46ef-89ad-98afaa69c091',
  houseId: code.houseId,
  mode,
  loginRequired: true,
  ...(mode === 'account'
    ? { accountUserId: 'user-1' }
    : {
        configuration: {
          snapshot: { version: 1, layout: {}, appearance: {} },
          appearance: {},
        },
      }),
});
const setup = (status: number, data: unknown) => {
  const request = vi.fn(
    async (_options: Parameters<CapacitorHttpPlugin['request']>[0]) => ({
      status,
      data,
    }),
  );
  const http: CapacitorHttpPlugin = { get: vi.fn(), request };
  const shell = {
    savePairing: vi.fn(async (_options: { value: string }) => {}),
    saveConfig: vi.fn(async (_options: { value: string }) => {}),
  };
  return { http, shell, request };
};
describe('acquisizione mobile distinta dalla propria casa', () => {
  it('CONFIG copia l’handoff e conserva endpoint e account destinatari', async () => {
    const { http, shell, request } = setup(200, {
      ...result('configuration'),
      accessToken: 'non-conservare',
    });
    await acceptPairing(code, 'configuration', http, shell);
    expect(shell.saveConfig).not.toHaveBeenCalled();
    const packet = JSON.parse(shell.savePairing.mock.calls[0]![0].value);
    expect(packet.mode).toBe('configuration');
    expect(packet).not.toHaveProperty('accessToken');
    expect(packet).not.toHaveProperty('invite');
    expect(request.mock.calls[0]![0].headers).not.toHaveProperty(
      'Authorization',
    );
  });
  it('ACCOUNT salva la destinazione ma non trasferisce credenziali HA', async () => {
    const { http, shell } = setup(200, result('account'));
    await acceptPairing(code, 'account', http, shell);
    expect(shell.saveConfig).toHaveBeenCalledWith({
      value: JSON.stringify(code.config),
    });
    expect(
      JSON.parse(shell.savePairing.mock.calls[0]![0].value).loginRequired,
    ).toBe(true);
  });
  it('non salva inviti scaduti o risposte di un’altra casa', async () => {
    for (const [status, data] of [
      [410, {}],
      [200, { ...result('account'), houseId: 'other' }],
    ] as const) {
      const { http, shell } = setup(status, data);
      await expect(
        acceptPairing(code, 'account', http, shell),
      ).rejects.toThrow();
      expect(shell.savePairing).not.toHaveBeenCalled();
      expect(shell.saveConfig).not.toHaveBeenCalled();
    }
  });
});
