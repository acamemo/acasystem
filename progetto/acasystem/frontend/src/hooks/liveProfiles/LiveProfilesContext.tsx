import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { ClientSession } from '@/api/clientSession';
import type { Configuration, EditTarget, LiveProfile } from '../../../../contracts/collaboration';
import {
  applyChanges,
  configurationLayout,
  diffConfiguration,
  resourcesForChanges,
} from '../../../../contracts/profileResources';
import { LiveProfileCoordinator, type LiveProfilesState } from './coordinator';
import { PageContextOverride, usePages, type PageContextValue } from '@/hooks/context/PageContext';
import { applySnapshot } from '@/api/snapshot';
import { collectQrConfiguration } from '@/api/qrPairing';
import { clearPendingLayoutCopy, readPendingLayoutCopy } from '@/api/qrHandoff';
import { validatePortableLayoutConfiguration } from '@/api/webPairing';
import { applyAppearance, readAppearance } from '@/utils/appearance';
import { isObject } from '@/validators/guards';
import { sanitizeLauncherLayout } from '@/validators/launcher';
import {
  migrateCommonOrder,
  newProfileConfiguration,
  normalizeProfileConfiguration,
} from '@/domain/launcher/commonOrder';
import {
  adoptDeviceConfig,
  isBindingSetting,
  isStructuralSetting,
  pageWidgetIds,
  propagateDeviceScoped,
  rememberWidgets,
  sanitizeWidgetMemory,
  touchWidget,
  widgetTypeOf,
} from '@/utils/launcher/deviceMemory';
import type { CardSettingsMap, PagesConfig, PageSettingsMap } from '@/@types/dashboard';
import type { BaseDeviceClass } from '@/@types/launcher';
import { useDeviceClass } from '@/hooks/launcher/useViewport';
import { baseClassOf } from '@/utils/launcher/deviceClass';
import { Body, Button, Caption, Field, Heading, StatusMessage, Surface } from '@/components/primitives';
import './liveProfiles.css';
import { exportDraftFile } from './drafts';
import { PROFILE_IN_USE_MESSAGE } from '@/api/usageProof';
import { useHomeStartupSignal, useOptionalHomeStartup } from '@/hooks/startup/HomeStartupContext';
import { pageWidgetIds as idsOfPage } from '@/utils/launcher/layout';
import { LiveProfileChrome } from './LiveProfileChrome';

interface LiveContext {
  state: LiveProfilesState;
  coordinator: LiveProfileCoordinator;
  mutate: (
    mutator: (value: Configuration) => Configuration,
    target?: EditTarget,
    title?: string
  ) => Promise<void>;
  create: (
    name: string,
    device: string,
    configuration?: Configuration,
    sourceId?: string
  ) => Promise<LiveProfile>;
}
const Context = createContext<LiveContext | null>(null);
export const useOptionalLiveProfiles = () => useContext(Context);
export const useLiveProfiles = () => {
  const value = useContext(Context);
  if (!value) throw new Error('Profilo live non disponibile.');
  return value;
};
const record = (value: unknown) => (isObject(value) ? value : {});
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function LiveProfilesProvider({
  session,
  children,
}: {
  session: ClientSession;
  children: ReactNode;
}) {
  const startup = useOptionalHomeStartup();
  const pages = usePages();
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const houseId = session.houseId,
    userId = session.user.id,
    clientId = session.client.id;
  // La vita dell'editor segue l'identità, non gli aggiornamenti di nome, avatar o preferenze.
  const coordinator = useMemo(() => {
    const latest = sessionRef.current;
    return new LiveProfileCoordinator({
      ...latest,
      houseId,
      user: { ...latest.user, id: userId },
      client: { ...latest.client, id: clientId },
    });
  }, [houseId, userId, clientId]);
  const state = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.snapshot,
    coordinator.snapshot
  );
  const additionOwner = useRef<{ widgetId: string; editorId: string; profileId: string } | null>(null);
  const [actionError, setActionError] = useState('');
  const sourceClass = baseClassOf(useDeviceClass());
  const view = state.editor?.working ?? state.profile?.configuration;
  const retryStartup = useCallback(() => { void coordinator.retryPreparation(); }, [coordinator]);
  const gatedUsage = Boolean(state.usageStatus && state.usageStatus !== 'active' && state.usageStatus !== 'idle');
  const checkingUsage = gatedUsage && state.usageStatus === 'checking';
  const pendingStartup = checkingUsage || !gatedUsage && state.status === 'loading';
  useHomeStartupSignal('profile', {
    retry: retryStartup,
    status: pendingStartup ? 'pending' : state.status === 'ready' && state.profile && state.usageStatus === 'active' ? 'ready' : 'outside',
    scope: state.profile ? `${houseId}:${userId}:${clientId}:${state.profile.id}` : undefined,
  });

  useEffect(() => {
    coordinator.updateSessionMetadata(session);
  }, [coordinator, session]);
  useEffect(() => {
    void coordinator.start();
    return () => coordinator.dispose();
  }, [coordinator]);
  useEffect(() => {
    if (!view) return;
    const snapshot = isObject(view.snapshot) ? view.snapshot : view;
    const raw = pagesRef.current;
    applySnapshot(snapshot, raw, { authoritative: true });
    applyAppearance(view.appearance);
  }, [view]);

  const mutate = useCallback(
    async (
      mutator: (value: Configuration) => Configuration,
      target: EditTarget = { kind: 'structure' },
      title = 'Disposizione del profilo'
    ) => {
      setActionError('');
      try {
        if (!coordinator.snapshot().editor)
          await coordinator.begin(target, title, { transient: true });
        await coordinator.update(mutator, { autosave: true });
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Modifica non disponibile.');
        throw error;
      }
    },
    [coordinator]
  );
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (coordinator.snapshot().editor?.quotaBlocked) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [coordinator]);

  const create = useCallback(
    (name: string, device: string, configuration?: Configuration, sourceId?: string) => {
      const initial = normalizeProfileConfiguration(
        configuration ?? (collectQrConfiguration() as unknown as Configuration),
        readAppearance() as unknown as Record<string, unknown>
      );
      return coordinator.create(
        name,
        migrateCommonOrder(initial, sourceClass),
        device,
        sourceId,
        sourceClass
      );
    },
    [coordinator, sourceClass]
  );
  const value = useMemo(
    () => ({ state, coordinator, mutate, create }),
    [state, coordinator, mutate, create]
  );

  const layout = view ? configurationLayout(view) : {};
  const canonicalLayout = useMemo(() => {
    const current = sanitizeLauncherLayout(layout.launcherLayout);
    // La modalità Modifica protegge già dagli spostamenti durante l'uso normale.
    return current ? { ...current, locked: false } : null;
  }, [layout.launcherLayout]);
  const editorAction = (action: () => Promise<unknown>) => {
    void action().catch((error) =>
      setActionError(error instanceof Error ? error.message : 'Operazione non riuscita.')
    );
  };
  const saveField = (field: string, next: unknown) => {
    if (JSON.stringify(layout[field]) === JSON.stringify(next)) return;
    const current =
      coordinator.snapshot().editor?.working ?? coordinator.snapshot().profile?.configuration;
    const changed = current
      ? applyChanges(current, [{ path: ['snapshot', 'layout', field], value: next }])
      : null;
    const resources =
      current && changed
        ? resourcesForChanges(current, changed, diffConfiguration(current, changed))
        : ['profile'];
    const widget = resources.find((key) => key.startsWith('widget:'))?.slice(7);
    const target: EditTarget =
      resources.includes('profile') || !widget
        ? { kind: 'structure' }
        : (coordinator.snapshot().editor?.target ?? { kind: 'widget', widgetId: widget });
    void mutate(
      (configuration) =>
        applyChanges(configuration, [{ path: ['snapshot', 'layout', field], value: next }]),
      target
    ).catch(() => undefined);
  };
  const configurationForWidget = (
    configuration: Configuration,
    id: string,
    setting: string,
    next: unknown
  ) => {
    const result = clone(configuration);
    const data = configurationLayout(result);
    const cards = record(data.cardSettings) as CardSettingsMap;
    const at = id.indexOf('::');
    const widgetId = at < 0 ? id : id.slice(at + 2);
    const type = widgetTypeOf(widgetId, cards[id] ?? {});
    data.cardSettings = propagateDeviceScoped(
      { ...cards, [id]: { ...cards[id], [setting]: next } },
      id,
      setting,
      next
    );
    let memory = sanitizeWidgetMemory(data.widgetMemory);
    if (!isStructuralSetting(type, setting)) memory = touchWidget(memory, widgetId, Date.now());
    else if (isBindingSetting(type, setting) && next) {
      const adopted = adoptDeviceConfig(
        {
          layout: sanitizeLauncherLayout(data.launcherLayout),
          pagesConfig: record(data.pagesConfig) as PagesConfig,
          cardSettings: data.cardSettings as CardSettingsMap,
          customNames: record(data.customNames) as Record<string, string>,
          customIcons: record(data.customIcons) as Record<string, string>,
          memory,
        },
        at < 0 ? null : id.slice(0, at),
        widgetId,
        Date.now()
      );
      if (adopted) {
        data.cardSettings = adopted.cardSettings;
        data.customNames = adopted.customNames;
        data.customIcons = adopted.customIcons;
        memory = adopted.memory;
      }
    }
    data.widgetMemory = memory;
    return result;
  };
  const widgetState = (configuration: Configuration) => {
    const data = configurationLayout(configuration);
    return {
      layout: sanitizeLauncherLayout(data.launcherLayout),
      pagesConfig: record(data.pagesConfig) as PagesConfig,
      cardSettings: record(data.cardSettings) as CardSettingsMap,
      customNames: record(data.customNames) as Record<string, string>,
      customIcons: record(data.customIcons) as Record<string, string>,
      memory: sanitizeWidgetMemory(data.widgetMemory),
    };
  };
  const logicalResourcePage = (configuration: Configuration, pageId: string) => {
    const launcher = sanitizeLauncherLayout(configurationLayout(configuration).launcherLayout);
    return (
      launcher?.pages.find((page) => page.id === pageId)?.id ??
      launcher?.pages.find((page) => pageId.startsWith(`${page.id}--aca-segment-`))?.id ??
      pageId
    );
  };
  const saveMetadata = (field: 'customNames' | 'customIcons', id: string, next: string) => {
    void mutate(
      (configuration) => {
        const result = applyChanges(configuration, [
          { path: ['snapshot', 'layout', field, id], value: next },
        ]);
        const data = configurationLayout(result);
        data.widgetMemory = touchWidget(sanitizeWidgetMemory(data.widgetMemory), id, Date.now());
        return result;
      },
      { kind: 'widget', widgetId: id },
      field === 'customNames' ? 'Nome del widget' : 'Icona del widget'
    ).catch(() => undefined);
  };
  const bridge: PageContextValue = {
    ...pages,
    pagesConfig: (layout.pagesConfig ?? pages.pagesConfig) as PagesConfig,
    cardSettings: record(layout.cardSettings) as CardSettingsMap,
    customNames: record(layout.customNames) as Record<string, string>,
    customIcons: record(layout.customIcons) as Record<string, string>,
    pageSettings: record(layout.pageSettings) as PageSettingsMap,
    launcherLayout: canonicalLayout,
    saveCardSetting: (id, key, next) => {
      const at = id.indexOf('::');
      const widgetId = at < 0 ? id : id.slice(at + 2);
      void mutate(
        (configuration) => configurationForWidget(configuration, id, key, next),
        { kind: 'widget', widgetId, ...(at < 0 ? {} : { pageId: id.slice(0, at) }) },
        'Impostazioni del widget'
      ).catch(() => undefined);
    },
    saveCustomName: (id, name) => saveMetadata('customNames', id, name),
    saveCustomIcon: (id, icon) => saveMetadata('customIcons', id, icon),
    rememberRemovedWidget: (pageId, widgetId, label) => {
      void mutate((configuration) => {
        const result = clone(configuration),
          data = configurationLayout(result),
          current = widgetState(result);
        data.widgetMemory = rememberWidgets(
          current,
          logicalResourcePage(result, pageId),
          [widgetId],
          Date.now(),
          (id) => (id === widgetId ? (label ?? null) : null)
        );
        return result;
      }).catch(() => undefined);
    },
    rememberRemovedPage: (pageId) => {
      void mutate((configuration) => {
        const result = clone(configuration),
          data = configurationLayout(result),
          current = widgetState(result);
        const logical = logicalResourcePage(result, pageId);
        data.widgetMemory = rememberWidgets(
          current,
          logical,
          current.layout ? pageWidgetIds(current.layout, logical) : [],
          Date.now()
        );
        return result;
      }).catch(() => undefined);
    },
    requestWidgetAdoption: (pageId, widgetId) => {
      void mutate(
        (configuration) => {
          const result = clone(configuration),
            data = configurationLayout(result),
            adopted = adoptDeviceConfig(widgetState(result), pageId, widgetId, Date.now());
          if (adopted) {
            data.cardSettings = adopted.cardSettings;
            data.customNames = adopted.customNames;
            data.customIcons = adopted.customIcons;
            data.widgetMemory = adopted.memory;
          }
          return result;
        },
        { kind: 'widget', widgetId, ...(pageId ? { pageId } : {}) }
      ).catch(() => undefined);
    },
    setCardSettings: (next) =>
      saveField(
        'cardSettings',
        typeof next === 'function' ? next(record(layout.cardSettings) as CardSettingsMap) : next
      ),
    setPagesConfig: (next) =>
      saveField('pagesConfig', typeof next === 'function' ? next(bridge.pagesConfig) : next),
    setPageSettings: (next) =>
      saveField('pageSettings', typeof next === 'function' ? next(bridge.pageSettings) : next),
    commitWidgetAddition: async (apply, widgetId) => {
      const before = coordinator.snapshot(), profileId = before.profile?.id;
      if (!profileId || before.usageStatus !== 'active') throw new Error('Profilo non disponibile.');
      if (before.offline || before.editor?.pendingOperation) await coordinator.refresh();
      const current = coordinator.snapshot();
      if (current.profile?.id !== profileId || current.usageStatus !== 'active' || current.offline) throw new Error('Collegamento al profilo non disponibile.');
      const ids = (configuration: Configuration) => new Set(widgetState(configuration).layout?.pages.flatMap(page => idsOfPage(page)) ?? []);
      if (ids(current.profile.configuration).has(widgetId) && !current.editor?.pendingOperation) { apply(widgetState(current.profile.configuration)); return; }
      if (current.editor && (additionOwner.current?.widgetId !== widgetId || additionOwner.current.editorId !== current.editor.id))
        throw new Error('Completa la modifica in corso.');
      if (!current.editor) {
        await coordinator.begin({ kind: 'structure' }, 'Aggiunta widget', { transient: true });
        const editor = coordinator.snapshot().editor;
        if (!editor) throw new Error('Modifica non disponibile.');
        additionOwner.current = { widgetId, editorId: editor.id, profileId };
      }
      if (!coordinator.snapshot().editor?.pendingOperation) {
        await coordinator.update(configuration => {
          const now = coordinator.snapshot();
          if (now.profile?.id !== profileId || now.usageStatus !== 'active' || now.offline) throw new Error('Profilo non disponibile.');
          const next = apply(widgetState(configuration)), result = clone(configuration), data = configurationLayout(result);
          data.launcherLayout = next.layout; data.pagesConfig = next.pagesConfig; data.cardSettings = next.cardSettings;
          data.customNames = next.customNames; data.customIcons = next.customIcons; data.widgetMemory = next.memory;
          return result;
        }, { autosave: false });
      }
      if (coordinator.snapshot().profile?.id !== profileId) throw new Error('Profilo non disponibile.');
      const saved = await coordinator.save(), after = coordinator.snapshot();
      if (!saved || after.profile?.id !== profileId || after.usageStatus !== 'active' || after.offline || !ids(after.profile.configuration).has(widgetId))
        throw new Error(after.editor?.error || after.error || 'Salvataggio non confermato. Riprova.');
      apply(widgetState(after.profile.configuration)); additionOwner.current = null;
    },
    cancelWidgetAddition: async widgetId => {
      const own = additionOwner.current;
      if (!own || own.widgetId !== widgetId) return 'cancelled';
      if (coordinator.snapshot().editor?.pendingOperation) await coordinator.refresh();
      const current = coordinator.snapshot();
      if (current.profile?.id !== own.profileId) throw new Error('Verifica il salvataggio nel profilo originale.');
      const saved = widgetState(current.profile.configuration).layout?.pages.some(page => idsOfPage(page).includes(widgetId));
      if (!saved && current.editor?.pendingOperation) throw new Error('Esito da verificare. Riprova.');
      if (current.editor?.id === own.editorId) await coordinator.close(true);
      additionOwner.current = null;
      return saved ? 'saved' : 'cancelled';
    },
    persistConfig: (next) => saveField('pagesConfig', next),
    persistCardSettings: (next) => saveField('cardSettings', next),
    persistPageSettings: (next) => saveField('pageSettings', next),
    persistCustomNames: (next) => saveField('customNames', next),
    persistCustomIcons: (next) => saveField('customIcons', next),
    persistWidgetMemory: (next) => saveField('widgetMemory', next),
    persistLauncherLayout: (next) => saveField('launcherLayout', next),
    savePageSetting: (id, key, next) =>
      saveField('pageSettings', {
        ...record(layout.pageSettings),
        [id]: { ...record(record(layout.pageSettings)[id]), [key]: next },
      }),
    setGridColumns: (next) => saveField('gridColumns', next),
    setDynamicGridColumns: (next) => saveField('dynamicGridColumns', next),
    setGridGapH: (next) => saveField('gridGapH', next),
    setGridGapV: (next) => saveField('gridGapV', next),
    setCardBorderRadius: (next) => saveField('cardBorderRadius', next),
    updateCardsOnlyMode: (next) => saveField('cardsOnlyMode', next),
    updateHeaderScale: (next) => saveField('headerScale', next),
    updateHeaderTitle: (next) => saveField('headerTitle', next),
    updateHeaderSettings: (next) => saveField('headerSettings', next),
    updateSectionSpacing: (next) =>
      saveField('sectionSpacing', { ...record(layout.sectionSpacing), ...next }),
    saveStatusPillsConfig: (next) => saveField('statusPillsConfig', next),
  };
  if (gatedUsage) {
    const checking = checkingUsage;
    if (startup?.canPresent() && checking) return null;
    return (
      <Context.Provider value={value}>
        <main className="aca-connect" aria-busy={checking}>
          <StatusMessage message={checking
            ? 'Collegamento…'
            : state.usageStatus === 'blocked'
              ? PROFILE_IN_USE_MESSAGE
              : 'Non riesco a verificare l’uso del profilo. Riprova.'}>
            <Button
              variant="primary"
              disabled={checking}
              onClick={() => {
                void coordinator.retryUsage();
              }}
            >
              Riprova
            </Button>
            {state.editor?.quotaBlocked && (
              <Button
                variant="control"
                onClick={() => {
                  const draft = coordinator.currentDraft();
                  if (draft) exportDraftFile(draft);
                }}
              >
                Esporta bozza
              </Button>
            )}
          </StatusMessage>
        </main>
      </Context.Provider>
    );
  }
  if (startup?.canPresent() && state.status === 'loading') return null;
  if (state.status === 'loading') return <Context.Provider value={value}>
    <main className="aca-connect"><StatusMessage message="Caricamento dei profili…" /></main>
  </Context.Provider>;
  if (state.status === 'unavailable') return <Context.Provider value={value}>
    <main className="aca-connect"><StatusMessage message={state.error} messageRole="alert">
      <Button variant="primary" onClick={() => void coordinator.start()}>Riprova</Button>
    </StatusMessage></main>
  </Context.Provider>;
  return (
    <Context.Provider value={value}>
      {state.status === 'ready' && state.profile ? (
        <PageContextOverride value={bridge}>
          <LiveProfileChrome notice={<>
          {(actionError || state.error) && (
            <div className="aca-live-notice" role="status">
              <Body size="sm">{actionError || state.error}</Body>
              <Button
                variant="control"
                size="sm"
                onClick={() => {
                  setActionError('');
                  void coordinator.refresh();
                }}
              >
                Riprova
              </Button>
            </div>
          )}
          {state.editor && (state.offline || state.saving || state.editor.busy
            || state.editor.error || state.editor.quotaBlocked || state.editor.conflict
            || state.editor.pendingOperation
            || diffConfiguration(state.editor.base.configuration, state.editor.working).length > 0) && (
            <div
              className="aca-live-sync-status"
              role="region"
              aria-label="Sincronizzazione del profilo"
            >
              <Caption role="status">
                {state.offline
                  ? 'Offline · bozza sul dispositivo'
                  : state.saving
                    ? 'Sincronizzazione…'
                    : diffConfiguration(state.editor.base.configuration, state.editor.working)
                          .length
                      ? 'Modifiche in attesa'
                      : 'Sincronizzato'}
                {state.editor.error ? ` · ${state.editor.error}` : ''}
              </Caption>
              {state.editor.quotaBlocked && (
                <Button
                  variant="control"
                  onClick={() => {
                    const draft = coordinator.currentDraft();
                    if (draft) exportDraftFile(draft);
                  }}
                >
                  Esporta la bozza in memoria
                </Button>
              )}
              {(state.editor.error || state.editor.quotaBlocked) &&
                !state.editor.pendingOperation && (
                  <Button
                    variant="control"
                    disabled={state.editor.busy}
                    onClick={() => editorAction(() => coordinator.close(true))}
                  >
                    Scarta bozza non sincronizzata
                  </Button>
                )}
              {state.editor.error && !state.offline && !state.editor.conflict && (
                <Button
                  variant="control"
                  disabled={state.editor.busy || state.editor.quotaBlocked}
                  onClick={() =>
                    editorAction(() => coordinator.save({ keepOpen: !state.editor?.transient }))
                  }
                >
                  Riprova sincronizzazione
                </Button>
              )}
              {state.editor.conflict && (
                <>
                  <Caption>Il profilo è cambiato: scegli quale versione mantenere.</Caption>
                  <Button
                    variant="control"
                    onClick={() => editorAction(() => coordinator.useCurrent())}
                  >
                    Usa versione attuale
                  </Button>
                  <Button
                    variant="control"
                    onClick={() =>
                      editorAction(async () => {
                        await coordinator.useMine();
                        await coordinator.save({
                          keepOpen: !coordinator.snapshot().editor?.transient,
                        });
                      })
                    }
                  >
                    Usa la mia bozza
                  </Button>
                  <Button
                    variant="control"
                    onClick={() =>
                      void coordinator
                        .copyConflict(`${state.profile!.name} — copia`)
                        .catch((error) =>
                          setActionError(
                            error instanceof Error ? error.message : 'Copia non riuscita.'
                          )
                        )
                    }
                  >
                    Crea copia indipendente
                  </Button>
                </>
              )}
            </div>
          )}
          {!state.editor && state.canUndo && (
            <div className="aca-live-sync-status">
              <Button
                variant="control"
                onClick={() =>
                  void coordinator
                    .undoLast()
                    .catch((error) =>
                      setActionError(
                        error instanceof Error ? error.message : 'Impossibile annullare.'
                      )
                    )
                }
              >
                Annulla ultima modifica
              </Button>
            </div>
          )}
          </>}>
            {children}
          </LiveProfileChrome>
        </PageContextOverride>
      ) : (
        <ProfileChoice sourceClass={sourceClass} />
      )}
    </Context.Provider>
  );
}

function ProfileChoice({ sourceClass }: { sourceClass: BaseDeviceClass }) {
  const { state, coordinator, create } = useLiveProfiles();
  const [name, setName] = useState('Principale');
  const [sourceId, setSourceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [receivedCopy, setReceivedCopy] = useState<Configuration | null>(null);
  useEffect(() => {
    if (state.status === 'loading' || state.offline) return;
    const pending = readPendingLayoutCopy();
    if (!pending) return;
    let cancelled = false;
    void validatePortableLayoutConfiguration(pending)
      .then((configuration) => {
        if (!cancelled) {
          setReceivedCopy(configuration as unknown as Configuration);
          setSourceId((previous) => previous || 'qr-copy');
        }
      })
      .catch((failure) => {
        if (!cancelled)
          setError(failure instanceof Error ? failure.message : 'Copia QR non valida.');
      });
    return () => {
      cancelled = true;
    };
  }, [state.status, state.offline]);
  const fromQr = sourceId === 'qr-copy' && receivedCopy;
  const source = fromQr
    ? undefined
    : (state.sources.find((item) => item.id === sourceId) ?? state.sources[0]);
  const preview = useMemo(
    () =>
      fromQr
        ? migrateCommonOrder(normalizeProfileConfiguration(fromQr), sourceClass)
        : source
          ? migrateCommonOrder(
              normalizeProfileConfiguration(
                source.configuration,
                readAppearance() as unknown as Record<string, unknown>
              ),
              sourceClass
            )
          : newProfileConfiguration(
              collectQrConfiguration() as unknown as Configuration,
              sourceClass
            ),
    [source, sourceClass, fromQr]
  );
  const projected = sanitizeLauncherLayout(configurationLayout(preview).launcherLayout);
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Operazione non riuscita.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="aca-live-choice">
      <Surface contentClassName="aca-live-choice__content">
        <Heading level={1} size="lg">
          Il tuo profilo ACA
        </Heading>
        {state.status === 'loading' ? (
          <Body>Caricamento dei profili…</Body>
        ) : (
          <>
            {state.status === 'unavailable' && <Body role="status">{state.error}</Body>}
            {state.profiles.map((profile) => (
              <Button
                key={profile.id}
                variant="secondary"
                disabled={busy || state.offline}
                onClick={() => void act(() => coordinator.select(profile.id))}
              >
                {profile.name}
              </Button>
            ))}
            {!state.offline && state.profiles.length > 0 && !creating && (
              <Button variant="control" onClick={() => setCreating(true)}>
                Crea nuovo profilo
              </Button>
            )}
            {!state.offline && (!state.profiles.length || creating) && (
              <>
                <Body>Scegli la configurazione del tuo account.</Body>
                {(state.sources.length > 0 || receivedCopy) && (
                  <label>
                    Configurazione di partenza
                    <select
                      value={fromQr ? 'qr-copy' : (source?.id ?? '')}
                      onChange={(event) => setSourceId(event.target.value)}
                    >
                      {receivedCopy && <option value="qr-copy">Layout ricevuto dal QR</option>}
                      {state.sources.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {item.deviceLabel ? ` · ${item.deviceLabel}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Field
                  label="Nome del profilo"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <details>
                  <summary>Anteprima della configurazione</summary>
                  <div aria-label="Anteprima ordine comune">
                    <Caption>
                      Ordine ricavato da questo formato ({sourceClass}). Gli altri schermi
                      adatteranno dimensioni e colonne.
                    </Caption>
                    {projected?.pages.map((page) => (
                      <p key={page.id}>
                        {page.label}: {(page.order ?? []).join(' → ') || 'pagina vuota'}
                      </p>
                    ))}
                  </div>
                </details>
                <Button
                  variant="primary"
                  loading={busy}
                  disabled={!name.trim()}
                  onClick={() =>
                    void act(async () => {
                      await create(name.trim(), state.clientName, preview, source?.id);
                      if (fromQr) clearPendingLayoutCopy();
                    })
                  }
                >
                  {state.profiles.length ? 'Crea nuovo profilo' : 'Continua'}
                </Button>
              </>
            )}
            {(error || state.error) && (
              <Body tone="danger" role="alert">
                {error || state.error}
              </Body>
            )}
            <Button variant="control" onClick={() => void act(() => coordinator.start())}>
              Riprova il collegamento
            </Button>
          </>
        )}
      </Surface>
    </main>
  );
}
