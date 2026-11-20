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
const STEP_LABELS: Record<'vm' | 'core' | 'acaQr', string> = {
  vm: 'Centrale accesa',
  core: 'Download di Home Assistant',
  acaQr: 'Installazione di Acasystem e codice QR',
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
const dlBytes = byId<HTMLElement>('dl-bytes');
const dlLive = byId<HTMLElement>('dl-live');
const dlNotes = byId<HTMLElement>('dl-notes');
const dlNoteResume = byId<HTMLElement>('dl-note-resume');
const viewSetup = document.querySelector<HTMLElement>('.view-setup') as HTMLElement;
const dlActions = byId<HTMLElement>('dl-actions');
const readyQr = byId<HTMLElement>('ready-qr');
const readyMessage = byId<HTMLElement>('ready-message');
const readyIp = byId<HTMLElement>('ready-ip');
const copyButton = byId<HTMLButtonElement>('ready-copy');
const copyLive = byId<HTMLElement>('ready-copy-live');
const openButton = byId<HTMLButtonElement>('setup-open');
const failedRetry = byId<HTMLButtonElement>('failed-retry');

const VERIFY_NOTE = 'Prima di usarlo controllo che il file sia quello originale.';
const RESUME_NOTE = 'Se la connessione cade riprendo da dove mi ero fermato, e prima di usarlo controllo che il file sia quello originale.';
let readyAddress = '';
let copyTimer: number | undefined;
let activePanel = '';
/** Durante un nuovo controllo si resta nella vista «Manca VirtualBox» per non far lampeggiare la pagina. */
let vboxPanelShown = false;
let lastLivePercent = -1;

const showPanel = (name: string): void => {
  for (const panel of panels) panel.classList.toggle('is-active', panel.dataset.sp === name);
  if (name !== activePanel) {
    activePanel = name;
    // Chi usa lo screen reader sente il nuovo titolo; la tastiera riparte dall'inizio della vista.
    setupTitle.tabIndex = -1;
    setupTitle.focus({ preventScroll: true });
    // Ingresso della vista: dissolvenza e salita (solo dissolvenza con movimento ridotto, nel CSS).
    viewSetup.classList.remove('is-entering');
    void viewSetup.offsetWidth;
    viewSetup.classList.add('is-entering');
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
  let minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? 'circa 1 minuto' : `circa ${minutes} minuti`;
  // Da un'ora in su i minuti si arrotondano a 5: non si dichiara più precisione di quella che c'è.
  minutes = Math.round(minutes / 5) * 5;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hoursText = hours === 1 ? '1 ora' : `${hours} ore`;
  if (rest === 0) return `circa ${hoursText}`;
  return `circa ${hoursText} e ${rest} ${rest === 1 ? 'minuto' : 'minuti'}`;
};

const formatElapsed = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  if (total < 60) return `${total} s`;
  if (total < 3600) return `${Math.floor(total / 60)} min ${total % 60} s`;
  return `${Math.floor(total / 3600)} h ${Math.floor((total % 3600) / 60)} min`;
};

/** Blocco di avanzamento condiviso: etichetta, percentuale, barra, «Tempo stimato» e «Tempo trascorso». */
interface ProgressView {
  label: HTMLElement;
  percent: HTMLElement;
  bar: HTMLElement;
  fill: HTMLElement;
  times: HTMLElement;
  eta: HTMLElement;
  elapsed: HTMLElement;
  /** Inizio del conteggio del tempo trascorso; undefined = non si conta. */
  startedAt?: number;
}
interface ProgressData {
  label?: string;
  /** null = indeterminato. */
  percent: number | null;
  /** undefined = riga dei tempi nascosta; null = «calcolo del tempo…». */
  etaSeconds?: number | null;
  startedAt?: number;
}

const progressTemplate = byId<HTMLTemplateElement>('tpl-progress');
const mountProgress = (id: string): ProgressView => {
  const root = (progressTemplate.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
  const find = (selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;
  byId(id).replaceChildren(root);
  return {
    label: find('.pg-label'),
    percent: find('.pg-percent'),
    bar: find('.pg-bar'),
    fill: find('.pg-fill'),
    times: find('.pg-times'),
    eta: find('.pg-eta'),
    elapsed: find('.pg-elapsed'),
  };
};
const downloadView = mountProgress('dl-progress');
const prepView = mountProgress('prep-progress');

const updateElapsed = (view: ProgressView): void => {
  if (view.startedAt !== undefined) view.elapsed.textContent = formatElapsed((Date.now() - view.startedAt) / 1000);
};

const updateProgress = (view: ProgressView, data: ProgressData): void => {
  view.label.hidden = !data.label;
  view.label.textContent = data.label ?? '';
  const determinate = data.percent !== null;
  view.percent.hidden = !determinate;
  view.percent.textContent = determinate ? `${data.percent}%` : '';
  view.bar.classList.toggle('is-indeterminate', !determinate);
  if (determinate) {
    view.bar.setAttribute('aria-valuenow', String(data.percent));
    view.bar.setAttribute('aria-valuetext', `${data.percent}%`);
    view.bar.removeAttribute('aria-busy');
    view.fill.style.width = `${data.percent}%`;
  } else {
    view.bar.removeAttribute('aria-valuenow');
    view.bar.setAttribute('aria-valuetext', data.label ?? 'In corso');
    view.bar.setAttribute('aria-busy', 'true');
    view.fill.style.width = '';
  }
  view.times.hidden = data.etaSeconds === undefined;
  if (data.etaSeconds !== undefined) view.eta.textContent = formatEta(data.etaSeconds);
  view.startedAt = data.startedAt;
  updateElapsed(view);
  syncElapsedTimer();
};

/** Il tempo trascorso si aggiorna ogni secondo, finché una delle due viste lo mostra. */
let elapsedTimer: number | undefined;
function syncElapsedTimer(): void {
  const needed = [downloadView, prepView].some((view) => view.startedAt !== undefined);
  if (needed && elapsedTimer === undefined) {
    elapsedTimer = window.setInterval(() => [downloadView, prepView].forEach(updateElapsed), 1000);
  } else if (!needed && elapsedTimer !== undefined) {
    window.clearInterval(elapsedTimer);
    elapsedTimer = undefined;
  }
}

const megabytes = (bytes: number): string => `${Math.round(bytes / 1_000_000)} MB`;
const speedText = (bytesPerSecond: number): string =>
  `${(bytesPerSecond / 1_000_000).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB/s`;

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
  dlBytes.hidden = dlNotes.hidden = dlActions.hidden = !download;
  if (phase.phase === 'verify') {
    setTexts('Controllo il disco scaricato…', 'Ci vuole qualche istante.');
  } else if (phase.phase === 'creating') {
    setTexts('Preparo la centrale…', 'Creo la macchina della centrale su questo PC.');
  } else {
    setTexts('Scarico la centrale', 'È il sistema che gestirà la casa: circa 600 MB.');
  }
  if (phase.phase === 'download') renderDownload(phase.progress, phase.startedAt);
  else updateProgress(downloadView, { percent: null });
  showPanel('progress');
};

const renderDownload = (progress: DownloadProgress, startedAt: number): void => {
  const percent = progress.totalBytes > 0
    ? Math.min(100, Math.max(0, Math.floor((progress.receivedBytes / progress.totalBytes) * 100)))
    : 0;
  updateProgress(downloadView, { percent, etaSeconds: progress.etaSeconds, startedAt });
  const speed = progress.bytesPerSecond > 0 ? ` · ${speedText(progress.bytesPerSecond)}` : '';
  dlBytes.textContent = `${megabytes(progress.receivedBytes)} di ${megabytes(progress.totalBytes)}${speed}`;
  dlNoteResume.textContent = progress.attempt > 1 ? `Connessione ripresa (tentativo ${progress.attempt}). ${VERIFY_NOTE}` : RESUME_NOTE;
  // L'annuncio vocale cambia a ogni 10%: non a ogni aggiornamento della barra.
  const decade = Math.floor(percent / 10);
  if (decade !== lastLivePercent) {
    lastLivePercent = decade;
    dlLive.textContent = `Scaricato il ${decade * 10}%`;
  }
};

const ROW_OF_STATE = { done: 'ok', active: 'active', pending: 'pending' } as const;
/** Tre righe: centrale accesa, Home Assistant, Acasystem e QR (unite); il controllo del disco è già nell'indicatore. */
const prepRows = (phase: Extract<SetupPhase, { phase: 'preparing' }>): RowData[] => {
  const step = (id: PrepStep['id']): PrepStep => phase.steps.find((item) => item.id === id) ?? { id, state: 'pending' };
  const vm = step('vm');
  const core = step('core');
  const aca = step('aca');
  const qr = step('qr');
  const percent = phase.progress.percent;
  const acaQrState = aca.state === 'done' ? (qr.state === 'done' ? 'done' : 'active') : aca.state;
  return [
    { label: STEP_LABELS.vm, status: ROW_OF_STATE[vm.state], detail: vm.detail ?? (vm.state === 'active' ? 'in corso' : undefined) },
    {
      label: STEP_LABELS.core,
      status: ROW_OF_STATE[core.state],
      detail: core.state === 'active' && percent !== null ? `${percent}%` : core.detail ?? (core.state === 'active' ? 'in corso' : undefined),
    },
    { label: STEP_LABELS.acaQr, status: ROW_OF_STATE[acaQrState], detail: aca.detail ?? (acaQrState === 'active' ? 'in corso' : undefined) },
  ];
};

const renderPreparing = (phase: Extract<SetupPhase, { phase: 'preparing' }>): void => {
  setStepper(2);
  setTexts('La centrale si sta preparando', 'Al primo avvio scarica Home Assistant e Acasystem. Di solito servono 15-30 minuti.');
  fillRows(byId('prep-steps'), prepRows(phase));
  updateProgress(prepView, {
    label: phase.progress.label,
    percent: phase.progress.percent,
    etaSeconds: phase.progress.etaSeconds,
    startedAt: phase.startedAt,
  });
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
  readyAddress = `http://${phase.ip}:${phase.port}`;
  readyIp.textContent = readyAddress;
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
  if (phase.phase !== 'download') downloadView.startedAt = undefined;
  if (phase.phase !== 'preparing') prepView.startedAt = undefined;
  syncElapsedTimer();
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
click('ready-copy', () => {
  if (!readyAddress) return;
  const clipboard = navigator.clipboard as Clipboard | undefined;
  void (clipboard ? clipboard.writeText(readyAddress) : Promise.reject(new Error('Appunti non disponibili'))).then(
    () => {
      copyButton.textContent = 'Copiato';
      copyLive.textContent = 'Indirizzo copiato';
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => {
        copyButton.textContent = 'Copia';
        copyLive.textContent = '';
      }, 2000);
    },
    () => {
      copyLive.textContent = 'Non sono riuscito a copiare l’indirizzo.';
    },
  );
});
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
    downloadView.startedAt = undefined;
    prepView.startedAt = undefined;
    syncElapsedTimer();
    activePanel = '';
  }
  for (const element of document.querySelectorAll<HTMLElement>('.app-version')) element.textContent = `App ${state.shellVersion}`;
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
