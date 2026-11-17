import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountMetadata } from '../../../contracts/account';
const mocks = vi.hoisted(() => ({ read: vi.fn(), image: vi.fn(), remove: vi.fn(), color: vi.fn(), save: vi.fn(), avatar: vi.fn(), photo: false,
  session: { user: { id: 'anna', name: 'Anna', color: '#6b8afd' }, client: { label: 'Telefono Anna' } } }));
vi.mock('@/api/accountApi', () => ({ readAccount: mocks.read, readOwnAccountImage: mocks.image, removeAccountImage: mocks.remove,
  saveAccountColor: mocks.color, saveAccountImage: mocks.save, accountAvatarUrl: mocks.avatar,
  hasAccountAvatar: () => mocks.photo, subscribeAccountAvatars: () => () => undefined }));
vi.mock('@/hooks/client/ClientAccessGate', () => ({ useClientSession: () => mocks.session }));
vi.mock('@/components/account/AccountImageCropper', () => ({ AccountImageCropper: ({ kind, onSave }: { kind: string; onSave: (value: string) => Promise<void> }) =>
  <button onClick={() => void onSave('data:image/jpeg;base64,crop')}>Salva ritaglio {kind}</button> }));
import { AccountView } from '@/components/account/AccountView';
import { AccountAvatar } from '@/components/account/AccountAvatar';
const account: AccountMetadata = { userId: 'anna', name: 'Anna', color: '#6b8afd', revision: 4, avatarRevision: null, coverRevision: null };
beforeEach(() => { vi.resetAllMocks(); mocks.photo = false; mocks.read.mockResolvedValue(account); mocks.avatar.mockResolvedValue(null); mocks.image.mockResolvedValue(null); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('personalizzazione account', () => {
  it('l’iniziale resta leggibile sul colore personale nero o bianco', async () => {
    render(<><AccountAvatar userId="black" name="Nero" color="#000000" /><AccountAvatar userId="white" name="Bianco" color="#ffffff" /></>);
    await waitFor(() => expect(screen.getByLabelText('Nero')).toHaveStyle({ backgroundColor: '#000000', color: '#ffffff' }));
    expect(screen.getByLabelText('Bianco')).toHaveStyle({ backgroundColor: '#ffffff', color: '#000000' });
  });
  it('Riprova cancella l’errore precedente quando la lettura riesce', async () => {
    mocks.read.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(account);
    render(<AccountView onClose={vi.fn()} />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Personalizza account' })).toBeEnabled());
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('cambiare account smonta il ritaglio precedente e non mostra i suoi metadati nel nuovo editor', async () => {
    const previous = mocks.session.user;
    const view = render(<AccountView onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Personalizza account' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('File della foto profilo'), { target: { files: [new File(['source'], 'foto.jpg')] } });
    expect(screen.getByRole('button', { name: 'Salva ritaglio avatar' })).toBeInTheDocument();
    try {
      mocks.read.mockReturnValue(new Promise(() => undefined));
      mocks.session.user = { ...previous, id: 'other', name: 'Altro' };
      view.rerender(<AccountView onClose={vi.fn()} />);
      expect(screen.queryByRole('button', { name: 'Salva ritaglio avatar' })).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Anna' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Altro' })).toBeInTheDocument();
    } finally { mocks.session.user = previous; }
  });
  it('la foto sostituisce il colore anche se l’immagine è temporaneamente indisponibile', async () => {
    mocks.photo = true; mocks.avatar.mockResolvedValue('blob:avatar');
    const { container } = render(<AccountAvatar userId="anna" name="Anna" color="#6b8afd" />);
    await waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', 'blob:avatar'));
    expect(screen.getByLabelText('Anna')).not.toHaveStyle({ backgroundColor: '#6b8afd' });
    fireEvent.error(container.querySelector('img')!);
    expect(screen.getByLabelText('Anna')).not.toHaveStyle({ backgroundColor: '#6b8afd' });
  });
  it('apre i controlli dal vero avatar e salva il colore con la revisione corrente', async () => {
    mocks.color.mockResolvedValue({ ...account, color: '#46a990', revision: 5 });
    render(<AccountView onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Personalizza account' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Personalizza foto e colore del mio account' }));
    fireEvent.change(screen.getByLabelText('Personalizza colore profilo'), { target: { value: '#46a990' } });
    expect(await screen.findByText('Personalizzazione aggiornata.')).toBeVisible();
    expect(mocks.color).toHaveBeenCalledWith(4, '#46a990', undefined, mocks.session);
  });
  it('carica lo sfondo soltanto nella vista account e lo libera alla chiusura', async () => {
    mocks.read.mockResolvedValue({ ...account, coverRevision: 2 }); mocks.image.mockResolvedValue(new Blob(['image'], { type: 'image/jpeg' }));
    const revoke = vi.fn(); vi.stubGlobal('URL', { createObjectURL: () => 'blob:cover', revokeObjectURL: revoke });
    const { unmount } = render(<AccountView onClose={vi.fn()} />);
    expect(await screen.findByAltText('Sfondo del mio account')).toHaveAttribute('src', 'blob:cover');
    expect(mocks.image).toHaveBeenCalledWith('cover');
    unmount(); expect(revoke).toHaveBeenCalledWith('blob:cover');
  });
  it('invia il ritaglio con CAS e rilegge i dati quando un altro client modifica l’account', async () => {
    mocks.save.mockResolvedValue({ ...account, avatarRevision: 1, revision: 5 });
    const { rerender } = render(<AccountView onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Personalizza account' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('File della foto profilo'), { target: { files: [new File(['source'], 'foto.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva ritaglio avatar' }));
    expect(await screen.findByText('Personalizzazione aggiornata.')).toBeVisible();
    expect(mocks.save).toHaveBeenCalledWith('avatar', 4, 'data:image/jpeg;base64,crop', undefined, mocks.session);
    mocks.color.mockRejectedValue(Object.assign(new Error('Conflict'), { status: 409 }));
    mocks.read.mockResolvedValue({ ...account, revision: 6 });
    rerender(<AccountView onClose={vi.fn()} />);
    if (screen.queryByRole('button', { name: 'Personalizza account' })?.getAttribute('aria-expanded') === 'false') fireEvent.click(screen.getByRole('button', { name: 'Personalizza account' }));
    mocks.remove.mockResolvedValue({ ...account, revision: 6 });
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi foto profilo' }));
    await screen.findByLabelText('Personalizza colore profilo');
    fireEvent.change(screen.getByLabelText('Personalizza colore profilo'), { target: { value: '#e879a0' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('cambiato su un altro dispositivo');
    expect(mocks.read).toHaveBeenCalledTimes(2);
  });
});
