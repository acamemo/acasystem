import {
  completeSetup,
  createOwner,
  detectMiniPc,
  inspectAddress,
  loginAdmin,
  noticeText,
  RELEASE_REPOSITORY,
  resolveStartup,
  SETUP_ERROR_TEXT,
  SETUP_STEP_TEXT,
  SETUP_STEPS,
  SetupError,
  startupErrorText,
  WIZARD_ERROR_TEXT,
} from '../../core/src/index.ts';
import type { HaSession, HomeConfig, MiniPcState, SetupStep, StartupResult, WebSocketLike } from '../../core/src/index.ts';
// Risolto dalla import map di index.html verso vendor/capacitor-core.js (nessun bundler).
import { CapacitorHttp, registerPlugin } from '@capacitor/core';
import {
  createCapacitorHaHttp,
  createCapacitorHttpClient,
  createPluginBundleCache,
  createPluginConfigStore,
} from './capacitorPorts.ts';
import type { AcaShellPlugin, CapacitorHttpPlugin } from './capacitorPorts.ts';

/**
 * Pagina locale del guscio Android (ADR-0023, C6): procedura guidata, configurazione del
 * mini PC (REP-20261026-005, S4-S5), attesa ed errori, con la stessa grafica della pagina
 * Windows. Se il nucleo dice «launch», il plugin avvia il server locale e apre l'interfaccia
 * in un'attività separata, senza il ponte di Capacitor.
 */

const shell = registerPlugin<AcaShellPlugin>('AcaShell');

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento mancante: ${id}`);
  return element as T;
};

const form = byId<HTMLFormElement>('wizard-form');
const hostInput = byId<HTMLInputElement>('host');
const portInput = byId<HTMLInputElement>('port');
const formMessage = byId<HTMLParagraphElement>('wizard-message');
const submitButton = byId<HTMLButtonElement>('submit');
const errorMessage = byId<HTMLParagraphElement>('error-message');

const { version: shellVersion } = await shell.shellVersion();
byId('version').textContent = `App ${shellVersion}`;

const userAgent = `Acasystem-client/${shellVersion} (Android)`;
const http = createCapacitorHttpClient(CapacitorHttp as unknown as CapacitorHttpPlugin, userAgent);
const haHttp = createCapacitorHaHttp(CapacitorHttp as unknown as CapacitorHttpPlugin, userAgent);
const config = createPluginConfigStore(shell);
const cache = createPluginBundleCache(shell);

type View = 'loading' | 'wizard' | 'error' | 'setup-owner' | 'setup-admin' | 'setup-home' | 'setup-progress';

const setView = (view: View): void => {
  document.body.dataset.view = view;
};

const showWizard = async (message = ''): Promise<void> => {
  const saved = await config.load();
  hostInput.value = saved?.host ?? '';
  portInput.value = saved && saved.port !== 3002 ? String(saved.port) : '';
  formMessage.textContent = message;
  submitButton.disabled = false;
  setView('wizard');
};

const showError = (message: string): void => {
  errorMessage.textContent = message;
  setView('error');
};

const apply = async (result: StartupResult): Promise<void> => {
  switch (result.kind) {
    case 'wizard':
      return showWizard();
    case 'launch':
      await shell.launch({
        version: result.version,
        serverOrigin: result.origin,
        notices: result.notices.map(noticeText),
      });
      return;
    default:
      return showError(startupErrorText(result));
  }
};

// Configurazione del mini PC: stesse schermate e stessi passi della pagina Windows.
const ownerForm = byId<HTMLFormElement>('owner-form');
const ownerName = byId<HTMLInputElement>('owner-name');
const ownerUsername = byId<HTMLInputElement>('owner-username');
const ownerPassword = byId<HTMLInputElement>('owner-password');
const ownerConfirm = byId<HTMLInputElement>('owner-confirm');
const ownerMessage = byId<HTMLParagraphElement>('owner-message');
const ownerSubmit = byId<HTMLButtonElement>('owner-submit');
const adminForm = byId<HTMLFormElement>('admin-form');
const adminUsername = byId<HTMLInputElement>('admin-username');
const adminPassword = byId<HTMLInputElement>('admin-password');
const adminMessage = byId<HTMLParagraphElement>('admin-message');
const adminSubmit = byId<HTMLButtonElement>('admin-submit');
const homeForm = byId<HTMLFormElement>('home-form');
const homeName = byId<HTMLInputElement>('home-name');
const homeCountry = byId<HTMLInputElement>('home-country');
const homeTimeZone = byId<HTMLInputElement>('home-time-zone');
const homeCurrency = byId<HTMLInputElement>('home-currency');
const homeUnits = byId<HTMLSelectElement>('home-units');
const homeSubmit = byId<HTMLButtonElement>('home-submit');
const stepList = byId<HTMLOListElement>('setup-steps');
const progressMessage = byId<HTMLParagraphElement>('progress-message');

/** Sessione di HA solo in memoria: password e token non si salvano. */
interface SetupRun {
  host: string;
  haBase: string;
  session: HaSession | null;
  steps: Record<SetupStep, 'pending' | 'running' | 'done'>;
  pendingHome: { home: HomeConfig; resolve: (home: HomeConfig) => void } | null;
  running: boolean;
}

let setup: SetupRun | null = null;
let usernameEdited = false;
const STEP_MARK = { pending: '○', running: '…', done: '✓' } as const;

const showProgress = (message = ''): void => {
  stepList.replaceChildren(
    ...SETUP_STEPS.map((step) => {
      const status = setup?.steps[step] ?? 'pending';
      const item = document.createElement('li');
      item.dataset.status = status;
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = STEP_MARK[status];
      item.append(mark, SETUP_STEP_TEXT[step]);
      return item;
    })
  );
  progressMessage.textContent = message;
  document.body.dataset.failed = message ? 'true' : 'false';
  setView('setup-progress');
};

const showSetupLogin = (state: Extract<MiniPcState, { kind: 'ha-new' | 'ha-ready' }>, host: string, message = ''): void => {
  setup = {
    host,
    haBase: state.haBase,
    session: null,
    steps: Object.fromEntries(SETUP_STEPS.map((step) => [step, 'pending'])) as SetupRun['steps'],
    pendingHome: null,
    running: false,
  };
  if (state.kind === 'ha-new') {
    ownerForm.reset();
    usernameEdited = false;
    ownerMessage.textContent = message;
    ownerSubmit.disabled = false;
    setView('setup-owner');
  } else {
    adminForm.reset();
    adminMessage.textContent = message;
    adminSubmit.disabled = false;
    setView('setup-admin');
  }
};

const setupErrorText = (error: unknown): string =>
  error instanceof SetupError ? SETUP_ERROR_TEXT[error.kind] : SETUP_ERROR_TEXT.unexpected;

let booting = false;
const boot = async (): Promise<void> => {
  if (booting) return;
  booting = true;
  setView('loading');
  try {
    const result = await resolveStartup({ http, config, cache, shellVersion, repository: RELEASE_REPOSITORY });
    if ((result.kind === 'server-unreachable' || result.kind === 'not-acasystem') && (await resumeSetup())) return;
    await apply(result);
  } catch (error) {
    console.error('[acasystem] avvio non riuscito', error);
    showError("Qualcosa non ha funzionato all'avvio. Riprova; se succede ancora, reinstalla l'app.");
  } finally {
    booting = false;
  }
};

const runSetup = async (): Promise<void> => {
  const run = setup;
  if (!run?.session || run.running) return;
  const saved = await config.load();
  if (!saved) return showWizard();
  run.running = true;
  try {
    showProgress();
    await completeSetup(
      {
        http,
        haHttp,
        socketFactory: (url) => new WebSocket(url) as unknown as WebSocketLike,
        config: saved,
        onProgress: (step, status) => {
          run.steps[step] = status;
          showProgress();
        },
        confirmHome: (home) =>
          new Promise<HomeConfig>((resolve) => {
            run.pendingHome = { home, resolve };
            homeName.value = home.location_name ?? 'Casa';
            homeCountry.value = home.country;
            homeTimeZone.value = home.time_zone;
            homeCurrency.value = home.currency;
            homeUnits.value = home.unit_system;
            homeSubmit.disabled = false;
            setView('setup-home');
          }),
      },
      run.session
    );
    setup = null;
    await boot();
  } catch (error) {
    console.error('[acasystem] configurazione non riuscita', error);
    // Con un accesso scaduto o rifiutato si torna all'accesso amministratore.
    if (error instanceof SetupError && (error.kind === 'not-admin' || error.kind === 'session-expired')) {
      return showSetupLogin({ kind: 'ha-ready', haBase: run.haBase }, run.host, setupErrorText(error));
    }
    showProgress(setupErrorText(error));
  } finally {
    run.running = false;
    run.pendingHome = null;
  }
};

/** All'avvio senza Acasystem: se all'indirizzo risponde HA, si riprende la configurazione. */
async function resumeSetup(): Promise<boolean> {
  const saved = await config.load();
  if (!saved) return false;
  const state = await detectMiniPc({ http, haHttp }, saved);
  if (state.kind !== 'ha-new' && state.kind !== 'ha-ready') return false;
  showSetupLogin(state, saved.host);
  return true;
}

const startWithSession = async (
  button: HTMLButtonElement,
  message: HTMLParagraphElement,
  login: (haBase: string) => Promise<HaSession>
): Promise<void> => {
  const run = setup;
  if (!run || run.running) return;
  button.disabled = true;
  message.textContent = 'Collegamento a Home Assistant…';
  try {
    run.session = await login(run.haBase);
  } catch (error) {
    if (error instanceof SetupError && error.kind === 'owner-exists') {
      return showSetupLogin({ kind: 'ha-ready', haBase: run.haBase }, run.host, setupErrorText(error));
    }
    message.textContent = setupErrorText(error);
    button.disabled = false;
    return;
  }
  void runSetup();
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  formMessage.textContent = 'Controllo il mini PC…';
  void inspectAddress({ host: hostInput.value, port: portInput.value.trim() }, { http, haHttp, config }).then((result) => {
    if (!result.ok) {
      formMessage.textContent = WIZARD_ERROR_TEXT[result.error];
      submitButton.disabled = false;
      return;
    }
    if (result.state.kind === 'acasystem') return boot();
    showSetupLogin(result.state, result.config.host);
  });
});

// Come HA: il nome utente si propone dal nome, finché il sistemista non lo cambia.
const suggestUsername = (name: string): string =>
  (name.trim().split(/\s+/)[0] ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
ownerName.addEventListener('input', () => {
  if (!usernameEdited) ownerUsername.value = suggestUsername(ownerName.value);
});
ownerUsername.addEventListener('input', () => {
  usernameEdited = ownerUsername.value !== '';
});

ownerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = ownerName.value.trim();
  const username = ownerUsername.value.trim();
  const password = ownerPassword.value;
  if (!name || !username || !password) {
    ownerMessage.textContent = 'Compila nome, nome utente e password.';
    return;
  }
  if (password !== ownerConfirm.value) {
    ownerMessage.textContent = 'Le due password non coincidono.';
    return;
  }
  void startWithSession(ownerSubmit, ownerMessage, (haBase) => createOwner(haHttp, haBase, { name, username, password }));
});

adminForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = adminUsername.value.trim();
  const password = adminPassword.value;
  if (!username || !password) {
    adminMessage.textContent = 'Scrivi nome utente e password.';
    return;
  }
  void startWithSession(adminSubmit, adminMessage, (haBase) => loginAdmin(haHttp, haBase, username, password));
});

homeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const pending = setup?.pendingHome;
  if (!pending || !setup) return;
  setup.pendingHome = null;
  homeSubmit.disabled = true;
  pending.resolve({
    ...pending.home,
    location_name: homeName.value.trim() || 'Casa',
    country: homeCountry.value.trim().toUpperCase(),
    time_zone: homeTimeZone.value.trim(),
    currency: homeCurrency.value.trim().toUpperCase(),
    unit_system: homeUnits.value === 'us_customary' ? 'us_customary' : 'metric',
  });
});

byId('setup-retry').addEventListener('click', () => {
  void (async () => {
    // Acasystem può essere partita nel frattempo; altrimenti si ripete dal passo mancante.
    const saved = await config.load();
    if (saved && (await detectMiniPc({ http, haHttp }, saved)).kind === 'acasystem') {
      setup = null;
      return boot();
    }
    if (setup?.session) return runSetup();
    if (!(await resumeSetup())) return boot();
  })();
});

byId('retry').addEventListener('click', () => void boot());
for (const id of ['change-address', 'owner-change-address', 'admin-change-address', 'progress-change-address']) {
  byId(id).addEventListener('click', () => void showWizard());
}

// Scorciatoia «Cambia indirizzo» con il guscio già aperto (anche sopra l'interfaccia).
const onChangeAddress = (): void => {
  void shell.consumeIntent().then(({ changeAddress }) => {
    if (changeAddress) void showWizard();
  });
};
void shell.addListener('changeAddress', onChangeAddress);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') onChangeAddress();
});

const { changeAddress } = await shell.consumeIntent();
if (changeAddress) await showWizard();
else await boot();
