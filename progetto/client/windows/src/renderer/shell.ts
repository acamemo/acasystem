/** Collegamento al mini PC e preparazione della centrale su questo PC; accesso e registrazione sono nella webapp. */
type View = 'loading' | 'wizard' | 'setup' | 'error' | 'fatal';
// Solo tipi: nessuna importazione, perché questo file è uno script classico della pagina.
type SetupPhase = import('../setup/types.ts').SetupPhase;
type SetupCheck = import('../setup/types.ts').SetupCheck;
type PrepStep = import('../setup/types.ts').PrepStep;
type DownloadProgress = import('../setup/types.ts').DownloadProgress;
interface PageState {
  view: View;
  shellVersion: string;
  host?: string;
  port?: string;
  message?: string;
  setup?: SetupPhase;
}
interface SubmitResult { ok: boolean; message?: string }
interface ShellBridge {
  getState(): Promise<PageState | null>;
  onState(listener: (state: PageState) => void): void;
  submit(host: string, port: string): Promise<SubmitResult>;
  retry(): Promise<void>;
  changeAddress(): Promise<void>;
  setupChecks(): Promise<void>;
  setupStart(): Promise<void>;
  setupCancel(): Promise<void>;
  setupRetry(): Promise<void>;
  setupUseExisting(): Promise<void>;
  setupNew(): Promise<void>;
  setupOpen(): Promise<SubmitResult>;
  openVirtualBoxDownload(): Promise<void>;
  minimize(): Promise<void>;
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

// ---- Preparazione della centrale -------------------------------------------------------------

type RowStatus = 'ok' | 'missing' | 'warning' | 'checking' | 'active' | 'pending';
interface RowData { label: string; status: RowStatus; detail?: string }

const ROW_STATUS_TEXT: Record<RowStatus, string> = {
  ok: 'Fatto',
  missing: 'Da sistemare',
  warning: 'Attenzione',
  checking: 'Controllo in corso',
  active: 'In corso',
  pending: 'In attesa',
};
const CHECK_LABELS: Record<SetupCheck['id'], string> = {
  virtualbox: 'VirtualBox',
  hardware: 'Memoria e processore',
  disk: 'Spazio sul disco',
  network: 'Rete di casa',
  internet: 'Internet',
};
const CHECK_ORDER: SetupCheck['id'][] = ['virtualbox', 'hardware', 'disk', 'network', 'internet'];
const STEP_LABELS: Record<PrepStep['id'], string> = {
  disk: 'Disco controllato',
  vm: 'Centrale accesa',
  core: 'Download di Home Assistant',
  aca: 'Installazione di Acasystem',
  qr: 'Codice QR per telefono e tablet',
};
const FAILED_TITLES: Record<Extract<SetupPhase, { phase: 'failed' }>['step'], string> = {
  checks: 'Controlli non riusciti',
  download: 'Download interrotto',
  verify: 'Il disco non è valido',
  creating: 'La centrale non è stata creata',
  preparing: 'La centrale non è pronta',
};

const rowTemplate = byId<HTMLTemplateElement>('tpl-row');
const fillRows = (list: HTMLElement, rows: RowData[]): void => {
  list.replaceChildren(
    ...rows.map((row) => {
      const item = (rowTemplate.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
      item.dataset.status = row.status;
      (item.querySelector('.row-label') as HTMLElement).textContent = row.label;
      (item.querySelector('.row-detail') as HTMLElement).textContent = row.detail ?? '';
      (item.querySelector('.row-status') as HTMLElement).textContent = ROW_STATUS_TEXT[row.status];
      return item;
    }),
  );
};

const panels = Array.from(document.querySelectorAll<HTMLElement>('.sp'));
const stepper = byId<HTMLOListElement>('stepper');
const stepItems = Array.from(stepper.querySelectorAll<HTMLElement>('.st'));
const setupTitle = byId<HTMLHeadingElement>('sp-title');
const setupSub = byId<HTMLParagraphElement>('sp-sub');
const hint = byId<HTMLParagraphElement>('welcome-hint');
const startButton = byId<HTMLButtonElement>('setup-start');
const recheckButton = byId<HTMLButtonElement>('setup-recheck');
const vboxRecheck = byId<HTMLButtonElement>('vbox-recheck');
const vboxDownload = byId<HTMLButtonElement>('vbox-download');
const dlPercent = byId<HTMLElement>('dl-percent');
const dlEta = byId<HTMLElement>('dl-eta');
const dlBar = byId<HTMLElement>('dl-bar');
const dlFill = byId<HTMLElement>('dl-fill');
const dlBytes = byId<HTMLElement>('dl-bytes');
const dlLive = byId<HTMLElement>('dl-live');
const dlNotes = byId<HTMLElement>('dl-notes');
const dlNoteResume = byId<HTMLElement>('dl-note-resume');
const dlActions = byId<HTMLElement>('dl-actions');
const prepElapsed = byId<HTMLElement>('prep-elapsed');
const readyQr = byId<HTMLElement>('ready-qr');
const readyMessage = byId<HTMLElement>('ready-message');
const openButton = byId<HTMLButtonElement>('setup-open');
const failedRetry = byId<HTMLButtonElement>('failed-retry');

const RESUME_NOTE = 'Se la connessione cade, riprendo da dove mi ero fermato.';
let activePanel = '';
/** Durante un nuovo controllo si resta nella vista «Manca VirtualBox» per non far lampeggiare la pagina. */
let vboxPanelShown = false;
let lastLivePercent = -1;
let elapsedTimer: number | undefined;

const showPanel = (name: string): void => {
  for (const panel of panels) panel.classList.toggle('is-active', panel.dataset.sp === name);
  if (name !== activePanel) {
    activePanel = name;
    // Chi usa lo screen reader sente il nuovo titolo; la tastiera riparte dall'inizio della vista.
    setupTitle.tabIndex = -1;
    setupTitle.focus({ preventScroll: true });
  }
};

const setTexts = (title: string, sub: string): void => {
  setupTitle.textContent = title;
  setupSub.textContent = sub;
};

/** 1 = scarico, 2 = preparo, 3 = pronta; 4 = tutti completati; 0 = indicatore nascosto. */
const setStepper = (current: 0 | 1 | 2 | 3 | 4): void => {
  stepper.hidden = current === 0;
  for (const item of stepItems) {
    const step = Number(item.dataset.step);
    item.dataset.state = step < current ? 'done' : step === current ? 'current' : 'todo';
    if (step === current) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  }
};

const formatEta = (seconds: number | null): string => {
  if (seconds === null || !Number.isFinite(seconds)) return 'calcolo del tempo…';
  if (seconds < 60) return 'meno di un minuto';
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? 'circa 1 minuto' : `circa ${minutes} minuti`;
};

const megabytes = (bytes: number): string => `${Math.round(bytes / 1_000_000)} MB`;

const renderWelcome = (phase: Extract<SetupPhase, { phase: 'welcome' }>): void => {
  const byCheck = new Map(phase.checks.map((check) => [check.id, check]));
  const checking = phase.checking || phase.checks.length === 0;
  const rows: RowData[] = CHECK_ORDER.map((id) => {
    const check = byCheck.get(id);
    if (checking || !check) return { label: CHECK_LABELS[id], status: 'checking' };
    return { label: CHECK_LABELS[id], status: check.status, detail: check.detail };
  });
  const anyMissing = !checking && phase.checks.some((check) => check.status === 'missing');
  if (!checking) vboxPanelShown = byCheck.get('virtualbox')?.status === 'missing';
  setStepper(0);
  if (vboxPanelShown) {
    setTexts('Manca VirtualBox', 'Serve per far funzionare la centrale su questo PC. È gratuito e si installa in pochi minuti.');
    fillRows(byId('vbox-checks'), rows);
    vboxRecheck.disabled = checking;
    vboxDownload.disabled = false;
    showPanel('virtualbox');
    return;
  }
  setTexts('Benvenuto in Acasystem', 'Prepariamo la centrale di casa su questo PC.');
  fillRows(byId('welcome-checks'), rows);
  startButton.disabled = checking || anyMissing;
  recheckButton.hidden = !anyMissing;
  hint.hidden = !anyMissing;
  showPanel('welcome');
};

const renderProgress = (phase: Extract<SetupPhase, { phase: 'download' | 'verify' | 'creating' }>): void => {
  setStepper(1);
  const download = phase.phase === 'download';
  dlPercent.hidden = dlEta.hidden = dlBytes.hidden = dlNotes.hidden = dlActions.hidden = !download;
  dlBar.classList.toggle('is-indeterminate', !download);
  if (phase.phase === 'verify') {
    setTexts('Controllo il disco scaricato…', 'Ci vuole qualche istante.');
  } else if (phase.phase === 'creating') {
    setTexts('Preparo la centrale…', 'Creo la macchina della centrale su questo PC.');
  } else {
    setTexts('Scarico la centrale', 'È il sistema che gestirà la casa: circa 600 MB.');
  }
  if (phase.phase === 'download') renderDownload(phase.progress);
  else {
    dlBar.removeAttribute('aria-valuenow');
    dlBar.setAttribute('aria-busy', 'true');
    dlFill.style.width = '';
  }
  showPanel('progress');
};

const renderDownload = (progress: DownloadProgress): void => {
  const percent = progress.totalBytes > 0
    ? Math.min(100, Math.max(0, Math.floor((progress.receivedBytes / progress.totalBytes) * 100)))
    : 0;
  dlPercent.textContent = `${percent}%`;
  dlEta.textContent = formatEta(progress.etaSeconds);
  dlBar.setAttribute('aria-valuenow', String(percent));
  dlBar.removeAttribute('aria-busy');
  dlFill.style.width = `${percent}%`;
  dlBytes.textContent = `${megabytes(progress.receivedBytes)} di ${megabytes(progress.totalBytes)}`;
  dlNoteResume.textContent = progress.attempt > 1 ? `Connessione ripresa (tentativo ${progress.attempt})` : RESUME_NOTE;
  // L'annuncio vocale cambia a ogni 10%: non a ogni aggiornamento della barra.
  const decade = Math.floor(percent / 10);
  if (decade !== lastLivePercent) {
    lastLivePercent = decade;
    dlLive.textContent = `Scaricato il ${decade * 10}%`;
  }
};

const elapsedText = (startedAt: number): string => {
  const minutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60_000));
  return minutes === 0 ? 'Appena avviata' : `Trascorsi ${minutes} min`;
};

const stopElapsedTimer = (): void => {
  if (elapsedTimer !== undefined) window.clearInterval(elapsedTimer);
  elapsedTimer = undefined;
};

const renderPreparing = (phase: Extract<SetupPhase, { phase: 'preparing' }>): void => {
  setStepper(2);
  setTexts('La centrale si sta preparando', 'Al primo avvio scarica Home Assistant e Acasystem. Di solito servono 15-30 minuti.');
  fillRows(byId('prep-steps'), phase.steps.map((step): RowData => ({
    label: STEP_LABELS[step.id],
    status: step.state === 'done' ? 'ok' : step.state === 'active' ? 'active' : 'pending',
    detail: step.detail ?? (step.state === 'active' ? 'in corso' : undefined),
  })));
  const update = (): void => { prepElapsed.textContent = elapsedText(phase.startedAt); };
  update();
  stopElapsedTimer();
  elapsedTimer = window.setInterval(update, 60_000);
  showPanel('preparing');
};

const SVG_NS = 'http://www.w3.org/2000/svg';
/** QR come SVG: moduli neri su bianco con margine di 4 moduli; costruito con il DOM, mai con innerHTML. */
const buildQrSvg = (modules: boolean[][]): SVGSVGElement => {
  const size = modules.length;
  const quiet = 4;
  const total = size + quiet * 2;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Codice QR per collegare telefono o tablet');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const background = document.createElementNS(SVG_NS, 'rect');
  background.setAttribute('width', String(total));
  background.setAttribute('height', String(total));
  background.setAttribute('fill', '#ffffff');
  const path = document.createElementNS(SVG_NS, 'path');
  let data = '';
  modules.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) data += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  }));
  path.setAttribute('d', data);
  path.setAttribute('fill', '#000000');
  svg.append(background, path);
  return svg;
};

const renderReady = (phase: Extract<SetupPhase, { phase: 'ready' }>): void => {
  setStepper(4);
  const minutes = phase.elapsedMinutes;
  setTexts(
    'La centrale è pronta',
    minutes < 1 ? 'Ci è voluto meno di un minuto.' : minutes === 1 ? 'Ci è voluto 1 minuto.' : `Ci sono voluti ${minutes} minuti.`,
  );
  byId('ready-ip').textContent = `Collegata · ${phase.ip}`;
  readyQr.replaceChildren(buildQrSvg(phase.qr));
  showPanel('ready');
};

const renderFailed = (phase: Extract<SetupPhase, { phase: 'failed' }>): void => {
  setStepper(0);
  setTexts(FAILED_TITLES[phase.step], '');
  byId('failed-message').textContent = phase.message;
  failedRetry.hidden = !phase.canRetry;
  showPanel('failed');
};

const renderSetup = (phase: SetupPhase): void => {
  document.body.dataset.phase = phase.phase;
  if (phase.phase !== 'preparing') stopElapsedTimer();
  if (phase.phase !== 'download') lastLivePercent = -1;
  if (phase.phase !== 'ready') readyMessage.textContent = '';
  switch (phase.phase) {
    case 'welcome': return renderWelcome(phase);
    case 'download':
    case 'verify':
    case 'creating': return renderProgress(phase);
    case 'preparing': return renderPreparing(phase);
    case 'ready': return renderReady(phase);
    case 'failed': return renderFailed(phase);
  }
};

const click = (id: string, action: () => void): void => {
  byId(id).addEventListener('click', action);
};
click('setup-start', () => void bridge?.setupStart());
click('setup-recheck', () => void bridge?.setupChecks());
click('vbox-recheck', () => void bridge?.setupChecks());
click('vbox-download', () => void bridge?.openVirtualBoxDownload());
click('setup-existing', () => void bridge?.setupUseExisting());
click('vbox-existing', () => void bridge?.setupUseExisting());
click('failed-existing', () => void bridge?.setupUseExisting());
click('setup-cancel', () => void bridge?.setupCancel());
click('failed-retry', () => void bridge?.setupRetry());
click('setup-minimize', () => void bridge?.minimize());
click('setup-new', () => void bridge?.setupNew());
click('setup-open', () => {
  if (!bridge) return;
  openButton.disabled = true;
  readyMessage.textContent = '';
  void bridge.setupOpen().then((result) => {
    if (result.ok) return;
    readyMessage.textContent = result.message ?? 'Non riesco ad aprire Acasystem. Riprova.';
    openButton.disabled = false;
  });
});

// ---- Schermate comuni ------------------------------------------------------------------------

const render = (state: PageState): void => {
  document.body.dataset.view = state.view;
  if (state.view !== 'setup') {
    delete document.body.dataset.phase;
    stopElapsedTimer();
    activePanel = '';
  }
  byId('version').textContent = `App ${state.shellVersion}`;
  if (state.view === 'loading') byId('loading-message').textContent = state.message ?? 'Avvio in corso…';
  if (state.view === 'setup' && state.setup) renderSetup(state.setup);
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
