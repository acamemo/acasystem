import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  headers: vi.fn(() => Promise.resolve({ Authorization: 'Bearer test' })),
  method: vi.fn(() => 'oauth'),
  unauthorized: vi.fn((message: string) => Object.assign(new Error(message), { status: 401 })),
}));

vi.mock('@/api/apiAuth', () => ({
  getValidatedHomeAssistantRequestHeadersAsync: auth.headers,
  getStoredAuthMethod: auth.method,
  notifyHomeAssistantApiUnauthorized: auth.unauthorized,
}));

import { RepairServiceNotice } from '@/components/widgets/utilities/discover/RepairServiceNotice';
import { installFakeDevices, errorReply, type FakeDevices } from './devicesFakeServer';

/**
 * «Ripara il servizio»: the button anyone can tap when the device service is off. It asks the
 * server to activate it again; on success the screen refreshes, otherwise the server says why.
 */

let fake: FakeDevices;
const onRepaired = vi.fn();

beforeEach(() => {
  fake = installFakeDevices();
  onRepaired.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const repair = () => fake.callsTo('POST /servizio/ripara');

describe('«Ripara il servizio»', () => {
  it('says the service is off, never names the installer, and offers the button', () => {
    render(<RepairServiceNotice onRepaired={onRepaired} />);
    expect(screen.getByText('Il servizio dei dispositivi non è attivo.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/installatore/i);
    expect(screen.getByRole('button', { name: 'Ripara il servizio' })).toBeEnabled();
  });

  it('shows «Sto riparando…» while it runs, then refreshes when the service is active', async () => {
    let release: () => void = () => undefined;
    fake.on(
      'POST /servizio/ripara',
      () =>
        new Promise((resolve) => {
          release = () => resolve({ body: { active: true, message: 'Il servizio è attivo.' } });
        })
    );
    render(<RepairServiceNotice onRepaired={onRepaired} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ripara il servizio' }));
    expect(await screen.findByRole('button', { name: 'Sto riparando…' })).toBeDisabled();
    release();
    await waitFor(() => expect(onRepaired).toHaveBeenCalledTimes(1));
    expect(repair()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ripara il servizio' })).toBeEnabled();
  });

  it('shows the message of the server when the service stays off, and can be tried again', async () => {
    fake.on('POST /servizio/ripara', () => ({
      body: { active: false, message: 'Home Assistant non risponde ancora. Riprova tra poco.' },
    }));
    render(<RepairServiceNotice onRepaired={onRepaired} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ripara il servizio' }));
    expect(
      await screen.findByText('Home Assistant non risponde ancora. Riprova tra poco.')
    ).toBeInTheDocument();
    expect(onRepaired).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ripara il servizio' }));
    await waitFor(() => expect(repair()).toHaveLength(2));
  });

  it('says it in plain words when the call itself fails', async () => {
    fake.on('POST /servizio/ripara', () => errorReply(500, 'INTERNAL', 'Errore.'));
    render(<RepairServiceNotice onRepaired={onRepaired} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ripara il servizio' }));
    expect(
      await screen.findByText('Non sono riuscito a riparare il servizio. Riprova.')
    ).toBeInTheDocument();
    expect(onRepaired).not.toHaveBeenCalled();
  });
});
