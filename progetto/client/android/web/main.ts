import {
  noticeText,
  RELEASE_REPOSITORY,
  resolveStartup,
  startupErrorText,
  submitAddress,
  WIZARD_ERROR_TEXT,
} from '../../core/src/index.ts';
import type { StartupResult } from '../../core/src/index.ts';
// Risolto dalla import map di index.html verso vendor/capacitor-core.js (nessun bundler).
import { CapacitorHttp, registerPlugin } from '@capacitor/core';
import {
  createCapacitorHttpClient,
  createPluginBundleCache,
  createPluginConfigStore,
} from './capacitorPorts.ts';
import type { AcaShellPlugin, CapacitorHttpPlugin } from './capacitorPorts.ts';

/**
 * Pagina locale del guscio Android (ADR-0023, C6): procedura guidata, attesa ed errori,
 * con la stessa grafica della pagina Windows. Se il nucleo dice «launch», il plugin avvia il
 * server locale e apre l'interfaccia in un'attività separata, senza il ponte di Capacitor.
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

const http = createCapacitorHttpClient(CapacitorHttp as unknown as CapacitorHttpPlugin, `Acasystem-client/${shellVersion} (Android)`);
const config = createPluginConfigStore(shell);
const cache = createPluginBundleCache(shell);

const setView = (view: 'loading' | 'wizard' | 'error'): void => {
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

let booting = false;
const boot = async (): Promise<void> => {
  if (booting) return;
  booting = true;
  setView('loading');
  try {
    await apply(await resolveStartup({ http, config, cache, shellVersion, repository: RELEASE_REPOSITORY }));
  } catch (error) {
    console.error('[acasystem] avvio non riuscito', error);
    showError("Qualcosa non ha funzionato all'avvio. Riprova; se succede ancora, reinstalla l'app.");
  } finally {
    booting = false;
  }
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  formMessage.textContent = 'Controllo il mini PC…';
  void submitAddress({ host: hostInput.value, port: portInput.value.trim() }, { http, config }).then((result) => {
    if (result.ok) return boot();
    formMessage.textContent = WIZARD_ERROR_TEXT[result.error];
    submitButton.disabled = false;
  });
});

byId('retry').addEventListener('click', () => void boot());
byId('change-address').addEventListener('click', () => void showWizard());

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
