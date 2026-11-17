import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientRecord } from '../../../contracts/collaboration';
const mocks = vi.hoisted(() => ({ list: vi.fn(), rename: vi.fn(), revoke: vi.fn(), offline: false }));
const client: ClientRecord = { id: 'phone', userId: 'anna', label: 'Telefono Anna', platform: 'web', activeProfileId: null,
  preferences: {}, createdAt: '', lastSeenAt: '', revokedAt: null, revocationPending: false };
vi.mock('@/api/clientSession', () => ({ listClients: mocks.list, renameClient: mocks.rename, revokeClient: mocks.revoke }));
vi.mock('@/hooks/client/ClientAccessGate', () => ({ useClientSession: () => ({ houseId: 'home', user: { id: 'anna' }, client, offline: mocks.offline }) }));
import { ClientsSection } from '@/pages/system/sections/ClientsSection';
beforeEach(() => { vi.resetAllMocks(); mocks.offline = false; mocks.list.mockResolvedValue([client]); });
afterEach(cleanup);
describe('accessi dei dispositivi dello stesso account', () => {
  it('rinomina il client identificato, senza cambiare account o profilo', async () => {
    mocks.rename.mockResolvedValue({ ...client, label: 'iPhone Anna' });
    render(<ClientsSection onLogout={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Nome di Telefono Anna'), { target: { value: 'iPhone Anna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva nome' }));
    expect(await screen.findByText('Nome del dispositivo aggiornato.')).toBeVisible();
    expect(mocks.rename).toHaveBeenCalledWith('phone', 'iPhone Anna');
  });
  it('chiude l’accesso corrente quando ACA lo blocca, anche se la revoca HA è in attesa', async () => {
    mocks.revoke.mockResolvedValue({ ...client, revokedAt: '2026-11-02T12:00:00Z', revocationPending: true });
    const logout = vi.fn(); render(<ClientsSection onLogout={logout} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Scollega dispositivo' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Scollega dispositivo' }).at(-1)!);
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(mocks.revoke).toHaveBeenCalledWith('phone');
  });
  it('distingue la revoca in attesa di un altro client senza scollegare quello in uso', async () => {
    const other = { ...client, id: 'pc', label: 'PC Anna' };
    mocks.list.mockResolvedValue([other]); mocks.revoke.mockResolvedValue({ ...other, revokedAt: '2026-11-02T12:00:00Z', revocationPending: true });
    const logout = vi.fn(); render(<ClientsSection onLogout={logout} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Scollega dispositivo' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Scollega dispositivo' }).at(-1)!);
    expect(await screen.findByText(/conferma della centrale è ancora in attesa/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Riprova revoca' })).toBeEnabled();
    expect(logout).not.toHaveBeenCalled();
  });
  it('non esegue operazioni di gestione quando la sessione è offline', () => {
    mocks.offline = true; render(<ClientsSection onLogout={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Aggiorna elenco' })).toBeDisabled();
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
