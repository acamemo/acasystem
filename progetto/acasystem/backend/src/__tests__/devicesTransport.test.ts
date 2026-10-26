// @vitest-environment node

import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HA_CALLS } from '../config/homeAssistantApiCatalog.ts';
import { createHaTransport, isHaError } from '../services/devices/haTransport.ts';
import { FakeHomeAssistant } from './fakeHomeAssistant.ts';

/**
 * The only retry of the transport is on the next base URL. A read may move on after an
 * unreachable host or a timeout; a write (pairing, flow steps, automations, removals) moves on
 * only when the connection failed before the request was sent, never after a timeout, because
 * HA may have received it (a flow left open, an entry added twice).
 */

let fake: FakeHomeAssistant;
let token: string;
let hung: Server;
let hungUrl: string;
let hungRequests: number;
let closedUrl: string;

const listen = (server: Server): Promise<string> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
    );
  });

beforeEach(async () => {
  fake = new FakeHomeAssistant();
  await fake.start();
  token = fake.addUser({ name: 'Servizio', isAdmin: true }).token;

  // A server that accepts the request and never answers.
  hungRequests = 0;
  hung = createServer(() => {
    hungRequests += 1;
  });
  hungUrl = await listen(hung);

  // A port nobody listens on: the connection is refused before anything is sent.
  const closed = createServer();
  closedUrl = await listen(closed);
  await new Promise<void>((resolve) => closed.close(() => resolve()));
});

afterEach(async () => {
  await fake.stop();
  hung.closeAllConnections();
  await new Promise<void>((resolve) => hung.close(() => resolve()));
});

const start = { token: '', body: { handler: 'webostv', show_advanced_options: false } };

describe('moving on to the next base URL', () => {
  it('sends a write to the next URL when the connection was refused before anything was sent', async () => {
    const transport = createHaTransport({ baseUrls: () => [closedUrl, fake.url] });

    const response = await transport.rest(HA_CALLS.flowStart, {
      ...start,
      token,
      timeoutMs: 2_000,
    });

    expect(response.status).toBe(200);
    expect(fake.callsFor('POST /api/config/config_entries/flow')).toHaveLength(1);
  });

  it('does not send a write again after a timeout: HA may have received it', async () => {
    const transport = createHaTransport({ baseUrls: () => [hungUrl, fake.url] });

    const error = await transport
      .rest(HA_CALLS.flowStart, { ...start, token, timeoutMs: 150 })
      .then(
        () => null,
        (caught: unknown) => caught
      );

    expect(isHaError(error) && error.kind).toBe('timeout');
    expect(hungRequests).toBe(1);
    expect(fake.callsFor('POST /api/config/config_entries/flow')).toHaveLength(0);
    expect(fake.flows.size).toBe(0);
  });

  it('reads from the next URL after a timeout: a read changes nothing', async () => {
    const transport = createHaTransport({ baseUrls: () => [hungUrl, fake.url] });

    const response = await transport.rest(HA_CALLS.flowHandlers, { token, timeoutMs: 150 });

    expect(response.status).toBe(200);
    expect(hungRequests).toBe(1);
    expect(fake.callsFor('GET /api/config/config_entries/flow_handlers')).toHaveLength(1);
  });
});
