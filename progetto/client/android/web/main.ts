import {
  noticeText,
  parseConnectionCode,
  RELEASE_REPOSITORY,
  resolveStartup,
  startupErrorText,
  submitAddress,
  WIZARD_ERROR_TEXT,
} from '../../core/src/index.ts';
import { parsePairingCode } from '../../core/src/pairing.ts';
import type { PairingCode } from '../../core/src/pairing.ts';
import { CapacitorHttp, registerPlugin } from '@capacitor/core';
import {
  createCapacitorHttpClient,
  createPluginBundleCache,
  createPluginConfigStore,
} from './capacitorPorts.ts';
import type { AcaShellPlugin, CapacitorHttpPlugin } from './capacitorPorts.ts';
import { acceptPairing } from './pairingFlow.ts';
import type { PairingAction } from './pairingFlow.ts';

const shell = registerPlugin<AcaShellPlugin>('AcaShell');
const nativeHttp = CapacitorHttp as unknown as CapacitorHttpPlugin;
const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento mancante: ${id}`);
  return element as T;
};
const { version: shellVersion } = await shell.shellVersion();
byId('version').textContent = `App ${shellVersion}`;
const http = createCapacitorHttpClient(
  nativeHttp,
  `Acasystem-client/${shellVersion} (Android)`,
);
const config = createPluginConfigStore(shell);
const cache = createPluginBundleCache(shell);
let code: PairingCode | null = null;
let busy = false;
let booting = false;
let ownHouseRequired = false;

const setView = (
  view: 'loading' | 'wizard' | 'scan' | 'pairing-choice' | 'error',
): void => {
  document.body.dataset.view = view;
};

const showWizard = async (message = ''): Promise<void> => {
  code = null;
  const saved = await config.load();
  const remote = saved && !saved.host.startsWith('127.') ? saved : null;
  byId<HTMLInputElement>('host').value = remote?.host ?? '';
  byId<HTMLInputElement>('port').value = remote && remote.port !== 3002 ? String(remote.port) : '';
  byId('wizard-message').textContent = message;
  byId<HTMLButtonElement>('submit').disabled = false;
  setView('wizard');
};

const showScan = async (message = ''): Promise<void> => {
  code = null;
  const state = await shell.pairingState();
  ownHouseRequired = state.configurationPending && !(await config.load());
  byId('scan-message').textContent = message;
  byId('use-address').hidden = !message;
  byId('scan-intro').textContent = ownHouseRequired
    ? 'La configurazione è pronta. Ora mostra il codice Account della tua casa e scansionalo per collegarla.'
    : 'Mostra il codice QR da ACA sul dispositivo di partenza. Per ora usa la stessa rete Wi-Fi.';
  byId<HTMLButtonElement>('scan').disabled = false;
  setView('scan');
};

const showError = (message: string): void => {
  byId('error-message').textContent = message;
  setView('error');
};

const boot = async (): Promise<void> => {
  if (booting) return;
  booting = true;
  try {
    const saved = await config.load();
    if (!saved || saved.host.startsWith('127.')) {
      await showScan();
      booting = false;
      await scan();
      return;
    }
    setView('loading');
    const result = await resolveStartup({
      http,
      config,
      cache,
      shellVersion,
      repository: RELEASE_REPOSITORY,
      preferServerBundle: true,
    });
    if (result.kind === 'wizard') {
      await showScan();
      booting = false;
      await scan();
      return;
    }
    if (result.kind !== 'launch') return showError(startupErrorText(result));
    await shell.launch({
      version: result.version,
      serverOrigin: result.origin,
      notices: result.notices.map(noticeText),
    });
  } catch {
    showError(
      'Non riesco ad aprire ACA. Controlla che la tua casa sia raggiungibile e riprova.',
    );
  } finally {
    booting = false;
  }
};

const scan = async (): Promise<void> => {
  if (busy) return;
  busy = true;
  byId<HTMLButtonElement>('scan').disabled = true;
  byId('scan-message').textContent = '';
  try {
    const scanned = (await shell.scanPairingCode()).value;
    const connection = parseConnectionCode(scanned);
    if (connection.ok) {
      const result = await submitAddress({ host: connection.value.host, port: String(connection.value.port) }, { http, config });
      if (!result.ok) return await showScan(WIZARD_ERROR_TEXT[result.error]);
      await boot();
      return;
    }
    const result = parsePairingCode(scanned);
    if (!result.ok) {
      await showScan(
        result.error === 'unsupported-endpoint'
          ? 'Questo collegamento non è supportato. Mostra il codice della centrale sulla stessa rete locale.'
          : 'Non è un codice QR ACA valido o usa una versione non supportata.',
      );
      return;
    }
    code = result.value;
    byId('pairing-source').textContent = 'Codice ACA riconosciuto.';
    byId<HTMLButtonElement>('pair-configuration').hidden = ownHouseRequired;
    byId('configuration-description').hidden = ownHouseRequired;
    setView('pairing-choice');
  } catch (error) {
    const nativeError = error as { code?: string } | null;
    await showScan(
      nativeError?.code === 'SCAN_CANCELLED'
        ? 'Scansione annullata. Puoi riprovare.'
        : nativeError?.code === 'CAMERA_DENIED'
          ? 'Consenti la fotocamera nelle impostazioni dell’app per leggere il QR.'
          : 'Non riesco ad aprire la fotocamera. Controlla il permesso e riprova.',
    );
  } finally {
    busy = false;
    byId<HTMLButtonElement>('scan').disabled = false;
  }
};

const choose = async (action: PairingAction): Promise<void> => {
  if (busy || !code) return;
  const selected = code;
  busy = true;
  byId<HTMLButtonElement>('pair-account').disabled = true;
  byId<HTMLButtonElement>('pair-configuration').disabled = true;
  byId<HTMLButtonElement>('scan-again').disabled = true;
  byId('pairing-message').textContent = 'Acquisizione in corso…';
  try {
    await acceptPairing(selected, action, nativeHttp, shell);
    code = null;
    if (action === 'configuration' && !(await config.load())) {
      return await showScan(
        'Interfaccia copiata. Collega ora la tua casa con il suo codice Account.',
      );
    }
    await boot();
  } catch (error) {
    code = null;
    await showScan(
      error instanceof Error
        ? error.message
        : 'Collegamento non riuscito. Genera un nuovo codice QR e riprova.',
    );
  } finally {
    busy = false;
    byId<HTMLButtonElement>('pair-account').disabled = false;
    byId<HTMLButtonElement>('pair-configuration').disabled = false;
    byId<HTMLButtonElement>('scan-again').disabled = false;
    byId('pairing-message').textContent = '';
  }
};

byId('wizard-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (busy) return;
  busy = true;
  byId<HTMLButtonElement>('submit').disabled = true;
  byId('wizard-message').textContent = 'Collegamento al mini PC…';
  void submitAddress({ host: byId<HTMLInputElement>('host').value, port: byId<HTMLInputElement>('port').value }, { http, config })
    .then(async (result) => {
      if (!result.ok) return showWizard(WIZARD_ERROR_TEXT[result.error]);
      await boot();
    })
    .catch(() => showWizard('Non riesco a collegarmi al mini PC. Riprova.'))
    .finally(() => { busy = false; byId<HTMLButtonElement>('submit').disabled = false; });
});
byId('show-scan').addEventListener('click', () => void showScan());
byId('use-address').addEventListener('click', () => void showWizard());
byId('scan').addEventListener('click', () => void scan());
byId('pair-account').addEventListener('click', () => void choose('account'));
byId('pair-configuration').addEventListener(
  'click',
  () => void choose('configuration'),
);
byId('scan-again').addEventListener('click', () => void showScan());
byId('retry').addEventListener('click', () => void boot());
byId('change-address').addEventListener('click', () => void showWizard());
const onChangeAddress = (): void => {
  if (!busy && !booting)
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
