// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { CANARY, createHarness, dumpDatabase, everythingVisible } from './devicesHarness.ts';
import type { Harness, HarnessOptions } from './devicesHarness.ts';

/**
 * Configuration flows of the device facade against a fake HA: start, steps, pairing with the
 * call held open, errors in Italian, ownership, expiry, restart of the backend, rate limits.
 */

const open: Harness[] = [];
const harnessFor = async (options: HarnessOptions = {}): Promise<Harness> => {
  const harness = await createHarness(options);
  open.push(harness);
  return harness;
};

afterEach(async () => {
  while (open.length) await open.pop()?.close();
});

const FLOW_STEP = 'POST /api/config/config_entries/flow/{flow_id}';
const FLOW_START = 'POST /api/config/config_entries/flow';
const FLOW_DELETE = 'DELETE /api/config/config_entries/flow/{flow_id}';

/** Starts a TV flow and sends the address: leaves it at the pairing step. */
const reachPairing = async (
  harness: Harness,
  user: 'customer' | 'customer2' = 'customer',
  host = CANARY.tvHost
) => {
  const started = await harness.request('/flussi', {
    method: 'POST',
    user,
    body: { handler: 'webostv' },
  });
  expect(started.status).toBe(201);
  const flowId = started.body.flowId as string;
  const addressed = await harness.request(`/flussi/${flowId}`, {
    method: 'POST',
    user,
    body: { input: { host } },
  });
  return { started, flowId, addressed };
};

describe('adding a TV from start to finish', () => {
  it('starts, takes the address, pairs and returns the loaded entry with its device', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.loadDelayMs = 250;

    const started = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({
      type: 'form',
      handler: 'webostv',
      stepId: 'user',
      title: 'Aggiungi il televisore LG',
      fields: [{ name: 'host', kind: 'text', required: true }],
    });
    const flowId = started.body.flowId as string;

    const addressed = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { host: CANARY.tvHost } },
    });
    expect(addressed.status).toBe(200);
    expect(addressed.body).toMatchObject({
      type: 'form',
      stepId: 'pairing',
      waitSeconds: 10,
      fields: [],
    });

    const begun = Date.now();
    const paired = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(paired.status).toBe(200);
    // The server waited for the entry to be `loaded` before answering.
    expect(Date.now() - begun).toBeGreaterThanOrEqual(150);
    expect(paired.body).toMatchObject({
      type: 'create_entry',
      domain: 'webostv',
      title: 'LG webOS TV UA751C0LA',
      pending: false,
      entry: {
        domain: 'webostv',
        state: 'loaded',
        loaded: true,
        mediaPlayerEntityId: 'media_player.lg_webos_tv_ua751c0la',
        device: { name: 'LG webOS TV UA751C0LA', manufacturer: 'LG', areaId: null },
        power: { configured: false },
      },
    });

    // Nothing is left open, here or in HA.
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
    expect(harness.fake.flows.size).toBe(0);
    expect(
      harness.module.service.listFlows({ id: 'user-customer', name: '', isAdmin: false })
    ).toEqual([]);

    const registry = await harness.request('/registro', { user: 'installer' });
    const actions = (
      registry.body.actions as { action: string; outcome: string; domain: string | null }[]
    ).map((row) => `${row.action}:${row.outcome}:${row.domain}`);
    expect(actions).toEqual(
      expect.arrayContaining(['flow.start:ok:webostv', 'flow.step:ok:webostv'])
    );
  });

  it('keeps the pairing call open for about ten seconds and refuses a second tap on the same step', async () => {
    const harness = await harnessFor({ module: { flowStepTimeoutMs: 30_000 } });
    harness.fake.knobs.pairingDelayMs = 10_000;
    const { flowId } = await reachPairing(harness);

    const begun = Date.now();
    const pairing = harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: {} } });

    await new Promise((resolve) => setTimeout(resolve, 400));
    const doubleTap = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(doubleTap.status).toBe(409);
    expect(doubleTap.body.code).toBe('FLOW_BUSY');

    // While the person is at the TV the flow is still listed and open.
    const listed = await harness.request('/flussi');
    expect((listed.body.flows as { flowId: string }[]).map((flow) => flow.flowId)).toEqual([
      flowId,
    ]);

    const result = await pairing;
    expect(Date.now() - begun).toBeGreaterThanOrEqual(9_500);
    expect(result.status).toBe(200);
    expect(result.body.type).toBe('create_entry');
    expect(harness.fake.callsFor(FLOW_STEP)).toHaveLength(2);
  }, 30_000);

  it('answers in Italian when the address is wrong, and lets the person try again', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.unreachableHosts = ['192.168.1.11'];
    const started = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    const flowId = started.body.flowId as string;

    const wrong = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { host: '192.168.1.11' } },
    });
    expect(wrong.status).toBe(200);
    expect(wrong.body).toMatchObject({
      type: 'form',
      stepId: 'user',
      errors: [{ field: null, code: 'cannot_connect' }],
    });
    expect((wrong.body.errors as { message: string }[])[0]?.message).toContain(
      'Non riesco a collegarmi al televisore'
    );

    const right = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { host: CANARY.tvHost } },
    });
    expect(right.body).toMatchObject({ stepId: 'pairing', errors: [] });

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'flow.step', outcome: 'error', code: 'cannot_connect' }),
      ])
    );
  });

  it('says so when OK was not pressed on the TV, and pairs on the second try', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.pairingOutcome = 'not_pressed';
    const { flowId } = await reachPairing(harness);

    const first = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(first.body).toMatchObject({
      type: 'form',
      stepId: 'pairing',
      errors: [{ code: 'error_pairing' }],
    });
    expect((first.body.errors as { message: string }[])[0]?.message).toBe(
      'Non hai premuto OK sul televisore in tempo. Riprova.'
    );

    harness.fake.knobs.pairingOutcome = 'accept';
    const second = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(second.body.type).toBe('create_entry');
  });

  it('reports a TV that is switched off as unreachable at pairing', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.pairingOutcome = 'cannot_connect';
    const { flowId } = await reachPairing(harness);

    const result = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(result.body).toMatchObject({ type: 'form', errors: [{ code: 'cannot_connect' }] });
  });

  it('translates the aborts of HA: already added, already in progress', async () => {
    const harness = await harnessFor({});
    const { flowId } = await reachPairing(harness);

    // Another tablet tries the same TV while the first flow waits at pairing.
    const second = await harness.request('/flussi', {
      method: 'POST',
      user: 'customer2',
      body: { handler: 'webostv' },
    });
    const busy = await harness.request(`/flussi/${second.body.flowId}`, {
      method: 'POST',
      user: 'customer2',
      body: { input: { host: CANARY.tvHost } },
    });
    expect(busy.body).toMatchObject({ type: 'abort', reason: 'already_in_progress' });
    expect(busy.body.message).toContain('già in corso');

    await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: {} } });

    const third = await harness.request('/flussi', {
      method: 'POST',
      user: 'customer2',
      body: { handler: 'webostv' },
    });
    const again = await harness.request(`/flussi/${third.body.flowId}`, {
      method: 'POST',
      user: 'customer2',
      body: { input: { host: CANARY.tvHost } },
    });
    expect(again.body).toMatchObject({
      type: 'abort',
      reason: 'already_configured',
      message: 'Questo dispositivo è già stato aggiunto.',
    });
    // An abort ends the flow: no row is left behind.
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
  });

  it('lets a person resume an open flow after a reload', async () => {
    const harness = await harnessFor({});
    const { flowId } = await reachPairing(harness);

    const listed = await harness.request('/flussi');
    expect(listed.body.flows).toEqual([
      expect.objectContaining({ flowId, handler: 'webostv', stepId: 'pairing' }),
    ]);

    const resumed = await harness.request(`/flussi/${flowId}`);
    expect(resumed.status).toBe(200);
    expect(resumed.body).toMatchObject({ type: 'form', stepId: 'pairing', flowId });
  });

  it('refuses a second flow for the same integration and tells which one is open', async () => {
    const harness = await harnessFor({});
    const first = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });

    const second = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ code: 'FLOW_ALREADY_OPEN', flowId: first.body.flowId });
    expect(harness.fake.callsFor(FLOW_START)).toHaveLength(1);
  });

  it('caps the number of open flows in total', async () => {
    const harness = await harnessFor({ module: { maxOpenFlowsTotal: 1 } });
    await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } });

    const second = await harness.request('/flussi', {
      method: 'POST',
      user: 'installer',
      body: { handler: 'webostv' },
    });
    expect(second.status).toBe(429);
    expect(second.body.code).toBe('TOO_MANY_FLOWS');
  });
});

describe('cancelling and losing flows', () => {
  it('cancels an own flow in HA and forgets it', async () => {
    const harness = await harnessFor({});
    const { flowId } = await reachPairing(harness);

    const cancelled = await harness.request(`/flussi/${flowId}`, { method: 'DELETE' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toEqual({ cancelled: true, pending: false });
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(1);
    expect(harness.fake.flows.size).toBe(0);

    const again = await harness.request(`/flussi/${flowId}`, { method: 'DELETE' });
    expect(again.status).toBe(404);
    expect(again.body.code).toBe('FLOW_NOT_FOUND');
  });

  it('forgets a flow that HA lost when it restarted', async () => {
    const harness = await harnessFor({});
    const { flowId } = await reachPairing(harness);

    harness.fake.forgetFlows();
    const result = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(result.status).toBe(404);
    expect(result.body.code).toBe('FLOW_NOT_FOUND');
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
  });

  it('expires an idle flow: 410, and the flow is cancelled in HA', async () => {
    let offset = 0;
    const harness = await harnessFor({
      module: { now: () => Date.now() + offset, flowTtlMs: 5_000 },
    });
    const { flowId } = await reachPairing(harness);

    offset += 6_000;
    const result = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(result.status).toBe(410);
    expect(result.body.code).toBe('FLOW_EXPIRED');
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(1);
    expect(harness.fake.flows.size).toBe(0);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
    expect(harness.fake.callsFor(FLOW_STEP).filter((call) => call.userId !== null)).toHaveLength(1);
  });

  it('cancels expired flows on the periodic sweep, without a request', async () => {
    let offset = 0;
    const harness = await harnessFor({
      module: { now: () => Date.now() + offset, flowTtlMs: 5_000 },
    });
    await reachPairing(harness);

    offset += 6_000;
    await harness.module.service.sweep();

    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(1);
    expect(harness.fake.flows.size).toBe(0);
    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'flow.expire', source: 'timer', outcome: 'ok' }),
      ])
    );
  });

  it('keeps an expired flow while the service is not active, and cancels it in HA when it is back', async () => {
    let offset = 0;
    const harness = await harnessFor({
      module: { now: () => Date.now() + offset, flowTtlMs: 5_000 },
    });
    const { flowId } = await reachPairing(harness);
    const loaded = harness.module.identity.store.load();
    if (!loaded.ok) throw new Error('the harness must have saved the secret');

    // The service is suspended (secret gone): the flow is still open in HA.
    harness.module.identity.store.remove();
    harness.module.identity.invalidate();
    offset += 6_000;
    await harness.module.service.sweep();

    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(0);
    expect(harness.fake.flows.has(flowId)).toBe(true);
    expect(harness.database.prepare('SELECT status FROM device_flows').all()).toEqual([
      { status: 'cancelling' },
    ]);

    harness.module.identity.store.save(loaded.secret);
    harness.module.identity.invalidate();
    await harness.module.service.sweep();

    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(1);
    expect(harness.fake.flows.size).toBe(0);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
  });

  it('keeps the row of a flow whose cancellation HA refused with an error, and retries', async () => {
    let offset = 0;
    const harness = await harnessFor({
      module: { now: () => Date.now() + offset, flowTtlMs: 5_000 },
    });
    const { flowId } = await reachPairing(harness);

    harness.fake.knobs.flowDeleteServerError = true;
    // The flow exists, so the fake would cancel it: remove it from the fake while keeping
    // the route failing, to model "HA answers 500 to the cancellation".
    harness.fake.forgetFlows();
    offset += 6_000;
    await harness.module.service.sweep();
    expect(harness.database.prepare('SELECT status FROM device_flows').all()).toEqual([
      { status: 'cancelling' },
    ]);

    // HA answers 404 for the flow: it is gone, so the row goes too.
    harness.fake.knobs.flowDeleteServerError = false;
    await harness.module.service.sweep();
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
    expect(harness.fake.flows.has(flowId)).toBe(false);
  });

  it('cancels the flows left open when the backend restarts (flows saved in tunet.db)', async () => {
    const harness = await harnessFor({});
    const { flowId } = await reachPairing(harness);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 1,
    });
    expect(harness.fake.flows.has(flowId)).toBe(true);

    const restarted = harness.restartBackend();
    await restarted.start();

    expect(harness.fake.flows.size).toBe(0);
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(1);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });

    // The old flow is gone for the person too, and a new attempt is not "already in progress".
    const old = await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: {} } });
    expect(old.status).toBe(404);
    const fresh = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(fresh.status).toBe(201);

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'flow.cancel_on_start',
          source: 'startup',
          outcome: 'ok',
        }),
      ])
    );
  });

  it('keeps trying to cancel when HA is down at start-up, and finishes when it is back', async () => {
    const harness = await harnessFor({});
    await reachPairing(harness);

    await harness.fake.stop();
    const restarted = harness.restartBackend();
    await restarted.start();
    expect(harness.database.prepare('SELECT status FROM device_flows').all()).toEqual([
      { status: 'cancelling' },
    ]);

    // Not offered to the person while it is being cancelled.
    expect((await harness.request('/flussi')).body.flows).toEqual([]);

    await harness.fake.start(harness.fake.port);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await restarted.service.sweep();
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
    expect(harness.fake.callsFor(FLOW_DELETE).length).toBeGreaterThanOrEqual(1);
  });
});

describe('ownership of flows', () => {
  it('answers 403 for the flow of another user and never reaches HA with it', async () => {
    const harness = await harnessFor({});
    const { flowId } = await reachPairing(harness);
    const stepsBefore = harness.fake.callsFor(FLOW_STEP).length;

    const step = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      user: 'customer2',
      body: { input: {} },
    });
    const read = await harness.request(`/flussi/${flowId}`, { user: 'customer2' });
    const cancel = await harness.request(`/flussi/${flowId}`, {
      method: 'DELETE',
      user: 'customer2',
    });

    for (const attempt of [step, read, cancel]) {
      expect(attempt.status).toBe(403);
      expect(attempt.body.code).toBe('FORBIDDEN');
    }
    expect(harness.fake.callsFor(FLOW_STEP)).toHaveLength(stepsBefore);
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(0);
    expect(harness.fake.flows.has(flowId)).toBe(true);

    // The other user does not see it either.
    expect((await harness.request('/flussi', { user: 'customer2' })).body.flows).toEqual([]);
  });

  it('answers 404 for a flow that Acasystem did not open, even if HA has it', async () => {
    const harness = await harnessFor({});
    const foreign = 'f'.repeat(32);
    harness.fake.flows.set(foreign, { id: foreign, handler: 'webostv', step: 'user', host: null });

    const result = await harness.request(`/flussi/${foreign}`, {
      method: 'POST',
      body: { input: { host: CANARY.tvHost } },
    });
    expect(result.status).toBe(404);
    expect(result.body.code).toBe('FLOW_NOT_FOUND');
    expect(harness.fake.callsFor(FLOW_STEP)).toHaveLength(0);
  });
});

describe('input and results are never guessed', () => {
  it.each([
    ['a loopback address', { host: '127.0.0.1' }, 'host'],
    ['an address with a scheme', { host: 'http://192.168.1.26' }, 'host'],
    ['no address', {}, 'host'],
    ['an extra key', { host: CANARY.tvHost, token: 'x' }, 'token'],
  ])('refuses %s with 400 and does not call HA', async (_label, input, field) => {
    const harness = await harnessFor({});
    const started = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    const stepsBefore = harness.fake.callsFor(FLOW_STEP).length;

    const result = await harness.request(`/flussi/${started.body.flowId}`, {
      method: 'POST',
      body: { input },
    });
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ code: 'INVALID_INPUT', field });
    expect(harness.fake.callsFor(FLOW_STEP)).toHaveLength(stepsBefore);
  });

  it('cancels the flow when HA answers with a step type it cannot draw', async () => {
    const harness = await harnessFor({});
    const started = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    harness.fake.knobs.overrideNextResult = {
      type: 'shiny_new_type',
      step_id: 'auth',
      url: 'https://example.org/login',
    };

    const result = await harness.request(`/flussi/${started.body.flowId}`, {
      method: 'POST',
      body: { input: { host: CANARY.tvHost } },
    });
    expect(result.status).toBe(422);
    expect(result.body.code).toBe('UNSUPPORTED_STEP');
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(1);
    expect(harness.fake.flows.size).toBe(0);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
    expect(JSON.stringify(result.body)).not.toContain('example.org');
  });

  it('cancels the flow when the first step has a field it cannot draw', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.overrideNextResult = {
      type: 'form',
      step_id: 'user',
      data_schema: [{ name: 'blob', selector: { object: {} } }],
      errors: null,
    };

    const result = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    // A field Acasystem cannot draw is for the installer (F4).
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('REQUIRES_INSTALLER');
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(1);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
  });

  it('does not answer a step without input rules: the flow is cancelled', async () => {
    const harness = await harnessFor({});
    const { flowId } = await reachPairing(harness);
    // A step this server has no rules for (as a later HA could introduce).
    harness.database
      .prepare('UPDATE device_flows SET step_id = ? WHERE flow_id = ?')
      .run('reauth_confirm', flowId);

    const result = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(result.status).toBe(422);
    expect(result.body.code).toBe('UNSUPPORTED_STEP');
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(1);
    expect(harness.fake.flows.size).toBe(0);
  });

  it('cancels the flow that HA opened as "next flow" of a created entry', async () => {
    const harness = await harnessFor({});
    const { flowId } = await reachPairing(harness);
    const tv = harness.fake.seedTv({ host: '192.168.1.77' });
    harness.fake.flows.set('nextflow1', {
      id: 'nextflow1',
      handler: 'webostv',
      step: 'user',
      host: null,
    });
    harness.fake.knobs.overrideNextResult = {
      type: 'create_entry',
      title: tv.title,
      result: { entry_id: tv.entry_id, domain: 'webostv', title: tv.title, state: 'loaded' },
      next_flow: ['config_flow', 'nextflow1'],
    };

    const created = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(created.body).toMatchObject({
      type: 'create_entry',
      entryId: tv.entry_id,
      pending: false,
    });
    expect(harness.fake.flows.has('nextflow1')).toBe(false);
  });
});

describe('limits', () => {
  it('limits the starts per user with a Retry-After header', async () => {
    const harness = await harnessFor({ module: { flowStartLimit: { max: 2, windowMs: 600_000 } } });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const started = await harness.request('/flussi', {
        method: 'POST',
        body: { handler: 'webostv' },
      });
      expect(started.status).toBe(201);
      await harness.request(`/flussi/${started.body.flowId}`, { method: 'DELETE' });
    }
    const third = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(third.status).toBe(429);
    expect(third.body).toMatchObject({ code: 'RATE_LIMITED' });
    expect(Number(third.headers.get('retry-after'))).toBeGreaterThan(0);
    // Another user is not affected.
    expect(
      (
        await harness.request('/flussi', {
          method: 'POST',
          user: 'customer2',
          body: { handler: 'webostv' },
        })
      ).status
    ).toBe(201);
  });

  it('limits the writes per user', async () => {
    const harness = await harnessFor({ module: { mutationLimit: { max: 3, windowMs: 60_000 } } });
    const started = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    const flowId = started.body.flowId as string;

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      statuses.push(
        (
          await harness.request(`/flussi/${flowId}`, {
            method: 'POST',
            body: { input: { host: 'tv.local' } },
          })
        ).status
      );
    }
    expect(statuses.slice(-1)).toEqual([429]);
  });

  it('limits all the requests of the router', async () => {
    const harness = await harnessFor({ rateLimitMax: 10 });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1)
      statuses.push((await harness.request('/flussi')).status);
    expect(statuses.filter((status) => status === 429).length).toBeGreaterThanOrEqual(1);
  });
});

describe('nothing sensitive is kept or shown', () => {
  it('keeps the address of the TV out of responses, logs, console, registry and tunet.db', async () => {
    const harness = await harnessFor({});
    const { flowId } = await reachPairing(harness);
    await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: {} } });
    await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } });
    await harness.request(`/flussi/${flowId}`);
    await harness.request('/registro', { user: 'installer' });

    const visible = everythingVisible(harness);
    expect(visible).not.toContain(CANARY.tvHost);
    expect(visible).not.toContain(harness.serviceToken);
    expect(dumpDatabase(harness.database)).not.toMatch(/192\.0\.2/);
    // The facade never lets a response be cached.
    expect(
      harness.transcript.every((entry) => entry.toLowerCase().includes('cache-control: no-store'))
    ).toBe(true);
  });
});
