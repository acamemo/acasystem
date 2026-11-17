import { afterEach, describe, expect, it, vi } from 'vitest';
import { CentralSetupError, completeCentralSetup, createCentralOwner, readCentralSetupStatus } from '@/api/centralSetup';

afterEach(() => vi.unstubAllGlobals());
const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('prima configurazione della centrale', () => {
  it('reads only the anonymous setup state without saved authentication', async () => {
    const fetcher = vi.fn().mockResolvedValue(answer({ state: 'owner-required' }));
    vi.stubGlobal('fetch', fetcher);
    expect(await readCentralSetupStatus()).toBe('owner-required');
    expect(fetcher).toHaveBeenCalledWith('./api/setup/status', expect.objectContaining({ cache: 'no-store' }));
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty('headers');
  });
  it('sends credentials only to owner creation and uses a bearer for house completion', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(answer({ created: true }, 201)).mockResolvedValueOnce(answer({ complete: true }));
    vi.stubGlobal('fetch', fetcher);
    await createCentralOwner({ name: 'Mario', username: 'mario', password: 'private-password' });
    await completeCentralSetup('personal-token', 'Casa Mario');
    expect(fetcher.mock.calls[0]?.[0]).toBe('./api/setup/owner');
    expect(fetcher.mock.calls[0]?.[1].body).toBe(JSON.stringify({ name: 'Mario', username: 'mario', password: 'private-password' }));
    expect(fetcher.mock.calls[1]?.[1].headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer personal-token' });
    expect(fetcher.mock.calls[1]?.[1].body).toBe(JSON.stringify({ locationName: 'Casa Mario' }));
  });
  it('rejects an unknown setup state instead of mounting an unconfigured app', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer({ state: 'unknown' })));
    await expect(readCentralSetupStatus()).rejects.toBeInstanceOf(CentralSetupError);
  });
  it('exposes a safe owner-exists result without forwarding upstream details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer({ code: 'SETUP_OWNER_EXISTS', error: 'secret-upstream-detail' }, 409)));
    await expect(createCentralOwner({ name: 'Mario', username: 'mario', password: 'private-password' })).rejects.toMatchObject({
      code: 'SETUP_OWNER_EXISTS', message: 'Il proprietario è già stato creato. Accedi per continuare la configurazione.',
    });
  });
  it('reports an unreachable central without treating it as ready', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private-network-detail')));
    await expect(readCentralSetupStatus()).rejects.toMatchObject({ code: 'HA_UNREACHABLE' });
  });
});
