/**
 * Pagina locale del guscio: procedura guidata (solo IP, porta nelle impostazioni avanzate),
 * attesa ed errori. Script classico senza import (tsconfig.renderer.json): parla solo con `window.acasystemShell`.
 */

type View = 'loading' | 'wizard' | 'error' | 'fatal';

interface PageState {
  view: View;
  shellVersion: string;
  host?: string;
  port?: string;
  message?: string;
}

interface ShellBridge {
  getState(): Promise<PageState | null>;
  onState(listener: (state: PageState) => void): void;
  submit(host: string, port: string): Promise<{ ok: boolean; message?: string }>;
  retry(): Promise<void>;
  changeAddress(): Promise<void>;
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

const render = (state: PageState): void => {
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

byId('retry').addEventListener('click', () => void bridge?.retry());
byId('change-address').addEventListener('click', () => void bridge?.changeAddress());

if (bridge) {
  bridge.onState(render);
  void bridge.getState().then((state) => state && render(state));
}
