import type { ClientSession } from '@/api/clientSession';
import { readClientBootstrap, renameClient } from '@/api/clientSession';
import * as api from '@/api/liveProfiles';
import { notifyHomeAssistantApiUnauthorized } from '@/api/apiAuth';
import type {
  CollaborationBootstrap,
  Configuration,
  EditLease,
  EditTarget,
  LiveProfile,
  MigrationSource,
  ProfileOperation,
  ProfileUsageLease,
} from '../../../../contracts/collaboration';
import { EDIT_RENEW_MS, PROFILE_USAGE_RENEW_MS } from '../../../../contracts/collaboration';
import * as profileUsage from '@/api/profileUsage';
import {
  clearProfileUsageProof,
  setProfileUsageProof,
  activateProfileUsageProof,
  PROFILE_USAGE_LOST_EVENT,
  PROFILE_IN_USE_MESSAGE,
  isProfileUsageFailure,
  profileUsageHeaders,
} from '@/api/usageProof';
import {
  applyChanges,
  diffConfiguration,
  resourcesForChanges,
  widgetExists,
} from '../../../../contracts/profileResources';
import { newRequestId } from '@/utils/requestId';
import * as drafts from './drafts';
import type { OfflineDraft } from './drafts';

export interface ProfileEditor {
  id: string;
  draftId: string;
  title: string;
  target: EditTarget;
  base: LiveProfile;
  working: Configuration;
  lease: EditLease | null;
  busy: boolean;
  error: string;
  conflict: LiveProfile | null;
  quotaBlocked: boolean;
  pendingOperation?: ProfileOperation;
  previousDraftIds?: string[];
  transient?: boolean;
  autosave?: boolean;
}
export interface LiveProfilesState {
  status: 'loading' | 'select' | 'ready' | 'unavailable';
  profile: LiveProfile | null;
  profiles: LiveProfile[];
  sources: MigrationSource[];
  leases: EditLease[];
  drafts: OfflineDraft[];
  editor: ProfileEditor | null;
  offline: boolean;
  error: string;
  clientName: string;
  canUndo: boolean;
  saving: boolean;
  usageStatus: 'idle' | 'checking' | 'active' | 'blocked' | 'unavailable';
  usageError: string;
  usageLease: ProfileUsageLease | null;
}
export interface CoordinatorDependencies {
  api: typeof api;
  bootstrap: typeof readClientBootstrap;
  renameClient: typeof renameClient;
  drafts: Pick<
    typeof drafts,
    'listDrafts' | 'saveDraft' | 'deleteDraft' | 'cacheActiveProfile' | 'readCachedProfile'
  >;
  id: () => string;
  usage: typeof profileUsage;
}
const defaults: CoordinatorDependencies = {
  api,
  bootstrap: readClientBootstrap,
  renameClient,
  drafts,
  id: newRequestId,
  usage: profileUsage,
};
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'La centrale non è raggiungibile. La bozza è conservata.';
const status = (error: unknown) => Number((error as { status?: unknown } | null)?.status);
const body = (error: unknown) =>
  (error as { body?: { profile?: LiveProfile; leases?: EditLease[] } } | null)?.body;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const selectedProfile = (bootstrap: CollaborationBootstrap) =>
  bootstrap.accountProfileId === undefined
    ? (bootstrap.client?.activeProfileId ?? null)
    : bootstrap.accountProfileId;

/** Stato autorevole e bozza separati; nessun timer ripubblica snapshot globali. */
export class LiveProfileCoordinator {
  private state: LiveProfilesState;
  private listeners = new Set<() => void>();
  private pending = Promise.resolve();
  private updates = Promise.resolve();
  private stopped = false;
  private generation = 0;
  private queuedUpdates = 0;
  private opening: Promise<void> | null = null;
  private closingEditorId: string | null = null;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private accessDenied = false;
  private denyingAccess: Promise<void> | null = null;
  private cancelStream = new AbortController();
  private renewTimer: ReturnType<typeof setInterval> | null = null;
  private usageTimer: ReturnType<typeof setInterval> | null = null;
  private usageExpiry: ReturnType<typeof setTimeout> | null = null;
  private usageRequest = 0;
  private claimingUsage = 0;
  private usageRetry: Promise<void> | null = null;
  private preparationRetry: Promise<void> | null = null;
  private preparationEpoch = 0;
  private usageVerification: Promise<void> | null = null;
  private usageResumePending = false;
  private pageAway = false;
  private usageSessionId: string;
  private deps: CoordinatorDependencies;
  private undo: {
    profileId: string;
    before: Configuration;
    after: LiveProfile;
    target: EditTarget;
  } | null = null;
  private currentSession: ClientSession;
  constructor(session: ClientSession, overrides: Partial<CoordinatorDependencies> = {}) {
    this.currentSession = session;
    this.deps = { ...defaults, ...overrides };
    this.usageSessionId = this.deps.id();
    this.state = {
      status: 'loading',
      profile: null,
      profiles: [],
      sources: [],
      leases: [],
      drafts: [],
      editor: null,
      offline: Boolean(session.offline),
      error: '',
      clientName: session.client.label,
      canUndo: false,
      saving: false,
      usageStatus: 'idle',
      usageError: '',
      usageLease: null,
    };
  }
  get session(): ClientSession {
    return this.currentSession;
  }
  updateSessionMetadata(session: ClientSession): void {
    if (
      session.houseId !== this.session.houseId ||
      session.user.id !== this.session.user.id ||
      session.client.id !== this.session.client.id
    )
      throw new Error('La nuova sessione appartiene a un’identità diversa.');
    this.currentSession = session;
    if (session.client.label !== this.state.clientName)
      this.set({ clientName: session.client.label });
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private set(patch: Partial<LiveProfilesState>) {
    if (this.stopped) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private enqueue<T>(action: () => Promise<T>): Promise<T> {
    const generation = this.generation;
    const job = this.pending.then(() => {
      if (this.stopped || generation !== this.generation)
        throw new Error('La sessione del profilo è cambiata.');
      return action();
    });
    this.pending = job.then(
      () => undefined,
      (error) => {
        if (!this.stopped && generation === this.generation) this.set({ error: message(error) });
      }
    );
    return job;
  }
  private clearAutoSave() {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = null;
  }
  private assertUsage() {
    if (this.pageAway || this.state.usageStatus !== 'active')
      throw Object.assign(new Error(this.state.usageError || PROFILE_IN_USE_MESSAGE), {
        status: 409,
        body: { code: 'PROFILE_USAGE_REQUIRED' },
      });
  }
  private freezeUsage(error: unknown, checking = false) {
    ++this.preparationEpoch;
    this.clearAutoSave();
    if (this.state.usageLease) clearProfileUsageProof(this.state.usageLease.id);
    this.set({
      usageStatus: checking ? 'checking' : isProfileUsageFailure(error) ? 'blocked' : 'unavailable',
      usageError: checking
        ? ''
        : isProfileUsageFailure(error)
          ? PROFILE_IN_USE_MESSAGE
          : message(error),
    });
    if (!checking && !this.usageTimer && !this.stopped && !this.pageAway)
      this.usageTimer = setInterval(() => {
        void this.retryUsage();
      }, PROFILE_USAGE_RENEW_MS);
    const editor = this.state.editor;
    if (editor)
      void this.deps.drafts.saveDraft(this.toDraft(editor)).catch((failure) => {
        if (this.state.editor?.id === editor.id)
          this.set({
            editor: { ...this.state.editor, quotaBlocked: true, error: message(failure) },
          });
      });
  }
  private stopUsageTimers() {
    if (this.usageTimer) clearInterval(this.usageTimer);
    if (this.usageExpiry) clearTimeout(this.usageExpiry);
    this.usageTimer = null;
    this.usageExpiry = null;
  }
  private keepUsage(lease: ProfileUsageLease) {
    this.stopUsageTimers();
    this.set({ usageLease: lease });
    setProfileUsageProof(lease, this.state.usageStatus === 'active');
    this.usageExpiry = setTimeout(
      () => {
        if (this.state.usageLease?.id === lease.id)
          this.freezeUsage(
            Object.assign(new Error(PROFILE_IN_USE_MESSAGE), {
              body: { code: 'PROFILE_USAGE_EXPIRED' },
            })
          );
      },
      Math.max(0, lease.expiresAt - lease.serverTime)
    );
    this.usageTimer = setInterval(() => {
      if (this.stopped || this.pageAway) return;
      if (this.state.usageStatus !== 'active') {
        void this.retryUsage().catch(() => undefined);
        return;
      }
      void this.deps.usage
        .renewProfileUsage(lease, this.usageSessionId)
        .then((renewed) => {
          if (
            this.stopped ||
            this.pageAway ||
            this.state.usageLease?.id !== lease.id ||
            this.state.usageStatus !== 'active'
          )
            return;
          this.keepUsage(renewed);
        })
        .catch((error) => {
          if (this.state.usageLease?.id === lease.id) this.freezeUsage(error);
        });
    }, PROFILE_USAGE_RENEW_MS);
  }
  private onUsageFailure = (event: Event) => {
    const detail = (event as CustomEvent<{ leaseId?: string; code?: string; error?: string }>)
      .detail;
    if (detail?.leaseId && detail.leaseId !== this.state.usageLease?.id) return;
    this.freezeUsage({ body: detail });
  };
  private onPageHide = () => {
    if (this.pageAway) return;
    this.usageResumePending = false;
    this.pageAway = true;
    ++this.usageRequest;
    this.freezeUsage(null, true);
    this.stopUsageTimers();
    const lease = this.state.usageLease;
    if (lease) this.deps.usage.releaseProfileUsageKeepAlive(lease, this.usageSessionId, true);
    this.set({ usageLease: null });
  };
  private onResume = () => {
    this.pageAway = false;
    if (this.stopped) return;
    if (this.claimingUsage) {
      this.usageResumePending = true;
      return;
    }
    if (this.usageVerification) return;
    const lease = this.state.usageLease;
    if (
      this.state.usageStatus === 'active' &&
      lease &&
      profileUsageHeaders()['x-aca-usage-lease'] === lease.id
    ) {
      const generation = this.generation;
      const verify = this.deps.usage
        .renewProfileUsage(lease, this.usageSessionId)
        .then(async (renewed) => {
          if (
            this.stopped ||
            this.pageAway ||
            generation !== this.generation ||
            this.state.usageLease?.id !== lease.id
          )
            return;
          this.keepUsage(renewed);
          await this.refresh(true);
        })
        .catch((error) => {
          if (
            this.stopped ||
            generation !== this.generation ||
            this.state.usageLease?.id !== lease.id
          )
            return;
          this.freezeUsage(error);
          void this.retryUsage();
        });
      this.usageVerification = verify;
      void verify.finally(() => {
        if (this.usageVerification === verify) this.usageVerification = null;
      });
      return;
    }
    void this.retryUsage().catch(() => undefined);
  };
  private onVisible = () => {
    if (document.visibilityState === 'visible') this.onResume();
  };
  private drainUsageResume() {
    if (!this.usageResumePending || this.claimingUsage || this.usageRetry) return;
    this.usageResumePending = false;
    if (!this.stopped && !this.pageAway && this.state.usageStatus === 'checking')
      void this.retryUsage();
  }
  retryUsage(): Promise<void> {
    if (this.stopped || this.pageAway || this.claimingUsage) return Promise.resolve();
    if (this.usageRetry) return this.usageRetry;
    this.freezeUsage(null, true);
    const retry = this.enqueue(async () => {
      await this.updates;
      if (this.state.editor) await this.closeNow(false);
      const bootstrap = await this.deps.bootstrap(this.cancelStream.signal);
      this.acceptBootstrap(bootstrap);
      const selected = selectedProfile(bootstrap);
      if (selected) await this.select(selected, false);
      else {
        this.onPageHide();
        this.pageAway = false;
        this.set({ status: 'select', profile: null, usageStatus: 'idle', usageError: '' });
      }
    }).catch((error) => {
      this.freezeUsage(error);
    });
    this.usageRetry = retry;
    void retry.finally(() => {
      if (this.usageRetry === retry) this.usageRetry = null;
      this.drainUsageResume();
    });
    return retry;
  }
  retryPreparation(): Promise<void> {
    if (this.stopped || this.pageAway || this.claimingUsage) return Promise.resolve();
    if (this.usageRetry) return this.usageRetry;
    if (this.preparationRetry) return this.preparationRetry;
    if (this.state.editor || this.state.usageStatus === 'active') return this.refresh();
    const lease = this.state.usageLease;
    if (!lease) return this.start();
    const generation = this.generation, request = ++this.usageRequest, epoch = ++this.preparationEpoch;
    const current = () => generation === this.generation && request === this.usageRequest && epoch === this.preparationEpoch && !this.stopped && !this.pageAway;
    const retry = (async () => {
      let renewed: ProfileUsageLease;
      try {
        // The timer and cached lease are not authority: confirm ownership with the server.
        renewed = await this.deps.usage.renewProfileUsage(lease, this.usageSessionId);
      } catch {
        if (current()) await this.retryUsage();
        return;
      }
      if (!current() || this.state.usageLease?.id !== lease.id) return;
      this.keepUsage(renewed);
      this.set({ usageStatus: 'checking', usageError: '' });
      try {
        const profile = await this.deps.api.readLiveProfile(renewed.profileId);
        const leases = await this.deps.api.readEditLeases(renewed.profileId);
        if (!current() || this.state.usageLease?.id !== renewed.id || !this.usageExpiry) return;
        const accepted = this.state.profile?.id === profile.id && this.state.profile.revision > profile.revision
          ? this.state.profile : profile;
        activateProfileUsageProof(renewed.id);
        this.set({ profile: accepted, profiles: this.state.profiles.map((item) => item.id === accepted.id ? accepted : item),
          leases, status: 'ready', offline: false, error: '', usageStatus: 'active', usageError: '' });
        await this.deps.drafts.cacheActiveProfile(this.cacheKey, accepted).catch(() => undefined);
      } catch (error) {
        if (current()) this.freezeUsage(error);
      }
    })();
    this.preparationRetry = retry;
    void retry.finally(() => { if (this.preparationRetry === retry) this.preparationRetry = null; });
    return retry;
  }
  private scheduleAutoSave() {
    this.clearAutoSave();
    if (this.stopped || this.state.offline || this.state.usageStatus !== 'active') return;
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      void this.enqueue(async () => {
        const editor = this.state.editor;
        if (
          !editor?.autosave ||
          (editor.conflict && !editor.pendingOperation) ||
          editor.quotaBlocked ||
          this.state.offline ||
          this.state.usageStatus !== 'active'
        )
          return;
        await this.updates;
        await this.saveNow({ keepOpen: !editor.transient, automatic: true });
      }).catch(() => undefined);
    }, 350);
  }
  private get cacheKey() {
    return `${this.session.houseId}:${this.session.user.id}:${this.session.client.id}`;
  }
  private async refreshDrafts() {
    try {
      this.set({
        drafts: await this.deps.drafts.listDrafts(this.session.houseId, this.session.user.id),
      });
    } catch (error) {
      this.set({ error: message(error) });
    }
  }
  async start(): Promise<void> {
    const generation = ++this.generation;
    this.stopped = false;
    this.accessDenied = false;
    this.pageAway = false;
    window.addEventListener(PROFILE_USAGE_LOST_EVENT, this.onUsageFailure);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onResume);
    window.addEventListener('online', this.onResume);
    document.addEventListener('visibilitychange', this.onVisible);
    this.clearAutoSave();
    this.cancelStream.abort();
    this.cancelStream = new AbortController();
    const signal = this.cancelStream.signal;
    if (this.renewTimer) clearInterval(this.renewTimer);
    await this.refreshDrafts();
    try {
      const bootstrap = await this.deps.bootstrap(signal);
      if (generation !== this.generation || signal.aborted) return;
      this.acceptBootstrap(bootstrap);
      const id = selectedProfile(bootstrap);
      if (id) await this.select(id, false);
      else {
        this.onPageHide();
        this.pageAway = false;
        this.set({
          status: 'select',
          profile: null,
          offline: false,
          usageStatus: 'idle',
          usageError: '',
        });
      }
    } catch (error) {
      if (generation !== this.generation || signal.aborted) return;
      if (isProfileUsageFailure(error)) {
        this.freezeUsage(error);
      } else if ([401, 403].includes(status(error))) {
        this.set({ status: 'unavailable', error: message(error) });
        return;
      } else {
        const cached = await this.deps.drafts.readCachedProfile(this.cacheKey).catch(() => null);
        if (cached)
          this.set({
            status: 'ready',
            profile: cached,
            profiles: [cached],
            offline: true,
            error: 'Centrale non raggiungibile: puoi preparare bozze locali.',
            usageStatus: 'unavailable',
            usageError: 'Collega la centrale per usare questo profilo.',
          });
        else
          this.set({
            status: 'unavailable',
            offline: true,
            error:
              'Nessun profilo già letto su questo dispositivo. Collega la centrale per il primo accesso.',
          });
      }
    }
    if (generation !== this.generation || signal.aborted) return;
    this.renewTimer = setInterval(() => {
      void this.renew();
    }, EDIT_RENEW_MS);
    void this.stream(signal, generation);
  }
  private acceptBootstrap(bootstrap: CollaborationBootstrap) {
    this.set({
      profiles: bootstrap.profiles,
      sources: bootstrap.sources,
      clientName: bootstrap.client?.label ?? this.state.clientName,
    });
  }
  private async handleAccessFailure(error: unknown): Promise<boolean> {
    const code = status(error);
    if (code !== 401 && code !== 403) return false;
    if (this.denyingAccess) {
      await this.denyingAccess;
      return true;
    }
    if (this.accessDenied) return true;
    this.accessDenied = true;
    this.clearAutoSave();
    this.stopUsageTimers();
    if (this.state.usageLease) clearProfileUsageProof(this.state.usageLease.id);
    ++this.generation;
    this.cancelStream.abort();
    if (this.renewTimer) clearInterval(this.renewTimer);
    const editor = this.state.editor;
    const action = (async () => {
      let preserved = true;
      if (editor) {
        this.set({ editor: { ...editor, busy: true, lease: null } });
        try {
          await this.deps.drafts.saveDraft(this.toDraft(editor));
          await this.refreshDrafts();
        } catch (storageError) {
          preserved = false;
          this.set({
            editor: {
              ...editor,
              busy: false,
              lease: null,
              quotaBlocked: true,
              error: `Accesso negato. Esporta la bozza in memoria: ${message(storageError)}`,
            },
          });
        }
      }
      if (preserved)
        this.set({
          editor: null,
          profile: null,
          leases: [],
          canUndo: false,
          status: code === 401 ? 'unavailable' : 'select',
          profiles:
            code === 401
              ? []
              : this.state.profiles.filter(
                  (item) => item.id !== editor?.base.id && item.id !== this.state.profile?.id
                ),
          error:
            code === 401
              ? 'Accesso non più valido. Accedi nuovamente; le bozze locali restano conservate.'
              : 'Non puoi più modificare questo profilo. Le bozze locali restano conservate.',
          offline: false,
        });
      else this.set({ offline: false });
      if (code === 401)
        notifyHomeAssistantApiUnauthorized('Accesso ACA non più valido. Accedi nuovamente.');
    })();
    this.denyingAccess = action;
    try {
      await action;
    } finally {
      this.denyingAccess = null;
    }
    return true;
  }
  private async stream(signal: AbortSignal, generation: number) {
    while (!signal.aborted && generation === this.generation) {
      try {
        await this.deps.api.watchLiveProfiles(
          signal,
          (event) => {
            if (event.type === 'activity') {
              globalThis.window?.dispatchEvent(new Event('acasystem:activity-changed'));
              return;
            }
            if (event.type === 'usage') {
              if (this.state.usageStatus !== 'active' && !this.claimingUsage)
                void this.retryUsage();
              return;
            }
            if (event.type === 'resync' && this.state.usageStatus === 'active' && !this.pageAway) {
              this.onResume();
              return;
            }
            void this.refresh(event.type === 'resync' || event.type === 'client');
          },
          this.usageSessionId
        );
      } catch (error) {
        if (!signal.aborted && (await this.handleAccessFailure(error))) return;
        if (!signal.aborted) this.set({ offline: true });
      }
      if (!signal.aborted)
        await new Promise<void>((resolve) => {
          const finish = () => {
            clearTimeout(timer);
            signal.removeEventListener('abort', finish);
            resolve();
          };
          const timer = setTimeout(finish, 2000);
          signal.addEventListener('abort', finish, { once: true });
        });
    }
  }
  async refresh(all = false): Promise<void> {
    if (this.pageAway) return;
    const generation = this.generation;
    try {
      if (all) {
        const bootstrap = await this.deps.bootstrap(this.cancelStream.signal);
        if (generation !== this.generation || this.stopped) return;
        this.acceptBootstrap(bootstrap);
        const selected = selectedProfile(bootstrap);
        if (
          selected &&
          (selected !== this.state.profile?.id || this.state.usageStatus !== 'active')
        ) {
          if (this.state.editor) {
            void this.retryUsage();
            return;
          }
          await this.select(selected, false);
          return;
        }
        if (!selected && this.state.profile && !this.state.editor) {
          this.onPageHide();
          this.pageAway = false;
          this.set({
            status: 'select',
            profile: null,
            leases: [],
            canUndo: false,
            usageStatus: 'idle',
          });
          return;
        }
      }
      const id = this.state.profile?.id;
      if (id) {
        const [profile, leases] = await Promise.all([
          this.deps.api.readLiveProfile(id),
          this.deps.api.readEditLeases(id),
        ]);
        if (
          generation !== this.generation ||
          this.stopped ||
          id !== this.state.profile?.id ||
          profile.revision < this.state.profile.revision ||
          profile.revision < (this.state.editor?.base.revision ?? 0)
        )
          return;
        const wasOffline = this.state.offline;
        const editor = this.state.editor;
        let nextEditor = editor;
        if (editor && !editor.busy && profile.revision !== editor.base.revision) {
          const changes = diffConfiguration(editor.base.configuration, editor.working);
          const required = resourcesForChanges(editor.base.configuration, editor.working, changes);
          const changed =
            !widgetExists(profile.configuration, editor.target) ||
            required.some(
              (key) =>
                (profile.resourceRevisions[key] ?? 0) !== (editor.base.resourceRevisions[key] ?? 0)
            );
          nextEditor =
            changed && changes.length
              ? {
                  ...editor,
                  conflict: profile,
                  error: 'Questa configurazione è cambiata. Confronta la bozza prima di salvarla.',
                }
              : { ...editor, base: profile, working: applyChanges(profile.configuration, changes) };
        }
        const accepted =
          this.state.profile?.revision === profile.revision ? this.state.profile : profile;
        this.set({
          profile: accepted,
          leases,
          editor: nextEditor,
          offline: false,
          profiles: this.state.profiles.map((item) => (item.id === id ? accepted : item)),
        });
        await this.deps.drafts.cacheActiveProfile(this.cacheKey, profile).catch(() => undefined);
        if (
          wasOffline &&
          nextEditor?.autosave &&
          (!nextEditor.conflict || nextEditor.pendingOperation)
        )
          this.scheduleAutoSave();
      } else this.set({ offline: false });
    } catch (error) {
      if (generation !== this.generation || this.stopped) return;
      if (await this.handleAccessFailure(error)) return;
      if (status(error) === 404)
        this.set({
          error: 'Il profilo non è più disponibile. Le bozze restano recuperabili.',
          editor: this.state.editor
            ? { ...this.state.editor, lease: null, error: message(error) }
            : null,
        });
      else this.set({ offline: true });
    }
  }
  async select(id: string, persist = true): Promise<void> {
    const generation = this.generation;
    const request = ++this.usageRequest;
    const resumingAccess = this.accessDenied;
    if (this.state.editor)
      throw new Error('Salva, conserva o annulla la modifica aperta prima di cambiare profilo.');
    this.freezeUsage(null, true);
    const previous = this.state.usageLease;
    let acquired: ProfileUsageLease | null = null;
    ++this.claimingUsage;
    try {
      acquired = await this.deps.usage.acquireProfileUsage(id, this.usageSessionId);
      if (
        generation !== this.generation ||
        request !== this.usageRequest ||
        this.stopped ||
        this.pageAway
      ) {
        await this.deps.usage
          .releaseProfileUsage(acquired, this.usageSessionId)
          .catch(() => undefined);
        return;
      }
      this.keepUsage(acquired);
      if (previous && previous.id !== acquired.id)
        void this.deps.usage
          .releaseProfileUsage(previous, this.usageSessionId)
          .catch(() => undefined);
      if (persist) await this.deps.api.activateLiveProfile(this.session.client.id, id);
      const profile = await this.deps.api.readLiveProfile(id);
      const leases = await this.deps.api.readEditLeases(id);
      if (
        generation !== this.generation ||
        request !== this.usageRequest ||
        this.stopped ||
        this.pageAway
      )
        return;
      this.accessDenied = false;
      activateProfileUsageProof(acquired.id);
      this.set({
        profile,
        status: 'ready',
        offline: false,
        error: '',
        canUndo: this.undo?.profileId === id,
        leases,
        usageStatus: 'active',
        usageError: '',
      });
      await this.deps.drafts
        .cacheActiveProfile(this.cacheKey, profile)
        .catch((error) => this.set({ error: message(error) }));
      if (resumingAccess) await this.start();
    } catch (error) {
      if (generation !== this.generation || request !== this.usageRequest || this.stopped) return;
      if (acquired) this.deps.usage.releaseProfileUsageKeepAlive(acquired, this.usageSessionId);
      this.freezeUsage(error);
      throw error;
    } finally {
      --this.claimingUsage;
      this.drainUsageResume();
    }
  }
  async create(
    name: string,
    configuration: Configuration,
    deviceName?: string,
    sourceId?: string,
    sourceClass?: string
  ): Promise<LiveProfile> {
    if (deviceName?.trim() && deviceName.trim() !== this.state.clientName) {
      await this.deps.renameClient(this.session.client.id, deviceName.trim());
      this.set({ clientName: deviceName.trim() });
    }
    const profile = await this.deps.api.createLiveProfile(
      name,
      configuration,
      sourceId,
      sourceClass
    );
    this.set({
      profiles: [profile, ...this.state.profiles.filter((item) => item.id !== profile.id)],
    });
    await this.select(profile.id);
    return profile;
  }
  async rename(id: string, name: string) {
    await this.deps.api.renameLiveProfile(id, name);
    await this.refresh(true);
  }
  async remove(id: string) {
    await this.deps.api.deleteLiveProfile(id);
    this.set({
      profiles: this.state.profiles.filter((item) => item.id !== id),
      ...(this.state.profile?.id === id
        ? { profile: null, status: 'select' as const, editor: null }
        : {}),
    });
  }
  begin(target: EditTarget, title: string, options: { transient?: boolean } = {}): Promise<void> {
    return this.enqueue(async () => {
      await this.updates;
      const opening = this.beginNow(target, title, options);
      this.opening = opening;
      try {
        await opening;
      } finally {
        if (this.opening === opening) this.opening = null;
      }
    });
  }
  private async beginNow(
    target: EditTarget,
    title: string,
    options: { transient?: boolean }
  ): Promise<void> {
    this.assertUsage();
    if (this.accessDenied)
      throw new Error(
        'L’accesso a questo profilo non è più valido. Scegli un altro profilo o accedi nuovamente.'
      );
    if (this.state.editor) {
      if (!options.transient && this.state.editor.transient)
        this.set({ editor: { ...this.state.editor, transient: false } });
      if (same(target, this.state.editor.target)) return;
      if (target.kind === 'structure') return this.promoteNow();
      if (this.state.editor.target.kind === 'structure') return;
      throw new Error('Termina la modifica aperta prima di aprirne un’altra.');
    }
    const profile = this.state.profile;
    if (!profile) throw new Error('Scegli un profilo prima di modificarlo.');
    if (!widgetExists(profile.configuration, target))
      throw new Error('Il widget è stato eliminato dal profilo.');
    const editor: ProfileEditor = {
      id: this.deps.id(),
      draftId: this.deps.id(),
      title,
      target,
      base: profile,
      working: clone(profile.configuration),
      lease: null,
      busy: true,
      error: '',
      conflict: null,
      quotaBlocked: false,
      transient: options.transient === true,
    };
    this.set({ editor });
    await (async () => {
      try {
        if (!this.state.offline)
          editor.lease = await this.deps.api.acquireEditLease(profile.id, editor.id, target);
        this.set({ editor: { ...editor, busy: false } });
      } catch (error) {
        if (status(error) === 423 || status(error) === 409) {
          this.set({
            editor: null,
            leases: body(error)?.leases ?? this.state.leases,
            error: message(error),
          });
          throw error;
        }
        if ([401, 403, 404].includes(status(error))) {
          this.set({ editor: null, error: message(error) });
          throw error;
        }
        this.set({ editor: { ...editor, busy: false, error: message(error) }, offline: true });
      }
      try {
        await this.deps.drafts.saveDraft(this.toDraft(this.state.editor ?? editor));
        await this.refreshDrafts();
      } catch (error) {
        if (this.state.editor)
          this.set({
            editor: {
              ...this.state.editor,
              busy: false,
              error: message(error),
              quotaBlocked: true,
            },
          });
      }
    })();
  }
  private toDraft(editor: ProfileEditor): OfflineDraft {
    return {
      id: editor.draftId,
      houseId: this.session.houseId,
      userId: this.session.user.id,
      profileId: editor.base.id,
      clientId: this.session.client.id,
      target: editor.target,
      title: editor.title,
      base: editor.base.configuration,
      changes: diffConfiguration(editor.base.configuration, editor.working),
      expected: editor.base.resourceRevisions,
      updatedAt: new Date().toISOString(),
      ...(editor.previousDraftIds?.length ? { previousDraftIds: editor.previousDraftIds } : {}),
      ...(editor.pendingOperation ? { pendingOperation: editor.pendingOperation } : {}),
    };
  }
  currentDraft(): OfflineDraft | null {
    return this.state.editor ? this.toDraft(this.state.editor) : null;
  }
  promote(): Promise<void> {
    return this.enqueue(() => this.promoteNow());
  }
  private async promoteNow(): Promise<void> {
    const editor = this.state.editor;
    if (!editor || editor.target.kind === 'structure') return;
    const target: EditTarget = { kind: 'structure' };
    const lease = this.state.offline
      ? null
      : await this.deps.api.acquireEditLease(
          editor.base.id,
          editor.id,
          target,
          diffConfiguration(editor.base.configuration, editor.working)
        );
    this.set({ editor: { ...editor, target, lease } });
  }
  update(
    mutator: (configuration: Configuration) => Configuration,
    options: { autosave?: boolean } = {}
  ): Promise<void> {
    const action = async () => {
      this.assertUsage();
      if (this.accessDenied)
        throw new Error('La modifica è ferma perché l’accesso al profilo è stato negato.');
      if (this.opening) await this.opening;
      let editor = this.state.editor;
      if (!editor) throw new Error('La modifica è terminata. Riapri il widget o la disposizione.');
      if (this.closingEditorId === editor.id)
        throw new Error('Attendi la chiusura della modifica prima di cambiarla ancora.');
      if (editor.quotaBlocked) return;
      if (editor.pendingOperation && !this.state.saving)
        throw new Error(
          'Verifica l’esito del salvataggio precedente prima di modificare ancora la bozza.'
        );
      const working = mutator(clone(editor.working));
      if (options.autosave && same(working, editor.working)) return;
      const changes = diffConfiguration(editor.base.configuration, working);
      if (
        !this.state.saving &&
        editor.target.kind === 'widget' &&
        resourcesForChanges(editor.base.configuration, working, changes).includes('profile')
      ) {
        try {
          await this.promoteNow();
        } catch (error) {
          this.clearAutoSave();
          const next = {
            ...editor,
            working,
            error: message(error),
            conflict: body(error)?.profile ?? editor.conflict,
            autosave: false,
          };
          this.set({ editor: next, leases: body(error)?.leases ?? this.state.leases });
          try {
            await this.deps.drafts.saveDraft(this.toDraft(next));
            await this.refreshDrafts();
          } catch (storageError) {
            this.set({ editor: { ...next, error: message(storageError), quotaBlocked: true } });
          }
          throw error;
        }
      }
      editor = this.state.editor!;
      const required = resourcesForChanges(editor.base.configuration, working, changes);
      let lease = editor.lease;
      if (
        !this.state.saving &&
        !this.state.offline &&
        lease &&
        !lease.resources.includes('profile') &&
        required.some((key) => !lease!.resources.includes(key))
      ) {
        try {
          lease = await this.deps.api.acquireEditLease(
            editor.base.id,
            editor.id,
            editor.target,
            changes
          );
        } catch (error) {
          const next = {
            ...editor,
            working,
            error: message(error),
            conflict: body(error)?.profile ?? editor.conflict,
          };
          this.set({ editor: next, leases: body(error)?.leases ?? this.state.leases });
          await this.deps.drafts.saveDraft(this.toDraft(next));
          throw error;
        }
      }
      const next = {
        ...editor,
        working,
        lease,
        error: '',
        autosave: options.autosave ?? editor.autosave,
      };
      this.set({ editor: next });
      try {
        await this.deps.drafts.saveDraft(this.toDraft(next));
        await this.refreshDrafts();
      } catch (error) {
        this.set({ editor: { ...next, error: message(error), quotaBlocked: true } });
        throw error;
      }
      if (options.autosave) this.scheduleAutoSave();
    };
    ++this.queuedUpdates;
    const job = this.updates.then(action);
    this.updates = job.catch((error) => {
      this.set({ error: message(error) });
    });
    return job.finally(() => {
      --this.queuedUpdates;
    });
  }
  save(options: { keepOpen?: boolean } = {}): Promise<boolean> {
    this.clearAutoSave();
    return this.enqueue(async () => {
      await this.updates;
      return this.saveNow(options);
    });
  }
  finish(): Promise<boolean> {
    this.clearAutoSave();
    return this.enqueue(async () => {
      await this.updates;
      while (this.state.editor) {
        if (!(await this.saveNow({}))) return false;
        await this.updates;
      }
      await this.refresh(true);
      return true;
    });
  }
  private async saveNow(options: { keepOpen?: boolean; automatic?: boolean }): Promise<boolean> {
    if (this.state.usageStatus !== 'active' || this.pageAway) return false;
    const generation = this.generation;
    const editor = this.state.editor;
    if (!editor || editor.busy || editor.quotaBlocked) return false;
    if (this.state.offline) {
      try {
        await this.deps.drafts.saveDraft(this.toDraft(editor));
        if (!options.keepOpen) await this.closeNow(false);
        return true;
      } catch (error) {
        this.set({ editor: { ...editor, error: message(error), quotaBlocked: true } });
        return false;
      }
    }
    if (editor.conflict && !editor.pendingOperation) return false;
    this.set({ editor: { ...editor, busy: true, error: '' }, saving: true });
    try {
      const changes = diffConfiguration(editor.base.configuration, editor.working);
      if (!changes.length) {
        if (!options.keepOpen) await this.closeNow(true);
        else this.set({ editor: { ...editor, busy: false } });
        return true;
      }
      if (
        !editor.pendingOperation &&
        editor.target.kind === 'widget' &&
        resourcesForChanges(editor.base.configuration, editor.working, changes).includes('profile')
      ) {
        await this.promoteNow();
        this.set({ editor: { ...this.state.editor!, busy: false } });
        return await this.saveNow(options);
      }
      const lease = editor.pendingOperation
        ? editor.lease
        : await this.deps.api.acquireEditLease(editor.base.id, editor.id, editor.target, changes);
      const required = resourcesForChanges(editor.base.configuration, editor.working, changes);
      const expected = Object.fromEntries(
        [...new Set([...(lease?.resources ?? []), ...required])].map((key) => [
          key,
          editor.base.resourceRevisions[key] ?? 0,
        ])
      );
      const operation = editor.pendingOperation ?? {
        operationId: editor.draftId,
        editSessionId: editor.id,
        leaseId: lease!.id,
        target: editor.target,
        expected,
        changes,
      };
      const sending = {
        ...(this.state.editor ?? editor),
        lease,
        pendingOperation: operation,
        busy: true,
      };
      this.set({ editor: sending });
      try {
        await this.deps.drafts.saveDraft(this.toDraft(sending));
      } catch (error) {
        this.set({
          editor: {
            ...(this.state.editor ?? sending),
            busy: false,
            pendingOperation: undefined,
            error: message(error),
            quotaBlocked: true,
          },
        });
        return false;
      }
      const committed = await this.deps.api.commitLiveProfile(editor.base.id, operation);
      await this.updates;
      if (this.stopped || generation !== this.generation) return false;
      const profile =
        this.state.profile?.id === committed.id && this.state.profile.revision > committed.revision
          ? this.state.profile
          : committed;
      const inverse = diffConfiguration(
        applyChanges(editor.base.configuration, operation.changes),
        editor.base.configuration
      );
      const canUndo = required.every(
        (key) => (profile.resourceRevisions[key] ?? 0) === (operation.expected[key] ?? 0) + 1
      );
      this.undo = canUndo
        ? {
            profileId: profile.id,
            before: applyChanges(profile.configuration, inverse),
            after: profile,
            target: editor.target,
          }
        : null;
      const latest = this.state.editor ?? sending;
      const following = diffConfiguration(
        applyChanges(editor.base.configuration, operation.changes),
        latest.working
      );
      const applied = applyChanges(editor.base.configuration, operation.changes);
      const appliedResources = resourcesForChanges(
        editor.base.configuration,
        applied,
        operation.changes
      );
      const afterOperation: LiveProfile = {
        ...committed,
        configuration: applied,
        revision: editor.base.revision + 1,
        resourceRevisions: {
          ...editor.base.resourceRevisions,
          ...Object.fromEntries(
            [...new Set([...appliedResources, 'profile'])].map((key) => [
              key,
              (editor.base.resourceRevisions[key] ?? 0) + 1,
            ])
          ),
        },
      };
      const followingConflict =
        following.length > 0 &&
        resourcesForChanges(applied, latest.working, following).some(
          (key) =>
            (profile.resourceRevisions[key] ?? 0) !== (afterOperation.resourceRevisions[key] ?? 0)
        );
      const nextBase = followingConflict ? afterOperation : profile;
      const keepOpen =
        options.keepOpen || following.length > 0 || (options.automatic && this.queuedUpdates > 0);
      this.set({
        profile,
        profiles: this.state.profiles.map((item) => (item.id === profile.id ? profile : item)),
        editor: keepOpen
          ? {
              ...latest,
              draftId: this.deps.id(),
              base: nextBase,
              working: applyChanges(nextBase.configuration, following),
              lease,
              busy: false,
              error: followingConflict
                ? 'Questa configurazione è cambiata. Confronta la bozza prima di salvarla.'
                : '',
              conflict: followingConflict ? profile : null,
              pendingOperation: undefined,
              previousDraftIds: undefined,
            }
          : null,
        canUndo,
        error: '',
      });
      if (following.length && this.state.editor) {
        try {
          await this.deps.drafts.saveDraft(this.toDraft(this.state.editor));
        } catch (error) {
          this.set({
            editor: { ...this.state.editor!, error: message(error), quotaBlocked: true },
          });
          return false;
        }
      }
      await this.deps.drafts.cacheActiveProfile(this.cacheKey, profile).catch(() => undefined);
      await this.deps.drafts
        .deleteDraft(editor.draftId)
        .catch((error) => this.set({ error: message(error) }));
      for (const previous of editor.previousDraftIds ?? [])
        await this.deps.drafts.deleteDraft(previous).catch(() => undefined);
      if (lease && !keepOpen)
        await this.deps.api.releaseEditLease(lease.id, editor.id).catch(() => undefined);
      await this.refreshDrafts();
      if (following.length && !followingConflict && !this.state.editor?.quotaBlocked)
        this.scheduleAutoSave();
      return true;
    } catch (error) {
      const latest = this.state.editor ?? editor;
      const uncertain = !status(error) || status(error) >= 500;
      this.set({
        editor: {
          ...latest,
          busy: false,
          error: message(error),
          conflict: body(error)?.profile ?? editor.conflict,
          pendingOperation: uncertain ? latest.pendingOperation : undefined,
        },
        ...(!status(error) || status(error) >= 500 ? { offline: true } : {}),
        leases: body(error)?.leases ?? this.state.leases,
      });
      return false;
    } finally {
      this.set({ saving: false });
    }
  }
  close(discard: boolean): Promise<void> {
    this.clearAutoSave();
    return this.enqueue(async () => {
      await this.updates;
      return this.closeNow(discard);
    });
  }
  private async closeNow(discard: boolean): Promise<void> {
    const editor = this.state.editor;
    if (!editor) return;
    if (discard && editor.pendingOperation)
      throw new Error(
        'L’esito del salvataggio non è ancora verificato. Potrebbe essere già applicato sulla centrale: conserva la bozza o riprova il salvataggio.'
      );
    this.closingEditorId = editor.id;
    try {
      if (
        discard ||
        (!editor.pendingOperation &&
          !diffConfiguration(editor.base.configuration, editor.working).length)
      ) {
        await this.deps.drafts.deleteDraft(editor.draftId);
        for (const previous of editor.previousDraftIds ?? [])
          await this.deps.drafts.deleteDraft(previous);
      } else await this.deps.drafts.saveDraft(this.toDraft(editor));
      if (editor.lease)
        await this.deps.api.releaseEditLease(editor.lease.id, editor.id).catch(() => undefined);
      this.set({
        editor: null,
        ...(editor.pendingOperation
          ? {
              error:
                'Esito del salvataggio da verificare: la bozza è conservata. Scartare la copia locale non annulla eventuali modifiche già salvate sulla centrale.',
            }
          : {}),
      });
      await this.refreshDrafts();
    } finally {
      if (this.closingEditorId === editor.id) this.closingEditorId = null;
    }
  }
  async resume(draft: OfflineDraft): Promise<void> {
    if (this.state.editor)
      throw new Error('Termina la modifica corrente prima di recuperare una bozza.');
    if (draft.pendingOperation && !this.state.offline) {
      try {
        await this.deps.api.commitLiveProfile(draft.profileId, draft.pendingOperation);
        const accepted = applyChanges(draft.base, draft.pendingOperation.changes);
        const following = diffConfiguration(accepted, applyChanges(draft.base, draft.changes));
        if (following.length) {
          const resources = resourcesForChanges(
            draft.base,
            accepted,
            draft.pendingOperation.changes
          );
          const recovered: OfflineDraft = {
            ...draft,
            id: this.deps.id(),
            base: accepted,
            changes: following,
            expected: {
              ...draft.expected,
              ...Object.fromEntries(
                [...new Set([...resources, 'profile'])].map((key) => [
                  key,
                  (draft.expected[key] ?? 0) + 1,
                ])
              ),
            },
            pendingOperation: undefined,
            previousDraftIds: [...(draft.previousDraftIds ?? []), draft.id],
          };
          await this.deps.drafts.saveDraft(recovered);
          await this.deps.drafts.deleteDraft(draft.id);
          await this.resume(recovered);
          return;
        }
        await this.deps.drafts.deleteDraft(draft.id);
        await this.select(draft.profileId);
        await this.refreshDrafts();
        return;
      } catch (error) {
        if (!status(error) || status(error) >= 500) throw error;
      }
    }
    if (!this.state.offline || this.state.profile?.id !== draft.profileId)
      await this.select(draft.profileId);
    const profile = this.state.profile!;
    if (!widgetExists(profile.configuration, draft.target))
      throw new Error(
        'Il widget non esiste più. Puoi esportare la bozza o creare una copia, senza ricrearlo nel profilo.'
      );
    const changed = Object.keys(draft.expected).some(
      (key) =>
        (draft.expected[key] ?? 0) !== (profile.resourceRevisions[key] ?? 0) &&
        resourcesForChanges(
          draft.base,
          applyChanges(draft.base, draft.changes),
          draft.changes
        ).includes(key)
    );
    await this.begin(draft.target, draft.title);
    const editor = this.state.editor!;
    await this.deps.drafts.deleteDraft(editor.draftId);
    this.set({
      editor: {
        ...editor,
        draftId: draft.id,
        working: applyChanges(profile.configuration, draft.changes),
        ...(draft.previousDraftIds?.length ? { previousDraftIds: draft.previousDraftIds } : {}),
        ...(this.state.offline && draft.pendingOperation
          ? { pendingOperation: draft.pendingOperation }
          : {}),
        conflict: changed || drafts.draftConflicts(draft, profile.configuration) ? profile : null,
        error: changed
          ? 'La risorsa è cambiata mentre eri offline. Confronta le due versioni.'
          : '',
      },
    });
  }
  async useMine(): Promise<void> {
    const editor = this.state.editor;
    if (!editor?.conflict) return;
    if (!widgetExists(editor.conflict.configuration, editor.target))
      throw new Error(
        'Il widget è stato eliminato. Esporta la bozza o crea una copia indipendente.'
      );
    const changes = diffConfiguration(editor.base.configuration, editor.working);
    this.set({
      editor: {
        ...editor,
        draftId: this.deps.id(),
        previousDraftIds: [...(editor.previousDraftIds ?? []), editor.draftId],
        base: editor.conflict,
        working: applyChanges(editor.conflict.configuration, changes),
        conflict: null,
        error: '',
        pendingOperation: undefined,
      },
    });
    await this.update((value) => value);
  }
  async useCurrent(): Promise<void> {
    await this.close(true);
    await this.refresh();
  }
  async copyConflict(name: string): Promise<void> {
    const editor = this.state.editor;
    if (!editor || !name.trim()) throw new Error('Dai un nome alla copia del profilo.');
    const profile = await this.deps.api.createLiveProfile(name.trim(), editor.working);
    this.set({
      profiles: [profile, ...this.state.profiles.filter((item) => item.id !== profile.id)],
    });
    await this.close(true);
    await this.select(profile.id);
  }
  async discardDraft(id: string) {
    await this.deps.drafts.deleteDraft(id);
    await this.refreshDrafts();
  }
  async undoLast(): Promise<void> {
    const undo = this.undo;
    if (!undo || undo.profileId !== this.state.profile?.id || this.state.editor) return;
    const current = await this.deps.api.readLiveProfile(undo.profileId);
    const changes = diffConfiguration(undo.after.configuration, undo.before);
    const required = resourcesForChanges(undo.after.configuration, undo.before, changes);
    if (
      required.some(
        (key) => (current.resourceRevisions[key] ?? 0) !== (undo.after.resourceRevisions[key] ?? 0)
      )
    )
      throw new Error(
        'La modifica non può essere annullata: la risorsa è cambiata successivamente.'
      );
    await this.begin(undo.target, 'Annulla ultima modifica');
    await this.update((value) => applyChanges(value, changes));
    if (await this.save()) {
      this.undo = null;
      this.set({ canUndo: false });
    }
  }
  private async renew() {
    if (this.state.usageStatus !== 'active' || this.pageAway) return;
    const editor = this.state.editor;
    if (!editor?.lease || editor.busy) return;
    try {
      const lease = await this.deps.api.renewEditLease(editor.lease.id, editor.id);
      if (this.state.editor?.id === editor.id)
        this.set({ editor: { ...this.state.editor, lease }, offline: false });
    } catch (error) {
      if (this.state.editor?.id === editor.id)
        this.set({
          editor: {
            ...this.state.editor,
            lease: null,
            error: 'La riserva è scaduta o non è raggiungibile. La modifica resta una bozza.',
          },
          offline: !status(error) || status(error) >= 500,
        });
    }
  }
  dispose() {
    this.usageResumePending = false;
    ++this.usageRequest;
    this.stopUsageTimers();
    if (this.state.usageLease) clearProfileUsageProof(this.state.usageLease.id);
    if (this.state.usageLease)
      this.deps.usage.releaseProfileUsageKeepAlive(this.state.usageLease, this.usageSessionId);
    window.removeEventListener(PROFILE_USAGE_LOST_EVENT, this.onUsageFailure);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onResume);
    window.removeEventListener('online', this.onResume);
    document.removeEventListener('visibilitychange', this.onVisible);
    this.clearAutoSave();
    this.stopped = true;
    ++this.generation;
    this.cancelStream.abort();
    if (this.renewTimer) clearInterval(this.renewTimer);
    const editor = this.state.editor;
    if (editor) {
      void this.deps.drafts.saveDraft(this.toDraft(editor)).catch(() => undefined);
      if (editor.lease)
        void this.deps.api.releaseEditLease(editor.lease.id, editor.id).catch(() => undefined);
    }
  }
}
