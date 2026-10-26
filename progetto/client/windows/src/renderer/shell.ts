/**
 * Pagina locale del guscio: procedura guidata (solo IP, porta nelle impostazioni avanzate),
 * configurazione del mini PC (proprietario o amministratore di HA, dati della casa, avanzamento),
 * attesa ed errori. Script classico senza import (tsconfig.renderer.json): parla solo con `window.acasystemShell`.
 */

type View = 'loading' | 'wizard' | 'error' | 'fatal' | 'setup-owner' | 'setup-admin' | 'setup-home' | 'setup-progress';

interface HomeView {
  location_name?: string;
  country: string;
  currency: string;
  time_zone: string;
  unit_system: 'metric' | 'us_customary';
  latitude?: number;
  longitude?: number;
}

interface PageState {
  view: View;
  shellVersion: string;
  host?: string;
  port?: string;
  message?: string;
  home?: HomeView;
  steps?: { label: string; status: 'pending' | 'running' | 'done' }[];
}

interface SubmitResult {
  ok: boolean;
  message?: string;
}

interface ShellBridge {
  getState(): Promise<PageState | null>;
  onState(listener: (state: PageState) => void): void;
  submit(host: string, port: string): Promise<SubmitResult>;
  retry(): Promise<void>;
  changeAddress(): Promise<void>;
  setupOwner(owner: { name: string; username: string; password: string }): Promise<SubmitResult>;
  setupAdmin(username: string, password: string): Promise<SubmitResult>;
  setupHome(home: HomeView): Promise<void>;
  setupRetry(): Promise<void>;
}

const bridge = (window as unknown as { acasystemShell?: ShellBridge }).acasystemShell;

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

let currentView: View | null = null;
let currentHome: HomeView | null = null;

const STEP_MARK = { pending: '○', running: '…', done: '✓' } as const;

const render = (state: PageState): void => {
  const entering = state.view !== currentView;
  currentView = state.view;
  document.body.dataset.view = state.view;
  byId('version').textContent = `App ${state.shellVersion}`;
  if (state.view === 'wizard') {
    hostInput.value = state.host ?? '';
    portInput.value = state.port && state.port !== '3002' ? state.port : '';
    formMessage.textContent = state.message ?? '';
    submitButton.disabled = false;
    hostInput.focus();
  }
  if (state.view === 'error' || state.view === 'fatal') errorMessage.textContent = state.message ?? '';
  if (state.view === 'setup-owner' && entering) {
    ownerForm.reset();
    ownerMessage.textContent = state.message ?? '';
    ownerSubmit.disabled = false;
    ownerName.focus();
  }
  if (state.view === 'setup-admin' && entering) {
    adminForm.reset();
    adminMessage.textContent = state.message ?? '';
    adminSubmit.disabled = false;
    adminUsername.focus();
  }
  if (state.view === 'setup-home' && state.home) {
    currentHome = state.home;
    homeName.value = state.home.location_name ?? 'Casa';
    homeCountry.value = state.home.country;
    homeTimeZone.value = state.home.time_zone;
    homeCurrency.value = state.home.currency;
    homeUnits.value = state.home.unit_system;
    homeSubmit.disabled = false;
    homeName.focus();
  }
  if (state.view === 'setup-progress') {
    stepList.replaceChildren(
      ...(state.steps ?? []).map((step) => {
        const item = document.createElement('li');
        item.dataset.status = step.status;
        const mark = document.createElement('span');
        mark.className = 'mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = STEP_MARK[step.status];
        item.append(mark, step.label);
        return item;
      })
    );
    progressMessage.textContent = state.message ?? '';
    document.body.dataset.failed = state.message ? 'true' : 'false';
  }
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!bridge) return;
  submitButton.disabled = true;
  formMessage.textContent = 'Controllo il mini PC…';
  void bridge.submit(hostInput.value, portInput.value.trim()).then((result) => {
    if (result.ok) return;
    formMessage.textContent = result.message ?? '';
    submitButton.disabled = false;
    hostInput.focus();
  });
});

// Come HA: il nome utente si propone dal nome, finché il sistemista non lo cambia.
let usernameEdited = false;
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
ownerForm.addEventListener('reset', () => {
  usernameEdited = false;
});

const sendLogin = (
  button: HTMLButtonElement,
  message: HTMLParagraphElement,
  focus: HTMLInputElement,
  send: () => Promise<SubmitResult>
): void => {
  button.disabled = true;
  message.textContent = 'Collegamento a Home Assistant…';
  void send().then((result) => {
    if (result.ok) return;
    message.textContent = result.message ?? '';
    button.disabled = false;
    focus.focus();
  });
};

ownerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!bridge) return;
  const name = ownerName.value.trim();
  const username = ownerUsername.value.trim();
  if (!name || !username || !ownerPassword.value) {
    ownerMessage.textContent = 'Compila nome, nome utente e password.';
    return;
  }
  if (ownerPassword.value !== ownerConfirm.value) {
    ownerMessage.textContent = 'Le due password non coincidono.';
    ownerConfirm.focus();
    return;
  }
  const password = ownerPassword.value;
  sendLogin(ownerSubmit, ownerMessage, ownerPassword, () => bridge.setupOwner({ name, username, password }));
});

adminForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!bridge) return;
  const username = adminUsername.value.trim();
  if (!username || !adminPassword.value) {
    adminMessage.textContent = 'Scrivi nome utente e password.';
    return;
  }
  const password = adminPassword.value;
  sendLogin(adminSubmit, adminMessage, adminPassword, () => bridge.setupAdmin(username, password));
});

homeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!bridge || !currentHome) return;
  homeSubmit.disabled = true;
  void bridge.setupHome({
    ...currentHome,
    location_name: homeName.value.trim() || 'Casa',
    country: homeCountry.value.trim(),
    time_zone: homeTimeZone.value.trim(),
    currency: homeCurrency.value.trim(),
    unit_system: homeUnits.value === 'us_customary' ? 'us_customary' : 'metric',
  });
});

byId('retry').addEventListener('click', () => void bridge?.retry());
byId('setup-retry').addEventListener('click', () => void bridge?.setupRetry());
for (const id of ['change-address', 'owner-change-address', 'admin-change-address', 'progress-change-address']) {
  byId(id).addEventListener('click', () => void bridge?.changeAddress());
}

if (bridge) {
  bridge.onState(render);
  void bridge.getState().then((state) => state && render(state));
}
