import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';

/**
 * A fake Home Assistant for the tests of the device facade: REST and WebSocket on a local
 * port, with users, tokens, permissions (administrators only where HA requires them),
 * configuration flows for `webostv` and `wake_on_lan`, registries, automations and the
 * `supported_features` of the TV media player. It is a model of the behaviour described in
 * REP-20261023-003, not a recording of a real HA: nothing in it was observed on a real HA.
 *
 * Every call is logged with the user it was made as, so the tests can prove which token was
 * used for what.
 */

export interface FakeUser {
  id: string;
  name: string;
  username: string | null;
  password: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  active: boolean;
  localOnly: boolean;
  /** Asks for a verification code after the password. */
  mfa: boolean;
}

interface TokenInfo {
  userId: string;
  kind: 'access' | 'refresh' | 'llat';
  parent?: string;
  /** Id of a refresh or long-lived token (what `auth/refresh_tokens` lists). */
  id?: string;
}

export interface FakeCall {
  via: 'rest' | 'ws';
  route: string;
  /** Id in the path (flow, entry, automation), when the route has one. */
  target?: string;
  userId: string | null;
  tokenKind: TokenInfo['kind'] | null;
}

interface FakeEntry {
  entry_id: string;
  domain: string;
  title: string;
  loadedAt: number;
  host: string | null;
  mac: string | null;
  /** State reported instead of the computed one (a TV that is off shows `setup_retry`). */
  forcedState?: string;
  /** Origin of the entry: `user` by default, the discovery when it was added from one. */
  source?: string;
}

interface FakeDevice {
  id: string;
  name: string;
  name_by_user: string | null;
  manufacturer: string;
  model: string;
  area_id: string | null;
  primary_config_entry: string;
  connections: string[][];
  serial_number: string;
}

interface FakeEntity {
  entity_id: string;
  platform: string;
  device_id: string;
  config_entry_id: string;
  hidden_by: string | null;
  disabled_by: string | null;
}

/** One step of a scripted flow, as a discovered integration would show it. */
export interface ScriptedStep {
  stepId: string;
  /** `data_schema` as HA sends it; fields with `required: true` must be in the answer. */
  schema?: unknown[];
  /** `form` by default. */
  type?: 'form' | 'menu' | 'external' | 'progress';
  /** An error key to show on the same step (a wrong PIN), or null to go on. */
  check?: (body: Record<string, unknown>) => string | null;
  /** An abort reason: the flow ends with it when the answer fits. */
  abort?: (body: Record<string, unknown>) => string | null;
  /** `menu`: the ids of the options (the next step ids), or a map id -> label. */
  menuOptions?: string[] | Record<string, string>;
  /** `external`: the page of the maker. Default `https://login.example.test/authorize`. */
  url?: string;
  /** `progress`: the task key HA sends as `progress_action`. */
  progressAction?: string;
  /** `description_placeholders` HA sends with the step. */
  placeholders?: Record<string, string>;
  /** `external` and `progress`: the read of the flow that moves it on (default: never, until the test says). */
  readsBeforeNext?: number;
  /** `external` and `progress`: the type HA answers once, before the next step. */
  doneType?: 'external_done' | 'progress_done';
}

export interface ScriptedEntry {
  title: string;
  manufacturer: string;
  model: string;
  entityId: string;
}

export interface DiscoveryOptions {
  handler: string;
  /** Origin of the flow: `zeroconf` by default. */
  source?: string;
  name?: string;
  model?: string;
  /** `null` leaves the flow without a unique id (HA cannot ignore it). */
  uniqueId?: string | null;
  steps: ScriptedStep[];
  entry: ScriptedEntry;
}

interface FakeFlow {
  id: string;
  handler: string;
  step: string;
  host: string | null;
  /** `user` for a flow a person started; HA leaves those out of the list in progress. */
  source?: string;
  placeholders?: Record<string, string>;
  uniqueId?: string | null;
  script?: { steps: ScriptedStep[]; index: number; entry: ScriptedEntry };
  /** Reads of the flow while it waits at an `external` or `progress` step. */
  reads?: number;
  doneSent?: boolean;
}

export interface FakeKnobs {
  version: string;
  onboarded: boolean;
  /** Milliseconds the `pairing` step keeps the call open. */
  pairingDelayMs: number;
  pairingOutcome: 'accept' | 'not_pressed' | 'cannot_connect';
  /** Milliseconds from creation to the `loaded` state of a new entry. */
  loadDelayMs: number;
  unreachableHosts: string[];
  /** Whether the device registry of the TV holds a MAC in `connections`. */
  tvMacInRegistry: string | null;
  /** Trigger forms that make the TV show the turn-on feature. */
  acceptedTriggerForms: ('device' | 'platform')[];
  /** `auth/refresh_tokens` answers `unknown_command`. */
  tokenListMissing: boolean;
  /** `auth/delete_refresh_token` fails. */
  tokenDeletionFails: boolean;
  /** `flow_handlers` without these domains. */
  hiddenHandlers: string[];
  /** The route DELETE of an unknown flow answers a different body (RD-03 fails). */
  flowDeleteBodyChanged: boolean;
  /** `config/area_registry/create` refuses the name (HA found a duplicate after its own rules). */
  areaCreateRefused: boolean;
  /** `config/device_registry/update` fails with a server error. */
  deviceUpdateFails: boolean;
  /** Writing an automation answers 500. */
  automationPutFails: boolean;
  /** DELETE of an unknown flow answers 500 (RD-03 cannot run). */
  flowDeleteServerError: boolean;
  /** GET of an unknown automation answers 500 (RD-07 cannot run). */
  automationGetServerError: boolean;
  /** GET of an unknown automation answers a different body (RD-07 fails). */
  automationRouteChanged: boolean;
  /** `config/auth/list` leaves the user names out (credentials exist, but are not listed). */
  omitUsernamesInList: boolean;
  /** Returned once instead of the next flow result (a type or field the facade must refuse). */
  overrideNextResult: Record<string, unknown> | null;
  /** `frontend/get_translations` answers `unknown_command` (an HA without it). */
  translationsMissing: boolean;
  /** `result.resources` of `frontend/get_translations`, per integration. */
  translations: Record<string, Record<string, string>>;
  /** First event (`{add: [...]}`) of the `ssdp`, `zeroconf` and `dhcp` `subscribe_discovery`. */
  network: { ssdp: unknown[]; zeroconf: unknown[]; dhcp: unknown[] };
  /** Sources whose subscription answers `unknown_command` (an HA without it). */
  networkMissing: ('ssdp' | 'zeroconf' | 'dhcp')[];
}

const BASE_FEATURES = 1028;
const TURN_ON = 128;
const OWNER_CODE = '123456';

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
};

const entryId = (): string =>
  Array.from(randomBytes(26), (byte) => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[byte % 32]).join('');

export class FakeHomeAssistant {
  knobs: FakeKnobs = {
    version: '2026.9.4',
    onboarded: true,
    pairingDelayMs: 0,
    pairingOutcome: 'accept',
    loadDelayMs: 0,
    unreachableHosts: [],
    tvMacInRegistry: null,
    acceptedTriggerForms: ['device', 'platform'],
    tokenListMissing: false,
    tokenDeletionFails: false,
    hiddenHandlers: [],
    flowDeleteBodyChanged: false,
    areaCreateRefused: false,
    deviceUpdateFails: false,
    automationPutFails: false,
    flowDeleteServerError: false,
    automationGetServerError: false,
    automationRouteChanged: false,
    omitUsernamesInList: false,
    overrideNextResult: null,
    translationsMissing: false,
    translations: {},
    network: { ssdp: [], zeroconf: [], dhcp: [] },
    networkMissing: [],
  };

  users = new Map<string, FakeUser>();
  tokens = new Map<string, TokenInfo>();
  authCodes = new Map<string, { userId: string; clientId: string }>();
  loginFlows = new Map<string, { step: 'init' | 'mfa'; userId: string | null }>();
  calls: FakeCall[] = [];
  revoked: string[] = [];

  entries: FakeEntry[] = [];
  devices: FakeDevice[] = [];
  entities: FakeEntity[] = [];
  areas: { area_id: string; name: string }[] = [];
  automations = new Map<string, Record<string, unknown>>();
  flows = new Map<string, FakeFlow>();
  /** Integrations a person can start from the catalogue, with the steps of their flow. */
  scriptedHandlers = new Map<string, { steps: ScriptedStep[]; entry: ScriptedEntry }>();
  /** Answers received by the scripted flows (what Acasystem sent to HA, step by step). */
  received: { flowId: string; stepId: string; body: Record<string, unknown> }[] = [];
  /** Discoveries ignored through `config_entries/ignore_flow`. */
  ignored: { flowId: string; title: string }[] = [];

  url = '';
  port = 0;
  private server: Server | null = null;
  private wsServer: WebSocketServer | null = null;

  // --- Test controls ---------------------------------------------------------------------

  /** Adds a user with a fresh access token; returns the token. */
  addUser(options: Partial<FakeUser> & { name: string }): { user: FakeUser; token: string } {
    const user: FakeUser = {
      id: randomUUID().replaceAll('-', ''),
      username: null,
      password: null,
      isAdmin: false,
      isOwner: false,
      active: true,
      localOnly: false,
      mfa: false,
      ...options,
    };
    this.users.set(user.id, user);
    const token = `test-access-${randomBytes(24).toString('hex')}`;
    this.tokens.set(token, { userId: user.id, kind: 'access' });
    return { user, token };
  }

  tokenFor(userId: string, kind: TokenInfo['kind'] = 'llat'): string {
    const token = `test-${kind}-${randomBytes(24).toString('hex')}`;
    this.tokens.set(token, {
      userId,
      kind,
      id: kind === 'access' ? undefined : randomUUID().replaceAll('-', ''),
    });
    return token;
  }

  userByName(name: string): FakeUser | undefined {
    return [...this.users.values()].find((user) => user.name === name);
  }

  /** Calls of one route, without the no-effect probes of the compatibility check. */
  callsFor(route: string): FakeCall[] {
    return this.calls.filter((call) => call.route === route && call.target !== 'acasystem-sonda');
  }

  resetCalls(): void {
    this.calls = [];
  }

  /** Home Assistant restarts: flows (kept in memory) are lost, everything else stays. */
  forgetFlows(): void {
    this.flows.clear();
  }

  /** A device that HA found by itself: a flow in progress with a discovery as origin. */
  seedDiscovery(options: DiscoveryOptions): string {
    const first = options.steps[0];
    if (!first) throw new Error('a discovery needs at least one step');
    const flow: FakeFlow = {
      id: randomUUID().replaceAll('-', ''),
      handler: options.handler,
      step: first.stepId,
      host: null,
      source: options.source ?? 'zeroconf',
      placeholders: {
        ...(options.name ? { name: options.name } : {}),
        ...(options.model ? { model: options.model } : {}),
      },
      uniqueId: options.uniqueId === undefined ? `uid-${options.handler}` : options.uniqueId,
      script: { steps: options.steps, index: 0, entry: options.entry },
    };
    this.flows.set(flow.id, flow);
    return flow.id;
  }

  /** An integration in the catalogue whose flow (started by a person) follows these steps. */
  scriptHandler(handler: string, options: { steps: ScriptedStep[]; entry: ScriptedEntry }): void {
    if (!options.steps[0]) throw new Error('a flow needs at least one step');
    this.scriptedHandlers.set(handler, options);
  }

  /** A TV that was already added, as it would be after the flow. */
  seedTv(options: { host?: string; mac?: string | null } = {}): FakeEntry {
    return this.createTvEntry(
      options.host ?? '192.168.1.99',
      options.mac ?? this.knobs.tvMacInRegistry
    );
  }

  /** A Wake on LAN entry that already exists, as if configured before. */
  seedWakeOnLan(mac: string): FakeEntry {
    return this.createWolEntry(mac);
  }

  // --- Server ----------------------------------------------------------------------------

  async start(port = 0): Promise<void> {
    const server = createServer((req, res) => {
      this.handleHttp(req, res).catch(() => {
        res.statusCode = 500;
        res.end('{"message":"fake error"}');
      });
    });
    const wsServer = new WebSocketServer({ server, path: '/api/websocket' });
    wsServer.on('connection', (socket) => this.handleSocket(socket));

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
    this.server = server;
    this.wsServer = wsServer;
    this.port = (server.address() as AddressInfo).port;
    this.url = `http://127.0.0.1:${this.port}`;
  }

  async stop(): Promise<void> {
    const { server, wsServer } = this;
    this.server = null;
    this.wsServer = null;
    wsServer?.clients.forEach((client) => client.terminate());
    wsServer?.close();
    await new Promise<void>((resolve) => {
      if (!server) resolve();
      else {
        server.closeAllConnections();
        server.close(() => resolve());
      }
    });
  }

  /** Stops and starts again on the same port, like a restart of HA. */
  async restart(): Promise<void> {
    await this.stop();
    this.forgetFlows();
    await this.start(this.port);
  }

  // --- Auth ------------------------------------------------------------------------------

  private userForToken(
    token: string | null,
    kinds: TokenInfo['kind'][]
  ): { user: FakeUser; info: TokenInfo } | null {
    if (!token) return null;
    const info = this.tokens.get(token);
    if (!info || !kinds.includes(info.kind)) return null;
    const user = this.users.get(info.userId);
    if (!user || !user.active) return null;
    return { user, info };
  }

  private bearer(req: IncomingMessage): string | null {
    const header = req.headers.authorization;
    return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
  }

  // --- REST ------------------------------------------------------------------------------

  private async handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://fake');
    const path = url.pathname;
    const method = req.method ?? 'GET';
    const raw = await readBody(req);
    const contentType = req.headers['content-type'] ?? '';
    const parsedBody: Record<string, unknown> = (() => {
      if (!raw) return {};
      try {
        if (contentType.includes('application/x-www-form-urlencoded')) {
          return Object.fromEntries(new URLSearchParams(raw));
        }
        const value: unknown = JSON.parse(raw);
        return typeof value === 'object' && value !== null
          ? (value as Record<string, unknown>)
          : {};
      } catch {
        return {};
      }
    })();

    const auth = this.userForToken(this.bearer(req), ['access', 'llat']);
    const send = (status: number, body: unknown) => {
      const target = /\/(?:flow|entry|config|login_flow)\/([A-Za-z0-9_-]+)$/.exec(path)?.[1];
      this.calls.push({
        via: 'rest',
        route: `${method} ${this.routeLabel(path)}`,
        ...(target ? { target } : {}),
        userId: auth?.user.id ?? null,
        tokenKind: auth?.info.kind ?? null,
      });
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(body === undefined ? '' : JSON.stringify(body));
    };
    const requireUser = (): FakeUser | null => {
      if (!auth) {
        send(401, { message: 'Unauthorized' });
        return null;
      }
      return auth.user;
    };
    const requireAdmin = (): FakeUser | null => {
      const user = requireUser();
      if (!user) return null;
      if (!user.isAdmin) {
        send(401, { message: 'Unauthorized' });
        return null;
      }
      return user;
    };

    // --- Login and tokens ---------------------------------------------------------------
    if (method === 'GET' && path === '/auth/providers') {
      if (!this.knobs.onboarded) {
        return send(400, { message: 'Onboarding not finished', code: 'onboarding_required' });
      }
      return send(200, {
        providers: [{ name: 'Home Assistant Local', id: null, type: 'homeassistant' }],
      });
    }

    if (method === 'POST' && path === '/auth/login_flow') {
      const clientId = parsedBody.client_id;
      if (typeof clientId !== 'string' || typeof parsedBody.redirect_uri !== 'string') {
        return send(400, { message: 'Invalid client id or redirect uri' });
      }
      const id = randomUUID().replaceAll('-', '');
      this.loginFlows.set(id, { step: 'init', userId: null });
      return send(200, this.loginForm(id, 'init', null));
    }

    const loginMatch = /^\/auth\/login_flow\/([A-Za-z0-9]+)$/.exec(path);
    if (method === 'POST' && loginMatch) {
      const id = loginMatch[1] ?? '';
      const flow = this.loginFlows.get(id);
      if (!flow) return send(404, { message: 'Invalid flow specified' });
      return send(200, this.loginStep(id, flow, parsedBody));
    }

    if (method === 'POST' && path === '/auth/token') {
      const code = typeof parsedBody.code === 'string' ? parsedBody.code : '';
      const found = this.authCodes.get(code);
      if (
        parsedBody.grant_type !== 'authorization_code' ||
        !found ||
        found.clientId !== parsedBody.client_id
      ) {
        return send(400, { error: 'invalid_request' });
      }
      this.authCodes.delete(code);
      const refresh = `test-refresh-${randomBytes(24).toString('hex')}`;
      const access = `test-access-${randomBytes(24).toString('hex')}`;
      this.tokens.set(refresh, {
        userId: found.userId,
        kind: 'refresh',
        id: randomUUID().replaceAll('-', ''),
      });
      this.tokens.set(access, { userId: found.userId, kind: 'access', parent: refresh });
      return send(200, {
        access_token: access,
        token_type: 'Bearer',
        refresh_token: refresh,
        expires_in: 1800,
      });
    }

    if (method === 'POST' && path === '/auth/revoke') {
      const token = typeof parsedBody.token === 'string' ? parsedBody.token : '';
      this.revoked.push(token);
      this.tokens.delete(token);
      for (const [key, info] of this.tokens) if (info.parent === token) this.tokens.delete(key);
      return send(200, undefined);
    }

    // --- Configuration API --------------------------------------------------------------
    if (method === 'GET' && path === '/api/config/config_entries/flow_handlers') {
      if (!requireUser()) return;
      return send(
        200,
        [
          'webostv',
          'wake_on_lan',
          'hue',
          'esphome',
          'hassio',
          'backup',
          ...this.scriptedHandlers.keys(),
        ].filter((domain) => !this.knobs.hiddenHandlers.includes(domain))
      );
    }

    if (method === 'POST' && path === '/api/config/config_entries/flow') {
      if (!requireAdmin()) return;
      const handler = parsedBody.handler;
      const scripted = typeof handler === 'string' ? this.scriptedHandlers.get(handler) : undefined;
      if (
        typeof handler !== 'string' ||
        (!scripted && !['webostv', 'wake_on_lan', 'hue', 'esphome'].includes(handler))
      ) {
        return send(404, { message: 'Invalid handler specified' });
      }
      const flow: FakeFlow = {
        id: randomUUID().replaceAll('-', ''),
        handler,
        step: scripted?.steps[0]?.stepId ?? 'user',
        host: null,
        ...(scripted
          ? { source: 'user', script: { steps: scripted.steps, index: 0, entry: scripted.entry } }
          : {}),
      };
      this.flows.set(flow.id, flow);
      return send(200, this.takeOverride(flow) ?? this.flowForm(flow, null));
    }

    if (method === 'GET' && path === '/api/config/config_entries/flow') {
      // As HA 2026.10.4: the list of the flows is not a REST call (405); it is the WS
      // command `config_entries/flow/progress`.
      return send(405, { message: 'Method not allowed' });
    }

    const flowMatch = /^\/api\/config\/config_entries\/flow\/([A-Za-z0-9_-]+)$/.exec(path);
    if (flowMatch) {
      const id = flowMatch[1] ?? '';
      const flow = this.flows.get(id);

      if (method === 'DELETE') {
        if (!requireUser()) return;
        if (!flow) {
          if (this.knobs.flowDeleteServerError) return send(500, { message: 'boom' });
          return send(
            404,
            this.knobs.flowDeleteBodyChanged
              ? { detail: 'gone' }
              : { message: 'Invalid flow specified' }
          );
        }
        this.flows.delete(id);
        return send(200, { message: 'Flow aborted' });
      }

      if (!requireAdmin()) return;
      if (!flow) return send(404, { message: 'Invalid flow specified' });
      if (method === 'GET') return send(200, this.readFlow(flow));
      if (method === 'POST') {
        const outcome = await this.advanceFlow(flow, parsedBody);
        return send(outcome.status, outcome.body);
      }
    }

    const entryMatch = /^\/api\/config\/config_entries\/entry\/([A-Za-z0-9]+)$/.exec(path);
    if (method === 'DELETE' && entryMatch) {
      if (!requireAdmin()) return;
      const id = entryMatch[1] ?? '';
      if (!this.entries.some((entry) => entry.entry_id === id))
        return send(404, { message: 'Invalid entry specified' });
      this.entries = this.entries.filter((entry) => entry.entry_id !== id);
      this.devices = this.devices.filter((device) => device.primary_config_entry !== id);
      this.entities = this.entities.filter((entity) => entity.config_entry_id !== id);
      return send(200, { require_restart: false });
    }

    const automationMatch = /^\/api\/config\/automation\/config\/([A-Za-z0-9_-]+)$/.exec(path);
    if (automationMatch) {
      if (!requireAdmin()) return;
      const id = automationMatch[1] ?? '';
      if (method === 'GET') {
        const stored = this.automations.get(id);
        return stored
          ? send(200, stored)
          : this.knobs.automationGetServerError
            ? send(500, { message: 'boom' })
            : send(
              404,
              this.knobs.automationRouteChanged
                ? { detail: 'gone' }
                : { message: 'Resource not found' }
            );
      }
      if (method === 'POST') {
        if (this.knobs.automationPutFails) return send(500, { message: 'boom' });
        if (!Array.isArray(parsedBody.triggers) || !Array.isArray(parsedBody.actions)) {
          return send(400, { message: 'Message malformed: required key not provided' });
        }
        this.automations.set(id, parsedBody);
        return send(200, { result: 'ok' });
      }
      if (method === 'DELETE') {
        if (!this.automations.delete(id)) return send(400, { message: 'Resource not found' });
        return send(200, { result: 'ok' });
      }
    }

    const stateMatch = /^\/api\/states\/([a-z_]+\.[a-z0-9_]+)$/.exec(path);
    if (method === 'GET' && stateMatch) {
      if (!requireUser()) return;
      const entity = this.entities.find((candidate) => candidate.entity_id === stateMatch[1]);
      if (!entity || !entity.entity_id.startsWith('media_player.'))
        return send(404, { message: 'Entity not found.' });
      return send(200, {
        entity_id: entity.entity_id,
        state: 'off',
        attributes: { supported_features: this.featuresOf(entity) },
      });
    }

    send(404, { message: 'Not found' });
  }

  private routeLabel(path: string): string {
    return path
      .replace(/\/flow\/[A-Za-z0-9_-]+$/, '/flow/{flow_id}')
      .replace(/\/entry\/[A-Za-z0-9]+$/, '/entry/{entry_id}')
      .replace(/\/automation\/config\/[A-Za-z0-9_-]+$/, '/automation/config/{id}')
      .replace(/\/login_flow\/[A-Za-z0-9]+$/, '/login_flow/{flow_id}')
      .replace(/\/states\/[a-z_.0-9]+$/, '/states/{entity_id}');
  }

  // --- Login flow ------------------------------------------------------------------------

  private loginForm(
    id: string,
    step: 'init' | 'mfa',
    error: string | null
  ): Record<string, unknown> {
    return {
      type: 'form',
      flow_id: id,
      handler: ['homeassistant', null],
      step_id: step,
      data_schema:
        step === 'init'
          ? [
              { type: 'string', name: 'username', required: true },
              { type: 'string', name: 'password', required: true },
            ]
          : [{ type: 'string', name: 'code', required: true }],
      errors: error ? { base: error } : {},
      description_placeholders: null,
      last_step: null,
    };
  }

  private loginStep(
    id: string,
    flow: { step: 'init' | 'mfa'; userId: string | null },
    body: Record<string, unknown>
  ): Record<string, unknown> {
    const done = (userId: string): Record<string, unknown> => {
      const code = randomBytes(16).toString('hex');
      this.authCodes.set(code, { userId, clientId: String(body.client_id ?? '') });
      this.loginFlows.delete(id);
      return { type: 'create_entry', flow_id: id, handler: ['homeassistant', null], result: code };
    };

    if (flow.step === 'init') {
      const user = [...this.users.values()].find(
        (candidate) =>
          candidate.active &&
          candidate.username !== null &&
          candidate.username === body.username &&
          candidate.password === body.password
      );
      if (!user) return this.loginForm(id, 'init', 'invalid_auth');
      if (user.mfa) {
        flow.step = 'mfa';
        flow.userId = user.id;
        return this.loginForm(id, 'mfa', null);
      }
      return done(user.id);
    }

    if (body.code === OWNER_CODE && flow.userId) return done(flow.userId);
    return this.loginForm(id, 'mfa', 'invalid_code');
  }

  // --- Configuration flows -----------------------------------------------------------------

  private scriptedForm(flow: FakeFlow, error: string | null): Record<string, unknown> {
    const step = flow.script?.steps[flow.script.index];
    const base = { flow_id: flow.id, handler: flow.handler, step_id: flow.step };
    const placeholders = step?.placeholders ?? null;
    if (step?.type === 'external') {
      return {
        type: 'external',
        ...base,
        url: step.url ?? 'https://login.example.test/authorize',
        description_placeholders: placeholders,
      };
    }
    if (step?.type === 'menu') {
      return {
        type: 'menu',
        ...base,
        menu_options: step.menuOptions ?? ['first', 'second'],
        description_placeholders: placeholders,
      };
    }
    if (step?.type === 'progress') {
      return {
        type: 'progress',
        ...base,
        progress_action: step.progressAction ?? 'task',
        description_placeholders: placeholders,
      };
    }
    return {
      type: 'form',
      ...base,
      data_schema: step?.schema ?? [],
      errors: error ? { base: error } : null,
      description_placeholders: placeholders,
      last_step: null,
      preview: null,
    };
  }

  private flowForm(flow: FakeFlow, error: string | null): Record<string, unknown> {
    if (flow.script) return this.scriptedForm(flow, error);
    const schemas: Record<string, unknown[]> = {
      'webostv:user': [{ type: 'string', name: 'host', required: true }],
      'webostv:pairing': [],
      'wake_on_lan:user': [
        { name: 'mac', required: true, selector: { text: { type: 'text' } } },
        { name: 'broadcast_address', optional: true, selector: { text: { type: 'text' } } },
        {
          name: 'broadcast_port',
          optional: true,
          selector: { number: { min: 0, max: 65535, step: 1, mode: 'box' } },
        },
      ],
      'hue:user': [{ type: 'string', name: 'host', required: true }],
      'esphome:user': [{ type: 'string', name: 'host', required: true }],
    };
    return {
      type: 'form',
      flow_id: flow.id,
      handler: flow.handler,
      step_id: flow.step,
      data_schema: schemas[`${flow.handler}:${flow.step}`] ?? [],
      errors: error ? { base: error } : null,
      description_placeholders: flow.host ? { host: flow.host } : null,
      last_step: null,
      preview: null,
    };
  }

  private abort(flow: FakeFlow, reason: string): { status: number; body: unknown } {
    this.flows.delete(flow.id);
    return {
      status: 200,
      body: {
        type: 'abort',
        flow_id: flow.id,
        handler: flow.handler,
        reason,
        description_placeholders: null,
      },
    };
  }

  private takeOverride(flow: FakeFlow): Record<string, unknown> | null {
    const override = this.knobs.overrideNextResult;
    if (!override) return null;
    this.knobs.overrideNextResult = null;
    return { flow_id: flow.id, handler: flow.handler, ...override };
  }

  private async advanceFlow(
    flow: FakeFlow,
    body: Record<string, unknown>
  ): Promise<{ status: number; body: unknown }> {
    const override = this.takeOverride(flow);
    if (override) return { status: 200, body: override };

    if (flow.script) return this.advanceScripted(flow, body);

    if (flow.handler === 'webostv' && flow.step === 'user') {
      const host = body.host;
      if (typeof host !== 'string')
        return { status: 400, body: { errors: { host: 'required key not provided' } } };
      if (this.knobs.unreachableHosts.includes(host))
        return { status: 200, body: this.flowForm(flow, 'cannot_connect') };
      if (this.entries.some((entry) => entry.host === host))
        return this.abort(flow, 'already_configured');
      for (const other of this.flows.values()) {
        if (other !== flow && other.host === host) return this.abort(flow, 'already_in_progress');
      }
      flow.host = host;
      flow.step = 'pairing';
      return { status: 200, body: this.flowForm(flow, null) };
    }

    if (flow.handler === 'webostv' && flow.step === 'pairing') {
      if (this.knobs.pairingDelayMs > 0)
        await new Promise((resolve) => setTimeout(resolve, this.knobs.pairingDelayMs));
      if (!this.flows.has(flow.id))
        return { status: 404, body: { message: 'Invalid flow specified' } };
      if (this.knobs.pairingOutcome === 'not_pressed')
        return { status: 200, body: this.flowForm(flow, 'error_pairing') };
      if (this.knobs.pairingOutcome === 'cannot_connect')
        return { status: 200, body: this.flowForm(flow, 'cannot_connect') };
      this.flows.delete(flow.id);
      const entry = this.createTvEntry(flow.host ?? '', this.knobs.tvMacInRegistry);
      return { status: 200, body: this.createdBody(flow, entry) };
    }

    if (flow.handler === 'wake_on_lan' && flow.step === 'user') {
      const mac = body.mac;
      if (typeof mac !== 'string')
        return { status: 400, body: { errors: { mac: 'required key not provided' } } };
      if (this.entries.some((entry) => entry.domain === 'wake_on_lan' && entry.mac === mac)) {
        return this.abort(flow, 'already_configured');
      }
      this.flows.delete(flow.id);
      const entry = this.createWolEntry(mac);
      return { status: 200, body: this.createdBody(flow, entry) };
    }

    return { status: 400, body: { message: 'Unsupported step' } };
  }

  private advanceScripted(
    flow: FakeFlow,
    body: Record<string, unknown>
  ): { status: number; body: unknown } {
    const script = flow.script;
    const step = script?.steps[script.index];
    if (!script || !step) return { status: 400, body: { message: 'Unsupported step' } };
    this.received.push({ flowId: flow.id, stepId: step.stepId, body });

    if (step.type === 'menu') {
      const target = body.next_step_id;
      const index = script.steps.findIndex((candidate) => candidate.stepId === target);
      if (typeof target !== 'string' || index < 0) {
        return { status: 400, body: { message: 'Invalid next step' } };
      }
      script.index = index;
      flow.step = target;
      return { status: 200, body: this.flowForm(flow, null) };
    }

    for (const field of step.schema ?? []) {
      const record = field as { name?: string; required?: boolean };
      if (record.required && record.name && !(record.name in body)) {
        return { status: 400, body: { errors: { [record.name]: 'required key not provided' } } };
      }
    }
    const reason = step.abort?.(body) ?? null;
    if (reason) return this.abort(flow, reason);
    const error = step.check?.(body) ?? null;
    if (error) return { status: 200, body: this.flowForm(flow, error) };

    return this.nextScripted(flow);
  }

  /** The step after the current one of a scripted flow, or the new entry when it was the last. */
  private nextScripted(flow: FakeFlow): { status: number; body: unknown } {
    const script = flow.script;
    if (!script) return { status: 400, body: { message: 'Unsupported step' } };
    script.index += 1;
    flow.reads = 0;
    flow.doneSent = false;
    const next = script.steps[script.index];
    if (next) {
      flow.step = next.stepId;
      return { status: 200, body: this.flowForm(flow, null) };
    }
    this.flows.delete(flow.id);
    const entry = this.createScriptedEntry(flow, script.entry);
    return { status: 200, body: this.createdBody(flow, entry) };
  }

  /** What `GET flow/{id}` answers: HA runs the step again; waiting steps move on after some reads. */
  private readFlow(flow: FakeFlow): unknown {
    const script = flow.script;
    const step = script?.steps[script.index];
    if (script && step && (step.type === 'progress' || step.type === 'external')) {
      flow.reads = (flow.reads ?? 0) + 1;
      if (flow.reads >= (step.readsBeforeNext ?? Number.POSITIVE_INFINITY)) {
        if (step.doneType && !flow.doneSent) {
          flow.doneSent = true;
          return {
            type: step.doneType,
            flow_id: flow.id,
            handler: flow.handler,
            step_id: flow.step,
          };
        }
        return this.nextScripted(flow).body;
      }
    }
    return this.flowForm(flow, null);
  }

  private createdBody(flow: FakeFlow, entry: FakeEntry): Record<string, unknown> {
    return {
      type: 'create_entry',
      flow_id: flow.id,
      handler: flow.handler,
      title: entry.title,
      description: null,
      description_placeholders: null,
      version: 1,
      minor_version: 1,
      result: this.entryJson(entry),
    };
  }

  private entryJson(entry: FakeEntry): Record<string, unknown> {
    return {
      entry_id: entry.entry_id,
      domain: entry.domain,
      title: entry.title,
      source: entry.source ?? 'user',
      state: entry.forcedState ?? (Date.now() >= entry.loadedAt ? 'loaded' : 'setup_in_progress'),
      supports_options: true,
      supports_remove_device: false,
      supports_unload: true,
      supports_reconfigure: true,
      supported_subentry_types: {},
      num_subentries: 0,
      pref_disable_new_entities: false,
      pref_disable_polling: false,
      disabled_by: null,
      reason: null,
    };
  }

  private createTvEntry(host: string, mac: string | null): FakeEntry {
    const entry: FakeEntry = {
      entry_id: entryId(),
      domain: 'webostv',
      title: 'LG webOS TV UA751C0LA',
      loadedAt: Date.now() + this.knobs.loadDelayMs,
      host,
      mac: null,
    };
    this.entries.push(entry);
    const device: FakeDevice = {
      id: randomUUID().replaceAll('-', ''),
      name: entry.title,
      name_by_user: null,
      manufacturer: 'LG',
      model: 'UA751C0LA',
      area_id: null,
      primary_config_entry: entry.entry_id,
      connections: mac ? [['mac', mac]] : [],
      serial_number: 'SN-TEST-0001',
    };
    this.devices.push(device);
    this.entities.push({
      entity_id: 'media_player.lg_webos_tv_ua751c0la',
      platform: 'webostv',
      device_id: device.id,
      config_entry_id: entry.entry_id,
      hidden_by: null,
      disabled_by: null,
    });
    return entry;
  }

  /** The entry, device and entity a discovered integration creates when its flow ends. */
  private createScriptedEntry(flow: FakeFlow, spec: ScriptedEntry): FakeEntry {
    const entry: FakeEntry = {
      entry_id: entryId(),
      domain: flow.handler,
      title: spec.title,
      loadedAt: Date.now() + this.knobs.loadDelayMs,
      host: null,
      mac: null,
      ...(flow.source ? { source: flow.source } : {}),
    };
    this.entries.push(entry);
    const device: FakeDevice = {
      id: randomUUID().replaceAll('-', ''),
      name: spec.title,
      name_by_user: null,
      manufacturer: spec.manufacturer,
      model: spec.model,
      area_id: null,
      primary_config_entry: entry.entry_id,
      connections: [],
      serial_number: '',
    };
    this.devices.push(device);
    this.entities.push({
      entity_id: spec.entityId,
      platform: flow.handler,
      device_id: device.id,
      config_entry_id: entry.entry_id,
      hidden_by: null,
      disabled_by: null,
    });
    return entry;
  }

  private createWolEntry(mac: string): FakeEntry {
    const entry: FakeEntry = {
      entry_id: entryId(),
      domain: 'wake_on_lan',
      title: `Wake on LAN ${mac}`,
      loadedAt: Date.now() + this.knobs.loadDelayMs,
      host: null,
      mac,
    };
    this.entries.push(entry);
    const device: FakeDevice = {
      id: randomUUID().replaceAll('-', ''),
      name: entry.title,
      name_by_user: null,
      manufacturer: 'Wake on LAN',
      model: 'Button',
      area_id: null,
      primary_config_entry: entry.entry_id,
      connections: [],
      serial_number: '',
    };
    this.devices.push(device);
    this.entities.push({
      entity_id: `button.wake_on_lan_${mac.replaceAll(':', '')}`,
      platform: 'wake_on_lan',
      device_id: device.id,
      config_entry_id: entry.entry_id,
      hidden_by: null,
      disabled_by: null,
    });
    return entry;
  }

  /** `supported_features` of a media player: the turn-on bit shows when an automation fits. */
  private featuresOf(entity: FakeEntity): number {
    const attached = [...this.automations.values()].some((automation) => {
      const triggers = Array.isArray(automation.triggers)
        ? (automation.triggers as Record<string, unknown>[])
        : [];
      return triggers.some((trigger) => {
        if (
          trigger.trigger === 'device' &&
          trigger.domain === 'webostv' &&
          trigger.type === 'webostv.turn_on'
        ) {
          return (
            this.knobs.acceptedTriggerForms.includes('device') &&
            trigger.device_id === entity.device_id
          );
        }
        if (trigger.trigger === 'webostv.turn_on') {
          return (
            this.knobs.acceptedTriggerForms.includes('platform') &&
            Array.isArray(trigger.entity_id) &&
            trigger.entity_id.includes(entity.entity_id)
          );
        }
        return false;
      });
    });
    return attached ? BASE_FEATURES | TURN_ON : BASE_FEATURES;
  }

  // --- WebSocket -------------------------------------------------------------------------

  private handleSocket(socket: WebSocket): void {
    let session: { user: FakeUser; info: TokenInfo; token: string } | null = null;
    socket.send(JSON.stringify({ type: 'auth_required', ha_version: this.knobs.version }));

    socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as Record<string, unknown>;

      if (!session) {
        if (message.type !== 'auth') return;
        const token = typeof message.access_token === 'string' ? message.access_token : null;
        const found = this.userForToken(token, ['access', 'llat']);
        session = found && token ? { ...found, token } : null;
        if (!session) {
          socket.send(
            JSON.stringify({ type: 'auth_invalid', message: 'Invalid access token or password' })
          );
          socket.close();
          return;
        }
        socket.send(JSON.stringify({ type: 'auth_ok', ha_version: this.knobs.version }));
        return;
      }

      const id = message.id;
      const type = String(message.type);
      this.calls.push({
        via: 'ws',
        route: type,
        userId: session.user.id,
        tokenKind: session.info.kind,
      });
      const subscription = /^(ssdp|zeroconf|dhcp)\/subscribe_discovery$/.exec(type);
      if (subscription) {
        const source = subscription[1] as 'ssdp' | 'zeroconf' | 'dhcp';
        if (!session.user.isAdmin || this.knobs.networkMissing.includes(source)) {
          const code = session.user.isAdmin ? 'unknown_command' : 'unauthorized';
          socket.send(
            JSON.stringify({ id, type: 'result', success: false, error: { code, message: code } })
          );
          return;
        }
        socket.send(JSON.stringify({ id, type: 'result', success: true, result: null }));
        socket.send(
          JSON.stringify({ id, type: 'event', event: { add: this.knobs.network[source] } })
        );
        return;
      }
      if (type === 'unsubscribe_events') {
        socket.send(JSON.stringify({ id, type: 'result', success: true, result: null }));
        return;
      }
      try {
        const result = this.command(type, message, session);
        socket.send(JSON.stringify({ id, type: 'result', success: true, result }));
      } catch (error) {
        const code = error instanceof Error ? error.message : 'unknown_error';
        socket.send(
          JSON.stringify({ id, type: 'result', success: false, error: { code, message: code } })
        );
      }
    });
  }

  private userJson(user: FakeUser): Record<string, unknown> {
    return {
      id: user.id,
      username: this.knobs.omitUsernamesInList ? null : user.username,
      name: user.name,
      is_owner: user.isOwner,
      is_active: user.active,
      system_generated: false,
      local_only: user.localOnly,
      group_ids: user.isAdmin ? ['system-admin'] : ['system-users'],
      credentials: user.username ? [{ type: 'homeassistant' }] : [],
    };
  }

  private command(
    type: string,
    message: Record<string, unknown>,
    session: { user: FakeUser; info: TokenInfo; token: string }
  ): unknown {
    const { user } = session;
    const admin = () => {
      if (!user.isAdmin) throw new Error('unauthorized');
    };
    const text = (key: string): string => {
      const value = message[key];
      if (typeof value !== 'string') throw new Error('invalid_format');
      return value;
    };

    switch (type) {
      case 'auth/current_user':
        return {
          id: user.id,
          name: user.name,
          is_owner: user.isOwner,
          is_admin: user.isAdmin,
          credentials: [],
          mfa_modules: [],
        };

      case 'auth/long_lived_access_token': {
        text('client_name');
        return this.tokenFor(user.id, 'llat');
      }

      case 'auth/refresh_tokens': {
        if (this.knobs.tokenListMissing) throw new Error('unknown_command');
        return [...this.tokens.values()]
          .filter((info) => info.userId === user.id && info.kind !== 'access')
          .map((info) => ({
            id: info.id,
            type: info.kind === 'llat' ? 'long_lived_access_token' : 'normal',
            client_name: info.kind === 'llat' ? 'Acasystem (servizio)' : null,
            is_current: false,
          }));
      }

      case 'auth/delete_refresh_token': {
        if (this.knobs.tokenDeletionFails) throw new Error('unknown_error');
        const id = text('refresh_token_id');
        const found = [...this.tokens].find(
          ([, info]) => info.id === id && info.userId === user.id && info.kind !== 'access'
        );
        if (!found) throw new Error('invalid_token_id');
        this.tokens.delete(found[0]);
        for (const [key, info] of this.tokens) if (info.parent === found[0]) this.tokens.delete(key);
        return null;
      }

      case 'config/auth/list':
        admin();
        return [...this.users.values()].map((candidate) => this.userJson(candidate));

      case 'config/auth/create': {
        admin();
        const groups = Array.isArray(message.group_ids) ? message.group_ids : [];
        const created: FakeUser = {
          id: randomUUID().replaceAll('-', ''),
          name: text('name'),
          username: null,
          password: null,
          isAdmin: groups.includes('system-admin'),
          isOwner: false,
          active: true,
          localOnly: message.local_only === true,
          mfa: false,
        };
        this.users.set(created.id, created);
        return { user: this.userJson(created) };
      }

      case 'config/auth/update': {
        admin();
        const target = this.users.get(text('user_id'));
        if (!target) throw new Error('not_found');
        if (typeof message.is_active === 'boolean') target.active = message.is_active;
        if (Array.isArray(message.group_ids))
          target.isAdmin = message.group_ids.includes('system-admin');
        if (typeof message.local_only === 'boolean') target.localOnly = message.local_only;
        return { user: this.userJson(target) };
      }

      case 'config/auth_provider/homeassistant/create': {
        admin();
        const target = this.users.get(text('user_id'));
        if (!target) throw new Error('not_found');
        if (target.username) throw new Error('credentials_exist');
        target.username = text('username');
        target.password = text('password');
        return null;
      }

      case 'config/auth_provider/homeassistant/admin_change_password': {
        admin();
        const target = this.users.get(text('user_id'));
        if (!target || !target.username) throw new Error('not_found');
        target.password = text('password');
        return null;
      }

      case 'integration/descriptions':
        admin();
        return {
          core: {
            integration: {
              lg: {
                name: 'LG',
                integrations: {
                  webostv: {
                    integration_type: 'device',
                    config_flow: true,
                    iot_class: 'local_push',
                    name: 'LG webOS TV',
                  },
                  lg_thinq: {
                    integration_type: 'hub',
                    config_flow: true,
                    iot_class: 'cloud_push',
                    name: 'LG ThinQ',
                  },
                },
              },
              wake_on_lan: {
                integration_type: 'service',
                config_flow: true,
                iot_class: 'local_push',
                name: 'Wake on LAN',
              },
              hue: {
                integration_type: 'hub',
                config_flow: true,
                iot_class: 'local_push',
                name: 'Philips Hue',
              },
              esphome: {
                integration_type: 'device',
                config_flow: true,
                iot_class: 'local_push',
                name: 'ESPHome',
              },
              sun: { integration_type: 'service', config_flow: false, name: 'Sun' },
              hue_virtual: {
                integration_type: 'virtual',
                supported_by: 'hue',
                name: 'Hue Bridge Friend',
              },
            },
            helper: {},
            translated_name: [],
          },
          custom: { integration: {}, helper: {} },
        };

      case 'config_entries/flow/progress':
        admin();
        // HA leaves out the flows a person started (`source: user`); reauth and the rest stay in.
        return [...this.flows.values()]
          .filter((flow) => (flow.source ?? 'user') !== 'user')
          .map((flow) => ({
            flow_id: flow.id,
            handler: flow.handler,
            step_id: flow.step,
            context: {
              source: flow.source ?? 'user',
              confirm_only: true,
              ...(flow.placeholders ? { title_placeholders: flow.placeholders } : {}),
              ...(flow.uniqueId ? { unique_id: flow.uniqueId } : {}),
            },
          }));

      case 'frontend/get_translations': {
        if (this.knobs.translationsMissing) throw new Error('unknown_command');
        const wanted = Array.isArray(message.integration) ? message.integration : [];
        const resources: Record<string, string> = {};
        for (const integration of wanted) {
          Object.assign(resources, this.knobs.translations[String(integration)] ?? {});
        }
        return { resources };
      }

      case 'config_entries/ignore_flow': {
        admin();
        const flow = this.flows.get(text('flow_id'));
        const title = text('title');
        if (!flow) throw new Error('not_found');
        if (!flow.uniqueId) throw new Error('no_unique_id');
        this.flows.delete(flow.id);
        this.ignored.push({ flowId: flow.id, title });
        return null;
      }

      case 'config_entries/get': {
        const domain = typeof message.domain === 'string' ? message.domain : null;
        return this.entries
          .filter((entry) => !domain || entry.domain === domain)
          .map((entry) => this.entryJson(entry));
      }

      case 'config/device_registry/list':
        return this.devices.map((device) => ({
          ...device,
          config_entry_id: device.primary_config_entry,
          config_entries: [device.primary_config_entry],
          identifiers: [[device.manufacturer.toLowerCase(), device.id]],
        }));

      case 'config/device_registry/update': {
        admin();
        if (this.knobs.deviceUpdateFails) throw new Error('unknown_error');
        const device = this.devices.find((candidate) => candidate.id === text('device_id'));
        if (!device) throw new Error('not_found');
        if ('name_by_user' in message)
          device.name_by_user = (message.name_by_user as string | null) ?? null;
        if ('area_id' in message) device.area_id = (message.area_id as string | null) ?? null;
        return device;
      }

      case 'config/entity_registry/list':
        return this.entities;

      case 'config/entity_registry/update': {
        admin();
        const entity = this.entities.find((candidate) => candidate.entity_id === text('entity_id'));
        if (!entity) throw new Error('not_found');
        if ('hidden_by' in message) entity.hidden_by = (message.hidden_by as string | null) ?? null;
        return { entity_entry: entity };
      }

      case 'config/area_registry/list':
        return this.areas;

      case 'config/area_registry/create': {
        admin();
        const name = text('name');
        if (this.knobs.areaCreateRefused) throw new Error('invalid_info');
        if (this.areas.some((area) => area.name === name)) throw new Error('invalid_info');
        const area = { area_id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name };
        this.areas.push(area);
        return area;
      }

      case 'validate_config':
        return {
          triggers: { valid: Array.isArray(message.triggers), error: null },
          conditions: { valid: true, error: null },
          actions: { valid: Array.isArray(message.actions), error: null },
        };

      default:
        throw new Error('unknown_command');
    }
  }
}

export const startFakeHomeAssistant = async (): Promise<FakeHomeAssistant> => {
  const fake = new FakeHomeAssistant();
  await fake.start();
  return fake;
};
