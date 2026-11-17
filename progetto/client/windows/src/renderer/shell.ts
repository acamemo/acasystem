/** Collegamento al mini PC; registrazione e accesso sono nella webapp condivisa. */
type View = 'loading' | 'wizard' | 'error' | 'fatal';
interface PageState {
  view: View;
  shellVersion: string;
  host?: string;
  port?: string;
  message?: string;
}
interface SubmitResult { ok: boolean; message?: string }
interface ShellBridge {
  getState(): Promise<PageState | null>;
  onState(listener: (state: PageState) => void): void;
  submit(host: string, port: string): Promise<SubmitResult>;
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
const render = (state: PageState): void => {
  document.body.dataset.view = state.view;
  byId('version').textContent = `App ${state.shellVersion}`;
  if (state.view === 'loading') byId('loading-message').textContent = state.message ?? 'Avvio in corso…';
  if (state.view === 'wizard') {
    hostInput.value = state.host ?? '';
    portInput.value = state.port && state.port !== '3002' ? state.port : '';
    formMessage.textContent = state.message ?? '';
    submitButton.disabled = false;
    hostInput.focus();
  }
  if (state.view === 'error' || state.view === 'fatal') byId('error-message').textContent = state.message ?? '';
};
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!bridge) return;
  submitButton.disabled = true;
  formMessage.textContent = 'Collegamento al mini PC…';
  void bridge.submit(hostInput.value, portInput.value).then((result) => {
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
