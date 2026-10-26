import { REQUIRED_FLOW_HANDLERS, readAllowUnverifiedHaVersion } from '../../config/devices.ts';
import {
  SUPPORTED_HA_VERSION,
  isKnownHaVersion,
  isVerifiedHaVersion,
} from '../../config/homeAssistantApiCatalog.ts';
import type { HaAdapter } from './haAdapter.ts';
import { isHaError } from './haTransport.ts';
import type { IdentityStatus, ServiceIdentity } from './serviceIdentity.ts';

/**
 * Compatibility check with the Home Assistant in use (REP-20261023-003, section 3, probes
 * RD-01, RD-02, RD-03, RD-07, RD-09). It runs at start-up and again, cached, when the
 * facade is used. All probes have no effect on HA: no flow is opened and nothing is written.
 *
 * Nothing is guessed (REP-20261023-003, section 3, point 4): a function is on only when every
 * probe it needs returned `pass`. A probe that failed or could not run (`skipped`: timeout,
 * protocol error, identity not active) leaves the function off, and a report with a probe
 * that could not run while the identity was active is cached only for a short time. The
 * report is also dropped when the identity changes (state or token), so a service that has
 * just been activated is checked before any write. A version of HA that is neither verified
 * nor compared with the source keeps the writes off until the installer allows them on purpose.
 */

export type ProbeResult = 'pass' | 'fail' | 'skipped';

export interface CompatibilityReport {
  checkedAt: number;
  reachable: boolean;
  version: string | null;
  versionVerified: boolean;
  /** null when it could not be read. */
  onboarded: boolean | null;
  probes: Record<'RD-01' | 'RD-02' | 'RD-03' | 'RD-07' | 'RD-09', ProbeResult>;
  features: { catalog: boolean; flows: boolean; power: boolean };
  /** State and token of the service identity this report was made for. */
  identityKey: string;
  /** Message for a customer when a function is off, else null. */
  customerMessage: string | null;
  /** Detailed messages for the installer. */
  installerMessages: string[];
}

export interface CompatibilityChecker {
  get(options?: { force?: boolean }): Promise<CompatibilityReport>;
  invalidate(): void;
}

export interface CompatibilityOptions {
  adapter: HaAdapter;
  identity: ServiceIdentity;
  now?: () => number;
  /** How long a report is trusted. Default 5 minutes. */
  cacheMs?: number;
  /** The installer's explicit choice to write on an unchecked version. Default: environment. */
  allowUnverifiedVersion?: () => boolean;
  log?: (line: string) => void;
}

const UNREACHABLE_CACHE_MS = 5_000;

const GENERIC_CUSTOMER_MESSAGE =
  "Su questo sistema non è possibile aggiungere dispositivi da qui. Chiedi all'installatore.";

const identityKeyOf = (status: IdentityStatus): string =>
  `${status.state}:${status.fingerprint ?? '-'}`;

export const createCompatibilityChecker = ({
  adapter,
  identity,
  now = Date.now,
  cacheMs = 300_000,
  allowUnverifiedVersion = readAllowUnverifiedHaVersion,
  log = () => undefined,
}: CompatibilityOptions): CompatibilityChecker => {
  let cached: CompatibilityReport | null = null;
  let running: { key: string; promise: Promise<CompatibilityReport> } | null = null;

  const run = async (identityStatus: IdentityStatus): Promise<CompatibilityReport> => {
    const report: CompatibilityReport = {
      checkedAt: now(),
      reachable: false,
      version: null,
      versionVerified: false,
      onboarded: null,
      probes: {
        'RD-01': 'skipped',
        'RD-02': 'skipped',
        'RD-03': 'skipped',
        'RD-07': 'skipped',
        'RD-09': 'skipped',
      },
      // Everything is off until the probes that a function needs have passed.
      features: { catalog: false, flows: false, power: false },
      identityKey: identityKeyOf(identityStatus),
      customerMessage: null,
      installerMessages: [],
    };

    try {
      report.version = await adapter.readVersion();
      report.reachable = true;
    } catch {
      report.installerMessages.push(
        'Home Assistant non è raggiungibile: la compatibilità non si può verificare.'
      );
      return report;
    }

    report.versionVerified = isVerifiedHaVersion(report.version);
    if (!report.versionVerified) {
      report.installerMessages.push(
        `Questa versione di Home Assistant (${report.version ?? 'sconosciuta'}) non è stata ancora provata con Acasystem (provata: ${SUPPORTED_HA_VERSION}). L'aggiunta dei dispositivi potrebbe non funzionare.`
      );
    }

    try {
      report.onboarded = (await adapter.authProviders()).onboarded;
      report.probes['RD-01'] = report.onboarded ? 'pass' : 'fail';
    } catch {
      report.probes['RD-01'] = 'fail';
    }
    if (report.onboarded === false) {
      report.customerMessage =
        "Home Assistant non è ancora stato configurato. Serve l'installatore.";
      report.installerMessages.push(report.customerMessage);
      return report;
    }

    if (identityStatus.state !== 'active') {
      // Without the service identity no probe that needs it can run: the functions stay off.
      // The report belongs to this identity state and is dropped when it changes.
      report.installerMessages.push(
        'Il servizio non è attivo: le sonde che lo richiedono non sono state eseguite.'
      );
      return report;
    }
    report.probes['RD-09'] = 'pass';

    let token: string;
    try {
      token = await identity.requireToken();
    } catch {
      return report;
    }

    try {
      const handlers = await adapter.flowHandlers(token);
      report.probes['RD-02'] = REQUIRED_FLOW_HANDLERS.every((handler) => handlers.includes(handler))
        ? 'pass'
        : 'fail';
    } catch (error) {
      report.probes['RD-02'] =
        isHaError(error) && error.kind === 'unreachable' ? 'skipped' : 'fail';
    }

    try {
      report.probes['RD-03'] = (await adapter.probeFlowRoute(token)) ? 'pass' : 'fail';
    } catch {
      report.probes['RD-03'] = 'skipped';
    }

    try {
      report.probes['RD-07'] = (await adapter.probeAutomationRoute(token)) ? 'pass' : 'fail';
    } catch {
      report.probes['RD-07'] = 'skipped';
    }

    // A function is on only when the probes it needs passed; `skipped` counts as off.
    const listOk = report.probes['RD-02'] === 'pass';
    const flowsOk = listOk && report.probes['RD-03'] === 'pass';
    const versionOk = isKnownHaVersion(report.version) || allowUnverifiedVersion();
    report.features.catalog = listOk;
    report.features.flows = flowsOk && versionOk;
    report.features.power = report.features.flows && report.probes['RD-07'] === 'pass';

    if (report.probes['RD-02'] === 'fail' || report.probes['RD-03'] === 'fail') {
      report.customerMessage = GENERIC_CUSTOMER_MESSAGE;
      report.installerMessages.push(
        'Le rotte dei flussi di configurazione di Home Assistant non rispondono come previsto (RD-02 o RD-03): aggiunta dei dispositivi spenta.'
      );
    } else if (report.probes['RD-02'] === 'skipped' || report.probes['RD-03'] === 'skipped') {
      report.customerMessage =
        'Non riesco a controllare ora che Home Assistant risponda come previsto. Riprova tra poco.';
      report.installerMessages.push(
        'Una sonda dei flussi (RD-02 o RD-03) non è riuscita a girare: aggiunta dei dispositivi spenta finché non riesce.'
      );
    } else if (!versionOk) {
      report.customerMessage = GENERIC_CUSTOMER_MESSAGE;
      report.installerMessages.push(
        `La versione ${report.version ?? 'sconosciuta'} di Home Assistant non è stata né provata né confrontata con Acasystem: l'aggiunta dei dispositivi e l'accensione sono spente. Con DEVICES_ALLOW_UNVERIFIED_HA_VERSION=1 si accendono a rischio dell'installatore.`
      );
    } else if (report.probes['RD-07'] === 'fail') {
      report.installerMessages.push(
        "La rotta delle automazioni non risponde come previsto (RD-07): l'accensione da spento non si può configurare da qui."
      );
    } else if (report.probes['RD-07'] === 'skipped') {
      report.installerMessages.push(
        "La sonda delle automazioni (RD-07) non è riuscita a girare: l'accensione da spento è spenta finché non riesce."
      );
    }

    return report;
  };

  /** A report is trusted for long only if every probe ran, or the identity was not active. */
  const ttlOf = (report: CompatibilityReport): number => {
    if (!report.reachable) return UNREACHABLE_CACHE_MS;
    const identityActive = report.probes['RD-09'] === 'pass';
    const skipped = Object.values(report.probes).includes('skipped');
    return identityActive && skipped ? UNREACHABLE_CACHE_MS : cacheMs;
  };

  const get = async (options: { force?: boolean } = {}): Promise<CompatibilityReport> => {
    // The identity answers from its own short cache; a change of state or token shows here.
    const identityStatus = await identity.status();
    const key = identityKeyOf(identityStatus);

    if (!options.force && cached && cached.identityKey === key) {
      if (now() - cached.checkedAt < ttlOf(cached)) return cached;
    }
    if (running && running.key === key) return running.promise;

    const promise: Promise<CompatibilityReport> = run(identityStatus)
      .then((report) => {
        cached = report;
        const failed = Object.entries(report.probes)
          .filter(([, result]) => result === 'fail')
          .map(([id]) => id);
        log(
          `[devices] Home Assistant ${report.version ?? 'unreachable'}: ` +
            `${report.versionVerified ? 'verified version' : 'unverified version'}, ` +
            `flows ${report.features.flows ? 'on' : 'off'}, power-on ${report.features.power ? 'on' : 'off'}` +
            (failed.length ? `, failed probes: ${failed.join(', ')}` : '')
        );
        return report;
      })
      .finally(() => {
        if (running?.promise === promise) running = null;
      });
    running = { key, promise };
    return promise;
  };

  return {
    get,
    invalidate() {
      cached = null;
    },
  };
};
