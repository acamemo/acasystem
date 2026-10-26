import { randomBytes } from 'node:crypto';
import {
  DEVICE_SERVICE_TOKEN_LIFESPAN_DAYS,
  DEVICE_SERVICE_TOKEN_NAME,
  DEVICE_SERVICE_USERNAME,
  DEVICE_SERVICE_USER_NAME,
  isSecretInsideDataDir,
  readAllowSecretInDataDir,
  readAllowUnverifiedHaVersion,
} from '../../config/devices.ts';
import { readDataDir } from '../../config/env.ts';
import { isKnownHaVersion } from '../../config/homeAssistantApiCatalog.ts';
import type { ActionLog } from './actionLog.ts';
import type { HaAdapter, HaAdminUser, HaLoginStep } from './haAdapter.ts';
import { isHaError } from './haTransport.ts';
import { normalizeFlowResult } from './flowModel.ts';
import { createServiceIdentity } from './serviceIdentity.ts';
import type { ServiceIdentityStore } from './serviceIdentity.ts';

/**
 * Activation of the service identity (D1s, ADR-0022 point 3). It is run by a person in their
 * own terminal. The owner's credentials are typed there, used for this one run and dropped:
 * they are not stored, logged, printed or sent anywhere except to Home Assistant.
 *
 * What it does, in order:
 * 1. if a working identity already exists, it stops (idempotent);
 * 2. the owner logs in (password, and a verification code if HA asks for one);
 * 3. the user "Acasystem (servizio)" is created (administrators group, `local_only`), or the
 *    existing one is reused (found by its login name; a user with that display name and a
 *    different login name is never touched); a suspended user is not reactivated unless
 *    `reactivate` is set;
 * 4. a random password is set for it and used once, to log in as that user;
 * 5. as that user a new long-lived token is created;
 * 6. the token is checked, a flow of `webostv` is started and cancelled to prove the writes;
 * 7. the token is written to the secret file (0600); only then are the older long-lived tokens
 *    of that user deleted. If anything fails before the save, the new token is deleted from HA
 *    (best effort) and the old one, still in the file, keeps working. Every other secret is
 *    thrown away and the login sessions of this run are revoked.
 *
 * The commands it uses to manage users (`config/auth/*`) are internal and change between
 * versions of HA: on a version that was neither verified nor compared with the source it stops
 * before asking for any credential, unless the installer allows it on purpose
 * (DEVICES_ALLOW_UNVERIFIED_HA_VERSION=1).
 *
 * The secret file must not sit in the data volume (it is copied with the data): the command
 * refuses to save there unless the installer allows it on purpose (bench only).
 * The result carries only a code and a sentence in Italian: no secret.
 */

export interface ActivationPrompter {
  /** Visible input (user name). */
  ask(question: string): Promise<string>;
  /** Hidden input (password, verification code). */
  askHidden(question: string): Promise<string>;
  say(line: string): void;
}

export interface ActivationDeps {
  adapter: HaAdapter;
  store: ServiceIdentityStore;
  actions: ActionLog;
  prompter: ActivationPrompter;
  /** Reactivate the service user if it is suspended in HA. */
  reactivate?: boolean;
  /** Create a new token even if the current one works. */
  rotate?: boolean;
  /** Allow the secret file inside the data volume. Default: TUNET_SERVICE_SECRET_ALLOW_DATA_DIR. */
  allowSecretInDataDir?: boolean;
  /** Data directory the secret file is compared with. Default: the configured one. */
  dataDir?: string;
  /** Allow a version of HA that was neither verified nor compared. Default: environment. */
  allowUnverifiedVersion?: boolean;
  now?: () => number;
  /** Random password of the service user; replaced in the tests only. */
  randomPassword?: () => string;
  clientId?: string;
}

export type ActivationCode =
  | 'activated'
  | 'already_active'
  | 'ha_unreachable'
  | 'ha_not_ready'
  | 'cancelled'
  | 'invalid_credentials'
  | 'not_admin'
  | 'user_suspended'
  | 'user_conflict'
  | 'secret_location'
  | 'ha_refused'
  | 'verification_failed'
  | 'incompatible';

export interface ActivationResult {
  ok: boolean;
  code: ActivationCode;
  message: string;
}

const DEFAULT_CLIENT_ID = 'http://localhost/';
const MAX_LOGIN_STEPS = 6;

const result = (ok: boolean, code: ActivationCode, message: string): ActivationResult => ({
  ok,
  code,
  message,
});

class Refusal extends Error {
  readonly outcome: ActivationResult;
  constructor(outcome: ActivationResult) {
    super(outcome.code);
    this.outcome = outcome;
  }
}

/** Logs in with the Home Assistant login flow and returns the session tokens. */
const login = async (
  adapter: HaAdapter,
  clientId: string,
  username: string,
  password: string,
  askCode: (() => Promise<string>) | null
): Promise<{ accessToken: string; refreshToken: string }> => {
  let step: HaLoginStep = await adapter.loginStart(clientId);

  for (let attempt = 0; attempt < MAX_LOGIN_STEPS; attempt += 1) {
    if (step.kind === 'done') return adapter.exchangeCode(step.code, clientId);

    if (step.error) {
      throw new Refusal(
        result(
          false,
          'invalid_credentials',
          'Utente o password non validi, oppure codice di verifica errato.'
        )
      );
    }

    if (step.fields.includes('username') && step.fields.includes('password')) {
      step = await adapter.loginStep(step.flowId, clientId, { username, password });
    } else if (step.fields.includes('code') && askCode) {
      step = await adapter.loginStep(step.flowId, clientId, { code: (await askCode()).trim() });
    } else {
      throw new Refusal(
        result(
          false,
          'incompatible',
          'Home Assistant chiede un passaggio di accesso che questo comando non conosce.'
        )
      );
    }
  }
  throw new Refusal(result(false, 'incompatible', 'Accesso non completato: troppi passaggi.'));
};

/** Deletes refresh tokens by id, best effort. Returns how many could not be deleted. */
const deleteTokens = async (
  adapter: HaAdapter,
  accessToken: string,
  ids: readonly string[]
): Promise<number> => {
  if (!ids.length) return 0;
  try {
    return await adapter.withWs(accessToken, async (api) => {
      let failed = 0;
      for (const id of ids) {
        await api.deleteRefreshToken(id).catch(() => {
          failed += 1;
        });
      }
      return failed;
    });
  } catch {
    return ids.length;
  }
};

export const activateServiceIdentity = async ({
  adapter,
  store,
  actions,
  prompter,
  reactivate = false,
  rotate = false,
  allowSecretInDataDir = readAllowSecretInDataDir(),
  dataDir = readDataDir(),
  allowUnverifiedVersion = readAllowUnverifiedHaVersion(),
  now = Date.now,
  randomPassword = () => randomBytes(32).toString('base64url'),
  clientId = DEFAULT_CLIENT_ID,
}: ActivationDeps): Promise<ActivationResult> => {
  const refreshTokensToRevoke: string[] = [];
  /** Ids of the long-lived tokens created by this run and not saved (to delete on failure). */
  let unsavedTokenIds: string[] = [];
  let serviceAccessToken: string | null = null;
  let ownerUser: { id: string; name: string } | null = null;

  const finish = (outcome: ActivationResult): ActivationResult => {
    actions.record({
      user: ownerUser,
      source: 'cli',
      action: 'service.activate',
      outcome: outcome.ok ? 'ok' : 'error',
      code: outcome.code,
    });
    return outcome;
  };

  try {
    // 1. Idempotent: a working identity is left as it is.
    if (!rotate && store.load().ok) {
      const current = await createServiceIdentity({ store, adapter, now }).status({ force: true });
      if (current.state === 'active') {
        return finish(
          result(
            true,
            'already_active',
            'Il servizio è già attivo: non c’è nulla da fare. Per ricreare il token usa --rotate.'
          )
        );
      }
      if (current.state === 'unreachable') {
        return finish(result(false, 'ha_unreachable', 'Home Assistant non è raggiungibile.'));
      }
      prompter.say('Il servizio salvato non funziona più: lo ricreo.');
    }

    // The secret must not end up in the volume that is copied with the data (ADR-0022, point 3).
    if (isSecretInsideDataDir(store.path(), dataDir)) {
      if (!allowSecretInDataDir) {
        return finish(
          result(
            false,
            'secret_location',
            'Il file con l’accesso del servizio finirebbe nel volume dei dati, che entra nelle copie a freddo. Monta un volume separato e indicalo con TUNET_SERVICE_SECRET_FILE. Solo per il banco di prova si può accettare con TUNET_SERVICE_SECRET_ALLOW_DATA_DIR=1. Non è stato cambiato nulla.'
          )
        );
      }
      prompter.say(
        'Attenzione: l’accesso del servizio sarà nel volume dei dati: non copiare quel volume senza trattarlo come un segreto.'
      );
    }

    if (!(await adapter.authProviders()).onboarded) {
      return finish(
        result(
          false,
          'ha_not_ready',
          'Home Assistant non è ancora stato configurato: crea prima il proprietario dalla sua pagina di benvenuto.'
        )
      );
    }

    const haVersion = await adapter.readVersion().catch(() => null);
    if (!isKnownHaVersion(haVersion) && !allowUnverifiedVersion) {
      return finish(
        result(
          false,
          'incompatible',
          `La versione ${haVersion ?? 'sconosciuta'} di Home Assistant non è stata né provata né confrontata con Acasystem: i comandi che gestiscono gli utenti potrebbero essere cambiati. Non è stato cambiato nulla. Se sai quello che fai, rilancia con DEVICES_ALLOW_UNVERIFIED_HA_VERSION=1.`
        )
      );
    }

    // 2. Owner login. The credentials stay in these variables and nowhere else.
    prompter.say(
      `Questo comando crea in Home Assistant l’utente «${DEVICE_SERVICE_USER_NAME}», che Acasystem usa solo per aggiungere e configurare dispositivi.`
    );
    prompter.say('Servono le credenziali del proprietario di Home Assistant. Non vengono salvate.');
    const ownerName = (await prompter.ask('Utente proprietario: ')).trim();
    const ownerPassword = await prompter.askHidden('Password: ');
    if (!ownerName || !ownerPassword) {
      return finish(result(false, 'cancelled', 'Operazione annullata: credenziali non inserite.'));
    }

    const ownerSession = await login(adapter, clientId, ownerName, ownerPassword, () =>
      prompter.askHidden('Codice di verifica: ')
    );
    refreshTokensToRevoke.push(ownerSession.refreshToken);

    const owner = await adapter.ws(ownerSession.accessToken).currentUser();
    ownerUser = { id: owner.id, name: owner.name };
    if (!owner.isAdmin) {
      return finish(
        result(false, 'not_admin', 'Serve il proprietario o un amministratore di Home Assistant.')
      );
    }

    // 3-4. The service user and its random password.
    const password = randomPassword();
    const serviceUser = await adapter.withWs(
      ownerSession.accessToken,
      async (api): Promise<HaAdminUser> => {
        const users = await api.adminUsers();
        // Found by login name. By display name only a user with no login name at all (one this
        // command created and could not finish): a user with that name and another login name
        // is somebody else's account and is left alone.
        const sameName = users.filter(
          (user) => user.name === DEVICE_SERVICE_USER_NAME && !user.systemGenerated
        );
        const found =
          users.find(
            (user) => user.username === DEVICE_SERVICE_USERNAME && !user.systemGenerated
          ) ?? sameName.find((user) => user.username === null);

        if ((!found && sameName.length) || found?.isOwner) {
          throw new Refusal(
            result(
              false,
              'user_conflict',
              `In Home Assistant esiste già un utente chiamato «${DEVICE_SERVICE_USER_NAME}» che non è quello creato da Acasystem. Rinominalo o eliminalo da Persone > Utenti e rilancia il comando. Non ho cambiato nulla.`
            )
          );
        }

        if (!found) {
          const created = await api.createUser(DEVICE_SERVICE_USER_NAME, true);
          await api.createCredentials(created.id, DEVICE_SERVICE_USERNAME, password);
          return created;
        }

        if (!found.isActive) {
          if (!reactivate) {
            throw new Refusal(
              result(
                false,
                'user_suspended',
                `L’utente «${DEVICE_SERVICE_USER_NAME}» è sospeso in Home Assistant. Riattivalo da Persone > Utenti, oppure rilancia il comando con --reactivate.`
              )
            );
          }
          await api.updateUser(found.id, { isActive: true });
        }
        if (!found.isAdmin || !found.localOnly) {
          await api.updateUser(found.id, { groupIds: ['system-admin'], localOnly: true });
        }
        // The old password is unknown by design: replace it.
        if (found.username) {
          await api.changePassword(found.id, password);
        } else {
          try {
            await api.createCredentials(found.id, DEVICE_SERVICE_USERNAME, password);
          } catch (error) {
            // The list may not show a username that exists (HA 2026.10 changed these commands).
            if (!isHaError(error) || error.code !== 'credentials_exist') throw error;
            await api.changePassword(found.id, password);
          }
        }
        return found;
      }
    );

    // 5. Log in as the service user, once, to obtain its long-lived token.
    const serviceSession = await login(adapter, clientId, DEVICE_SERVICE_USERNAME, password, null);
    refreshTokensToRevoke.push(serviceSession.refreshToken);
    serviceAccessToken = serviceSession.accessToken;

    // The old tokens are listed first and deleted only after the new one is saved. The ids are
    // a best effort: if HA does not list them, the old ones stay valid until they expire.
    const issued = await adapter.withWs(serviceSession.accessToken, async (api) => {
      const before = await api.longLivedTokenIds().catch(() => null);
      const newToken = await api.longLivedToken(
        DEVICE_SERVICE_TOKEN_NAME,
        DEVICE_SERVICE_TOKEN_LIFESPAN_DAYS
      );
      const after = await api.longLivedTokenIds().catch(() => null);
      const known = new Set(before ?? []);
      return {
        token: newToken,
        oldIds: before ?? [],
        newIds: before && after ? after.filter((id) => !known.has(id)) : [],
      };
    });
    const { token, oldIds } = issued;
    unsavedTokenIds = issued.newIds;

    // 6. The token belongs to the declared user and can write: open a flow and cancel it.
    const checked = await adapter.ws(token).currentUser();
    if (checked.id !== serviceUser.id || !checked.isAdmin) {
      return finish(
        result(
          false,
          'verification_failed',
          'Il token creato non appartiene all’utente di servizio o non ha i permessi attesi.'
        )
      );
    }
    const probe = normalizeFlowResult(await adapter.flowStart(token, 'webostv'), 'webostv');
    if (probe.outcome !== 'step') {
      if (probe.outcome === 'unsupported' && probe.flowId)
        await adapter.flowCancel(token, probe.flowId).catch(() => false);
      return finish(
        result(
          false,
          'verification_failed',
          'Prova di scrittura non riuscita: il flusso del televisore non si apre.'
        )
      );
    }
    await adapter.flowCancel(token, probe.flowId);

    // 7. Save the token and nothing else.
    const created = now();
    store.save({
      version: 1,
      token,
      userId: serviceUser.id,
      userName: DEVICE_SERVICE_USER_NAME,
      createdAt: new Date(created).toISOString(),
      expiresAt: new Date(created + DEVICE_SERVICE_TOKEN_LIFESPAN_DAYS * 86_400_000).toISOString(),
      haVersion,
    });
    unsavedTokenIds = [];

    // The new token is saved: now the older ones can go.
    const notDeleted = await deleteTokens(adapter, serviceSession.accessToken, oldIds);

    return finish(
      result(
        true,
        'activated',
        `Servizio attivato: l’utente «${DEVICE_SERVICE_USER_NAME}» è pronto e il suo accesso è salvato sul server. Nessuna credenziale è stata salvata.` +
          (notDeleted
            ? ' Alcuni token precedenti non sono stati eliminati: puoi toglierli dal profilo dell’utente in Home Assistant.'
            : '')
      )
    );
  } catch (error) {
    if (error instanceof Refusal) return finish(error.outcome);
    if (isHaError(error)) {
      if (error.kind === 'unreachable' || error.kind === 'timeout') {
        return finish(result(false, 'ha_unreachable', 'Home Assistant non è raggiungibile.'));
      }
      if (error.kind === 'protocol') {
        return finish(
          result(
            false,
            'incompatible',
            'Home Assistant non risponde come previsto: questa versione non è stata provata.'
          )
        );
      }
      if (error.kind === 'forbidden' || error.kind === 'unauthorized') {
        return finish(
          result(
            false,
            'not_admin',
            'Home Assistant ha rifiutato l’operazione: serve il proprietario o un amministratore.'
          )
        );
      }
      return finish(
        result(
          false,
          'ha_refused',
          `Home Assistant ha rifiutato un passaggio (${error.code ?? error.kind}).`
        )
      );
    }
    throw error;
  } finally {
    // An activation that did not save its token must not leave it valid in HA.
    if (serviceAccessToken && unsavedTokenIds.length) {
      await deleteTokens(adapter, serviceAccessToken, unsavedTokenIds);
    }
    // Throw away the sessions of this run; the long-lived token is not one of them.
    for (const refreshToken of refreshTokensToRevoke) {
      await adapter.revokeRefreshToken(refreshToken).catch(() => undefined);
    }
  }
};
