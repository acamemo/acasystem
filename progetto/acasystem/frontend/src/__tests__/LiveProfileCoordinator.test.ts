import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveProfileCoordinator } from '@/hooks/liveProfiles/coordinator';
import * as liveApi from '@/api/liveProfiles';
import * as apiAuth from '@/api/apiAuth';
import {
  applyChanges,
  configurationLayout,
  resourcesForChanges,
  resourcesForTarget,
} from '../../../contracts/profileResources';
import type {
  Configuration,
  EditLease,
  LiveProfile,
  ProfileOperation,
  CollaborationEvent,
} from '../../../contracts/collaboration';
import type { ClientSession } from '@/api/clientSession';
import type { OfflineDraft } from '@/hooks/liveProfiles/drafts';
import {
  notifyProfileUsageFailure,
  profileUsageHeaders,
  PROFILE_IN_USE_MESSAGE,
} from '@/api/usageProof';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const configuration: Configuration = {
  snapshot: {
    layout: {
      cardSettings: { 'home::a': { heading: 'A' }, 'home::b': { heading: 'B' } },
      customNames: {},
      customIcons: {},
      launcherLayout: {
        version: 1,
        commonOrderVersion: 1,
        cover: { enabled: false },
        pages: [{ id: 'home', label: 'Casa', kind: 'widgets', order: ['a', 'b'], placements: {} }],
      },
    },
  },
};
const session: ClientSession = {
  houseId: 'house',
  user: { id: 'user', name: 'Ada', color: '#123456' },
  client: {
    id: 'client',
    userId: 'user',
    label: 'Telefono',
    platform: 'web',
    activeProfileId: 'profile',
    preferences: {},
    createdAt: '',
    lastSeenAt: '',
    revokedAt: null,
    revocationPending: false,
  },
};
const running: LiveProfileCoordinator[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  running.splice(0).forEach((item) => item.dispose());
  vi.useRealTimers();
});
function harness() {
  let profile: LiveProfile = {
    id: 'profile',
    userId: 'user',
    name: 'Casa',
    revision: 0,
    resourceRevisions: {},
    configuration: copy(configuration),
    migration: null,
    createdAt: '',
    updatedAt: '',
  };
  const saved = new Map<string, OfflineDraft>();
  let cached: LiveProfile | null = copy(profile);
  let leases: EditLease[] = [];
  const commits = new Map<string, { operation: ProfileOperation; profile: LiveProfile }>();
  let serial = 0;
  const api = {
    ...liveApi,
    readLiveProfile: vi.fn(async (_id: string) => copy(profile)),
    readEditLeases: vi.fn(async () => copy(leases)),
    activateLiveProfile: vi.fn(async () => undefined),
    acquireEditLease: vi.fn(async (_id, editSessionId, target, proposed = []) => {
      const after = applyChanges(profile.configuration, proposed);
      const resources = [
        ...new Set([
          ...resourcesForTarget(profile.configuration, target),
          ...resourcesForChanges(profile.configuration, after, proposed),
        ]),
      ];
      if (
        leases.some(
          (lease) =>
            lease.editSessionId !== editSessionId &&
            (lease.resources.includes('profile') ||
              resources.includes('profile') ||
              resources.some((key) => lease.resources.includes(key)))
        )
      )
        throw Object.assign(new Error('Risorsa occupata'), { status: 423, body: { leases } });
      const lease: EditLease = {
        id: 'lease',
        profileId: 'profile',
        editSessionId,
        clientId: 'client',
        userId: 'user',
        userName: 'Ada',
        clientName: 'Telefono',
        resources,
        expiresAt: Date.now() + 45000,
      };
      leases = [...leases.filter((item) => item.editSessionId !== editSessionId), lease];
      return copy(lease);
    }),
    releaseEditLease: vi.fn(async (_id, editor) => {
      leases = leases.filter((item) => item.editSessionId !== editor);
    }),
    renewEditLease: vi.fn(async () => copy(leases[0]!)),
    commitLiveProfile: vi.fn(async (_id, operation) => {
      const prior = commits.get(operation.operationId);
      if (prior) {
        expect(operation).toEqual(prior.operation);
        return copy(profile);
      }
      if (
        !leases.some(
          (lease) =>
            lease.id === operation.leaseId && lease.editSessionId === operation.editSessionId
        )
      )
        throw Object.assign(new Error('Riserva scaduta'), { status: 423 });
      if (
        Object.entries(operation.expected).some(
          ([key, version]) => (profile.resourceRevisions[key] ?? 0) !== version
        )
      )
        throw Object.assign(new Error('Conflitto'), {
          status: 409,
          body: { profile: copy(profile) },
        });
      const after = applyChanges(profile.configuration, operation.changes);
      const resources = resourcesForChanges(profile.configuration, after, operation.changes);
      profile = {
        ...profile,
        configuration: after,
        revision: profile.revision + 1,
        resourceRevisions: {
          ...profile.resourceRevisions,
          ...Object.fromEntries(
            resources.map((key) => [key, (profile.resourceRevisions[key] ?? 0) + 1])
          ),
        },
      };
      commits.set(operation.operationId, { operation: copy(operation), profile: copy(profile) });
      return copy(profile);
    }),
    watchLiveProfiles: vi.fn(
      (
        signal: AbortSignal,
        _changed?: (event: CollaborationEvent) => void,
        _usageSessionId?: string
      ) =>
        new Promise<void>((resolve) =>
          signal.addEventListener('abort', () => resolve(), { once: true })
        )
    ),
  } satisfies typeof liveApi;
  const deps = {
    api,
    usage: {
      acquireProfileUsage: vi.fn(async (profileId: string, usageSessionId: string) => ({
        id: `usage-${++serial}`,
        profileId,
        usageSessionId,
        clientId: 'client',
        expiresAt: Date.now() + 180000,
        serverTime: Date.now(),
      })),
      renewProfileUsage: vi.fn(async (lease) => ({
        ...lease,
        expiresAt: Date.now() + 180000,
        serverTime: Date.now(),
      })),
      releaseProfileUsage: vi.fn(async () => undefined),
      releaseProfileUsageKeepAlive: vi.fn(),
    },
    bootstrap: vi.fn(async () => ({
      protocol: 2 as const,
      houseId: 'house',
      user: session.user,
      client: session.client,
      clients: [],
      profiles: [copy(profile)],
      sources: [],
    })),
    id: () => `id-${++serial}`,
    drafts: {
      listDrafts: vi.fn(async () => [...saved.values()].map(copy)),
      saveDraft: vi.fn(async (draft: OfflineDraft) => {
        saved.set(draft.id, copy(draft));
      }),
      deleteDraft: vi.fn(async (id: string) => {
        saved.delete(id);
      }),
      cacheActiveProfile: vi.fn(async (_key: string, value: LiveProfile) => {
        cached = copy(value);
      }),
      readCachedProfile: vi.fn(async () => cached),
    },
  };
  const coordinator = new LiveProfileCoordinator(session, deps);
  running.push(coordinator);
  const remote = (widget: string, heading: string) => {
    const next = copy(profile.configuration);
    const cards = configurationLayout(next).cardSettings as Record<string, { heading: string }>;
    cards[`home::${widget}`] = { heading };
    profile = {
      ...profile,
      configuration: next,
      revision: profile.revision + 1,
      resourceRevisions: {
        ...profile.resourceRevisions,
        [`widget:${widget}`]: (profile.resourceRevisions[`widget:${widget}`] ?? 0) + 1,
      },
    };
  };
  const change = (heading: string, autosave = false) =>
    coordinator.update(
      (value) =>
        applyChanges(value, [
          { path: ['snapshot', 'layout', 'cardSettings', 'home::a', 'heading'], value: heading },
        ]),
      { autosave }
    );
  return {
    coordinator,
    deps,
    api,
    saved,
    remote,
    change,
    get profile() {
      return profile;
    },
    expire() {
      leases = [];
    },
  };
}
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
describe('coordinatore profili live', () => {
  it('un profilo occupato blocca prima del caricamento senza concedere la cache offline', async () => {
    const h = harness();
    h.deps.usage.acquireProfileUsage.mockRejectedValueOnce(
      Object.assign(new Error(PROFILE_IN_USE_MESSAGE), {
        status: 423,
        body: { code: 'PROFILE_IN_USE' },
      })
    );
    await h.coordinator.start();
    expect(h.coordinator.snapshot().usageStatus).toBe('blocked');
    expect(h.coordinator.snapshot().profile).toBeNull();
    expect(h.deps.drafts.readCachedProfile).not.toHaveBeenCalled();
    expect(h.api.readLiveProfile).not.toHaveBeenCalled();
    await expect(h.coordinator.begin({ kind: 'structure' }, 'A')).rejects.toThrow(
      PROFILE_IN_USE_MESSAGE
    );
    expect(h.api.acquireEditLease).not.toHaveBeenCalled();
  });
  it('la cache offline non costituisce una concessione d’uso', async () => {
    const h = harness();
    h.deps.bootstrap.mockRejectedValueOnce(new Error('Offline'));
    await h.coordinator.start();
    expect(h.coordinator.snapshot().profile).not.toBeNull();
    expect(h.coordinator.snapshot().usageStatus).toBe('unavailable');
    await expect(h.coordinator.begin({ kind: 'structure' }, 'A')).rejects.toThrow();
    expect(h.deps.usage.acquireProfileUsage).not.toHaveBeenCalled();
  });
  it('rilegge lo stato autorevole dopo la concessione prima di consentire l’interfaccia', async () => {
    const h = harness(),
      gate = deferred();
    h.api.readLiveProfile.mockImplementationOnce(async () => {
      await gate.promise;
      return copy(h.profile);
    });
    const starting = h.coordinator.start();
    await vi.waitFor(() => expect(h.api.readLiveProfile).toHaveBeenCalledOnce());
    expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce();
    expect(h.coordinator.snapshot().usageStatus).toBe('checking');
    gate.resolve();
    await starting;
    expect(h.coordinator.snapshot().usageStatus).toBe('active');
  });
  it('un retry durante acquire pendente non riavvia bootstrap o acquisisce una seconda concessione', async () => {
    const h = harness(), gate = deferred();
    const acquire = h.deps.usage.acquireProfileUsage.getMockImplementation()!;
    h.deps.usage.acquireProfileUsage.mockImplementationOnce(async (...args) => { await gate.promise; return acquire(...args); });
    const starting = h.coordinator.start();
    await vi.waitFor(() => expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce());
    await h.coordinator.retryPreparation();
    expect(h.deps.bootstrap).toHaveBeenCalledOnce();
    expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce();
    gate.resolve(); await starting;
    expect(h.coordinator.snapshot().usageStatus).toBe('active');
  });
  it('un lease rilasciato dopo errore non riabilita il profilo quando un altro dispositivo lo usa', async () => {
    const h = harness();
    h.api.readLiveProfile.mockRejectedValueOnce(new Error('Risposta persa'));
    await h.coordinator.start();
    expect(h.deps.usage.releaseProfileUsageKeepAlive).toHaveBeenCalledOnce();
    h.deps.usage.renewProfileUsage.mockRejectedValueOnce(Object.assign(new Error('Scaduto'), { status: 409 }));
    h.deps.usage.acquireProfileUsage.mockRejectedValueOnce(Object.assign(new Error('Occupato'), { status: 423, body: { code: 'PROFILE_IN_USE' } }));
    await h.coordinator.retryPreparation();
    expect(h.coordinator.snapshot().usageStatus).toBe('blocked');
    expect(profileUsageHeaders()['x-aca-usage-lease']).toBeUndefined();
    await expect(h.coordinator.begin({ kind: 'structure' }, 'Modifica')).rejects.toThrow();
    expect(h.api.acquireEditLease).not.toHaveBeenCalled();
  });
  it.each(['PROFILE_IN_USE', 'PROFILE_USAGE_EXPIRED'])('il blocco %s durante la lettura dopo renew impedisce la riattivazione tardiva', async (code) => {
    const h = harness(), gate = deferred();
    h.api.readLiveProfile.mockRejectedValueOnce(new Error('Risposta iniziale persa'));
    await h.coordinator.start();
    h.api.readLiveProfile.mockImplementationOnce(async () => { await gate.promise; return copy(h.profile); });
    const retry = h.coordinator.retryPreparation();
    await vi.waitFor(() => expect(h.api.readLiveProfile).toHaveBeenCalledTimes(2));
    notifyProfileUsageFailure({ code, error: 'Occupato' }, h.coordinator.snapshot().usageLease?.id);
    expect(h.coordinator.snapshot().usageStatus).toBe('blocked');
    gate.resolve(); await retry;
    expect(h.coordinator.snapshot().usageStatus).toBe('blocked');
    expect(profileUsageHeaders()['x-aca-usage-lease']).toBeUndefined();
    await expect(h.coordinator.begin({ kind: 'structure' }, 'Modifica')).rejects.toThrow();
    expect(h.api.acquireEditLease).not.toHaveBeenCalled();
  });
  it('il retry non retrocede una revisione aggiornata mentre attende le riserve', async () => {
    const h = harness(), gate = deferred();
    h.api.readLiveProfile.mockRejectedValueOnce(new Error('Risposta iniziale persa'));
    await h.coordinator.start();
    h.api.readEditLeases.mockImplementationOnce(async () => { await gate.promise; return []; });
    const retry = h.coordinator.retryPreparation();
    await vi.waitFor(() => expect(h.api.readEditLeases).toHaveBeenCalledOnce());
    h.remote('b', 'Revisione più recente');
    await h.coordinator.refresh();
    const revision = h.coordinator.snapshot().profile!.revision;
    gate.resolve(); await retry;
    expect(h.coordinator.snapshot().profile!.revision).toBe(revision);
    expect(configurationLayout(h.coordinator.snapshot().profile!.configuration).cardSettings).toHaveProperty('home::b.heading', 'Revisione più recente');
    expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce();
  });
  it('il background non rilascia l’uso e mantiene i rinnovi', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(60000);
    expect(h.deps.usage.renewProfileUsage).toHaveBeenCalledTimes(3);
    expect(h.deps.usage.releaseProfileUsageKeepAlive).not.toHaveBeenCalled();
    expect(h.coordinator.snapshot().usageStatus).toBe('active');
  });
  it('tornare visibile verifica l’uso ancora valido senza chiudere editor o bozza', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Modifica aperta');
    const editor = h.coordinator.snapshot().editor;
    const usageId = h.coordinator.snapshot().usageLease?.id;
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(h.api.readLiveProfile).toHaveBeenCalledTimes(2));
    expect(h.deps.usage.renewProfileUsage).toHaveBeenCalledOnce();
    expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce();
    expect(h.api.releaseEditLease).not.toHaveBeenCalled();
    expect(h.coordinator.snapshot().usageStatus).toBe('active');
    expect(h.coordinator.snapshot().usageLease?.id).toBe(usageId);
    expect(h.coordinator.snapshot().editor).toBe(editor);
    expect(h.coordinator.snapshot().editor?.working).toHaveProperty(
      'snapshot.layout.cardSettings.home::a.heading',
      'Modifica aperta'
    );
    expect(h.saved.size).toBe(1);
  });
  it('pagehide rilascia senza logout e pageshow acquisisce e rilegge prima di riaprire', async () => {
    const h = harness();
    await h.coordinator.start();
    const original = h.coordinator.snapshot().usageLease;
    window.dispatchEvent(new Event('pagehide'));
    expect(h.deps.usage.releaseProfileUsageKeepAlive).toHaveBeenCalledWith(
      original,
      expect.any(String),
      true
    );
    expect(profileUsageHeaders()).toEqual({});
    expect(h.coordinator.snapshot().usageStatus).toBe('checking');
    h.remote('a', 'Da rileggere');
    window.dispatchEvent(new Event('pageshow'));
    await h.coordinator.retryUsage();
    expect(h.coordinator.snapshot().usageStatus).toBe('active');
    expect(h.coordinator.snapshot().usageLease?.id).not.toBe(original?.id);
    expect(h.coordinator.snapshot().profile?.revision).toBe(1);
  });
  it('una scadenza d’uso ferma autosave e conserva la bozza', async () => {
    vi.useFakeTimers();
    const h = harness();
    h.deps.usage.acquireProfileUsage.mockImplementationOnce(async (profileId, usageSessionId) => ({
      id: 'short-usage',
      profileId,
      usageSessionId,
      clientId: 'client',
      expiresAt: Date.now() + 1000,
      serverTime: Date.now(),
    }));
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Bozza prima di scadenza');
    await vi.advanceTimersByTimeAsync(1001);
    expect(h.coordinator.snapshot().usageStatus).toBe('blocked');
    expect(h.coordinator.currentDraft()?.changes).toContainEqual(
      expect.objectContaining({ value: 'Bozza prima di scadenza' })
    );
    expect(h.api.commitLiveProfile).not.toHaveBeenCalled();
    expect(profileUsageHeaders()).toEqual({});
  });
  it('un rifiuto d’uso congela la bozza senza cancellarla né inviare l’autosave', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Non perdere', true);
    notifyProfileUsageFailure(
      { code: 'PROFILE_USAGE_EXPIRED' },
      h.coordinator.snapshot().usageLease!.id
    );
    await vi.advanceTimersByTimeAsync(350);
    expect(h.coordinator.snapshot().usageStatus).toBe('blocked');
    expect(h.api.commitLiveProfile).not.toHaveBeenCalled();
    expect(h.saved.size).toBe(1);
    expect(h.coordinator.currentDraft()?.changes).toContainEqual(
      expect.objectContaining({ value: 'Non perdere' })
    );
  });
  it('un evento d’uso riprova il profilo bloccato e rilegge le modifiche della sessione precedente', async () => {
    const h = harness();
    h.deps.usage.acquireProfileUsage.mockRejectedValueOnce(
      Object.assign(new Error(PROFILE_IN_USE_MESSAGE), {
        status: 423,
        body: { code: 'PROFILE_IN_USE' },
      })
    );
    await h.coordinator.start();
    h.remote('a', 'Ultima revisione');
    h.api.watchLiveProfiles.mock.calls[0]?.[1]?.({ type: 'usage', profileId: 'profile' });
    await h.coordinator.retryUsage();
    expect(h.coordinator.snapshot().usageStatus).toBe('active');
    expect(h.coordinator.snapshot().profile?.revision).toBe(1);
  });
  it('resync dopo riconnessione verifica subito la vecchia concessione e blocca senza perdere la bozza', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Bozza della connessione precedente');
    h.deps.usage.renewProfileUsage.mockRejectedValueOnce(
      Object.assign(new Error('Uso scaduto'), {
        status: 409,
        body: { code: 'PROFILE_USAGE_EXPIRED' },
      })
    );
    h.deps.usage.acquireProfileUsage.mockRejectedValueOnce(
      Object.assign(new Error(PROFILE_IN_USE_MESSAGE), {
        status: 423,
        body: { code: 'PROFILE_IN_USE' },
      })
    );
    h.api.watchLiveProfiles.mock.calls[0]?.[1]?.({ type: 'resync' });
    await vi.waitFor(() => expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(h.coordinator.snapshot().usageStatus).toBe('blocked'));
    expect(h.deps.usage.renewProfileUsage).toHaveBeenCalledOnce();
    expect(h.api.commitLiveProfile).not.toHaveBeenCalled();
    const saved = [...h.saved.values()][0]!;
    expect(applyChanges(saved.base, saved.changes)).toHaveProperty(
      'snapshot.layout.cardSettings.home::a.heading',
      'Bozza della connessione precedente'
    );
  });
  it('una risposta tardiva a un acquire chiuso rilascia soltanto quella concessione', async () => {
    const h = harness(),
      gate = deferred();
    const acquire = h.deps.usage.acquireProfileUsage.getMockImplementation()!;
    h.deps.usage.acquireProfileUsage.mockImplementationOnce(async (...args) => {
      await gate.promise;
      return acquire(...args);
    });
    const starting = h.coordinator.start();
    await vi.waitFor(() => expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce());
    h.coordinator.dispose();
    gate.resolve();
    await starting;
    expect(h.deps.usage.releaseProfileUsage).toHaveBeenCalledOnce();
    expect(h.api.readLiveProfile).not.toHaveBeenCalled();
  });
  it('pageshow durante acquire ricorda la ripresa e richiede una nuova concessione dopo la risposta scartata', async () => {
    const h = harness(),
      gate = deferred();
    const acquire = h.deps.usage.acquireProfileUsage.getMockImplementation()!;
    h.deps.usage.acquireProfileUsage.mockImplementationOnce(async (...args) => {
      await gate.promise;
      return acquire(...args);
    });
    const starting = h.coordinator.start();
    await vi.waitFor(() => expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce());
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pageshow'));
    gate.resolve();
    await starting;
    await vi.waitFor(() => expect(h.coordinator.snapshot().usageStatus).toBe('active'));
    expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledTimes(2);
    expect(h.deps.usage.releaseProfileUsage).toHaveBeenCalledOnce();
    expect(h.deps.usage.acquireProfileUsage.mock.calls[1]?.[1]).toBe(
      h.deps.usage.acquireProfileUsage.mock.calls[0]?.[1]
    );
  });
  it('pageshow durante un acquire ancora valido non ruota una concessione appena confermata', async () => {
    const h = harness(),
      gate = deferred();
    const acquire = h.deps.usage.acquireProfileUsage.getMockImplementation()!;
    h.deps.usage.acquireProfileUsage.mockImplementationOnce(async (...args) => {
      await gate.promise;
      return acquire(...args);
    });
    const starting = h.coordinator.start();
    await vi.waitFor(() => expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce());
    window.dispatchEvent(new Event('pageshow'));
    gate.resolve();
    await starting;
    expect(h.coordinator.snapshot().usageStatus).toBe('active');
    expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce();
    expect(h.deps.usage.releaseProfileUsage).not.toHaveBeenCalled();
  });
  it('la ripresa attende anche il retry già in corso prima di consumare il latch', async () => {
    const h = harness(),
      gate = deferred();
    await h.coordinator.start();
    const acquire = h.deps.usage.acquireProfileUsage.getMockImplementation()!;
    h.deps.usage.acquireProfileUsage.mockImplementationOnce(async (...args) => {
      await gate.promise;
      return acquire(...args);
    });
    const retrying = h.coordinator.retryUsage();
    await vi.waitFor(() => expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledTimes(2));
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pageshow'));
    gate.resolve();
    await retrying;
    await vi.waitFor(() => expect(h.coordinator.snapshot().usageStatus).toBe('active'));
    expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledTimes(3);
  });
  it.each(['dispose', 'pagehide'] as const)(
    'non consuma la ripresa pendente dopo %s',
    async (ending) => {
      vi.useFakeTimers();
      const h = harness(),
        gate = deferred();
      const acquire = h.deps.usage.acquireProfileUsage.getMockImplementation()!;
      h.deps.usage.acquireProfileUsage.mockImplementationOnce(async (...args) => {
        await gate.promise;
        return acquire(...args);
      });
      const starting = h.coordinator.start();
      await vi.waitFor(() => expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce());
      window.dispatchEvent(new Event('pagehide'));
      window.dispatchEvent(new Event('pageshow'));
      if (ending === 'dispose') h.coordinator.dispose();
      else window.dispatchEvent(new Event('pagehide'));
      gate.resolve();
      await starting;
      await vi.advanceTimersByTimeAsync(21000);
      expect(h.deps.usage.acquireProfileUsage).toHaveBeenCalledOnce();
      expect(h.deps.usage.releaseProfileUsage).toHaveBeenCalledOnce();
      expect(h.coordinator.snapshot().usageStatus).not.toBe('active');
    }
  );
  it('accorpa cambi rapidi e sincronizza senza Salva mantenendo la sessione esplicita', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const original = h.coordinator.snapshot().editor!;
    await h.change('Prima modifica', true);
    await h.change('Ultima modifica', true);
    await vi.advanceTimersByTimeAsync(349);
    expect(h.api.commitLiveProfile).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(h.api.commitLiveProfile).toHaveBeenCalledOnce();
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Ultima modifica'
    );
    expect(h.coordinator.snapshot().editor).toMatchObject({
      id: original.id,
      busy: false,
      base: { revision: 1 },
    });
    expect(h.coordinator.snapshot().editor!.draftId).not.toBe(original.draftId);
    expect(h.api.releaseEditLease).not.toHaveBeenCalled();
    await h.coordinator.refresh();
    await vi.advanceTimersByTimeAsync(400);
    expect(h.api.commitLiveProfile).toHaveBeenCalledOnce();
    expect(await h.coordinator.finish()).toBe(true);
    expect(h.coordinator.snapshot().editor).toBeNull();
    expect(h.api.releaseEditLease).toHaveBeenCalledOnce();
    expect(h.saved.size).toBe(0);
  });
  it('una singola impostazione transitoria salva e rilascia automaticamente la riserva', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A', { transient: true });
    await h.change('Impostazione', true);
    await vi.advanceTimersByTimeAsync(350);
    expect(h.profile.revision).toBe(1);
    expect(h.coordinator.snapshot().editor).toBeNull();
    expect(h.api.releaseEditLease).toHaveBeenCalledOnce();
    expect(h.saved.size).toBe(0);
  });
  it('un pannello esplicito adotta un editor transitorio senza perderne la bozza', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    const target = { kind: 'widget' as const, widgetId: 'a' };
    await h.coordinator.begin(target, 'A', { transient: true });
    await h.change('Modifica aperta', true);
    await h.coordinator.begin(target, 'Impostazioni');
    await vi.advanceTimersByTimeAsync(350);
    expect(h.coordinator.snapshot().editor).toMatchObject({
      transient: false,
      base: { revision: 1 },
    });
    expect(h.api.releaseEditLease).not.toHaveBeenCalled();
  });
  it('serializza gli aggiornamenti arrivati durante un checkpoint lento senza perderli', async () => {
    vi.useFakeTimers();
    const h = harness(),
      gate = deferred();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const commit = h.api.commitLiveProfile.getMockImplementation()!;
    h.api.commitLiveProfile.mockImplementationOnce(async (...args) => {
      await gate.promise;
      return commit(...args);
    });
    await h.change('Primo', true);
    await vi.advanceTimersByTimeAsync(350);
    expect(h.coordinator.snapshot().saving).toBe(true);
    const second = h.change('Secondo', true);
    gate.resolve();
    await second;
    await vi.advanceTimersByTimeAsync(350);
    expect(h.profile.revision).toBe(2);
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Secondo'
    );
    const operations = h.api.commitLiveProfile.mock.calls.map((call) => call[1]);
    expect(operations[1]!.operationId).not.toBe(operations[0]!.operationId);
    expect(h.coordinator.snapshot().editor).toMatchObject({ base: { revision: 2 }, busy: false });
    expect(h.coordinator.snapshot().saving).toBe(false);
  });
  it('non chiude il transient durante un commit se è già in coda una seconda modifica', async () => {
    vi.useFakeTimers();
    const h = harness(),
      gate = deferred();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A', { transient: true });
    const commit = h.api.commitLiveProfile.getMockImplementation()!;
    h.api.commitLiveProfile.mockImplementationOnce(async (...args) => {
      await gate.promise;
      return commit(...args);
    });
    await h.change('Primo', true);
    await vi.advanceTimersByTimeAsync(350);
    const second = h.change('Secondo', true);
    gate.resolve();
    await second;
    expect(h.coordinator.snapshot().editor).not.toBeNull();
    await vi.advanceTimersByTimeAsync(350);
    expect(h.profile.revision).toBe(2);
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Secondo'
    );
    expect(h.coordinator.snapshot().editor).toBeNull();
    expect(h.api.releaseEditLease).toHaveBeenCalledOnce();
  });
  it('Fine scarica il debounce e conferma prima di chiudere senza un secondo Salva', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Confermato', true);
    expect(await h.coordinator.finish()).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(h.api.commitLiveProfile).toHaveBeenCalledOnce();
    expect(h.coordinator.snapshot().editor).toBeNull();
    expect(await h.coordinator.finish()).toBe(true);
  });
  it('i nuovi input durante HTTP sono subito presenti nella bozza anche prima della risposta', async () => {
    vi.useFakeTimers();
    const h = harness(),
      gate = deferred();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const commit = h.api.commitLiveProfile.getMockImplementation()!;
    h.api.commitLiveProfile.mockImplementationOnce(async (...args) => {
      await gate.promise;
      return commit(...args);
    });
    await h.change('Primo', true);
    await vi.advanceTimersByTimeAsync(350);
    await h.change('Secondo', true);
    const persisted = [...h.saved.values()][0]!;
    expect(applyChanges(persisted.base, persisted.changes)).toHaveProperty(
      'snapshot.layout.cardSettings.home::a.heading',
      'Secondo'
    );
    expect(persisted.pendingOperation).toEqual(h.api.commitLiveProfile.mock.calls[0]![1]);
    expect(h.coordinator.snapshot().editor?.working).toHaveProperty(
      'snapshot.layout.cardSettings.home::a.heading',
      'Secondo'
    );
    gate.resolve();
    expect(await h.coordinator.finish()).toBe(true);
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Secondo'
    );
  });
  it('riprende la bozza chiusa durante HTTP senza scartare gli input successivi al tentativo', async () => {
    vi.useFakeTimers();
    const h = harness(),
      gate = deferred();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const commit = h.api.commitLiveProfile.getMockImplementation()!;
    h.api.commitLiveProfile.mockImplementationOnce(async (...args) => {
      const accepted = await commit(...args);
      await gate.promise;
      return accepted;
    });
    await h.change('Primo', true);
    await vi.advanceTimersByTimeAsync(350);
    await h.change('Secondo', true);
    const draft = copy([...h.saved.values()][0]!);
    h.coordinator.dispose();
    gate.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const resumed = new LiveProfileCoordinator(session, h.deps);
    running.push(resumed);
    await resumed.start();
    await resumed.resume(draft);
    expect(resumed.snapshot().editor?.working).toHaveProperty(
      'snapshot.layout.cardSettings.home::a.heading',
      'Secondo'
    );
    expect(resumed.snapshot().editor?.conflict).toBeNull();
    expect(await resumed.finish()).toBe(true);
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Secondo'
    );
    expect(h.profile.revision).toBe(2);
  });
  it('una quota esaurita prima dell’invio blocca il checkpoint e conserva la modifica in memoria', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Da conservare', true);
    h.deps.drafts.saveDraft.mockRejectedValueOnce(
      Object.assign(new Error('Quota piena'), { code: 'DRAFT_QUOTA' })
    );
    await vi.advanceTimersByTimeAsync(350);
    expect(h.api.commitLiveProfile).not.toHaveBeenCalled();
    expect(h.coordinator.snapshot().editor).toMatchObject({
      quotaBlocked: true,
      working: expect.anything(),
    });
    expect(h.coordinator.currentDraft()).toMatchObject({
      changes: [expect.objectContaining({ value: 'Da conservare' })],
    });
    expect(h.coordinator.snapshot().offline).toBe(false);
  });
  it('una promozione strutturale negata conserva la proposta e il lease precedente senza autosend', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const before = h.coordinator.snapshot().editor!;
    const current = copy(h.profile);
    h.api.acquireEditLease.mockRejectedValueOnce(
      Object.assign(new Error('Profilo occupato'), {
        status: 409,
        body: { profile: current, leases: [] },
      })
    );
    await expect(
      h.coordinator.update(
        (value) => {
          const launcher = configurationLayout(value).launcherLayout as {
            pages: { label: string }[];
          };
          launcher.pages[0]!.label = 'Nome proposto';
          return value;
        },
        { autosave: true }
      )
    ).rejects.toThrow('occupato');
    const editor = h.coordinator.snapshot().editor!;
    expect(editor.lease).toEqual(before.lease);
    expect(editor.target).toEqual(before.target);
    expect(editor.conflict).toEqual(current);
    expect(editor.error).toContain('occupato');
    expect(editor.working).toHaveProperty(
      'snapshot.layout.launcherLayout.pages.0.label',
      'Nome proposto'
    );
    const persisted = [...h.saved.values()][0]!;
    expect(applyChanges(persisted.base, persisted.changes)).toHaveProperty(
      'snapshot.layout.launcherLayout.pages.0.label',
      'Nome proposto'
    );
    await vi.advanceTimersByTimeAsync(700);
    expect(h.api.commitLiveProfile).not.toHaveBeenCalled();
    expect(h.profile.revision).toBe(0);
  });
  it('riconcilia una risposta persa e poi sincronizza gli input successivi senza richiedere Salva', async () => {
    vi.useFakeTimers();
    const h = harness(),
      gate = deferred();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const commit = h.api.commitLiveProfile.getMockImplementation()!;
    h.api.commitLiveProfile.mockImplementationOnce(async (...args) => {
      await commit(...args);
      await gate.promise;
      throw new Error('Risposta persa');
    });
    await h.change('Primo', true);
    await vi.advanceTimersByTimeAsync(350);
    await h.change('Secondo', true);
    gate.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.coordinator.snapshot().offline).toBe(true);
    await h.coordinator.refresh();
    await vi.advanceTimersByTimeAsync(700);
    expect(h.profile.revision).toBe(2);
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Secondo'
    );
    expect(h.coordinator.snapshot().editor?.pendingOperation).toBeUndefined();
  });
  it('non sovrascrive una modifica remota intervenuta dopo il primo invio con nuovi input ancora locali', async () => {
    vi.useFakeTimers();
    const h = harness(),
      gate = deferred();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const commit = h.api.commitLiveProfile.getMockImplementation()!;
    h.api.commitLiveProfile.mockImplementationOnce(async (...args) => {
      const accepted = await commit(...args);
      await gate.promise;
      return accepted;
    });
    await h.change('Primo', true);
    await vi.advanceTimersByTimeAsync(350);
    await h.change('Secondo locale', true);
    h.remote('a', 'Terzo remoto');
    await h.coordinator.refresh();
    gate.resolve();
    await vi.advanceTimersByTimeAsync(700);
    expect(h.api.commitLiveProfile).toHaveBeenCalledOnce();
    expect(h.coordinator.snapshot().editor?.conflict).not.toBeNull();
    expect(h.coordinator.snapshot().editor?.working).toHaveProperty(
      'snapshot.layout.cardSettings.home::a.heading',
      'Secondo locale'
    );
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Terzo remoto'
    );
  });
  it('Fine rilegge la selezione account arrivata mentre l’editor era aperto', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const other = { ...copy(h.profile), id: 'other-profile' };
    h.deps.bootstrap.mockImplementation(async () => ({
      protocol: 2,
      houseId: 'house',
      user: session.user,
      client: { ...session.client, activeProfileId: other.id },
      clients: [],
      profiles: [copy(h.profile), other],
      sources: [],
    }));
    h.api.readLiveProfile.mockImplementation(async (id) =>
      id === other.id ? other : copy(h.profile)
    );
    await h.coordinator.refresh(true);
    expect(h.coordinator.snapshot().profile?.id).toBe('profile');
    expect(await h.coordinator.finish()).toBe(true);
    expect(h.coordinator.snapshot().profile?.id).toBe(other.id);
  });
  it('offline conserva le modifiche e riconcilia automaticamente soltanto risorse compatibili', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    h.api.readLiveProfile.mockRejectedValueOnce(new Error('Offline'));
    await h.coordinator.refresh();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Locale', true);
    await vi.advanceTimersByTimeAsync(400);
    expect(h.api.commitLiveProfile).not.toHaveBeenCalled();
    expect(h.saved.size).toBe(1);
    h.remote('b', 'Remoto indipendente');
    await h.coordinator.refresh();
    await vi.advanceTimersByTimeAsync(350);
    expect(h.api.commitLiveProfile).toHaveBeenCalledOnce();
    expect(configurationLayout(h.profile.configuration).cardSettings).toMatchObject({
      'home::a': { heading: 'Locale' },
      'home::b': { heading: 'Remoto indipendente' },
    });
  });
  it('un conflitto offline interrompe l’automatismo e conserva entrambe le versioni', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    h.api.readLiveProfile.mockRejectedValueOnce(new Error('Offline'));
    await h.coordinator.refresh();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Locale', true);
    h.remote('a', 'Remoto');
    await h.coordinator.refresh();
    await vi.advanceTimersByTimeAsync(350);
    expect(h.api.commitLiveProfile).not.toHaveBeenCalled();
    expect(h.coordinator.snapshot().editor?.conflict).not.toBeNull();
    expect(h.coordinator.snapshot().editor?.working).toHaveProperty(
      'snapshot.layout.cardSettings.home::a.heading',
      'Locale'
    );
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Remoto'
    );
    expect(h.saved.size).toBe(1);
  });
  it('dopo risposta automatica persa verifica lo stesso intento prima di creare un nuovo checkpoint', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const commit = h.api.commitLiveProfile.getMockImplementation()!;
    h.api.commitLiveProfile.mockImplementationOnce(async (...args) => {
      await commit(...args);
      throw new Error('Risposta persa');
    });
    await h.change('Accettato', true);
    await vi.advanceTimersByTimeAsync(350);
    const operation = h.api.commitLiveProfile.mock.calls[0]![1];
    expect(h.coordinator.snapshot().editor?.pendingOperation).toEqual(operation);
    await h.coordinator.refresh();
    await vi.advanceTimersByTimeAsync(350);
    expect(h.api.commitLiveProfile.mock.calls[1]![1]).toEqual(operation);
    expect(h.profile.revision).toBe(1);
    expect(h.coordinator.snapshot().editor?.pendingOperation).toBeUndefined();
    await h.change('Successivo', true);
    await vi.advanceTimersByTimeAsync(350);
    expect(h.profile.revision).toBe(2);
    expect(h.api.commitLiveProfile.mock.calls[2]![1].operationId).not.toBe(operation.operationId);
  });
  it('ignora risposte di lettura tardive che precedono il checkpoint già confermato', async () => {
    const h = harness(),
      gate = deferred();
    await h.coordinator.start();
    const old = copy(h.profile);
    h.api.readLiveProfile.mockImplementationOnce(async () => {
      await gate.promise;
      return old;
    });
    const refreshing = h.coordinator.refresh();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Nuovo');
    expect(await h.coordinator.save({ keepOpen: true })).toBe(true);
    gate.resolve();
    await refreshing;
    expect(h.coordinator.snapshot().profile?.revision).toBe(1);
    expect(h.coordinator.snapshot().editor?.base.revision).toBe(1);
    expect(h.coordinator.snapshot().editor?.working).toHaveProperty(
      'snapshot.layout.cardSettings.home::a.heading',
      'Nuovo'
    );
  });
  it('non regredisce se SSE ha già letto una revisione più nuova della risposta al commit', async () => {
    vi.useFakeTimers();
    const h = harness(),
      gate = deferred();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    const commit = h.api.commitLiveProfile.getMockImplementation()!;
    h.api.commitLiveProfile.mockImplementationOnce(async (...args) => {
      const accepted = await commit(...args);
      h.remote('b', 'SSE');
      await h.coordinator.refresh();
      await gate.promise;
      return accepted;
    });
    await h.change('Locale', true);
    await vi.advanceTimersByTimeAsync(350);
    expect(h.coordinator.snapshot().profile?.revision).toBe(2);
    gate.resolve();
    await h.coordinator.finish();
    expect(h.coordinator.snapshot().profile?.revision).toBe(2);
    expect(
      configurationLayout(h.coordinator.snapshot().profile!.configuration).cardSettings
    ).toMatchObject({
      'home::a': { heading: 'Locale' },
      'home::b': { heading: 'SSE' },
    });
  });
  it('i metadati della stessa identità cambiano senza resettare editor, profilo o stream', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('In corso');
    const editor = h.coordinator.snapshot().editor,
      profile = h.coordinator.snapshot().profile;
    h.coordinator.updateSessionMetadata({
      ...session,
      user: { ...session.user, color: '#abcdef' },
      client: { ...session.client, label: 'Studio', activeProfileId: 'other' },
    });
    expect(h.coordinator.snapshot().editor).toBe(editor);
    expect(h.coordinator.snapshot().profile).toBe(profile);
    expect(h.coordinator.snapshot().clientName).toBe('Studio');
    expect(h.coordinator.session.user.color).toBe('#abcdef');
    expect(h.api.watchLiveProfiles).toHaveBeenCalledOnce();
    expect(h.api.acquireEditLease).toHaveBeenCalledOnce();
    expect(() => h.coordinator.updateSessionMetadata({ ...session, houseId: 'elsewhere' })).toThrow(
      'identità diversa'
    );
  });
  it('una lettura già in corso non riapre il profilo dopo la revoca dell’accesso', async () => {
    const notify = vi
      .spyOn(apiAuth, 'notifyHomeAssistantApiUnauthorized')
      .mockImplementation((message) =>
        Object.assign(new Error(message), { status: 401, body: { error: message ?? '' } })
      );
    const h = harness();
    await h.coordinator.start();
    let finish: (profile: LiveProfile) => void = () => undefined;
    h.api.readLiveProfile.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const older = h.coordinator.refresh();
    h.api.readLiveProfile.mockRejectedValueOnce(
      Object.assign(new Error('Revocato'), { status: 401 })
    );
    await h.coordinator.refresh();
    finish(copy(h.profile));
    await older;
    expect(h.coordinator.snapshot().status).toBe('unavailable');
    expect(h.coordinator.snapshot().profile).toBeNull();
    expect(notify).toHaveBeenCalledOnce();
  });
  it('un 401 definitivo durante refresh conserva la bozza e richiede accesso senza convertirlo in offline', async () => {
    const notify = vi
      .spyOn(apiAuth, 'notifyHomeAssistantApiUnauthorized')
      .mockImplementation((message) =>
        Object.assign(new Error(message), { status: 401, body: { error: message ?? '' } })
      );
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Locale');
    h.api.readLiveProfile.mockRejectedValueOnce(
      Object.assign(new Error('Revocato'), { status: 401 })
    );
    await h.coordinator.refresh();
    expect(h.saved.size).toBe(1);
    expect(h.coordinator.snapshot().editor).toBeNull();
    expect(h.coordinator.snapshot().offline).toBe(false);
    expect(h.coordinator.snapshot().status).toBe('unavailable');
    expect(notify).toHaveBeenCalledOnce();
    await expect(h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A')).rejects.toThrow(
      'accesso'
    );
  });
  it('un 403 del profilo conserva la bozza e ferma editing senza invalidare l’account', async () => {
    const notify = vi.spyOn(apiAuth, 'notifyHomeAssistantApiUnauthorized');
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Locale');
    h.api.readLiveProfile.mockRejectedValueOnce(
      Object.assign(new Error('Profilo negato'), { status: 403 })
    );
    await h.coordinator.refresh();
    expect(h.saved.size).toBe(1);
    expect(h.coordinator.snapshot().editor).toBeNull();
    expect(h.coordinator.snapshot().status).toBe('select');
    expect(h.coordinator.snapshot().offline).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });
  it('un 401 sullo stream ferma riconnessioni e rinnovi dopo aver conservato la bozza', async () => {
    const notify = vi
      .spyOn(apiAuth, 'notifyHomeAssistantApiUnauthorized')
      .mockImplementation((message) =>
        Object.assign(new Error(message), { status: 401, body: { error: message ?? '' } })
      );
    const h = harness();
    let rejectStream: (error: unknown) => void = () => undefined;
    h.api.watchLiveProfiles.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectStream = reject;
        })
    );
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Locale');
    rejectStream(Object.assign(new Error('Revocato'), { status: 401 }));
    await vi.waitFor(() => expect(h.coordinator.snapshot().status).toBe('unavailable'));
    expect(h.saved.size).toBe(1);
    expect(h.coordinator.snapshot().offline).toBe(false);
    expect(notify).toHaveBeenCalledOnce();
    expect(h.api.watchLiveProfiles).toHaveBeenCalledOnce();
  });
  it('Annulla non promette di annullare un commit con risposta persa e X conserva la ricevuta locale', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Mia');
    h.api.commitLiveProfile.mockRejectedValueOnce(new Error('Risposta persa'));
    expect(await h.coordinator.save()).toBe(false);
    await expect(h.coordinator.close(true)).rejects.toThrow('esito');
    expect(h.saved.size).toBe(1);
    await h.coordinator.close(false);
    expect(h.coordinator.snapshot().editor).toBeNull();
    expect([...h.saved.values()][0]?.pendingOperation).toBeDefined();
    expect(h.coordinator.snapshot().error).toContain('non annulla');
  });
  it('una scelta esplicita dopo un conflitto è un nuovo intento e conserva la bozza precedente fino alla conferma', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Mia');
    const oldId = h.coordinator.snapshot().editor!.draftId;
    h.remote('a', 'Altra');
    await h.coordinator.refresh();
    await h.coordinator.useMine();
    expect(h.coordinator.snapshot().editor?.draftId).not.toBe(oldId);
    expect(h.saved.has(oldId)).toBe(true);
    expect(h.saved.size).toBe(2);
    expect(await h.coordinator.save()).toBe(true);
    expect(h.saved.size).toBe(0);
  });
  it('separa bozza da profilo autorevole e applica solo la patch del widget alla conferma', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a', pageId: 'home' }, 'Widget A');
    await h.change('Locale');
    expect(configurationLayout(h.profile.configuration).cardSettings).toEqual(
      configurationLayout(configuration).cardSettings
    );
    h.remote('b', 'Remoto');
    await h.coordinator.refresh();
    expect(configurationLayout(h.coordinator.snapshot().editor!.working).cardSettings).toEqual({
      'home::a': { heading: 'Locale' },
      'home::b': { heading: 'Remoto' },
    });
    expect(await h.coordinator.save()).toBe(true);
    expect(h.api.commitLiveProfile).toHaveBeenCalledOnce();
    expect(h.saved.size).toBe(0);
    expect(configurationLayout(h.profile.configuration).cardSettings).toEqual({
      'home::a': { heading: 'Locale' },
      'home::b': { heading: 'Remoto' },
    });
  });
  it('un conflitto sullo stesso widget richiede una scelta e non sovrascrive da solo', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Bozza');
    h.remote('a', 'Remoto');
    await h.coordinator.refresh();
    expect(h.coordinator.snapshot().editor?.conflict).not.toBeNull();
    expect(await h.coordinator.save()).toBe(false);
    await h.coordinator.useCurrent();
    expect(h.coordinator.snapshot().editor).toBeNull();
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Remoto'
    );
  });
  it('avvio offline noto e ripresa conservano la bozza senza chiamare operazioni HA o salvataggi remoti', async () => {
    const h = harness();
    await h.coordinator.start();
    h.api.readLiveProfile.mockRejectedValueOnce(new Error('offline'));
    await h.coordinator.refresh();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Offline');
    expect(await h.coordinator.save()).toBe(true);
    const draft = [...h.saved.values()][0]!;
    await h.coordinator.resume(draft);
    expect(h.coordinator.snapshot().editor?.working).toHaveProperty(
      'snapshot.layout.cardSettings.home::a.heading',
      'Offline'
    );
    expect(h.api.commitLiveProfile).not.toHaveBeenCalled();
    expect(h.saved.size).toBe(1);
  });
  it('un titolare scaduto non salva e la bozza resta recuperabile', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Bozza');
    h.api.commitLiveProfile.mockRejectedValueOnce(
      Object.assign(new Error('Riserva scaduta'), { status: 423 })
    );
    expect(await h.coordinator.save()).toBe(false);
    expect(h.saved.size).toBe(1);
    expect(h.coordinator.snapshot().editor?.error).toContain('scaduta');
    expect(h.profile.revision).toBe(0);
  });
  it('dopo una risposta persa ripete lo stesso operationId e payload prima di acquisire un altro lease', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Locale');
    const commit = h.api.commitLiveProfile.getMockImplementation()!;
    h.api.commitLiveProfile.mockImplementationOnce(async (...args) => {
      await commit(...args);
      throw new Error('Risposta persa');
    });
    expect(await h.coordinator.save()).toBe(false);
    const operation = h.api.commitLiveProfile.mock.calls[0]![1];
    await h.coordinator.refresh();
    h.api.acquireEditLease.mockClear();
    expect(await h.coordinator.save()).toBe(true);
    expect(h.api.acquireEditLease).not.toHaveBeenCalled();
    expect(h.api.commitLiveProfile.mock.calls[1]![1]).toEqual(operation);
    expect(h.profile.revision).toBe(1);
  });
  it('Annulla non ripristina un vecchio snapshot sopra una modifica successiva della stessa risorsa', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    await h.change('Locale');
    await h.coordinator.save();
    h.remote('a', 'Successivo');
    await expect(h.coordinator.undoLast()).rejects.toThrow('cambiata successivamente');
    expect(configurationLayout(h.profile.configuration).cardSettings).toHaveProperty(
      'home::a.heading',
      'Successivo'
    );
  });
  it('quota piena blocca nuovi cambi senza eliminare la bozza o toccare il profilo remoto', async () => {
    const h = harness();
    await h.coordinator.start();
    await h.coordinator.begin({ kind: 'widget', widgetId: 'a' }, 'A');
    h.deps.drafts.saveDraft.mockRejectedValue(
      Object.assign(new Error('Memoria piena'), { code: 'DRAFT_QUOTA' })
    );
    await expect(h.change('In memoria')).rejects.toThrow('piena');
    expect(h.coordinator.snapshot().editor?.quotaBlocked).toBe(true);
    expect(await h.coordinator.save()).toBe(false);
    expect(h.saved.size).toBe(1);
    expect(h.profile.revision).toBe(0);
  });
  it('riparte dopo cleanup StrictMode senza mantenere lo stream abortito', async () => {
    const h = harness();
    await h.coordinator.start();
    h.coordinator.dispose();
    await h.coordinator.start();
    expect(h.coordinator.snapshot().status).toBe('ready');
    const signals = h.api.watchLiveProfiles.mock.calls.map((call) => call[0]);
    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    const instances = h.api.watchLiveProfiles.mock.calls.map((call) => call[2]);
    expect(instances[0]).toBe(h.deps.usage.acquireProfileUsage.mock.calls[0]?.[1]);
    expect(instances[1]).toBe(instances[0]);
  });
});
