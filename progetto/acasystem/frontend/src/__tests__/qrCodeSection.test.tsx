import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QrCodeSection } from '@/pages/system/sections/qrCodeSection';

const mocks = vi.hoisted(() => ({ endpoint: vi.fn(), invite: vi.fn(), importFile: vi.fn() }));
vi.mock('@/api/webPairing', () => ({ importPortableLayoutFile: mocks.importFile }));
vi.mock('@/api/qrPairing', () => ({
  readQrEndpoint: mocks.endpoint,
  createQrInvitation: mocks.invite,
  pairingUri: () => 'acasystem://pair?v=1',
  qrImage: () => 'data:image/svg+xml,%3Csvg%2F%3E',
  centralConnectionUri: (value: string) => `${value}/`,
}));
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('QR Code section', () => {
  it('shows a plain connection QR without creating an account invitation', async () => {
    mocks.endpoint.mockResolvedValue('http://192.168.1.5:3002');
    render(<QrCodeSection authenticated />);
    fireEvent.click(screen.getByRole('button', { name: 'Mostra QR di collegamento' }));
    expect(await screen.findByRole('img', { name: 'QR Code di collegamento alla centrale' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Indirizzo della centrale' })).toHaveValue('http://192.168.1.5:3002/');
    expect(screen.getByRole('heading', { name: 'Collegamento alla centrale' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Invito account o copia layout' })).toBeVisible();
    expect(screen.getByText(/collegamento resta valido finché/)).toBeVisible();
    expect(mocks.invite).not.toHaveBeenCalled();
  });
  it('copia il solo indirizzo pubblico della centrale', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    mocks.endpoint.mockResolvedValue('http://192.168.1.5:3002');
    render(<QrCodeSection authenticated />);
    fireEvent.click(screen.getByRole('button', { name: 'Mostra QR di collegamento' }));
    await screen.findByRole('textbox', { name: 'Indirizzo della centrale' });
    fireEvent.click(screen.getByRole('button', { name: 'Copia indirizzo' }));
    expect(await screen.findByText('Indirizzo copiato.')).toBeVisible();
    expect(writeText).toHaveBeenCalledWith('http://192.168.1.5:3002/');
  });
  it('requires a signed-in user and explains the two distinct choices', () => {
    render(<QrCodeSection authenticated={false} />);
    expect(screen.getByRole('button', { name: 'Genera QR Code' })).toBeDisabled();
    expect(screen.getByText(/«Collega account» per usare lo stesso account sincronizzato/)).toBeVisible();
    expect(mocks.invite).not.toHaveBeenCalled();
  });
  it('uses the shell endpoint and displays a temporary code', async () => {
    mocks.endpoint.mockResolvedValue('http://192.168.1.5:3002');
    mocks.invite.mockResolvedValue({ schema: 1, houseId: 'own-house', endpoint: 'http://192.168.1.5:3002',
      invite: 'opaque', expiresAt: Date.now() + 300_000 });
    render(<QrCodeSection authenticated />);
    fireEvent.click(screen.getByRole('button', { name: 'Genera QR Code' }));
    expect(await screen.findByRole('img', { name: /QR Code temporaneo/ })).toBeVisible();
    expect(mocks.invite).toHaveBeenCalledWith('http://192.168.1.5:3002');
    expect(screen.getByText(/Non contiene password/)).toBeVisible();
  });
  it('shows a useful error when the LAN endpoint is unavailable', async () => {
    mocks.endpoint.mockResolvedValue(null);
    render(<QrCodeSection authenticated />);
    fireEvent.click(screen.getByRole('button', { name: 'Genera QR Code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('indirizzo disponibile sulla rete locale');
    expect(mocks.invite).not.toHaveBeenCalled();
  });
  it('imports a checked file only in the signed-in destination and applies the returned copy', async () => {
    const configuration = { snapshot: { version: 1, layout: {}, appearance: {} },
      appearance: { theme: 'dark', accent: 'cyan', wallpaper: 'none' } } as const;
    mocks.importFile.mockResolvedValue(configuration);
    const apply = vi.fn();
    render(<QrCodeSection authenticated onImportConfiguration={apply} />);
    const file = new File(['{}'], 'acasystem-layout.aca.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Importa file layout'), { target: { files: [file] } });
    expect(await screen.findByText(/Layout importato come copia/)).toBeVisible();
    expect(mocks.importFile).toHaveBeenCalledWith(file);
    expect(apply).toHaveBeenCalledWith(configuration);
    expect(mocks.invite).not.toHaveBeenCalled();
  });
});
