import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

/**
 * Finto Home Assistant OS per la prova della configurazione automatica (REP-20261026-005, S4-S5):
 * onboarding HTTP, token, WebSocket con i comandi usati dall'app (utente, dati della casa,
 * supervisor/api). WebSocket minimo scritto qui (solo frame di testo brevi) per non aggiungere
 * dipendenze. «Avviare» l'app Acasystem chiama `onAddonStarted`.
 */

const SLUG = '9960cdb4_acasystem';
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const readBody = (req) =>
  new Promise((done) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => done(Buffer.concat(chunks).toString('utf8')));
  });

const frame = (text) => {
  const payload = Buffer.from(text, 'utf8');
  const header =
    payload.length < 126
      ? Buffer.from([0x81, payload.length])
      : payload.length < 65_536
        ? Buffer.from([0x81, 126, payload.length >> 8, payload.length & 0xff])
        : null;
  if (!header) throw new Error('Messaggio troppo lungo per il finto WebSocket');
  return Buffer.concat([header, payload]);
};

/** Estrae i frame completi (mascherati, dal client) dal buffer; restituisce testi e resto. */
const parseFrames = (buffer) => {
  const texts = [];
  let offset = 0;
  for (;;) {
    if (buffer.length - offset < 2) break;
    const opcode = buffer[offset] & 0x0f;
    let length = buffer[offset + 1] & 0x7f;
    let cursor = offset + 2;
    if (length === 126) {
      if (buffer.length - cursor < 2) break;
      length = buffer.readUInt16BE(cursor);
      cursor += 2;
    } else if (length === 127) {
      if (buffer.length - cursor < 8) break;
      length = Number(buffer.readBigUInt64BE(cursor));
      cursor += 8;
    }
    if (buffer.length - cursor < 4 + length) break;
    const mask = buffer.subarray(cursor, cursor + 4);
    const data = Buffer.from(buffer.subarray(cursor + 4, cursor + 4 + length));
    for (let i = 0; i < data.length; i += 1) data[i] ^= mask[i % 4];
    if (opcode === 0x1) texts.push(data.toString('utf8'));
    if (opcode === 0x8) texts.push(null);
    offset = cursor + 4 + length;
  }
  return { texts, rest: buffer.subarray(offset) };
};

export const createFakeHomeAssistant = ({ onAddonStarted }) => {
  const state = {
    steps: { user: false, core_config: false, analytics: false, integration: false },
    owner: null,
    tokens: new Set(),
    codes: new Set(),
    repositories: ['https://github.com/hassio-addons/repository'],
    installed: false,
    addonState: 'unknown',
    log: [],
  };
  let counter = 0;
  const json = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const authorized = (req) => state.tokens.has((req.headers.authorization ?? '').replace(/^Bearer /, ''));

  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const route = `${req.method} ${req.url}`;
    state.log.push(route);
    if (route === 'GET /api/onboarding') {
      return json(res, 200, Object.entries(state.steps).map(([step, done]) => ({ step, done })));
    }
    if (route === 'POST /api/onboarding/users') {
      if (state.steps.user) return json(res, 403, { message: 'User step already done' });
      const owner = JSON.parse(body);
      state.owner = owner;
      state.steps.user = true;
      const code = `code-${(counter += 1)}`;
      state.codes.add(code);
      return json(res, 200, { auth_code: code });
    }
    if (route === 'POST /auth/token') {
      const form = new URLSearchParams(body);
      if (form.get('grant_type') !== 'authorization_code' || !state.codes.delete(form.get('code'))) {
        return json(res, 400, { error: 'invalid_request' });
      }
      const token = `token-${(counter += 1)}`;
      state.tokens.add(token);
      return json(res, 200, { access_token: token, token_type: 'Bearer', expires_in: 1800, refresh_token: 'r' });
    }
    const onboardingStep = /^POST \/api\/onboarding\/(core_config|analytics|integration)$/.exec(route)?.[1];
    if (onboardingStep) {
      if (!authorized(req)) return json(res, 401, {});
      if (state.steps[onboardingStep]) return json(res, 403, { message: 'Step already done' });
      state.steps[onboardingStep] = true;
      return json(res, 200, onboardingStep === 'integration' ? { auth_code: 'unused' } : {});
    }
    json(res, 404, {});
  });

  const command = (message) => {
    state.log.push(`WS ${message.type}${message.endpoint ? ` ${message.method} ${message.endpoint}` : ''}`);
    switch (message.type) {
      case 'auth/current_user':
        return { result: { name: state.owner?.name ?? 'Admin', is_admin: true } };
      case 'config/core/detect':
        return { result: { country: 'IT', currency: 'EUR', time_zone: 'Europe/Rome', unit_system: 'metric' } };
      case 'config/core/update':
        state.coreConfig = message;
        return { result: null };
      case 'supervisor/api': {
        const { endpoint, method } = message;
        if (endpoint === '/store/repositories' && method === 'get') return { result: state.repositories.map((source) => ({ source })) };
        if (endpoint === '/store/repositories') {
          state.repositories.push(message.data.repository);
          return { result: null };
        }
        if (endpoint === '/store/reload') return { result: null };
        if (endpoint === `/store/addons/${SLUG}`) {
          return state.repositories.includes('https://github.com/acamemo/acasystem-releases')
            ? { result: { installed: state.installed } }
            : { error: 'not_found' };
        }
        if (endpoint === `/store/addons/${SLUG}/install`) {
          state.installed = true;
          state.addonState = 'stopped';
          return { result: null };
        }
        if (endpoint === `/addons/${SLUG}/options`) {
          state.options = message.data;
          return { result: null };
        }
        if (endpoint === `/addons/${SLUG}/info`) return { result: { state: state.addonState } };
        if (endpoint === `/addons/${SLUG}/start`) {
          state.addonState = 'started';
          onAddonStarted();
          return { result: null };
        }
        return { error: 'unknown_endpoint' };
      }
      default:
        return { error: 'unknown_command' };
    }
  };

  server.on('upgrade', (req, socket) => {
    if (req.url !== '/api/websocket') return socket.destroy();
    const accept = createHash('sha1').update(`${req.headers['sec-websocket-key']}${WS_GUID}`).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    const send = (payload) => socket.write(frame(JSON.stringify(payload)));
    let buffer = Buffer.alloc(0);
    let authenticated = false;
    send({ type: 'auth_required', ha_version: '2026.9.4' });
    socket.on('data', (chunk) => {
      const parsed = parseFrames(Buffer.concat([buffer, chunk]));
      buffer = parsed.rest;
      for (const text of parsed.texts) {
        if (text === null) return socket.end();
        const message = JSON.parse(text);
        if (!authenticated) {
          authenticated = message.type === 'auth' && state.tokens.has(message.access_token);
          send({ type: authenticated ? 'auth_ok' : 'auth_invalid' });
          if (!authenticated) socket.end();
          continue;
        }
        const reply = command(message);
        send(
          reply.error
            ? { id: message.id, type: 'result', success: false, error: { code: reply.error, message: reply.error } }
            : { id: message.id, type: 'result', success: true, result: reply.result }
        );
      }
    });
    socket.on('error', () => {});
    state.sockets = [...(state.sockets ?? []), socket];
  });

  const destroySockets = () => {
    for (const socket of state.sockets ?? []) socket.destroy();
  };

  return { server, state, destroySockets };
};
