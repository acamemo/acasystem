// @vitest-environment-options {"url":"http://192.168.1.50:3002/"}
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/routes/AppRoot';
import { readQrPreferences } from '@/api/qrPairing';
import type { WebPairingEntry } from '@/api/webPairing';

const mocks = vi.hoisted(() => ({ provider: vi.fn(), sync: vi.fn() }));
vi.mock('@/api/centralSetup', () => ({ readCentralSetupStatus: async () => 'ready' }));
vi.mock('@/hooks/context/ConfigContext', () => ({
  useConfig: () => ({ config: { authMethod: 'oauth' } }),
  useConnectPageControl: () => null,
  ConnectPageControlProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/context/HomeAssistantContext', () => ({
  HomeAssistantProvider: ({ children }: { children: ReactNode }) => { mocks.provider(readQrPreferences()); return <>{children}</>; },
}));
vi.mock('@/hooks/launcher/useSnapshotSetters', () => ({ useLauncherSettingsSync: () => mocks.sync(readQrPreferences()) }));
vi.mock('@/api/snapshot', () => ({ collectSnapshot: () => ({}), applySnapshot: vi.fn() }));
vi.mock('@/api/haSession', () => ({ hasStoredCredentials: () => false, hasSessionTokens: () => false }));
vi.mock('@/api/oauthStorage', () => ({ subscribeToOAuthTokenChanges: () => () => undefined, requestTokensFromOtherTabs: async () => undefined }));
vi.mock('@/components/qrAccountNotice', () => ({ QrAccountNotice: () => null }));
vi.mock('@/routes/AppRoutes', () => ({ AppRoutes: () => <div>Accesso ACA normale</div> }));

const houseId = '345dd32e-56bd-46ef-89ad-98afaa69c091';
const entry: WebPairingEntry = { kind: 'ready', code: { houseId, invite: 'a'.repeat(43) } };
const packet = (action: string) => ({ schema: 1, pairingId: '445dd32e-56bd-46ef-89ad-98afaa69c091', houseId,
  endpoint: 'http://192.168.1.50:3002', mode: action, loginRequired: true,
  ...(action === 'account' ? { accountUserId: 'expected-user' } : { configuration: {
    snapshot: { version: 1, layout: {}, appearance: {} }, appearance: { theme: 'dark', accent: 'cyan', wallpaper: 'none' },
  } }) });
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('gate web prima di accesso e sincronizzazione', () => {
  it('does not mount HA or settings sync or consume the invitation until the account CTA', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(packet('account'))));
    vi.stubGlobal('fetch', fetcher);
    render(<App initialPairing={entry} />);
    expect(screen.getByRole('button', { name: 'Collega account' })).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Collega account' }));
    await screen.findByText('Accesso ACA normale');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mocks.provider).toHaveBeenCalledWith({ schema: 1, mode: 'account', houseId, accountUserId: 'expected-user' });
    // Il collegamento non monta più il writer globale: il profilo live attende il login.
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('offers the file for the destination home without applying it or mounting the source account', async () => {
    localStorage.setItem('aca_appearance', JSON.stringify({ theme: 'light' }));
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(packet('configuration'))));
    vi.stubGlobal('fetch', fetcher);
    render(<App initialPairing={entry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Importa layout' }));
    await screen.findByRole('button', { name: 'Scarica il file layout' });
    expect(screen.getByText(/apri ACA della tua casa/)).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('aca_pairing_preferences')).toBeNull();
    expect(JSON.parse(localStorage.getItem('aca_appearance')!)).toEqual({ theme: 'light' });
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
    const createObjectURL = vi.fn(() => 'blob:portable-layout');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Scarica il file layout' }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });
  it('keeps an invalid link outside HA and accepts no token', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(<App initialPairing={{ kind: 'invalid' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('collegamento non è valido');
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apri ACA' }));
    await waitFor(() => expect(mocks.provider).toHaveBeenCalled());
  });
  it('does not redeem twice when both choices are pressed before the response arrives', async () => {
    let complete!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => { complete = resolve; }));
    vi.stubGlobal('fetch', fetcher);
    render(<App initialPairing={entry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Collega account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importa layout' }));
    expect(fetcher).toHaveBeenCalledTimes(1);
    complete(new Response(JSON.stringify(packet('account'))));
    await screen.findByText('Accesso ACA normale');
  });
});
