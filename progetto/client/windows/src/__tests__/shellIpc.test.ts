// @vitest-environment node
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => any>(),
  events: new Map<string, (...args: any[]) => any>(),
  frame: { url: '' },
  dataDirectory: 'C:/ACA/default-profile',
  app: {
    isPackaged: false,
    setPath: vi.fn(),
    getPath: vi.fn(),
    getVersion: vi.fn(),
    requestSingleInstanceLock: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
    whenReady: vi.fn(),
    setAppUserModelId: vi.fn(),
  },
  web: {
    getURL: vi.fn(),
    send: vi.fn(),
    setWindowOpenHandler: vi.fn(),
    getUserAgent: vi.fn(),
    setUserAgent: vi.fn(),
    on: vi.fn(),
  },
  window: {
    once: vi.fn(),
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    on: vi.fn(),
    maximize: vi.fn(),
    show: vi.fn(),
    isMinimized: vi.fn(),
    restore: vi.fn(),
    focus: vi.fn(),
  },
  browserOptions: vi.fn(),
  openExternal: vi.fn(),
  startServer: vi.fn(),
  setTarget: vi.fn(),
  closeServer: vi.fn(),
  config: { load: vi.fn(), save: vi.fn() },
  engine: {
    enabled: vi.fn(),
    enable: vi.fn(),
    ensureStarted: vi.fn(),
    pairingEndpoint: vi.fn(),
  },
  createEngine: vi.fn(),
  bootstrap: vi.fn(),
  startup: vi.fn(),
}));
vi.mock('electron', () => ({
  app: m.app,
  BrowserWindow: function (options: unknown) {
    m.browserOptions(options);
    return { ...m.window, webContents: { ...m.web, mainFrame: m.frame } };
  },
  ipcMain: {
    handle: (channel: string, handler: (...args: any[]) => any) =>
      m.handlers.set(channel, handler),
  },
  Menu: { buildFromTemplate: vi.fn(), setApplicationMenu: vi.fn() },
  Notification: { isSupported: () => false },
  session: {
    defaultSession: {
      setPermissionRequestHandler: vi.fn(),
      clearStorageData: vi.fn(),
      clearCache: vi.fn(),
    },
  },
  shell: { openExternal: m.openExternal },
}));
vi.mock('../fileStore.ts', () => ({
  createFileConfigStore: () => m.config,
  createFileBundleCache: () => ({ directoryOf: () => 'C:/ACA/bundle' }),
  createLastServerStore: () => ({ load: async () => null, save: vi.fn() }),
}));
vi.mock('../nodeHttp.ts', () => ({
  createNodeHttpClient: () => ({}),
  createNodeHaHttp: () => ({}),
}));
vi.mock('../localServer.ts', () => ({ startLocalServer: m.startServer }));
vi.mock('../engine/localAppBootstrap.ts', () => ({
  bootstrapLocalApp: m.bootstrap,
}));
vi.mock('../engine/localEngine.ts', async (original) => ({
  ...(await original<typeof import('../engine/localEngine.ts')>()),
  createLocalEngine: m.createEngine,
}));
vi.mock('../../../core/src/index.ts', async (original) => ({
  ...(await original<typeof import('../../../core/src/index.ts')>()),
  resolveStartup: m.startup,
}));

const origin = 'http://127.0.0.1:47978';
const resourcesDescriptor = Object.getOwnPropertyDescriptor(
  process,
  'resourcesPath',
);
const invoke = (channel: string, senderFrame: { url: string } | undefined) =>
  m.handlers.get(channel)!({ senderFrame });
const loadMain = async (): Promise<string> => {
  await import('../main.ts');
  await vi.waitFor(() => {
    const page = m.window.loadFile.mock.calls[0]?.[0] as string | undefined;
    expect(page).toBeTruthy();
    expect(
      m.handlers.get('shell:get-state')!({
        senderFrame: { url: pathToFileURL(page!).href },
      })?.view,
    ).toBe('wizard');
  });
  return pathToFileURL(m.window.loadFile.mock.calls[0]![0]).href;
};

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  m.handlers.clear();
  m.events.clear();
  m.app.isPackaged = false;
  m.dataDirectory = 'C:/ACA/default-profile';
  m.frame.url = '';
  Object.defineProperty(process, 'resourcesPath', {
    configurable: true,
    value: 'C:/ACA/installed/resources',
  });
  vi.stubEnv('ACASYSTEM_CLIENT_DATA_DIR', 'C:/ACA/test-profile');
  vi.stubEnv('ACASYSTEM_CLIENT_PORT', '47978');
  vi.stubEnv('ACASYSTEM_CLIENT_TEST_RELEASES', 'http://127.0.0.1:47979');
  vi.stubEnv('ACASYSTEM_CLIENT_NO_NOTIFICATIONS', '1');
  m.app.setPath.mockImplementation((_name: string, value: string) => {
    m.dataDirectory = value;
  });
  m.app.getPath.mockImplementation(() => m.dataDirectory);
  m.app.getVersion.mockReturnValue('0.1.0');
  m.app.requestSingleInstanceLock.mockReturnValue(true);
  m.app.whenReady.mockResolvedValue(undefined);
  m.app.on.mockImplementation(
    (event: string, handler: (...args: any[]) => any) =>
      m.events.set(event, handler),
  );
  m.web.getURL.mockImplementation(() => m.frame.url);
  m.web.getUserAgent.mockReturnValue('Electron');
  m.window.loadFile.mockImplementation(async (file: string) => {
    m.frame.url = pathToFileURL(file).href;
  });
  m.window.loadURL.mockImplementation(async (url: string) => {
    m.frame.url = url;
  });
  m.startServer.mockResolvedValue({
    origin,
    setTarget: m.setTarget,
    close: m.closeServer,
  });
  m.config.load.mockResolvedValue(null);
  m.engine.enabled.mockResolvedValue(false);
  m.engine.enable.mockResolvedValue(undefined);
  m.engine.ensureStarted.mockResolvedValue({
    vmUuid: 'owned-vm',
    vboxManagePath: 'D:/CustomVBox/VBoxManage.exe',
  });
  m.engine.pairingEndpoint.mockResolvedValue('http://192.168.1.20:3002');
  m.createEngine.mockReturnValue(m.engine);
  m.bootstrap.mockResolvedValue({ kind: 'prepared' });
  m.startup.mockResolvedValue({ kind: 'wizard' });
});
afterEach(() => {
  vi.unstubAllEnvs();
  if (resourcesDescriptor)
    Object.defineProperty(process, 'resourcesPath', resourcesDescriptor);
  else Reflect.deleteProperty(process, 'resourcesPath');
});

describe('IPC Windows e separazione dal motore', () => {
  it('al primo avvio non prepara né avvia il motore o una UI HA', async () => {
    await loadMain();
    expect(m.engine.enable).not.toHaveBeenCalled();
    expect(m.engine.ensureStarted).not.toHaveBeenCalled();
    expect(m.bootstrap).not.toHaveBeenCalled();
    expect(m.window.loadURL).not.toHaveBeenCalled();
    expect(m.openExternal).not.toHaveBeenCalled();
    expect(m.browserOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        webPreferences: expect.objectContaining({
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
        }),
      }),
    );
  });

  it('solo il main frame della UI ACA legge l’endpoint; altri frame/origini non interrogano il motore', async () => {
    const fileUrl = await loadMain();
    for (const sender of [
      undefined,
      { url: `${origin}/` },
      { url: 'http://127.0.0.1:8123/' },
      { url: fileUrl },
    ]) {
      expect(await invoke('shell:pairing-endpoint', sender)).toEqual({
        endpoint: null,
      });
    }
    for (const address of [
      'http://127.0.0.1:8123/',
      'http://127.0.0.1:47979/',
      `${origin}.evil.test/`,
    ]) {
      m.frame.url = address;
      expect(await invoke('shell:pairing-endpoint', m.frame)).toEqual({
        endpoint: null,
      });
    }
    expect(m.engine.pairingEndpoint).not.toHaveBeenCalled();
    m.config.load.mockResolvedValue({ host: '192.168.1.20', port: 3002 });
    m.frame.url = `${origin}/`;
    expect(await invoke('shell:pairing-endpoint', m.frame)).toEqual({
      endpoint: 'http://192.168.1.20:3002',
    });
    expect(m.engine.pairingEndpoint).not.toHaveBeenCalled();
  });

  it('non espone più comandi di registrazione o attivazione VM', async () => {
    await loadMain();
    for (const channel of ['shell:prepare-local-pc', 'shell:setup-owner', 'shell:setup-admin', 'shell:setup-home', 'shell:setup-retry']) {
      expect(m.handlers.has(channel)).toBe(false);
    }
    expect(m.createEngine).not.toHaveBeenCalled();
  });

  it('ignora il vecchio flag locale e chiede il mini PC se era salvato il loopback', async () => {
    m.engine.enabled.mockResolvedValue(true);
    m.config.load.mockResolvedValue({ host: '127.0.0.1', port: 3002 });
    await loadMain();
    expect(m.createEngine).not.toHaveBeenCalled();
    expect(m.engine.enabled).not.toHaveBeenCalled();
    expect(m.engine.ensureStarted).not.toHaveBeenCalled();
    expect(m.bootstrap).not.toHaveBeenCalled();
    expect(m.startup).not.toHaveBeenCalled();
    expect(m.config.save).not.toHaveBeenCalled();
  });

  it('l’app installata ignora le sostituzioni di prova e preferisce il bundle del mini PC', async () => {
    m.app.isPackaged = true;
    await loadMain();
    expect(m.app.setPath).not.toHaveBeenCalled();
    expect(m.startServer).toHaveBeenCalledWith(47320);
    expect(m.createEngine).not.toHaveBeenCalled();
    expect(m.startup).toHaveBeenCalledWith(expect.objectContaining({
      repository: { owner: 'acamemo', repo: 'acasystem-releases' }, preferServerBundle: true,
    }));
  });

  it('chiudere ACA chiude il proxy e non invia uno stop alla VM', async () => {
    await loadMain();
    m.events.get('window-all-closed')!();
    expect(m.app.quit).toHaveBeenCalledOnce();
    m.events.get('will-quit')!();
    expect(m.closeServer).toHaveBeenCalledOnce();
    expect(m.engine.ensureStarted).not.toHaveBeenCalled();
    expect(m.bootstrap).not.toHaveBeenCalled();
  });
});
