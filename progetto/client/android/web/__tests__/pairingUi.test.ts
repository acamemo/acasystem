// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  shell: {
    shellVersion: vi.fn(),
    loadConfig: vi.fn(),
    saveConfig: vi.fn(),
    listBundles: vi.fn(),
    installBundle: vi.fn(),
    launch: vi.fn(),
    scanPairingCode: vi.fn(),
    savePairing: vi.fn(),
    pairingState: vi.fn(),
    consumeIntent: vi.fn(),
    addListener: vi.fn(),
  },
  http: { get: vi.fn(), request: vi.fn() },
  startup: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  registerPlugin: () => mocks.shell,
  CapacitorHttp: mocks.http,
}));
vi.mock('../../../core/src/index.ts', async (original) => ({
  ...(await original<typeof import('../../../core/src/index.ts')>()),
  resolveStartup: mocks.startup,
}));

class Control extends EventTarget {
  textContent = '';
  value = '';
  disabled = false;
  hidden = false;
  click(): void {
    if (!this.disabled) this.dispatchEvent(new Event('click'));
  }
}
const legacyQr =
  'acasystem://pair?v=1&endpoint=http%3A%2F%2F192.168.1.50%3A3002&house=source-house&invite=abcdefghijklmnopqrstuvwx';
const { url: qr } = JSON.parse(
  await readFile(
    new URL(
      '../../../../acasystem/frontend/src/__tests__/fixtures/pairing-web-v1.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as { url: string };
let controls: Map<string, Control>;
let body: { dataset: { view: string } };
let stored: string | null;
let configurationPending: boolean;
const control = (id: string): Control => controls.get(id)!;
const openScanner = async (): Promise<void> => {
  control('show-scan').click();
  await vi.waitFor(() => expect(body.dataset.view).toBe('scan'));
};
const chooseQr = async (): Promise<void> => {
  if (body.dataset.view === 'wizard') await openScanner();
  control('scan').click();
  await vi.waitFor(() => expect(body.dataset.view).toBe('pairing-choice'));
};

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  const html = await readFile(
    new URL('../index.html', import.meta.url),
    'utf8',
  );
  controls = new Map(
    [...html.matchAll(/id="([^"]+)"/g)].map((match) => [
      match[1]!,
      new Control(),
    ]),
  );
  body = { dataset: { view: 'loading' } };
  vi.stubGlobal('document', {
    body,
    getElementById: (id: string) => controls.get(id),
    addEventListener: vi.fn(),
    visibilityState: 'hidden',
  });
  stored = null;
  configurationPending = false;
  mocks.shell.shellVersion.mockResolvedValue({ version: '0.1.0' });
  mocks.shell.loadConfig.mockImplementation(async () => ({ value: stored }));
  mocks.shell.saveConfig.mockImplementation(
    async ({ value }: { value: string }) => {
      stored = value;
    },
  );
  mocks.shell.pairingState.mockImplementation(async () => ({
    configurationPending,
  }));
  mocks.shell.savePairing.mockImplementation(
    async ({ value }: { value: string }) => {
      if (JSON.parse(value).mode === 'configuration')
        configurationPending = true;
    },
  );
  mocks.shell.scanPairingCode.mockResolvedValue({ value: qr }).mockRejectedValueOnce({ code: 'SCAN_CANCELLED' });
  mocks.shell.consumeIntent.mockResolvedValue({ changeAddress: false });
  mocks.shell.addListener.mockResolvedValue({});
  mocks.shell.launch.mockResolvedValue(undefined);
  mocks.http.request.mockImplementation(
    async ({ data }: { data: { action: string; houseId: string } }) => ({
      status: 200,
      data: {
        schema: 1,
        pairingId: '345dd32e-56bd-46ef-89ad-98afaa69c091',
        houseId: data.houseId,
        mode: data.action,
        loginRequired: true,
        ...(data.action === 'account'
          ? { accountUserId: 'owner' }
          : {
              configuration: {
                snapshot: { version: 1, layout: {}, appearance: {} },
                appearance: {},
              },
            }),
      },
    }),
  );
  mocks.startup.mockResolvedValue({
    kind: 'launch',
    version: '0.9.31',
    origin: 'http://192.168.1.50:3002',
    notices: [],
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('avvio Android mediante QR', () => {
  it('riconosce anche il formato legacy senza consumare l’invito all’apertura', async () => {
    await import('../main.ts');
    mocks.shell.scanPairingCode.mockResolvedValueOnce({ value: legacyQr });
    await chooseQr();
    expect(mocks.http.request).not.toHaveBeenCalled();
  });
  it('al primo avvio apre lo scanner e dopo annullamento offre il ripiego IP senza chiedere credenziali', async () => {
    await import('../main.ts');
    expect(body.dataset.view).toBe('scan');
    expect(mocks.shell.scanPairingCode).toHaveBeenCalledOnce();
    expect(control('use-address').hidden).toBe(false);
    expect(mocks.startup).not.toHaveBeenCalled();
    expect(controls.has('host')).toBe(true);
    expect(controls.has('owner-password')).toBe(false);
  });

  it('il primo QR di collegamento valido apre direttamente la casa', async () => {
    mocks.shell.scanPairingCode.mockReset().mockResolvedValue({ value: 'http://192.168.1.50:3002/' });
    mocks.http.get.mockResolvedValue({ status: 200, data: { status: 'ok', version: '0.9.31' } });
    await import('../main.ts');
    expect(mocks.shell.scanPairingCode).toHaveBeenCalledOnce();
    expect(mocks.shell.launch).toHaveBeenCalledOnce();
    expect(mocks.shell.savePairing).not.toHaveBeenCalled();
  });

  it.each([
    ['SCAN_CANCELLED', 'Scansione annullata'],
    ['CAMERA_DENIED', 'Consenti la fotocamera'],
  ])(
    'per %s consente di riprovare senza salvare dati',
    async (code, message) => {
      await import('../main.ts');
      await openScanner();
      mocks.shell.scanPairingCode.mockRejectedValueOnce({ code });
      control('scan').click();
      await vi.waitFor(() =>
        expect(control('scan-message').textContent).toContain(message),
      );
      expect(control('scan').disabled).toBe(false);
      expect(mocks.shell.savePairing).not.toHaveBeenCalled();
    },
  );

  it('rifiuta un QR estraneo e lascia ripetere la scansione', async () => {
    await import('../main.ts');
    await openScanner();
    mocks.shell.scanPairingCode.mockResolvedValueOnce({
      value: 'https://example.com',
    });
    control('scan').click();
    await vi.waitFor(() =>
      expect(control('scan-message').textContent).toContain(
        'Non è un codice QR ACA valido',
      ),
    );
    expect(mocks.http.request).not.toHaveBeenCalled();
  });

  it('collega con IP dopo health ACA e lascia la registrazione alla webapp', async () => {
    await import('../main.ts');
    mocks.http.get.mockResolvedValue({ status: 200, data: { status: 'ok', version: '0.9.31' } });
    control('host').value = '192.168.1.50';
    control('wizard-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(mocks.shell.launch).toHaveBeenCalledOnce());
    expect(JSON.parse(stored!)).toEqual({ host: '192.168.1.50', port: 3002 });
    expect(mocks.http.get).toHaveBeenCalledWith(expect.objectContaining({ url: 'http://192.168.1.50:3002/api/health' }));
    expect(mocks.http.request).not.toHaveBeenCalled();
    expect(mocks.shell.savePairing).not.toHaveBeenCalled();
  });

  it('un QR di solo collegamento apre ACA senza consumare inviti account', async () => {
    await import('../main.ts');
    await openScanner();
    mocks.http.get.mockResolvedValue({ status: 200, data: { status: 'ok', version: '0.9.31' } });
    mocks.shell.scanPairingCode.mockResolvedValueOnce({ value: 'http://192.168.1.50:3002/' });
    control('scan').click();
    await vi.waitFor(() => expect(mocks.shell.launch).toHaveBeenCalledOnce());
    expect(JSON.parse(stored!)).toEqual({ host: '192.168.1.50', port: 3002 });
    expect(mocks.shell.savePairing).not.toHaveBeenCalled();
    expect(mocks.http.request).not.toHaveBeenCalled();
  });

  it('non salva un IP pubblico o una centrale senza health ACA', async () => {
    await import('../main.ts');
    control('host').value = '8.8.8.8';
    control('wizard-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(control('wizard-message').textContent).toContain('rete di casa'));
    expect(mocks.http.get).not.toHaveBeenCalled();
    mocks.http.get.mockResolvedValue({ status: 200, data: { service: 'other' } });
    control('host').value = '192.168.1.50';
    control('wizard-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(control('wizard-message').textContent).toContain('altro servizio'));
    expect(stored).toBeNull();
    expect(mocks.startup).not.toHaveBeenCalled();
  });

  it('ACCOUNT associa la casa e richiede il bundle della centrale prima del login ACA', async () => {
    await import('../main.ts');
    await chooseQr();
    control('pair-account').click();
    await vi.waitFor(() => expect(mocks.shell.launch).toHaveBeenCalledOnce());
    expect(JSON.parse(stored!)).toEqual({ host: '192.168.1.50', port: 3002 });
    expect(mocks.startup).toHaveBeenCalledWith(
      expect.objectContaining({ preferServerBundle: true }),
    );
    expect(
      JSON.parse(mocks.shell.savePairing.mock.calls[0]![0].value),
    ).toMatchObject({ mode: 'account', loginRequired: true });
  });

  it('CONFIG mantiene la propria casa già associata', async () => {
    const ownConfig = JSON.stringify({ host: '192.168.1.20', port: 3002 });
    stored = ownConfig;
    mocks.shell.scanPairingCode.mockReset().mockResolvedValue({ value: qr });
    await import('../main.ts');
    control('show-scan').click();
    await vi.waitFor(() => expect(body.dataset.view).toBe('scan'));
    await chooseQr();
    control('pair-configuration').click();
    await vi.waitFor(() => expect(mocks.shell.launch).toHaveBeenCalledTimes(2));
    expect(stored).toBe(ownConfig);
    expect(mocks.shell.saveConfig).not.toHaveBeenCalled();
  });

  it('CONFIG senza casa conserva la copia e chiede il QR Account della propria casa', async () => {
    await import('../main.ts');
    await chooseQr();
    control('pair-configuration').click();
    await vi.waitFor(() =>
      expect(control('scan-intro').textContent).toContain(
        'Account della tua casa',
      ),
    );
    expect(stored).toBeNull();
    expect(mocks.shell.launch).not.toHaveBeenCalled();
    await chooseQr();
    expect(control('pair-configuration').hidden).toBe(true);
    control('pair-account').click();
    await vi.waitFor(() => expect(mocks.shell.launch).toHaveBeenCalledOnce());
    expect(
      mocks.shell.savePairing.mock.calls.map(
        ([packet]) => JSON.parse(packet.value).mode,
      ),
    ).toEqual(['configuration', 'account']);
  });
});
