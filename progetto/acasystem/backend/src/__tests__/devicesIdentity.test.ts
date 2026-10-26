// @vitest-environment node

import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../cli/deviceServiceIdentity.ts';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createDeviceModel } from '../models/deviceModel.ts';
import { createActionLog } from '../services/devices/actionLog.ts';
import { createHaAdapter } from '../services/devices/haAdapter.ts';
import { createHaTransport } from '../services/devices/haTransport.ts';
import { activateServiceIdentity } from '../services/devices/identityActivation.ts';
import type { ActivationPrompter } from '../services/devices/identityActivation.ts';
import { createDeviceModule } from '../services/devices/index.ts';
import { createServiceIdentityStore } from '../services/devices/serviceIdentity.ts';
import type { ServiceIdentityStore } from '../services/devices/serviceIdentity.ts';
import { dumpDatabase } from './devicesHarness.ts';
import { FakeHomeAssistant } from './fakeHomeAssistant.ts';

/**
 * Activation of the service identity (D1s), run against a fake HA with scripted answers in
 * place of a person at a terminal. The owner's password is a test value: after every run the
 * tests look for it, and for the tokens, in everything the command printed, in the registry,
 * in the database and in the secret file.
 */

const OWNER_PASSWORD = 'owner-password-canary-7731';
const SERVICE_NAME = 'Acasystem (servizio)';

let fake: FakeHomeAssistant;
let database: SqliteDatabase;
let directory: string;
let secretPath: string;

const buildDependencies = () => {
  const transport = createHaTransport({ baseUrls: () => [fake.url] });
  const adapter = createHaAdapter({ transport, callTimeoutMs: 3_000, flowStepTimeoutMs: 5_000 });
  const store = createServiceIdentityStore(() => secretPath);
  const actions = createActionLog(createDeviceModel(database));
  return { adapter, store, actions };
};

interface Script {
  visible: string[];
  hidden: string[];
}

/** A person at a terminal who types these answers in this order. */
const scripted = (script: Script) => {
  const output: string[] = [];
  const asked: string[] = [];
  const prompter: ActivationPrompter = {
    ask: async (question) => {
      asked.push(question);
      output.push(question);
      return script.visible.shift() ?? '';
    },
    askHidden: async (question) => {
      asked.push(question);
      output.push(question);
      return script.hidden.shift() ?? '';
    },
    say: (line) => {
      output.push(line);
    },
  };
  return { prompter, output, asked };
};

const addOwner = (
  options: { mfa?: boolean; isAdmin?: boolean; isOwner?: boolean; username?: string } = {}
) =>
  fake.addUser({
    name: 'Proprietario',
    username: options.username ?? 'proprietario',
    password: OWNER_PASSWORD,
    isAdmin: options.isAdmin ?? true,
    isOwner: options.isOwner ?? true,
    mfa: options.mfa ?? false,
  });

const activate = async (
  script: Script,
  options: {
    reactivate?: boolean;
    rotate?: boolean;
    dataDir?: string;
    allowSecretInDataDir?: boolean;
    allowUnverifiedVersion?: boolean;
    store?: ServiceIdentityStore;
  } = {}
) => {
  const session = scripted(script);
  const result = await activateServiceIdentity({
    ...buildDependencies(),
    prompter: session.prompter,
    ...options,
  });
  return { ...session, result };
};

/** Long-lived tokens of a user in the fake HA. */
const longLivedOf = (userId: string): string[] =>
  [...fake.tokens.entries()]
    .filter(([, info]) => info.userId === userId && info.kind === 'llat')
    .map(([token]) => token);

const secretContent = (): string => readFileSync(secretPath, 'utf8');
const serviceUsers = () => [...fake.users.values()].filter((user) => user.name === SERVICE_NAME);

/** Looks for the values that must never be printed, stored or logged. */
const expectNoSecretsOutsideTheFile = (output: string[]): void => {
  const printed = output.join('\n');
  const token = (JSON.parse(secretContent()) as { token: string }).token;
  const servicePassword = serviceUsers()[0]?.password ?? 'no-service-password';
  const everything = [printed, dumpDatabase(database)].join('\n');

  for (const secret of [OWNER_PASSWORD, token, servicePassword]) {
    expect(everything).not.toContain(secret);
  }
  // Only the secret file holds the token, and it holds nothing else of this run.
  expect(secretContent()).not.toContain(OWNER_PASSWORD);
  expect(secretContent()).not.toContain(servicePassword);
  expect(readdirSync(join(directory, 'secrets'))).toEqual(['service-identity.json']);
};

beforeEach(async () => {
  fake = new FakeHomeAssistant();
  await fake.start();
  database = openDatabase(':memory:');
  directory = mkdtempSync(join(tmpdir(), 'aca-identity-'));
  secretPath = join(directory, 'secrets', 'service-identity.json');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await fake.stop();
  database.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('activating the service identity', () => {
  it('creates the declared user, saves only its token, and discards everything else', async () => {
    const owner = addOwner();
    const { result, output } = await activate({
      visible: ['proprietario'],
      hidden: [OWNER_PASSWORD],
    });

    expect(result).toMatchObject({ ok: true, code: 'activated' });
    expect(result.message).toContain(SERVICE_NAME);

    // The user exists in HA, declared by name, in the administrators group, local only.
    const [service] = serviceUsers();
    expect(serviceUsers()).toHaveLength(1);
    expect(service).toMatchObject({
      isAdmin: true,
      isOwner: false,
      active: true,
      localOnly: true,
      username: 'acasystem_servizio',
    });

    // The secret is the long-lived token of that user, with the expected shape and end date.
    const secret = JSON.parse(secretContent()) as Record<string, unknown>;
    expect(secret).toMatchObject({
      version: 1,
      userId: service?.id,
      userName: SERVICE_NAME,
      haVersion: '2026.9.4',
    });
    expect(fake.tokens.get(String(secret.token))).toMatchObject({
      userId: service?.id,
      kind: 'llat',
    });
    const expires = Date.parse(String(secret.expiresAt));
    expect(expires - Date.now()).toBeGreaterThan(3600 * 86_400_000);

    // The two login sessions of the run were revoked; the long-lived token was not.
    expect(fake.revoked).toHaveLength(2);
    expect(fake.tokens.has(String(secret.token))).toBe(true);
    expect(
      [...fake.tokens.values()].filter(
        (info) => info.kind === 'refresh' && info.userId === owner.user.id
      )
    ).toHaveLength(0);

    // The write proof: a flow was opened and cancelled as the service user, nothing was added.
    const flowStarts = fake.callsFor('POST /api/config/config_entries/flow');
    expect(flowStarts).toHaveLength(1);
    expect(flowStarts[0]).toMatchObject({ userId: service?.id, tokenKind: 'llat' });
    expect(fake.callsFor('DELETE /api/config/config_entries/flow/{flow_id}')).toHaveLength(1);
    expect(fake.flows.size).toBe(0);
    expect(fake.entries).toHaveLength(0);

    // The registry has one line, with the owner as the person and no secret.
    expect(database.prepare('SELECT * FROM device_actions').all()).toEqual([
      expect.objectContaining({
        action: 'service.activate',
        source: 'cli',
        outcome: 'ok',
        code: 'activated',
        ha_user_id: owner.user.id,
      }),
    ]);
    expectNoSecretsOutsideTheFile([...output, result.message]);
  });

  it('gives the facade a working identity: the secret written by the command is the one the server reads', async () => {
    addOwner();
    await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });

    const devices = createDeviceModule(database, {
      haUrls: () => [fake.url],
      secretPath: () => secretPath,
      log: () => undefined,
      pollIntervalMs: 10,
    });
    expect(await devices.identity.status({ force: true })).toMatchObject({ state: 'active' });

    const user = { id: 'tablet-user', name: 'Cliente', isAdmin: false };
    const started = await devices.service.startFlow(user, 'webostv');
    expect(started).toMatchObject({ type: 'form', stepId: 'user' });
    devices.stop();
  });

  it('is idempotent: with a working identity it asks nothing and changes nothing', async () => {
    addOwner();
    await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    const before = secretContent();
    const users = fake.users.size;

    const again = await activate({ visible: [], hidden: [] });
    expect(again.result).toMatchObject({ ok: true, code: 'already_active' });
    expect(again.asked).toEqual([]);
    expect(secretContent()).toBe(before);
    expect(fake.users.size).toBe(users);
  });

  it('creates a new token with --rotate, reusing the same user and replacing its password', async () => {
    addOwner();
    await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    const first = JSON.parse(secretContent()) as { token: string };
    const firstPassword = serviceUsers()[0]?.password;

    const rotated = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { rotate: true }
    );
    expect(rotated.result).toMatchObject({ ok: true, code: 'activated' });

    const second = JSON.parse(secretContent()) as { token: string };
    expect(second.token).not.toBe(first.token);
    expect(serviceUsers()).toHaveLength(1);
    expect(serviceUsers()[0]?.password).not.toBe(firstPassword);
    // The previous long-lived token of the service user was deleted (best effort).
    expect(fake.tokens.has(first.token)).toBe(false);
    expect(fake.tokens.has(second.token)).toBe(true);
    expectNoSecretsOutsideTheFile(rotated.output);
  });

  it('recreates the identity when the saved one no longer works', async () => {
    addOwner();
    await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    const first = JSON.parse(secretContent()) as { token: string };
    fake.tokens.delete(first.token);

    const again = await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    expect(again.result).toMatchObject({ ok: true, code: 'activated' });
    expect(again.output.join('\n')).toContain('non funziona più');
    expect((JSON.parse(secretContent()) as { token: string }).token).not.toBe(first.token);
    expect(serviceUsers()).toHaveLength(1);
  });

  it('reuses an existing user of that name, fixing its group and its local-only flag', async () => {
    addOwner();
    const existing = fake.addUser({
      name: SERVICE_NAME,
      username: 'acasystem_servizio',
      password: 'old-service-password',
      isAdmin: false,
      localOnly: false,
    });

    const { result } = await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    expect(result.code).toBe('activated');
    expect(serviceUsers()).toHaveLength(1);
    expect(existing.user).toMatchObject({ isAdmin: true, localOnly: true });
    expect(existing.user.password).not.toBe('old-service-password');
  });

  it('does not reactivate a suspended user unless asked: suspending is how the service is revoked', async () => {
    addOwner();
    const suspended = fake.addUser({
      name: SERVICE_NAME,
      username: 'acasystem_servizio',
      password: 'x',
      isAdmin: true,
      localOnly: true,
      active: false,
    });

    const refused = await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    expect(refused.result).toMatchObject({ ok: false, code: 'user_suspended' });
    expect(refused.result.message).toContain('--reactivate');
    expect(suspended.user.active).toBe(false);
    expect(() => readFileSync(secretPath)).toThrow();

    const reactivated = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { reactivate: true }
    );
    expect(reactivated.result).toMatchObject({ ok: true, code: 'activated' });
    expect(suspended.user.active).toBe(true);
  });

  it('refuses a wrong password without creating anything or printing it', async () => {
    addOwner();
    const { result, output } = await activate({
      visible: ['proprietario'],
      hidden: ['wrong-password-canary-1'],
    });

    expect(result).toMatchObject({ ok: false, code: 'invalid_credentials' });
    expect(serviceUsers()).toHaveLength(0);
    expect(() => readFileSync(secretPath)).toThrow();
    expect([...output, result.message].join('\n')).not.toContain('wrong-password-canary-1');
    expect(database.prepare('SELECT code, outcome FROM device_actions').all()).toEqual([
      { code: 'invalid_credentials', outcome: 'error' },
    ]);
  });

  it('refuses credentials that are not an administrator', async () => {
    fake.addUser({
      name: 'Cliente',
      username: 'cliente',
      password: 'client-password',
      isAdmin: false,
    });
    const { result } = await activate({ visible: ['cliente'], hidden: ['client-password'] });

    expect(result).toMatchObject({ ok: false, code: 'not_admin' });
    expect(serviceUsers()).toHaveLength(0);
    expect(() => readFileSync(secretPath)).toThrow();
  });

  it('asks for the verification code when the owner has two-step login', async () => {
    addOwner({ mfa: true });
    const { result, asked } = await activate({
      visible: ['proprietario'],
      hidden: [OWNER_PASSWORD, '123456'],
    });

    expect(result).toMatchObject({ ok: true, code: 'activated' });
    expect(asked.filter((question) => question.includes('Codice di verifica'))).toHaveLength(1);
  });

  it('refuses a wrong verification code', async () => {
    addOwner({ mfa: true });
    const { result } = await activate({
      visible: ['proprietario'],
      hidden: [OWNER_PASSWORD, '000000'],
    });

    expect(result).toMatchObject({ ok: false, code: 'invalid_credentials' });
    expect(serviceUsers()).toHaveLength(0);
  });

  it('stops without asking anything while HA has not been set up, or is not reachable', async () => {
    fake.knobs.onboarded = false;
    const notReady = await activate({ visible: [], hidden: [] });
    expect(notReady.result).toMatchObject({ ok: false, code: 'ha_not_ready' });
    expect(notReady.asked).toEqual([]);

    await fake.stop();
    const down = await activate({ visible: [], hidden: [] });
    expect(down.result).toMatchObject({ ok: false, code: 'ha_unreachable' });
    expect(down.asked).toEqual([]);
  });

  it('is cancelled when no credentials are typed', async () => {
    addOwner();
    const { result } = await activate({ visible: [''], hidden: [''] });
    expect(result).toMatchObject({ ok: false, code: 'cancelled' });
    expect(fake.calls.filter((call) => call.route === 'POST /auth/token')).toHaveLength(0);
  });

  it('replaces the password of an existing user whose credentials HA does not list', async () => {
    addOwner();
    const existing = fake.addUser({
      name: SERVICE_NAME,
      username: 'acasystem_servizio',
      password: 'old-service-password',
      isAdmin: true,
      localOnly: true,
    });
    fake.knobs.omitUsernamesInList = true;

    const { result } = await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    expect(result).toMatchObject({ ok: true, code: 'activated' });
    expect(existing.user.password).not.toBe('old-service-password');
    expect(serviceUsers()).toHaveLength(1);
  });

  it('creates the credentials of an existing user that has none', async () => {
    addOwner();
    const existing = fake.addUser({
      name: SERVICE_NAME,
      username: null,
      isAdmin: true,
      localOnly: true,
    });

    const { result } = await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    expect(result.code).toBe('activated');
    expect(existing.user.username).toBe('acasystem_servizio');
  });
});

describe('rotating the token and finding the user', () => {
  const firstActivation = async () => {
    addOwner();
    await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    const saved = (JSON.parse(secretContent()) as { token: string; userId: string });
    return saved;
  };

  it('deletes the old token only after the new one is saved', async () => {
    const first = await firstActivation();
    const order: string[] = [];
    const store = buildDependencies().store;
    const spying: ServiceIdentityStore = {
      path: store.path,
      load: () => store.load(),
      save: (secret) => {
        // At the moment of the save the old token is still valid in HA.
        order.push(fake.tokens.has(first.token) ? 'save-while-old-valid' : 'save-after-old-gone');
        store.save(secret);
      },
      remove: () => store.remove(),
    };

    const rotated = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { rotate: true, store: spying }
    );

    expect(rotated.result).toMatchObject({ ok: true, code: 'activated' });
    expect(order).toEqual(['save-while-old-valid']);
    const second = JSON.parse(secretContent()) as { token: string };
    expect(longLivedOf(first.userId)).toEqual([second.token]);
  });

  it('keeps the old token working when the check of the new one fails, and deletes the new one', async () => {
    const first = await firstActivation();
    // The proof of write gets an answer the facade does not accept as a form.
    fake.knobs.overrideNextResult = { type: 'abort', reason: 'not_supported' };

    const rotated = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { rotate: true }
    );

    expect(rotated.result.ok).toBe(false);
    expect((JSON.parse(secretContent()) as { token: string }).token).toBe(first.token);
    expect(longLivedOf(first.userId)).toEqual([first.token]);
    expectNoSecretsOutsideTheFile(rotated.output);
  });

  it('keeps the old token working when the new one cannot be saved, and deletes the new one', async () => {
    const first = await firstActivation();
    const real = buildDependencies().store;
    const broken: ServiceIdentityStore = {
      path: real.path,
      load: () => real.load(),
      save: () => {
        throw new Error('disk full');
      },
      remove: () => real.remove(),
    };

    await expect(
      activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] }, { rotate: true, store: broken })
    ).rejects.toThrow('disk full');

    expect((JSON.parse(secretContent()) as { token: string }).token).toBe(first.token);
    expect(longLivedOf(first.userId)).toEqual([first.token]);
    // The sessions of the run were revoked even so.
    expect(
      [...fake.tokens.values()].filter((info) => info.kind === 'refresh' && info.userId === first.userId)
    ).toHaveLength(0);
  });

  it('succeeds and says so when an old token cannot be deleted', async () => {
    const first = await firstActivation();
    fake.knobs.tokenDeletionFails = true;

    const rotated = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { rotate: true }
    );

    expect(rotated.result).toMatchObject({ ok: true, code: 'activated' });
    expect(rotated.result.message).toContain('token precedenti');
    const second = JSON.parse(secretContent()) as { token: string };
    expect(second.token).not.toBe(first.token);
    expect(longLivedOf(first.userId).sort()).toEqual([first.token, second.token].sort());
  });

  it('still activates when HA does not list the tokens: the old ones expire by themselves', async () => {
    const first = await firstActivation();
    fake.knobs.tokenListMissing = true;

    const rotated = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { rotate: true }
    );

    expect(rotated.result).toMatchObject({ ok: true, code: 'activated' });
    expect((JSON.parse(secretContent()) as { token: string }).token).not.toBe(first.token);
  });

  it('never touches an account with that name but another login name', async () => {
    addOwner();
    const other = fake.addUser({
      name: SERVICE_NAME,
      username: 'mario',
      password: 'mario-password',
      isAdmin: false,
      localOnly: false,
    });

    const { result } = await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });

    expect(result).toMatchObject({ ok: false, code: 'user_conflict' });
    expect(other.user).toMatchObject({
      username: 'mario',
      password: 'mario-password',
      isAdmin: false,
      localOnly: false,
      active: true,
    });
    expect(serviceUsers()).toHaveLength(1);
    expect(fake.users.size).toBe(2);
    expect(() => readFileSync(secretPath)).toThrow();
  });

  it('never touches the owner, even when the owner carries that name', async () => {
    const { user } = addOwner();
    user.name = SERVICE_NAME;

    const { result } = await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });

    expect(result).toMatchObject({ ok: false, code: 'user_conflict' });
    expect(user.password).toBe(OWNER_PASSWORD);
    expect(() => readFileSync(secretPath)).toThrow();
  });
});

describe('the version of Home Assistant', () => {
  it('stops before asking for any credential on a version that was neither verified nor compared', async () => {
    addOwner();
    fake.knobs.version = '2099.1.0';

    const { result, asked } = await activate({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });

    expect(result).toMatchObject({ ok: false, code: 'incompatible' });
    expect(result.message).toContain('DEVICES_ALLOW_UNVERIFIED_HA_VERSION');
    expect(asked).toEqual([]);
    expect(fake.calls.filter((call) => call.route.startsWith('config/auth'))).toHaveLength(0);
    expect(() => readFileSync(secretPath)).toThrow();
  });

  it('goes on when the installer allows it on purpose, and on the version only compared with the source', async () => {
    addOwner();
    fake.knobs.version = '2099.1.0';
    const allowed = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { allowUnverifiedVersion: true }
    );
    expect(allowed.result).toMatchObject({ ok: true, code: 'activated' });

    fake.knobs.version = '2026.10.2';
    const compared = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { rotate: true }
    );
    expect(compared.result).toMatchObject({ ok: true, code: 'activated' });
  });
});

describe('where the secret is saved', () => {
  it('refuses to save inside the data volume, before asking for any credential', async () => {
    addOwner();
    const { result, asked } = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { dataDir: directory }
    );

    expect(result).toMatchObject({ ok: false, code: 'secret_location' });
    expect(result.message).toContain('TUNET_SERVICE_SECRET_FILE');
    expect(asked).toEqual([]);
    expect(fake.calls).toHaveLength(0);
    expect(serviceUsers()).toHaveLength(0);
    expect(() => readFileSync(secretPath)).toThrow();
  });

  it('accepts it only when the installer allows it on purpose, and warns', async () => {
    addOwner();
    const { result, output } = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { dataDir: directory, allowSecretInDataDir: true }
    );

    expect(result).toMatchObject({ ok: true, code: 'activated' });
    expect(output.join('\n')).toContain('volume dei dati');
  });

  it('saves without a word when the secret is outside the data volume', async () => {
    addOwner();
    const { result, output } = await activate(
      { visible: ['proprietario'], hidden: [OWNER_PASSWORD] },
      { dataDir: join(directory, 'altrove') }
    );

    expect(result.code).toBe('activated');
    expect(output.join('\n')).not.toContain('volume dei dati');
  });

  it('is decided by the environment on the command line, and `status` reminds the installer', async () => {
    addOwner();
    const lines: string[] = [];
    const run = async (argv: string[]) => {
      const session = scripted({ visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
      lines.length = 0;
      const code = await runCli(
        argv,
        { print: (line) => lines.push(line), prompter: session.prompter },
        buildDependencies()
      );
      return code;
    };

    vi.stubEnv('DATA_DIR', directory);
    expect(await run(['activate'])).toBe(1);
    expect(lines.join('\n')).toContain('TUNET_SERVICE_SECRET_FILE');
    expect(() => readFileSync(secretPath)).toThrow();

    vi.stubEnv('TUNET_SERVICE_SECRET_ALLOW_DATA_DIR', '1');
    expect(await run(['activate'])).toBe(0);
    expect(await run(['status'])).toBe(0);
    expect(lines.join('\n')).toContain('Attenzione');
    expect(lines.join('\n')).not.toContain(
      (JSON.parse(secretContent()) as { token: string }).token
    );
  });
});

describe('the command line', () => {
  const run = async (argv: string[], interactive: Script | null) => {
    const lines: string[] = [];
    const session = interactive ? scripted(interactive) : null;
    const code = await runCli(
      argv,
      { print: (line) => lines.push(line), prompter: session?.prompter ?? null },
      buildDependencies()
    );
    return { code, lines, output: [...lines, ...(session?.output ?? [])] };
  };

  it('refuses to ask for credentials without an interactive terminal, and never reads them from anywhere else', async () => {
    addOwner();
    const result = await run(['activate'], null);

    expect(result.code).toBe(2);
    expect(result.lines.join('\n')).toContain('terminale interattivo');
    expect(fake.calls).toHaveLength(0);
    expect(serviceUsers()).toHaveLength(0);
  });

  it('activates on an interactive terminal and prints only the outcome', async () => {
    addOwner();
    const result = await run(['activate'], { visible: ['proprietario'], hidden: [OWNER_PASSWORD] });

    expect(result.code).toBe(0);
    expect(result.lines.at(-1)).toContain('Servizio attivato');
    expectNoSecretsOutsideTheFile(result.output);
  });

  it('reports the state without secrets and with an exit code, and forgets the local secret', async () => {
    addOwner();
    const before = await run(['status'], null);
    expect(before.code).toBe(1);
    expect(before.lines.join('\n')).toContain('non è stato attivato');

    await run(['activate'], { visible: ['proprietario'], hidden: [OWNER_PASSWORD] });
    const after = await run(['status'], null);
    expect(after.code).toBe(0);
    expect(after.lines[0]).toContain('attivo');
    expect(after.lines.join('\n')).not.toContain(
      (JSON.parse(secretContent()) as { token: string }).token
    );

    const forgotten = await run(['forget'], null);
    expect(forgotten.code).toBe(0);
    expect(forgotten.lines.join('\n')).toContain('sospendilo o eliminalo');
    expect(() => readFileSync(secretPath)).toThrow();
    // HA still has the user: forgetting is local only.
    expect(serviceUsers()).toHaveLength(1);
  });

  it('shows the usage for an unknown command or flag', async () => {
    for (const argv of [[], ['frobnicate'], ['activate', '--password=x']]) {
      const result = await run(argv, null);
      expect(result.code).toBe(2);
      expect(result.lines.join('\n')).toContain('Uso:');
    }
  });
});
