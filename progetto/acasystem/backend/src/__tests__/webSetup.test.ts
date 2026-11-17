// @vitest-environment node
import express from 'express';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';
import { createSetupRouter } from '../routes/setup.ts';
import { createHomeAssistantAuthMiddleware } from '../middlewares/homeAssistantAuth.ts';
import { createHomeAssistantSetupService } from '../services/homeAssistantSetup.ts';

const servers: Server[] = [];
const sockets: WebSocketServer[] = [];
afterEach(async () => {
  sockets.splice(0).forEach((server) => { server.clients.forEach((client) => client.terminate()); server.close(); });
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); })));
  vi.unstubAllEnvs();
});
const listen = async (server: Server): Promise<string> => {
  servers.push(server); server.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test address');
  return `http://127.0.0.1:${address.port}`;
};
const fakeHa = async () => {
  const done: Record<string, boolean> = { user: false, core_config: false, analytics: false, integration: false };
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  const commands: Record<string, unknown>[] = [];
  const behavior = { lostOwner: false, malformedStatus: false, gone: false, refuseStep: false, invalidUsername: false };
  const server = createServer(async (req, res) => {
    const path = req.url ?? '/';
    const send = (status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.method === 'GET' && path === '/api/onboarding') {
      if (behavior.gone) { send(404, { message: 'Not found' }); return; }
      send(200, behavior.malformedStatus ? { password: 'upstream-secret' } : Object.entries(done).map(([step, value]) => ({ step, done: value })));
      return;
    }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    requests.push({ path, body });
    if (req.method === 'POST' && path === '/api/onboarding/users') {
      if (done.user) { send(403, { message: 'Already done' }); return; }
      if (behavior.invalidUsername || typeof body.username !== 'string' || body.username !== body.username.trim().toLowerCase()) {
        send(400, { message_code: 'username_not_normalized', message: 'Not normalized: private-upstream-detail' }); return;
      }
      done.user = true;
      if (behavior.lostOwner) { req.socket.destroy(); return; }
      send(200, { auth_code: 'do-not-return-this-code' }); return;
    }
    const step = path.split('/').at(-1) ?? '';
    if (req.method === 'POST' && step in done && req.headers.authorization === 'Bearer admin') {
      if (behavior.refuseStep) { send(403, { message: 'secret refusal detail' }); return; }
      done[step] = true; send(200, {}); return;
    }
    send(404, {});
  });
  const ws = new WebSocketServer({ server }); sockets.push(ws);
  ws.on('connection', (socket) => {
    let token = '';
    socket.send(JSON.stringify({ type: 'auth_required', ha_version: '2026.10.4' }));
    socket.on('message', (raw) => {
      const body = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (body.type === 'auth') {
        token = String(body.access_token);
        socket.send(JSON.stringify({ type: token === 'admin' || token === 'user' ? 'auth_ok' : 'auth_invalid', ha_version: '2026.10.4' })); return;
      }
      commands.push(body);
      const result = body.type === 'auth/current_user' ? { id: token, is_admin: token === 'admin', is_owner: token === 'admin' } : {};
      socket.send(JSON.stringify({ id: body.id, type: 'result', success: true, result }));
    });
  });
  const origin = await listen(server);
  vi.stubEnv('TUNET_INTERNAL_HA_URL', origin);
  vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
  return { origin, done, requests, commands, behavior };
};
const api = async () => {
  const app = express();
  // This is the actual per-user middleware, not a test shortcut around authorization.
  app.use('/api/setup', createSetupRouter(createHomeAssistantAuthMiddleware()));
  return `${await listen(createServer(app))}/api/setup`;
};
const owner = { name: 'Proprietario', username: 'owner', password: 'test-password' };
const post = (origin: string, path: string, body: unknown, token?: string) => fetch(`${origin}/${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
});

describe('prima configurazione nella webapp, mini PC già predisposto', () => {
  it('crea solo il primo owner, non espone codici/token e lascia i passi successivi al login', async () => {
    const ha = await fakeHa(); const origin = await api();
    expect(await (await fetch(`${origin}/status`)).json()).toEqual({ state: 'owner-required' });
    const response = await post(origin, 'owner', owner);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ created: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await (await fetch(`${origin}/status`)).json()).toEqual({ state: 'setup-required' });
    expect(ha.requests).toEqual([{ path: '/api/onboarding/users', body: { ...owner, client_id: 'http://127.0.0.1:47320/', language: 'it' } }]);
    expect(ha.done.core_config).toBe(false);
  });
  it('normalizza il nome utente del proprietario senza cambiare nome visibile o password', async () => {
    const ha = await fakeHa(); const origin = await api();
    const password = 'MiXeD-test-Password';
    const response = await post(origin, 'owner', { name: 'Nome Visibile', username: '  OwNeR  ', password });
    expect(response.status).toBe(201);
    expect(ha.requests[0]?.body).toMatchObject({ name: 'Nome Visibile', username: 'owner', password });
    expect(await (await fetch(`${origin}/status`)).json()).toEqual({ state: 'setup-required' });
  });
  it('presenta un rifiuto del formato username senza dettagli o dati restituiti da HA', async () => {
    const ha = await fakeHa(); ha.behavior.invalidUsername = true;
    const response = await post(await api(), 'owner', owner);
    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ code: 'SETUP_USERNAME_INVALID' });
    expect(JSON.stringify(body)).not.toContain('private-upstream-detail');
    expect(ha.done.user).toBe(false);
  });
  it('rifiuta una seconda registrazione e due creazioni concorrenti senza ripetere la scrittura', async () => {
    const ha = await fakeHa(); const service = createHomeAssistantSetupService();
    const first = service.createOwner(owner);
    await expect(service.createOwner({ ...owner, username: 'other' })).rejects.toMatchObject({ code: 'SETUP_OWNER_EXISTS', status: 409 });
    await first;
    await expect(service.createOwner(owner)).rejects.toMatchObject({ code: 'SETUP_OWNER_EXISTS' });
    expect(ha.requests.filter((request) => request.path.endsWith('/users'))).toHaveLength(1);
  });
  it('recupera la risposta persa dopo la creazione, senza tentare di ricreare il proprietario', async () => {
    const ha = await fakeHa(); ha.behavior.lostOwner = true;
    const response = await post(await api(), 'owner', owner);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'SETUP_OWNER_EXISTS' });
    expect(ha.requests).toHaveLength(1);
  });
  it('richiede un amministratore reale per completare e non usa URL HA forniti dal browser', async () => {
    const ha = await fakeHa(); ha.done.user = true; const origin = await api();
    expect((await post(origin, 'complete', { locationName: 'Casa' })).status).toBe(401);
    expect((await post(origin, 'complete', { locationName: 'Casa' }, 'user')).status).toBe(403);
    expect((await post(origin, 'complete', { locationName: 'Casa' }, 'invalid')).status).toBe(401);
    expect(ha.requests).toHaveLength(0);
  });
  it('completa casa, analytics e integration con il token personale, senza installare app', async () => {
    const ha = await fakeHa(); ha.done.user = true; const origin = await api();
    const response = await post(origin, 'complete', { locationName: 'Casa mia' }, 'admin');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ complete: true });
    expect(ha.commands.find((command) => command.type === 'config/core/update')).toMatchObject({ location_name: 'Casa mia', language: 'it' });
    expect(ha.requests.map((request) => request.path)).toEqual(['/api/onboarding/core_config', '/api/onboarding/analytics', '/api/onboarding/integration']);
    expect(await (await fetch(`${origin}/status`)).json()).toEqual({ state: 'ready' });
    const previousRequests = ha.requests.length;
    expect((await post(origin, 'complete', { locationName: 'Non sovrascrivere' }, 'admin')).status).toBe(200);
    expect(ha.requests).toHaveLength(previousRequests);
    expect(ha.commands.filter((command) => command.type === 'config/core/update')).toHaveLength(1);
  });
  it('non considera un 403 di HA come successo se il passo non è davvero concluso', async () => {
    const ha = await fakeHa(); ha.done.user = true; ha.behavior.refuseStep = true;
    const response = await post(await api(), 'complete', { locationName: 'Casa' }, 'admin');
    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).not.toContain('secret refusal detail');
    expect(ha.done.core_config).toBe(false);
  });
  it('riconosce HA già configurato anche dopo la rimozione delle viste onboarding', async () => {
    const ha = await fakeHa(); ha.behavior.gone = true; const origin = await api();
    expect(await (await fetch(`${origin}/status`)).json()).toEqual({ state: 'ready' });
    expect((await post(origin, 'owner', owner)).status).toBe(409);
    expect(ha.requests).toHaveLength(0);
  });
  it('rifiuta dati e form cross-site senza inviare richieste di scrittura a HA', async () => {
    const ha = await fakeHa(); const origin = await api();
    for (const input of [{ ...owner, name: '' }, { ...owner, password: 'short' }, { ...owner, haUrl: 'http://other' }]) {
      expect((await post(origin, 'owner', input)).status).toBe(400);
    }
    expect((await fetch(`${origin}/owner`, { method: 'POST', body: new URLSearchParams(owner) })).status).toBe(400);
    expect(ha.requests).toHaveLength(0);
  });
  it('limita il corpo e risponde a JSON malformato senza log o frammenti delle credenziali', async () => {
    const ha = await fakeHa(); const origin = await api();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const malformed = await fetch(`${origin}/owner`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"password":"not-in-error",BROKEN' });
      expect(malformed.status).toBe(400);
      expect(await malformed.text()).not.toContain('not-in-error');
      const large = await post(origin, 'owner', { ...owner, password: 'x'.repeat(5000) });
      expect(large.status).toBe(413);
      expect(errors).not.toHaveBeenCalled();
      expect(ha.requests).toHaveLength(0);
    } finally { errors.mockRestore(); }
  });
  it('distingue HA assente, non configurato e risposta malformata senza esporre dettagli', async () => {
    const ha = await fakeHa(); const origin = await api(); ha.behavior.malformedStatus = true;
    const bad = await fetch(`${origin}/status`);
    expect(bad.status).toBe(502);
    expect(await bad.text()).not.toContain('upstream-secret');
    vi.stubEnv('TUNET_INTERNAL_HA_URL', 'http://127.0.0.1:1');
    expect((await fetch(`${origin}/status`)).status).toBe(502);
    vi.stubEnv('TUNET_INTERNAL_HA_URL', '');
    expect((await fetch(`${origin}/status`)).status).toBe(503);
  });
});
