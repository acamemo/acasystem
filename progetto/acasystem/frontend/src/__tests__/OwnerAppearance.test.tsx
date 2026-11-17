import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthData } from 'home-assistant-js-websocket';
import type { AccountMetadata } from '../../../contracts/account';
import type { ClientSession } from '@/api/clientSession';
const mocks = vi.hoisted(() => ({ backend: vi.fn(), headers: vi.fn(), read: vi.fn(), save: vi.fn(), saveImage: vi.fn(), readImage: vi.fn(), removeImage: vi.fn() }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.backend }));
vi.mock('@/api/apiAuth', () => ({ getValidatedHomeAssistantRequestHeadersAsync: mocks.headers }));
vi.mock('@/api/accountApi', () => ({ readAccount: mocks.read, saveAccountColor: mocks.save, saveAccountImage: mocks.saveImage, readOwnAccountImage: mocks.readImage, removeAccountImage: mocks.removeImage }));
import { applyOwnerAppearance, bindMemberAppearance, bindOwnerAppearance, OWNER_APPEARANCE_KEY, readOwnerAppearance, rememberMemberAppearance, rememberOwnerAppearance } from '@/api/ownerAppearance';
import { readAppearanceImages } from '@/components/account/appearanceDraft';
import { getClientSession, setClientSession } from '@/api/clientSession';
import { OwnerAppearanceGate } from '@/pages/connect/OwnerAppearanceGate';

const session = { houseId: 'house', user: { id: 'owner', name: 'owner', color: '#6b8afd' },
  client: { id: 'client-owner', userId: 'owner' } } as ClientSession;
const tokens = { access_token: 'transient-access', refresh_token: 'transient-refresh' } as AuthData;
const metadata: AccountMetadata = { userId: 'owner', name: 'owner', color: '#6b8afd', revision: 0, avatarRevision: null, coverRevision: null };
const bootstrap = () => ({ protocol: 2, houseId: session.houseId, user: session.user, client: { ...session.client, revokedAt: null } });
const bind = async () => { rememberOwnerAppearance('owner', '#123abc'); await bindOwnerAppearance(tokens, 'owner'); };

beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); localStorage.clear(); setClientSession(session);
  mocks.backend.mockImplementation(async () => bootstrap());
  mocks.headers.mockResolvedValue({ Authorization: 'Bearer captured-access' });
  mocks.read.mockResolvedValue({ ...metadata });
  mocks.save.mockImplementation(async (base: number, color: string) => ({ ...metadata, color, revision: base + 1 }));
  mocks.readImage.mockResolvedValue(null);
});
afterEach(() => { cleanup(); sessionStorage.clear(); setClientSession(null); vi.restoreAllMocks(); });

describe('colore del primo account, senza credenziali nel recupero', () => {
  it('il normale bind owner non associa un intento member senza la verifica del suo attempt', () => {
    rememberMemberAppearance('owner', '#123abc', 'member-attempt', { avatar: 'data:image/jpeg;base64,AQID' });
    expect(bindOwnerAppearance(tokens, 'owner')).toBeNull();
    expect(mocks.backend).not.toHaveBeenCalled();
    expect(readOwnerAppearance()?.userId).toBeUndefined();
  });
  it('conserva solo l’intento, lo rilegge dopo riapertura e lega identità con il token esatto del login', async () => {
    rememberOwnerAppearance('owner', '#123abc');
    const before = sessionStorage.getItem(OWNER_APPEARANCE_KEY);
    expect(readOwnerAppearance()).toMatchObject({ username: 'owner', color: '#123abc' });
    expect(bindOwnerAppearance(tokens, 'different-user')).toBeNull();
    expect(sessionStorage.getItem(OWNER_APPEARANCE_KEY)).toBe(before);
    expect(mocks.backend).not.toHaveBeenCalled();
    await bindOwnerAppearance(tokens, '  OWNER  ');
    expect(mocks.backend).toHaveBeenCalledWith('/v2/bootstrap', {}, {
      authHeadersOverride: { Authorization: 'Bearer transient-access' }, retryOnOAuthUnauthorized: false, notifyOnUnauthorized: false,
    });
    const stored = sessionStorage.getItem(OWNER_APPEARANCE_KEY) || '';
    expect(JSON.parse(stored)).toMatchObject({ houseId: 'house', userId: 'owner', color: '#123abc' });
    expect(stored).not.toContain('transient-access'); expect(stored).not.toContain('transient-refresh');
    expect(stored).not.toMatch(/password|token/i);
  });
  it('non applica né cancella il colore quando entra un altro utente', async () => {
    await bind(); mocks.backend.mockClear();
    const before = sessionStorage.getItem(OWNER_APPEARANCE_KEY);
    await applyOwnerAppearance({ ...session, user: { id: 'other', name: 'other' } });
    expect(mocks.backend).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(OWNER_APPEARANCE_KEY)).toBe(before);
  });
  it('salva una volta e aggiorna subito il contesto del client corretto', async () => {
    await bind();
    await applyOwnerAppearance(session);
    expect(mocks.save).toHaveBeenCalledWith(0, '#123abc', { Authorization: 'Bearer captured-access' }, session);
    expect(getClientSession()?.user.color).toBe('#123abc');
    expect(readOwnerAppearance()).toBeNull();
  });
  it('persiste la scelta anche quando coincide con il fallback non ancora salvato', async () => {
    await bind(); mocks.read.mockResolvedValue({ ...metadata, color: '#123abc', revision: 0 });
    await applyOwnerAppearance(session);
    expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('dopo risposta persa rilegge il colore confermato e non ripete la scrittura', async () => {
    await bind(); mocks.save.mockRejectedValueOnce(new Error('Risposta persa'));
    await expect(applyOwnerAppearance(session)).rejects.toThrow('Risposta persa');
    expect(readOwnerAppearance()).not.toBeNull();
    mocks.read.mockResolvedValue({ ...metadata, color: '#123abc', revision: 1 });
    await applyOwnerAppearance(session);
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(getClientSession()?.user.color).toBe('#123abc');
    expect(readOwnerAppearance()).toBeNull();
  });
  it('un cambio account durante la richiesta non colora il nuovo contesto e usa sempre l’header catturato', async () => {
    await bind();
    let complete!: (value: AccountMetadata) => void;
    mocks.read.mockReturnValue(new Promise<AccountMetadata>((resolve) => { complete = resolve; }));
    const applying = applyOwnerAppearance(session);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledOnce());
    const other = { ...session, houseId: 'another-house', user: { id: 'other', name: 'other', color: '#abcdef' }, client: { ...session.client, id: 'other-client' } };
    setClientSession(other); mocks.headers.mockResolvedValue({ Authorization: 'Bearer other-access' });
    complete(metadata); await applying;
    expect(mocks.save).toHaveBeenCalledWith(0, '#123abc', { Authorization: 'Bearer captured-access' }, session);
    expect(getClientSession()).toBe(other);
  });
  it('rifiuta un’identità corrente diversa prima di leggere o modificare l’account', async () => {
    await bind(); mocks.backend.mockResolvedValue({ ...bootstrap(), user: { id: 'other' } });
    await expect(applyOwnerAppearance(session)).rejects.toThrow('verificare');
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
    expect(readOwnerAppearance()).not.toBeNull();
  });
  it('mantiene l’intento su conflitto e riprova con CAS dopo un’azione esplicita', async () => {
    await bind(); mocks.save.mockRejectedValueOnce(Object.assign(new Error('Colore cambiato'), { status: 409 }));
    render(<OwnerAppearanceGate session={session}><p>Interfaccia</p></OwnerAppearanceGate>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Colore cambiato');
    expect(readOwnerAppearance()).not.toBeNull(); expect(screen.queryByText('Interfaccia')).toBeNull();
    mocks.read.mockResolvedValue({ ...metadata, revision: 1, color: '#000000' });
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByText('Interfaccia')).toBeVisible();
    expect(mocks.save).toHaveBeenLastCalledWith(1, '#123abc', { Authorization: 'Bearer captured-access' }, session);
  });
  it('riapertura e StrictMode non generano due salvataggi né montano i profili prima della conferma', async () => {
    await bind();
    let complete!: (value: AccountMetadata) => void;
    mocks.save.mockReturnValue(new Promise<AccountMetadata>((resolve) => { complete = resolve; }));
    const first = render(<StrictMode><OwnerAppearanceGate session={session}><p>Interfaccia</p></OwnerAppearanceGate></StrictMode>);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(screen.queryByText('Interfaccia')).toBeNull(); first.unmount();
    render(<OwnerAppearanceGate session={session}><p>Interfaccia</p></OwnerAppearanceGate>);
    await act(async () => { complete({ ...metadata, color: '#123abc', revision: 1 }); });
    expect(await screen.findByText('Interfaccia')).toBeVisible();
    expect(mocks.save).toHaveBeenCalledOnce(); expect(readOwnerAppearance()).toBeNull();
  });
  it('colore, avatar e cover del membro passano dopo login/client dalle stesse API protette e revisioni', async () => {
    const image = 'data:image/jpeg;base64,AQID';
    rememberMemberAppearance('owner', '#123abc', 'member-attempt', { avatar: image, cover: image });
    const id = readOwnerAppearance()!.id;
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.saveImage).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(OWNER_APPEARANCE_KEY)).not.toContain(image);
    await bindMemberAppearance(tokens, 'owner', 'member-attempt');
    mocks.saveImage.mockImplementation(async (kind: string, base: number) => ({ ...metadata, color: '#123abc', revision: base + 1,
      avatarRevision: kind === 'avatar' ? base + 1 : 2, coverRevision: kind === 'cover' ? base + 1 : null }));
    await applyOwnerAppearance(session);
    expect(mocks.save).toHaveBeenCalledWith(0, '#123abc', { Authorization: 'Bearer captured-access' }, session);
    expect(mocks.saveImage).toHaveBeenNthCalledWith(1, 'avatar', 1, image, { Authorization: 'Bearer captured-access' }, session);
    expect(mocks.saveImage).toHaveBeenNthCalledWith(2, 'cover', 2, image, { Authorization: 'Bearer captured-access' }, session);
    expect(readAppearanceImages(id)).toEqual({}); expect(readOwnerAppearance()).toBeNull();
  });
  it('rifiuta un bind membro per un altro utente e non applica il ritaglio al nuovo account', async () => {
    rememberMemberAppearance('owner', '#123abc', 'member-attempt', { avatar: 'data:image/jpeg;base64,AQID' });
    await expect(bindMemberAppearance(tokens, 'another-user', 'member-attempt')).rejects.toThrow(/verificare/);
    await applyOwnerAppearance({ ...session, user: { id: 'another-user', name: 'Other' } });
    expect(mocks.saveImage).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
    expect(readOwnerAppearance()?.userId).toBeUndefined();
  });
  it('un metadato colore non cancella le foto; dopo risposta avatar persa rilegge e invia solo la cover restante', async () => {
    const image = 'data:image/jpeg;base64,AQID';
    rememberOwnerAppearance('owner', '#123abc', { avatar: image, cover: image });
    await bindOwnerAppearance(tokens, 'owner');
    const id = readOwnerAppearance()!.id;
    mocks.save.mockImplementationOnce(async () => {
      setClientSession({ ...session, user: { ...session.user, color: '#123abc' } });
      return { ...metadata, color: '#123abc', revision: 1 };
    });
    mocks.saveImage.mockRejectedValueOnce(new Error('Risposta persa'));
    await expect(applyOwnerAppearance(session)).rejects.toThrow('Risposta persa');
    expect(readAppearanceImages(id)).toEqual({ avatar: image, cover: image });
    mocks.read.mockResolvedValue({ ...metadata, color: '#123abc', revision: 2, avatarRevision: 2 });
    mocks.readImage.mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }));
    mocks.saveImage.mockResolvedValue({ ...metadata, color: '#123abc', revision: 3, avatarRevision: 2, coverRevision: 3 });
    await applyOwnerAppearance(session);
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.saveImage).toHaveBeenCalledTimes(2);
    expect(mocks.saveImage).toHaveBeenLastCalledWith('cover', 2, image, { Authorization: 'Bearer captured-access' }, session);
    expect(readAppearanceImages(id)).toEqual({});
  });
  it('un vero cambio account durante la lettura libera i ritagli e non li invia al nuovo utente', async () => {
    const image = 'data:image/jpeg;base64,AQID';
    rememberOwnerAppearance('owner', '#123abc', { avatar: image, cover: image });
    await bindOwnerAppearance(tokens, 'owner');
    const id = readOwnerAppearance()!.id;
    let complete!: (value: AccountMetadata) => void;
    mocks.read.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const saving = applyOwnerAppearance(session);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledOnce());
    const other = { ...session, user: { id: 'other', name: 'Other' } };
    setClientSession(other);
    expect(readAppearanceImages(id)).toEqual({});
    complete(metadata); await saving;
    expect(mocks.saveImage).not.toHaveBeenCalled(); expect(getClientSession()).toBe(other);
  });
});
