import { fileURLToPath } from 'node:url';
import { isSecretInsideDataDir, readDeviceServiceSecretPath } from '../config/devices.ts';
import { hasInteractiveTerminal, createTtyPrompter } from '../helpers/ttyPrompter.ts';
import { getHomeAssistantUrlCandidates } from '../middlewares/homeAssistantAuth.ts';
import { getDatabase } from '../models/database.ts';
import { createDeviceModel } from '../models/deviceModel.ts';
import { createActionLog } from '../services/devices/actionLog.ts';
import { createHaAdapter } from '../services/devices/haAdapter.ts';
import { createHaTransport } from '../services/devices/haTransport.ts';
import { activateServiceIdentity } from '../services/devices/identityActivation.ts';
import type { ActivationPrompter } from '../services/devices/identityActivation.ts';
import {
  createServiceIdentity,
  createServiceIdentityStore,
  describeIdentityState,
} from '../services/devices/serviceIdentity.ts';

/**
 * Installer command for the service identity of the device facade (ADR-0022, D1s).
 *
 *   docker exec -it aca-tunet-tunet-1 node src/cli/deviceServiceIdentity.ts activate
 *   docker exec -it aca-tunet-tunet-1 node src/cli/deviceServiceIdentity.ts status
 *   docker exec -it aca-tunet-tunet-1 node src/cli/deviceServiceIdentity.ts forget
 *
 * `activate` asks for the credentials of the Home Assistant owner on the terminal (the
 * password is not shown) and prints only the outcome. `status` and `forget` need no
 * credentials. To switch the service off in Home Assistant, suspend or delete the user
 * "Acasystem (servizio)" under People > Users; `forget` only removes the local secret.
 */

const USAGE = [
  'Uso: node src/cli/deviceServiceIdentity.ts <activate|status|forget> [--reactivate] [--rotate]',
  '  activate    crea (o ripristina) l’utente «Acasystem (servizio)» e ne salva l’accesso sul server',
  '  status      dice se il servizio è attivo; non stampa segreti',
  '  forget      cancella solo il file con l’accesso salvato sul server (non tocca Home Assistant)',
  '  --reactivate  riattiva l’utente se è sospeso in Home Assistant',
  '  --rotate      crea un nuovo token anche se quello attuale funziona',
].join('\n');

export interface CliIo {
  print(line: string): void;
  prompter: ActivationPrompter | null;
}

interface CliDependencies {
  adapter: ReturnType<typeof createHaAdapter>;
  store: ReturnType<typeof createServiceIdentityStore>;
  actions: ReturnType<typeof createActionLog>;
}

const buildDependencies = (): CliDependencies => {
  const database = getDatabase();
  const transport = createHaTransport({ baseUrls: getHomeAssistantUrlCandidates });
  const adapter = createHaAdapter({ transport, callTimeoutMs: 20_000, flowStepTimeoutMs: 90_000 });
  const store = createServiceIdentityStore(readDeviceServiceSecretPath);
  const actions = createActionLog(createDeviceModel(database));
  return { adapter, store, actions };
};

/** Returns the exit code. `io.prompter` is null when there is no interactive terminal. */
export const runCli = async (
  argv: readonly string[],
  io: CliIo,
  dependencies: CliDependencies | null = null
): Promise<number> => {
  const [command, ...flags] = argv;
  const unknownFlag = flags.find((flag) => flag !== '--reactivate' && flag !== '--rotate');
  if (!command || !['activate', 'status', 'forget'].includes(command) || unknownFlag) {
    io.print(USAGE);
    return 2;
  }

  const { adapter, store, actions } = dependencies ?? buildDependencies();

  if (command === 'status') {
    const identity = createServiceIdentity({ store, adapter });
    const status = await identity.status({ force: true });
    io.print(describeIdentityState(status.state));
    if (status.state === 'active' && status.expiresAt)
      io.print(`Il token scade il ${status.expiresAt.slice(0, 10)}.`);
    if (isSecretInsideDataDir(store.path())) {
      io.print(
        'Attenzione: il file con l’accesso del servizio è nel volume dei dati e finisce nelle copie a freddo. Spostalo in un volume separato (TUNET_SERVICE_SECRET_FILE).'
      );
    }
    return status.state === 'active' ? 0 : 1;
  }

  if (command === 'forget') {
    store.remove();
    actions.record({ user: null, source: 'cli', action: 'service.forget', outcome: 'ok' });
    io.print(
      'Accesso del servizio cancellato dal server. In Home Assistant l’utente «Acasystem (servizio)» resta: sospendilo o eliminalo da Persone > Utenti.'
    );
    return 0;
  }

  if (!io.prompter) {
    io.print(
      'Questo comando chiede le credenziali del proprietario e va lanciato da un terminale interattivo, per esempio con «docker exec -it …». Le credenziali non si possono passare da argomenti, variabili o file.'
    );
    return 2;
  }

  const outcome = await activateServiceIdentity({
    adapter,
    store,
    actions,
    prompter: io.prompter,
    reactivate: flags.includes('--reactivate'),
    rotate: flags.includes('--rotate'),
  });
  io.print(outcome.message);
  return outcome.ok ? 0 : 1;
};

const isMainModule = Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  const interactive = hasInteractiveTerminal();
  runCli(process.argv.slice(2), {
    print: (line) => console.log(line),
    prompter: interactive ? createTtyPrompter() : null,
  }).then(
    (code) => process.exit(code),
    () => {
      // The message of an unexpected error is not printed: it could name an address.
      console.error('Errore imprevisto. Riprova; se si ripete, avvisa l’installatore.');
      process.exit(1);
    }
  );
}
