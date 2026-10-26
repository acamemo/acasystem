import { app, BrowserWindow, ipcMain, Menu, Notification, session, shell } from 'electron';
import type { IpcMainInvokeEvent, MenuItemConstructorOptions } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import {
  needsBrowserReset,
  noticeText,
  RELEASE_REPOSITORY,
  resolveStartup,
  startupErrorText,
  submitAddress,
  WIZARD_ERROR_TEXT,
} from '../../core/src/index.ts';
import type { ReleaseRepository, StartupResult } from '../../core/src/index.ts';
import { createFileBundleCache, createFileConfigStore, createLastServerStore } from './fileStore.ts';
import { startLocalServer } from './localServer.ts';
import type { LocalServer } from './localServer.ts';
import { createNodeHttpClient } from './nodeHttp.ts';
import type { ShellState } from './shellState.ts';

/**
 * Guscio Windows di Acasystem (ADR-0023, C5). All'avvio decide con il nucleo: procedura
 * guidata, pagina d'errore oppure l'interfaccia scaricata, servita dal server locale.
 * Niente kiosk (Q-A9): finestra normale, ingrandita; F11 per lo schermo intero.
 */

/** Porta fissa: l'origine non cambia tra un avvio e l'altro, quindi la sessione resta. */
const DEFAULT_LOCAL_PORT = 47_320;

// Sostituzioni solo per le prove dai sorgenti: l'app installata le ignora.
const testEnv = (name: string): string | undefined => (app.isPackaged ? undefined : process.env[name]);
const testDataDir = testEnv('ACASYSTEM_CLIENT_DATA_DIR');
if (testDataDir) app.setPath('userData', testDataDir);
const localPort = Number(testEnv('ACASYSTEM_CLIENT_PORT') ?? DEFAULT_LOCAL_PORT);
const testReleases = testEnv('ACASYSTEM_CLIENT_TEST_RELEASES');
const repository: ReleaseRepository = testReleases
  ? { ...RELEASE_REPOSITORY, webBase: testReleases, apiBase: `${testReleases}/api` }
  : RELEASE_REPOSITORY;

const shellDir = fileURLToPath(new URL('../../../shell/', import.meta.url));
const shellPage = join(shellDir, 'index.html');
const shellUrlPrefix = pathToFileURL(shellDir).href;
const preload = fileURLToPath(new URL('./preload.cjs', import.meta.url));

const shellVersion = app.getVersion();
/** Segno dell'app nello user agent e indirizzo del pulsante «Cambia indirizzo» di Acasystem. */
const CLIENT_SHELL_TOKEN = `AcasystemShell/${shellVersion}`;
const CHANGE_ADDRESS_URL = 'acasystem://change-address';
const http = createNodeHttpClient(`Acasystem-client/${shellVersion} (Windows)`);
const config = createFileConfigStore(app.getPath('userData'));
const cache = createFileBundleCache(app.getPath('userData'));
const lastServer = createLastServerStore(app.getPath('userData'));

let window: BrowserWindow | null = null;
let localServer: LocalServer | null = null;
let state: ShellState = { view: 'loading', shellVersion };
let booting = false;

const showShell = async (next: ShellState): Promise<void> => {
  state = next;
  localServer?.setTarget(null);
  if (!window) return;
  if (window.webContents.getURL().startsWith(shellUrlPrefix)) window.webContents.send('shell:state', state);
  else await window.loadFile(shellPage);
};

const showWizard = async (error?: string): Promise<void> => {
  const saved = await config.load();
  await showShell({
    view: 'wizard',
    shellVersion,
    host: saved?.host ?? '',
    port: saved ? String(saved.port) : '',
    ...(error ? { message: error } : {}),
  });
};

const notify = (texts: string[]): void => {
  if (!Notification.isSupported()) return;
  for (const body of texts) new Notification({ title: 'Acasystem', body }).show();
};

const applyResult = async (result: StartupResult): Promise<void> => {
  switch (result.kind) {
    case 'wizard':
      return showWizard();
    case 'launch': {
      if (!localServer || !window) return;
      // Altro mini PC: sessione, localStorage, cache e service worker del precedente non servono.
      if (needsBrowserReset(await lastServer.load(), result.origin)) {
        await session.defaultSession.clearStorageData({ origin: localServer.origin });
        await session.defaultSession.clearCache();
      }
      await lastServer.save(result.origin);
      localServer.setTarget({ bundleDir: cache.directoryOf(result.version), serverOrigin: result.origin });
      await window.loadURL(`${localServer.origin}/`);
      notify(result.notices.map(noticeText));
      return;
    }
    default:
      return showShell({ view: 'error', shellVersion, message: startupErrorText(result) });
  }
};

const boot = async (): Promise<void> => {
  if (booting) return;
  booting = true;
  try {
    await showShell({ view: 'loading', shellVersion });
    await applyResult(await resolveStartup({ http, config, cache, shellVersion, repository }));
  } catch (error) {
    console.error('[acasystem] avvio non riuscito', error);
    await showShell({
      view: 'error',
      shellVersion,
      message: "Qualcosa non ha funzionato all'avvio. Riprova; se succede ancora, reinstalla l'app.",
    });
  } finally {
    booting = false;
  }
};

/** Le funzioni del guscio rispondono solo alle sue pagine locali, non all'interfaccia scaricata. */
const fromShell = (event: IpcMainInvokeEvent): boolean =>
  event.senderFrame?.url.startsWith(shellUrlPrefix) === true;

const registerIpc = (): void => {
  ipcMain.handle('shell:get-state', (event) => (fromShell(event) ? state : null));
  ipcMain.handle('shell:submit', async (event, host: unknown, port: unknown) => {
    if (!fromShell(event) || typeof host !== 'string' || (port !== undefined && typeof port !== 'string')) {
      return { ok: false, message: WIZARD_ERROR_TEXT['not-ipv4'] };
    }
    const result = await submitAddress({ host, ...(port ? { port } : {}) }, { http, config });
    if (!result.ok) return { ok: false, message: WIZARD_ERROR_TEXT[result.error] };
    void boot();
    return { ok: true };
  });
  ipcMain.handle('shell:retry', (event) => {
    if (fromShell(event)) void boot();
  });
  ipcMain.handle('shell:change-address', (event) => {
    if (fromShell(event)) void showWizard();
  });
};

const buildMenu = (): void => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Acasystem',
      submenu: [
        { label: 'Cambia indirizzo…', click: () => void showWizard() },
        { label: 'Ricarica', accelerator: 'F5', click: () => void boot() },
        { type: 'separator' },
        { label: 'Schermo intero', role: 'togglefullscreen', accelerator: 'F11' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' } as MenuItemConstructorOptions]),
        { type: 'separator' },
        { label: 'Esci', role: 'quit' },
      ],
    },
    {
      label: 'Modifica',
      submenu: [
        { label: 'Taglia', role: 'cut' },
        { label: 'Copia', role: 'copy' },
        { label: 'Incolla', role: 'paste' },
        { label: 'Seleziona tutto', role: 'selectAll' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

/** Dentro la finestra solo il guscio e l'interfaccia locale; i link esterni nel browser. */
const isInternal = (url: string): boolean =>
  url.startsWith(shellUrlPrefix) || (localServer !== null && url.startsWith(`${localServer.origin}/`));

const openOutside = (url: string): void => {
  if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
};

const createWindow = (): BrowserWindow => {
  const created = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 480,
    show: false,
    title: 'Acasystem',
    backgroundColor: '#f6f6f6',
    autoHideMenuBar: true,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });
  created.once('ready-to-show', () => {
    created.maximize();
    created.show();
  });
  created.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: 'deny' };
  });
  // L'interfaccia riconosce l'app dallo user agent e mostra «Cambia indirizzo» (utils/clientShell.ts).
  created.webContents.setUserAgent(`${created.webContents.getUserAgent()} ${CLIENT_SHELL_TOKEN} (Windows)`);
  created.webContents.on('will-navigate', (event, url) => {
    if (isInternal(url)) return;
    event.preventDefault();
    if (url.startsWith(CHANGE_ADDRESS_URL)) void showWizard();
    else openOutside(url);
  });
  created.webContents.on('will-attach-webview', (event) => event.preventDefault());
  created.on('closed', () => {
    window = null;
  });
  return created;
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.on('window-all-closed', () => app.quit());

  app.on('will-quit', () => {
    void localServer?.close();
  });

  void app.whenReady().then(async () => {
    app.setAppUserModelId('it.acasystem.client');
    // Permessi del browser: solo schermo intero e copia negli appunti.
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) =>
      callback(permission === 'fullscreen' || permission === 'clipboard-sanitized-write')
    );
    registerIpc();
    buildMenu();
    window = createWindow();
    try {
      localServer = await startLocalServer(localPort);
    } catch (error) {
      console.error('[acasystem] porta locale occupata', error);
      await showShell({
        view: 'fatal',
        shellVersion,
        message: `La porta ${localPort} di questo PC è già in uso: forse Acasystem è aperta da un altro utente. Chiudi l'altra finestra e riapri l'app.`,
      });
      return;
    }
    await boot();
  });
}

