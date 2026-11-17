import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HaAdminUser, HaWsApi } from '../services/devices/haAdapter.ts';
import { HaError } from '../services/devices/haTransport.ts';
import { createRegistrationService, validateRegistration } from '../v2/registrationService.ts';

const databases: Database.Database[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });
const setup = () => {
  const database = new Database(':memory:'); databases.push(database);
  const users: HaAdminUser[] = [];
  const api: Pick<HaWsApi, 'adminUsers' | 'createHumanUser' | 'updateUser' | 'createCredentials' | 'deleteUser'> = {
    adminUsers: vi.fn(async () => users.map((user) => ({ ...user }))),
    createHumanUser: vi.fn(async (name) => {
      const user = { id: randomUUID(), name, username: null, isActive: true, isAdmin: false,
        isOwner: false, localOnly: false, systemGenerated: false };
      users.push(user); return user;
    }),
    updateUser: vi.fn(async (id, changes) => { const user = users.find((item) => item.id === id)!; if (changes.name) user.name = changes.name; }),
    createCredentials: vi.fn(async (id, username) => { users.find((item) => item.id === id)!.username = username; }),
    deleteUser: vi.fn(async (id) => { const index = users.findIndex((item) => item.id === id); if (index >= 0) users.splice(index, 1); }),
  };
  const access = { ready: vi.fn(async () => true), withAdmin: async <T>(operation: (value: typeof api) => Promise<T>) => operation(api) };
  const registered = vi.fn();
  const service = createRegistrationService({ database, access, onRegistered: registered });
  const input = { attemptId: randomUUID(), name: 'Anna', username: 'anna', password: 'Password-in-RAM-123' };
  return { database, users, api, access, registered, service, input };
};

describe('registrazione pubblica HA recuperabile', () => {
  it('crea un normale membro una sola volta e non conserva password nel journal', async () => {
    const { service, input, api, database, users, registered } = setup();
    const first = await service.register(input);
    expect(first.status).toBe('created');
    expect(await service.register(input)).toEqual(first);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ name: 'Anna', isAdmin: false, isOwner: false, localOnly: false, username: 'anna' });
    expect(api.createHumanUser).toHaveBeenCalledOnce();
    expect(api.createCredentials).toHaveBeenCalledOnce();
    expect(registered).toHaveBeenCalledOnce();
    expect(JSON.stringify(database.prepare('SELECT * FROM aca_v2_registration_attempts').all())).not.toContain(input.password);
  });
  it('conserva il colore facoltativo nel journal e nel solo evento di creazione', async () => {
    const { service, input, registered, database } = setup();
    await service.register({ ...input, color: '#6b8afd' });
    expect(registered).toHaveBeenCalledWith(expect.objectContaining({ name: 'Anna', color: '#6b8afd' }));
    expect(database.prepare('SELECT color FROM aca_v2_registration_attempts').get()).toEqual({ color: '#6b8afd' });
    expect(() => validateRegistration({ ...input, color: 'url(secret)' })).toThrow();
  });

  it('recupera la risposta persa della creazione senza creare una seconda persona', async () => {
    const { service, input, api, users } = setup();
    const original = api.createHumanUser;
    api.createHumanUser = vi.fn(async (name) => { await original(name); throw new HaError('timeout'); });
    expect((await service.register(input)).status).toBe('pending');
    expect((await service.register(input)).status).toBe('created');
    expect(api.createHumanUser).toHaveBeenCalledOnce();
    expect(users).toHaveLength(1);
  });

  it('riprova soltanto una creazione certamente mai inviata', async () => {
    const { service, input, api } = setup();
    vi.mocked(api.createHumanUser).mockRejectedValueOnce(new HaError('unreachable', { neverSent: true }));
    expect((await service.register(input)).status).toBe('pending');
    expect((await service.register(input)).status).toBe('created');
    expect(api.createHumanUser).toHaveBeenCalledTimes(2);
  });

  it('riconosce credenziali già collegate dopo una risposta persa', async () => {
    const { service, input, api, users } = setup();
    api.createCredentials = vi.fn(async (id, username) => {
      users.find((user) => user.id === id)!.username = username;
      throw new HaError('timeout');
    });
    expect((await service.register(input)).status).toBe('created');
    expect((await service.register(input)).status).toBe('created');
    expect(api.createCredentials).toHaveBeenCalledOnce();
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  it('non modifica un account preesistente con lo stesso username', async () => {
    const { service, input, api, users } = setup();
    users.push({ id: 'existing', name: 'Anna', username: 'anna', isAdmin: false, isOwner: false,
      isActive: true, localOnly: false, systemGenerated: false });
    await expect(service.register(input)).rejects.toMatchObject({ code: 'USERNAME_UNAVAILABLE' });
    expect(api.createHumanUser).not.toHaveBeenCalled();
    expect(api.createCredentials).not.toHaveBeenCalled();
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  it('annulla solo il proprio nuovo utente dopo un rifiuto definitivo delle credenziali', async () => {
    const { service, input, api, users } = setup();
    vi.mocked(api.createCredentials).mockRejectedValueOnce(new HaError('bad_request'));
    await expect(service.register(input)).rejects.toMatchObject({ code: 'USERNAME_UNAVAILABLE' });
    expect(api.deleteUser).toHaveBeenCalledOnce();
    expect(users).toHaveLength(0);
    expect(service.get(input.attemptId)?.status).toBe('failed');
  });

  it('resta pendente su esito incerto senza eliminare utenti o reimpostare password', async () => {
    const { service, input, api } = setup();
    vi.mocked(api.createCredentials).mockRejectedValueOnce(new HaError('timeout'));
    expect((await service.register(input)).status).toBe('pending');
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  it('rifiuta privilegi scelti dal client e conserva il tentativo se il servizio non è pronto', async () => {
    const { service, input, access, api } = setup();
    expect(() => validateRegistration({ ...input, group_ids: ['system-admin'] })).toThrow();
    access.ready.mockResolvedValueOnce(false);
    await expect(service.register(input)).rejects.toMatchObject({ code: 'REGISTRATION_UNAVAILABLE', status: 503 });
    expect(api.createHumanUser).not.toHaveBeenCalled();
  });
});
