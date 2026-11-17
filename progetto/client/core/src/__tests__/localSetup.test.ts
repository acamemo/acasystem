import { describe, expect, it, vi } from 'vitest';
import type { HaHttp, WebSocketLike } from '../ports.ts';
import { completeSetup } from '../setup.ts';
import { createHttp } from './fakes.ts';

const HA = 'http://127.0.0.1:48123';
const origin = 'http://127.0.0.1:43002';
const slug = 'local_acasystem';
const run = ({ localAppSlug = slug, installed = false, started = false, visibleAfterReload = 1, installFails = false } = {}) => {
  const log: Record<string, unknown>[] = [];
  let reloads = 0;
  let isInstalled = installed;
  let isStarted = started;
  const closed = vi.fn();
  const haHttp: HaHttp = { request: async (request) => {
    expect(request.method).toBe('GET');
    expect(request.url).toBe(`${HA}/api/onboarding`);
    return { status: 200, url: request.url, body: ['user', 'core_config', 'analytics', 'integration'].map((step) => ({ step, done: true })) };
  } };
  const socketFactory = () => {
    const socket: WebSocketLike = { onopen: null, onmessage: null, onerror: null, onclose: null, close: closed,
      send: (text) => {
        const message = JSON.parse(text) as Record<string, unknown>;
        const reply = (value: Record<string, unknown>) => queueMicrotask(() => socket.onmessage?.({ data: JSON.stringify(value) }));
        if (message.type === 'auth') return reply({ type: 'auth_ok' });
        log.push(message);
        const ok = (result: unknown) => reply({ id: message.id, type: 'result', success: true, result });
        const fail = (code: string) => reply({ id: message.id, type: 'result', success: false, error: { code, message: code } });
        if (message.type === 'auth/current_user') return ok({ is_admin: true });
        const endpoint = message.endpoint;
        if (endpoint === '/store/reload') { reloads++; return ok(null); }
        if (endpoint === `/store/addons/${slug}`) return reloads >= visibleAfterReload ? ok({ installed: isInstalled }) : fail('not_found');
        if (endpoint === `/store/addons/${slug}/install`) {
          if (installFails) return fail('build_failed');
          isInstalled = true; return ok(null);
        }
        if (endpoint === `/addons/${slug}/options`) return ok(null);
        if (endpoint === `/addons/${slug}/info`) return ok({ state: isStarted ? 'started' : 'stopped' });
        if (endpoint === `/addons/${slug}/start`) { isStarted = true; return ok(null); }
        return fail('unexpected_endpoint');
      } };
    queueMicrotask(() => socket.onmessage?.({ data: JSON.stringify({ type: 'auth_required' }) }));
    return socket;
  };
  const net = createHttp({ [`${origin}/api/health`]: { status: 'ok', version: '0.9.31' } });
  const result = completeSetup({ http: net.http, haHttp, socketFactory, config: { host: '127.0.0.1', port: 43002 },
    localAppSlug, onProgress: () => undefined, confirmHome: async (home) => home,
  }, { haBase: HA, accessToken: 'test-session' });
  return { result, log, closed };
};

describe('setup of the packaged local app', () => {
  it('reloads the local store, installs and starts the local slug without accessing repositories', async () => {
    const test = run();
    await test.result;
    expect(test.log.filter((message) => message.type === 'supervisor/api').map((message) => message.endpoint)).toEqual([
      '/store/reload', `/store/addons/${slug}`, `/store/addons/${slug}/install`, `/addons/${slug}/options`, `/addons/${slug}/info`, `/addons/${slug}/start`,
    ]);
    expect(test.log.find((message) => message.endpoint === `/store/addons/${slug}/install`)).toMatchObject({ timeout: null, method: 'post' });
    expect(test.log.find((message) => message.endpoint === `/addons/${slug}/options`)?.data).toEqual({ boot: 'auto', watchdog: true });
    expect(test.closed).toHaveBeenCalledOnce();
  });
  it('retries a store miss after a second reload without adding a remote repository', async () => {
    const test = run({ visibleAfterReload: 2 });
    await test.result;
    expect(test.log.filter((message) => message.endpoint === '/store/reload')).toHaveLength(2);
    expect(test.log.some((message) => message.endpoint === '/store/repositories')).toBe(false);
  });
  it('resumes an installed running local app without reinstalling or restarting it', async () => {
    const test = run({ installed: true, started: true });
    await test.result;
    expect(test.log.some((message) => String(message.endpoint).endsWith('/install'))).toBe(false);
    expect(test.log.some((message) => String(message.endpoint).endsWith('/start'))).toBe(false);
    expect(test.log.some((message) => message.endpoint === '/store/repositories')).toBe(false);
  });
  it('rejects a non-local slug before calling Supervisor and closes the setup session', async () => {
    const test = run({ localAppSlug: 'remote_acasystem' });
    await expect(test.result).rejects.toMatchObject({ kind: 'unexpected' });
    expect(test.log.some((message) => message.type === 'supervisor/api')).toBe(false);
    expect(test.closed).toHaveBeenCalledOnce();
  });
  it('reports local build failure and closes the setup session', async () => {
    const test = run({ installFails: true });
    await expect(test.result).rejects.toMatchObject({ kind: 'install-failed' });
    expect(test.closed).toHaveBeenCalledOnce();
    expect(test.log.some((message) => String(message.endpoint).endsWith('/start'))).toBe(false);
  });
});
