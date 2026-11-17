// @vitest-environment node

import { afterEach, expect, it, vi } from 'vitest';
import { openDatabase } from '../models/database.ts';
import { createDeviceModule } from '../services/devices/index.ts';
import type { IdentityStatus } from '../services/devices/serviceIdentity.ts';

const active: IdentityStatus = { state: 'active', expiresAt: null, checkedAt: 0, fingerprint: null };
const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  vi.useRealTimers(); vi.restoreAllMocks();
});
const fixture = (supervisor = false) => {
  vi.useFakeTimers();
  const database = openDatabase(':memory:');
  const module = createDeviceModule(database, { haUrls: () => [],
    supervisor: supervisor ? { coreUrl: 'http://127.0.0.1:9/core', token: 'fixture-supervisor' } : null, log: () => {},
    sweepIntervalMs: 10, serviceCheckIntervalMs: 20, serviceQuickCheckMs: 10 });
  cleanups.push(() => { module.stop(); database.close(); });
  const startup = vi.spyOn(module.service, 'startup').mockResolvedValue(undefined);
  const sweep = vi.spyOn(module.service, 'sweep').mockResolvedValue(undefined);
  const status = vi.spyOn(module.identity, 'status').mockResolvedValue(active);
  return { module, startup, sweep, status };
};
const held = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

it('aspetta lo sweep in corso, blocca nuovi producer e riprende senza ricancellare i flussi', async () => {
  const f = fixture(); await f.module.start();
  const sweep = held<void>(); f.sweep.mockImplementationOnce(() => sweep.promise);
  await vi.advanceTimersByTimeAsync(10); expect(f.sweep).toHaveBeenCalledTimes(1);
  let drained = false; const draining = f.module.pauseForUpdate().then(() => { drained = true; });
  await Promise.resolve(); expect(drained).toBe(false);
  await vi.advanceTimersByTimeAsync(100); expect(f.sweep).toHaveBeenCalledTimes(1);
  sweep.resolve(); await draining; expect(drained).toBe(true);
  const calls = f.status.mock.calls.length;
  f.module.keeper.poke(); f.module.keeper.noteRejected();
  f.module.keeper.offerAdmin({ token: 'fixture-private-admin-token', user: { id: 'fixture', name: 'Fixture' } });
  expect((await f.module.keeper.ensureReady()).active).toBe(false);
  await vi.advanceTimersByTimeAsync(100); expect(f.status).toHaveBeenCalledTimes(calls);
  await f.module.resumeAfterUpdate(); await vi.advanceTimersByTimeAsync(10);
  expect(f.sweep).toHaveBeenCalledTimes(2); expect(f.startup).toHaveBeenCalledTimes(1);
  expect(f.status.mock.calls.length).toBeGreaterThan(calls);
  f.module.stop(); await f.module.start(); expect(f.startup).toHaveBeenCalledTimes(2);
});

it('aspetta il check/repair keeper già avviato prima di confermare il drain', async () => {
  const f = fixture(); await f.module.start();
  const check = held<IdentityStatus>(); f.status.mockImplementationOnce(() => check.promise);
  const ready = f.module.keeper.ensureReady();
  let drained = false; const draining = f.module.pauseForUpdate().then(() => { drained = true; });
  await Promise.resolve(); expect(drained).toBe(false);
  check.resolve(active); await ready; await draining;
  const calls = f.status.mock.calls.length; await vi.advanceTimersByTimeAsync(200);
  expect(f.status).toHaveBeenCalledTimes(calls); expect(f.sweep).not.toHaveBeenCalled();
});

it('la pausa durante startup aspetta la chiusura e non avvia il keeper dopo il drain', async () => {
  const f = fixture(); const startup = held<void>(); f.startup.mockImplementationOnce(() => startup.promise);
  const starting = f.module.start(); let drained = false;
  const draining = f.module.pauseForUpdate().then(() => { drained = true; });
  await Promise.resolve(); expect(drained).toBe(false);
  startup.resolve(); await starting; await draining;
  expect(f.status).not.toHaveBeenCalled();
  await f.module.resumeAfterUpdate(); expect(f.startup).toHaveBeenCalledTimes(1); expect(f.status).toHaveBeenCalledTimes(1);
});

it('un flag ripreso prima del primo start conserva i producer spenti fino a resume', async () => {
  const f = fixture(); await f.module.pauseForUpdate(); await f.module.start();
  await vi.advanceTimersByTimeAsync(100); expect(f.startup).not.toHaveBeenCalled(); expect(f.status).not.toHaveBeenCalled();
  await f.module.resumeAfterUpdate(); expect(f.startup).toHaveBeenCalledTimes(1); expect(f.status).toHaveBeenCalledTimes(1);
});

it('anche la valutazione offerta da un admin è tracciata nel drain', async () => {
  const f = fixture(); const check = held<IdentityStatus>(); f.status.mockImplementationOnce(() => check.promise);
  f.module.keeper.offerAdmin({ token: 'fixture-private-admin-token', user: { id: 'fixture', name: 'Fixture' } });
  let drained = false; const draining = f.module.pauseForUpdate().then(() => { drained = true; });
  await Promise.resolve(); expect(drained).toBe(false);
  check.resolve(active); await draining;
  expect(f.status).toHaveBeenCalledTimes(1); expect(f.startup).not.toHaveBeenCalled();
});

it('un quick check già in volo non ricrea timer dopo la pausa', async () => {
  const f = fixture(true); const unavailable: IdentityStatus = { ...active, state: 'unreachable' };
  f.status.mockResolvedValue(unavailable); await f.module.start();
  const check = held<IdentityStatus>(); f.status.mockImplementationOnce(() => check.promise);
  await vi.advanceTimersByTimeAsync(10);
  const draining = f.module.pauseForUpdate(); check.resolve(unavailable); await draining;
  const calls = f.status.mock.calls.length; await vi.advanceTimersByTimeAsync(200);
  expect(f.status).toHaveBeenCalledTimes(calls); expect(vi.getTimerCount()).toBe(0);
});
